import type { KnowledgeGraph, GraphNode, GraphEdge, CausalChain, ImpactAssessment, GraphSearchResult } from './types';
import { createKnowledgeGraph, extractEntitiesFromText, extractRelations } from './index';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';

export type QueryMode = 'local' | 'global' | 'hybrid' | 'mix';

export interface QueryResult {
  answer: string;
  sources: Array<{ id: string; title: string; relevance: number }>;
  graphPath: string[];
  confidence: number;
  mode: QueryMode;
}

export interface RAGContext {
  graph: KnowledgeGraph;
  documents: Map<string, string>;
  query: string;
  mode: QueryMode;
}

export async function queryWithRAG(
  graph: KnowledgeGraph,
  query: string,
  mode: QueryMode = 'mix'
): Promise<QueryResult> {
  const localResults = await localSearch(graph, query);
  const globalResults = await globalSearch(graph, query);

  let combinedResults: GraphSearchResult[];
  
  switch (mode) {
    case 'local':
      combinedResults = localResults;
      break;
    case 'global':
      combinedResults = globalResults;
      break;
    case 'hybrid':
      combinedResults = mergeResults(localResults, globalResults);
      break;
    case 'mix':
    default:
      combinedResults = mergeResults(localResults, globalResults);
      break;
  }

  const answer = await generateAnswer(query, combinedResults);
  const sources = extractSources(combinedResults);
  const graphPath = extractGraphPath(combinedResults);

  return {
    answer,
    sources,
    graphPath,
    confidence: combinedResults.length > 0 ? 0.7 : 0.3,
    mode,
  };
}

async function localSearch(graph: KnowledgeGraph, query: string): Promise<GraphSearchResult[]> {
  const results: GraphSearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const node of graph.nodes.values()) {
    const labelMatch = node.label.toLowerCase().includes(lowerQuery);
    const descMatch = node.description?.toLowerCase().includes(lowerQuery);

    if (labelMatch || descMatch) {
      const neighbors = graph.getNeighbors(node.id, 1);
      const edges = graph.getEdges(node.id);

      results.push({
        nodes: [node, ...neighbors],
        edges,
        relevance: labelMatch ? 1.0 : 0.7,
      });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

async function globalSearch(graph: KnowledgeGraph, query: string): Promise<GraphSearchResult[]> {
  const results: GraphSearchResult[] = [];
  const visited = new Set<string>();

  for (const node of graph.nodes.values()) {
    if (visited.has(node.id)) continue;

    const chains = graph.findCausalChains(node.id, 3);
    
    for (const chain of chains) {
      const chainText = chain.nodes.map(n => n.label).join(' ');
      const relevance = calculateRelevance(chainText, query);

      if (relevance > 0.3) {
        const chainNodes = chain.nodes;
        const chainEdges = chain.edges;

        chainNodes.forEach(n => visited.add(n.id));

        results.push({
          nodes: chainNodes,
          edges: chainEdges,
          relevance,
        });
      }
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

function calculateRelevance(text: string, query: string): number {
  const textWords = text.toLowerCase().split(/\s+/);
  const queryWords = query.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (const word of queryWords) {
    if (textWords.some(tw => tw.includes(word) || word.includes(tw))) {
      matches++;
    }
  }

  return matches / queryWords.length;
}

function mergeResults(local: GraphSearchResult[], global: GraphSearchResult[]): GraphSearchResult[] {
  const merged = new Map<string, GraphSearchResult>();

  for (const result of [...local, ...global]) {
    const key = result.nodes.map(n => n.id).sort().join('-');
    const existing = merged.get(key);

    if (!existing || result.relevance > existing.relevance) {
      merged.set(key, result);
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.relevance - a.relevance);
}

function extractSources(results: GraphSearchResult[]): Array<{ id: string; title: string; relevance: number }> {
  return results.map((r, i) => ({
    id: `source-${i}`,
    title: r.nodes[0]?.label || 'Unknown',
    relevance: r.relevance,
  }));
}

function extractGraphPath(results: GraphSearchResult[]): string[] {
  const path: string[] = [];
  const visited = new Set<string>();

  for (const result of results) {
    for (const node of result.nodes) {
      if (!visited.has(node.id)) {
        path.push(node.label);
        visited.add(node.id);
      }
    }
  }

  return path.slice(0, 10);
}

async function generateAnswer(query: string, results: GraphSearchResult[]): Promise<string> {
  if (!isDeepSeekConfigured()) {
    return generateFallbackAnswer(query, results);
  }

  const context = results.slice(0, 3).map(r => {
    const nodes = r.nodes.map(n => `${n.type}: ${n.label}`).join(', ');
    const edges = r.edges.map(e => {
      const source = r.nodes.find(n => n.id === e.sourceId);
      const target = r.nodes.find(n => n.id === e.targetId);
      return `${source?.label} → ${target?.label}`;
    }).join(', ');
    return `实体：${nodes}\n关系：${edges}`;
  }).join('\n\n');

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: '根据知识图谱信息回答用户问题。回答要简洁、准确、有洞察。100字以内。'
        },
        {
          role: 'user',
          content: `问题：${query}\n\n知识图谱信息：\n${context}`,
        },
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.3,
      max_tokens: 200,
    });

    return completion.choices[0].message.content || generateFallbackAnswer(query, results);
  } catch {
    return generateFallbackAnswer(query, results);
  }
}

function generateFallbackAnswer(query: string, results: GraphSearchResult[]): string {
  if (results.length === 0) {
    return `未找到与"${query}"直接相关的知识图谱信息。`;
  }

  const topResult = results[0];
  const nodeLabels = topResult.nodes.slice(0, 3).map(n => n.label).join('、');

  return `根据知识图谱分析，${nodeLabels}与您的查询相关。建议进一步研究这些实体之间的关系。`;
}

export async function insertDocumentIntoGraph(
  graph: KnowledgeGraph,
  documentId: string,
  text: string
): Promise<{ nodesAdded: number; edgesAdded: number }> {
  const initialNodeCount = graph.nodes.size;
  const initialEdgeCount = graph.edges.size;

  const entities = await extractEntitiesFromText(text);
  const relations = await extractRelations(text, entities);

  const nodeMap = new Map<string, GraphNode>();

  for (const entity of entities) {
    const node = await graph.addNode({
      type: entity.type,
      label: entity.label,
      description: entity.description,
      metadata: { sourceDocument: documentId },
    });
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
        evidence: [documentId],
      });
    }
  }

  return {
    nodesAdded: graph.nodes.size - initialNodeCount,
    edgesAdded: graph.edges.size - initialEdgeCount,
  };
}
