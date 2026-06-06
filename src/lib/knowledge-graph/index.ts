import type { KnowledgeGraph, GraphNode, GraphEdge, NodeType, EdgeType, CausalChain, ImpactAssessment, GraphSearchResult } from './types';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';

export function createKnowledgeGraph(): KnowledgeGraph {
  return new InMemoryKnowledgeGraph();
}

class InMemoryKnowledgeGraph implements KnowledgeGraph {
  nodes = new Map<string, GraphNode>();
  edges = new Map<string, GraphEdge>();
  private nextNodeId = 1;
  private nextEdgeId = 1;

  addNode(params: { type: NodeType; label: string; description?: string; metadata?: Record<string, any> }): GraphNode {
    const existing = Array.from(this.nodes.values()).find(
      n => n.type === params.type && n.label.toLowerCase() === params.label.toLowerCase()
    );
    if (existing) return existing;

    const node: GraphNode = {
      id: `node-${this.nextNodeId++}`,
      type: params.type,
      label: params.label,
      description: params.description,
      metadata: params.metadata ?? {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.nodes.set(node.id, node);
    return node;
  }

  addEdge(params: { sourceId: string; targetId: string; type: EdgeType; weight?: number; description?: string; evidence?: string[] }): GraphEdge {
    const existing = Array.from(this.edges.values()).find(
      e => e.sourceId === params.sourceId && e.targetId === params.targetId && e.type === params.type
    );
    if (existing) {
      existing.weight = Math.max(existing.weight, params.weight ?? 0.5);
      if (params.evidence) existing.evidence = [...(existing.evidence ?? []), ...params.evidence];
      return existing;
    }

    const edge: GraphEdge = {
      id: `edge-${this.nextEdgeId++}`,
      sourceId: params.sourceId,
      targetId: params.targetId,
      type: params.type,
      weight: params.weight ?? 0.5,
      description: params.description,
      evidence: params.evidence,
      createdAt: new Date().toISOString(),
    };
    this.edges.set(edge.id, edge);
    return edge;
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getEdges(nodeId: string): GraphEdge[] {
    return Array.from(this.edges.values()).filter(
      e => e.sourceId === nodeId || e.targetId === nodeId
    );
  }

  getNeighbors(nodeId: string, depth = 1): GraphNode[] {
    const visited = new Set<string>();
    const result: GraphNode[] = [];

    const traverse = (currentId: string, remainingDepth: number) => {
      if (visited.has(currentId) || remainingDepth < 0) return;
      visited.add(currentId);

      const edges = this.getEdges(currentId);
      for (const edge of edges) {
        const neighborId = edge.sourceId === currentId ? edge.targetId : edge.sourceId;
        if (!visited.has(neighborId)) {
          const node = this.getNode(neighborId);
          if (node) result.push(node);
          traverse(neighborId, remainingDepth - 1);
        }
      }
    };

    traverse(nodeId, depth);
    return result;
  }

  search(query: string, limit = 10): GraphSearchResult[] {
    const lowerQuery = query.toLowerCase();
    const results: GraphSearchResult[] = [];

    for (const node of this.nodes.values()) {
      const labelMatch = node.label.toLowerCase().includes(lowerQuery);
      const descMatch = node.description?.toLowerCase().includes(lowerQuery);
      
      if (labelMatch || descMatch) {
        const edges = this.getEdges(node.id);
        const neighborIds = new Set<string>();
        edges.forEach(e => {
          neighborIds.add(e.sourceId);
          neighborIds.add(e.targetId);
        });
        neighborIds.delete(node.id);

        const relatedNodes = Array.from(neighborIds)
          .map(id => this.getNode(id))
          .filter((n): n is GraphNode => n !== undefined);

        results.push({
          nodes: [node, ...relatedNodes],
          edges,
          relevance: labelMatch ? 1 : 0.7,
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  }

  findCausalChains(eventId: string, maxDepth = 4): CausalChain[] {
    const chains: CausalChain[] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string, chain: { nodes: GraphNode[]; edges: GraphEdge[] }, depth: number) => {
      if (depth >= maxDepth) return;
      
      const edges = this.getEdges(nodeId).filter(e => e.type === 'causes' || e.type === 'triggers');
      
      if (edges.length === 0 && chain.nodes.length > 1) {
        const rootEvent = this.getNode(eventId);
        if (rootEvent) {
          chains.push({
            id: `chain-${chains.length}`,
            rootEvent,
            nodes: [...chain.nodes],
            edges: [...chain.edges],
            impactScore: chain.edges.reduce((s, e) => s * e.weight, 1),
            confidence: chain.edges.reduce((s, e) => s * e.weight, 1),
            summary: chain.nodes.map(n => n.label).join(' → '),
          });
        }
        return;
      }

      for (const edge of edges) {
        const nextId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
        if (visited.has(nextId)) continue;
        
        visited.add(nextId);
        const nextNode = this.getNode(nextId);
        if (!nextNode) continue;

        chain.nodes.push(nextNode);
        chain.edges.push(edge);
        traverse(nextId, chain, depth + 1);
        chain.nodes.pop();
        chain.edges.pop();
        visited.delete(nextId);
      }
    };

    const rootNode = this.getNode(eventId);
    if (rootNode) {
      visited.add(eventId);
      traverse(eventId, { nodes: [rootNode], edges: [] }, 0);
    }

    return chains.sort((a, b) => b.impactScore - a.impactScore);
  }

  assessImpact(eventId: string, symbols: string[]): ImpactAssessment[] {
    const chains = this.findCausalChains(eventId);
    
    return symbols.map(symbol => {
      const relevantChains = chains.filter(chain =>
        chain.nodes.some(n => 
          n.label.toLowerCase().includes(symbol.toLowerCase()) ||
          n.metadata?.symbol?.toLowerCase() === symbol.toLowerCase()
        )
      );

      const totalImpact = relevantChains.reduce((sum, chain) => {
        const lastNode = chain.nodes[chain.nodes.length - 1];
        const isPositive = lastNode.metadata?.sentiment === 'bullish' || lastNode.type === 'industry';
        return sum + (isPositive ? chain.impactScore : -chain.impactScore);
      }, 0);

      return {
        symbol,
        impact: totalImpact > 0.1 ? 'positive' : totalImpact < -0.1 ? 'negative' : 'neutral',
        magnitude: Math.min(1, Math.abs(totalImpact)),
        confidence: relevantChains.length > 0 
          ? relevantChains.reduce((s, c) => s + c.confidence, 0) / relevantChains.length 
          : 0,
        causalChains: relevantChains,
        summary: relevantChains.length > 0
          ? `${relevantChains.length} 条因果链影响 ${symbol}`
          : `未发现对 ${symbol} 的直接影响`,
      };
    });
  }
}

export async function extractEntitiesFromText(text: string): Promise<Array<{ type: NodeType; label: string; description?: string }>> {
  if (!isDeepSeekConfigured()) {
    return extractEntitiesFallback(text);
  }

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `从金融文本中提取实体。返回 JSON 数组。
实体类型：company(公司), industry(行业), event(事件), indicator(指标), policy(政策), technology(技术), person(人物)
格式：[{"type": "类型", "label": "名称", "description": "简短描述"}]`
        },
        { role: 'user', content: text.slice(0, 2000) },
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.1,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) return [];

    const result = JSON.parse(content);
    const entities = Array.isArray(result.entities) ? result.entities : Array.isArray(result) ? result : [];
    
    return entities.filter((e: any) => e.type && e.label).map((e: any) => ({
      type: ['company', 'industry', 'event', 'indicator', 'policy', 'technology', 'person'].includes(e.type) ? e.type : 'event',
      label: String(e.label).slice(0, 100),
      description: e.description ? String(e.description).slice(0, 200) : undefined,
    }));
  } catch {
    return extractEntitiesFallback(text);
  }
}

function extractEntitiesFallback(text: string): Array<{ type: NodeType; label: string }> {
  const entities: Array<{ type: NodeType; label: string }> = [];
  
  const companyPatterns = /(?:苹果|谷歌|微软|特斯拉|英伟达|亚马逊|Meta|阿里巴巴|腾讯|华为|小米|比亚迪|宁德时代|中芯国际)/g;
  let match;
  while ((match = companyPatterns.exec(text)) !== null) {
    entities.push({ type: 'company', label: match[0] });
  }

  const industryPatterns = /(?:半导体|新能源|人工智能|云计算|生物医药|金融科技|消费电子|汽车|房地产|银行|保险|券商)/g;
  while ((match = industryPatterns.exec(text)) !== null) {
    entities.push({ type: 'industry', label: match[0] });
  }

  return entities;
}

export async function extractRelations(text: string, entities: Array<{ type: NodeType; label: string }>): Promise<Array<{ source: string; target: string; type: EdgeType; description?: string }>> {
  if (!isDeepSeekConfigured() || entities.length < 2) return [];

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `分析实体之间的关系。返回 JSON 数组。
关系类型：causes(导致), affects(影响), competes(竞争), supplies(供应), belongs_to(属于), correlates(相关), triggers(触发)
格式：[{"source": "源实体", "target": "目标实体", "type": "关系类型", "description": "关系描述"}]`
        },
        {
          role: 'user',
          content: `实体：${entities.map(e => `${e.label}(${e.type})`).join('、')}\n\n文本：${text.slice(0, 1500)}`,
        },
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.1,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) return [];

    const result = JSON.parse(content);
    const relations = Array.isArray(result.relations) ? result.relations : Array.isArray(result) ? result : [];
    
    return relations.filter((r: any) => r.source && r.target && r.type).map((r: any) => ({
      source: String(r.source),
      target: String(r.target),
      type: ['causes', 'affects', 'competes', 'supplies', 'belongs_to', 'correlates', 'triggers'].includes(r.type) ? r.type : 'affects',
      description: r.description ? String(r.description).slice(0, 200) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function buildGraphFromText(graph: KnowledgeGraph, text: string, sourceId?: string): Promise<void> {
  const entities = await extractEntitiesFromText(text);
  const relations = await extractRelations(text, entities);

  const nodeMap = new Map<string, GraphNode>();
  for (const entity of entities) {
    const node = await graph.addNode({ ...entity, metadata: {} });
    nodeMap.set(entity.label, node);
  }

  for (const relation of relations) {
    const sourceNode = nodeMap.get(relation.source);
    const targetNode = nodeMap.get(relation.target);
    if (sourceNode && targetNode) {
      await graph.addEdge({
        sourceId: sourceNode.id,
        targetId: targetNode.id,
        type: relation.type,
        weight: 0.5,
        description: relation.description,
        evidence: sourceId ? [sourceId] : undefined,
      });
    }
  }
}
