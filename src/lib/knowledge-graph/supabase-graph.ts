import type { KnowledgeGraph, GraphNode, GraphEdge, NodeType, EdgeType, CausalChain, ImpactAssessment, GraphSearchResult } from './types';

export class SupabaseKnowledgeGraph implements KnowledgeGraph {
  nodes = new Map<string, GraphNode>();
  edges = new Map<string, GraphEdge>();
  private supabase: any;
  private userId: string;
  private loaded = false;

  constructor(supabase: any, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  async load(): Promise<void> {
    if (this.loaded) return;

    const [{ data: nodeRows }, { data: edgeRows }] = await Promise.all([
      this.supabase.from('kg_nodes').select('*').eq('user_id', this.userId).limit(1000),
      this.supabase.from('kg_edges').select('*').eq('user_id', this.userId).limit(5000),
    ]);

    if (nodeRows) {
      for (const row of nodeRows) {
        this.nodes.set(row.id, {
          id: row.id,
          type: row.type,
          label: row.label,
          description: row.description || undefined,
          metadata: row.metadata || {},
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
    }

    if (edgeRows) {
      for (const row of edgeRows) {
        this.edges.set(row.id, {
          id: row.id,
          sourceId: row.source_id,
          targetId: row.target_id,
          type: row.type,
          weight: row.weight || 0.5,
          description: row.description || undefined,
          evidence: row.evidence || [],
          createdAt: row.created_at,
        });
      }
    }

    this.loaded = true;
  }

  async addNode(params: { type: NodeType; label: string; description?: string; metadata?: Record<string, any> }): Promise<GraphNode> {
    await this.load();

    const existing = Array.from(this.nodes.values()).find(
      n => n.type === params.type && n.label.toLowerCase() === params.label.toLowerCase()
    );
    if (existing) return existing;

    const { data, error } = await this.supabase
      .from('kg_nodes')
      .insert({
        user_id: this.userId,
        type: params.type,
        label: params.label,
        description: params.description || null,
        metadata: params.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    const node: GraphNode = {
      id: data.id,
      type: data.type,
      label: data.label,
      description: data.description || undefined,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    this.nodes.set(node.id, node);
    return node;
  }

  async addEdge(params: { sourceId: string; targetId: string; type: EdgeType; weight?: number; description?: string; evidence?: string[] }): Promise<GraphEdge> {
    await this.load();

    const existing = Array.from(this.edges.values()).find(
      e => e.sourceId === params.sourceId && e.targetId === params.targetId && e.type === params.type
    );
    if (existing) {
      existing.weight = Math.max(existing.weight, params.weight ?? 0.5);
      if (params.evidence) existing.evidence = [...(existing.evidence ?? []), ...params.evidence];
      
      await this.supabase
        .from('kg_edges')
        .update({ weight: existing.weight, evidence: existing.evidence })
        .eq('id', existing.id);
      
      return existing;
    }

    const { data, error } = await this.supabase
      .from('kg_edges')
      .insert({
        user_id: this.userId,
        source_id: params.sourceId,
        target_id: params.targetId,
        type: params.type,
        weight: params.weight ?? 0.5,
        description: params.description || null,
        evidence: params.evidence || [],
      })
      .select()
      .single();

    if (error) throw error;

    const edge: GraphEdge = {
      id: data.id,
      sourceId: data.source_id,
      targetId: data.target_id,
      type: data.type,
      weight: data.weight || 0.5,
      description: data.description || undefined,
      evidence: data.evidence || [],
      createdAt: data.created_at,
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

export function createSupabaseKnowledgeGraph(supabase: any, userId: string): SupabaseKnowledgeGraph {
  return new SupabaseKnowledgeGraph(supabase, userId);
}
