export type AgentRole = 'fundamental' | 'sentiment' | 'technical' | 'risk' | 'portfolio_manager';

export interface AgentMessage {
  role: AgentRole;
  content: string;
  confidence: number; // 1-5
  timestamp: string;
}

export interface DebateTopic {
  id: string;
  question: string;
  context: string;
  symbol?: string;
}

export interface DebateResult {
  topicId: string;
  consensus: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  arguments: {
    for: AgentMessage[];
    against: AgentMessage[];
  };
  finalDecision: string;
  dissenting: AgentMessage[];
}

export interface AnalysisResult {
  symbol: string;
  timestamp: string;
  agents: {
    fundamental: AgentAnalysis;
    sentiment: AgentAnalysis;
    technical: AgentAnalysis;
    risk: AgentAnalysis;
  };
  debate: DebateResult;
  recommendation: Recommendation;
}

export interface AgentAnalysis {
  role: AgentRole;
  summary: string;
  signals: Signal[];
  confidence: number;
  reasoning: string;
}

export interface Signal {
  type: 'buy' | 'sell' | 'hold';
  strength: 'strong' | 'moderate' | 'weak';
  reason: string;
  source: string;
}

export interface Recommendation {
  action: 'buy' | 'sell' | 'hold' | 'add' | 'reduce';
  targetAllocation?: number;
  targetPrice?: number;
  stopLoss?: number;
  timeHorizon: 'short' | 'medium' | 'long';
  reasoning: string;
  confidence: number;
  risks: string[];
}

export interface DecisionLog {
  id: string;
  userId: string;
  symbol: string;
  timestamp: string;
  analysisResult: AnalysisResult;
  userAction?: 'buy' | 'sell' | 'hold' | 'add' | 'reduce';
  userReasoning?: string;
  emotionState?: string;
  outcome?: {
    actualReturn: number;
    benchmarkReturn: number;
    lessonsLearned: string;
  };
}
