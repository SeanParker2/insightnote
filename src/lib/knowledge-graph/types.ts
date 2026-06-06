export type NodeType = 'company' | 'industry' | 'event' | 'indicator' | 'policy' | 'technology' | 'person';
export type EdgeType = 'causes' | 'affects' | 'competes' | 'supplies' | 'belongs_to' | 'correlates' | 'triggers';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  weight: number; // 0-1, 关系强度
  description?: string;
  evidence?: string[]; // 支撑证据（新闻/文章 ID）
  createdAt: string;
}

export interface CausalChain {
  id: string;
  rootEvent: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
  impactScore: number; // 0-1, 影响程度
  confidence: number; // 0-1, 置信度
  summary: string;
}

export interface ImpactAssessment {
  symbol: string;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: number; // 0-1
  confidence: number; // 0-1
  causalChains: CausalChain[];
  summary: string;
}

export interface GraphSearchResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  relevance: number;
}

export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  
  addNode(node: Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt'>): GraphNode | Promise<GraphNode>;
  addEdge(edge: Omit<GraphEdge, 'id' | 'createdAt'>): GraphEdge | Promise<GraphEdge>;
  getNode(id: string): GraphNode | undefined;
  getEdges(nodeId: string): GraphEdge[];
  getNeighbors(nodeId: string, depth?: number): GraphNode[];
  search(query: string, limit?: number): GraphSearchResult[];
  findCausalChains(eventId: string, depth?: number): CausalChain[];
  assessImpact(eventId: string, symbols: string[]): ImpactAssessment[];
}
