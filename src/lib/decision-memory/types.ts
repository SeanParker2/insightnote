export interface DecisionMemory {
  id: string;
  userId: string;
  symbol: string;
  timestamp: string;
  
  // 决策内容
  action: 'buy' | 'sell' | 'hold' | 'add' | 'reduce';
  reasoning: string;
  confidence: number;
  emotionState: string;
  
  // 市场上下文（决策时）
  marketContext: {
    price: number;
    change: number;
    sentiment?: string;
    news?: string[];
  };
  
  // 结果（验证后）
  outcome?: {
    verifiedAt: string;
    actualPrice: number;
    actualReturn: number;
    benchmarkReturn: number; // 同期大盘
    excessReturn: number;
    holdingDays: number;
    maxDrawdown: number;
    maxGain: number;
  };
  
  // 反思（自动生成）
  reflection?: {
    summary: string;
    whatWentRight: string;
    whatWentWrong: string;
    lessonLearned: string;
    applicablePattern: string;
    biasDetected?: string;
  };
  
  // 关联
  relatedDecisions: string[]; // 类似决策的 ID
  triggeredBy?: string; // 触发来源（news/agent/signal）
}

export interface MemoryContext {
  // 用户画像
  userProfile: {
    totalDecisions: number;
    winRate: number;
    avgReturn: number;
    dominantBiases: string[];
    emotionalTendencies: Record<string, number>;
    bestPerformingSector: string;
    worstPerformingSector: string;
  };
  
  // 相似情境的历史决策
  similarDecisions: Array<{
    id: string;
    symbol: string;
    action: string;
    outcome: 'win' | 'loss' | 'pending';
    returnPct?: number;
    lesson?: string;
    similarity: number; // 0-1
  }>;
  
  // 该标的的历史
  symbolHistory: Array<{
    action: string;
    returnPct?: number;
    timestamp: string;
  }>;
  
  // 当前偏差状态
  currentBiases: Array<{
    type: string;
    severity: string;
    suggestion: string;
  }>;
  
  // 教练提醒
  coachReminders: string[];
}

export interface ReflectionReport {
  period: { start: string; end: string };
  totalDecisions: number;
  verifiedDecisions: number;
  
  // 绩效
  winRate: number;
  avgReturn: number;
  bestDecision: DecisionMemory | null;
  worstDecision: DecisionMemory | null;
  
  // 行为洞察
  behaviorInsights: {
    emotionalImpact: Array<{ emotion: string; avgReturn: number; count: number }>;
    confidenceCalibration: Array<{ confidence: number; actualWinRate: number }>;
    biasPatterns: Array<{ bias: string; frequency: number; impact: number }>;
  };
  
  // 学习进展
  learningProgress: {
    lessonsApplied: number;
    patternsRecognized: number;
    biasesReduced: number;
    consistencyScore: number;
  };
  
  // 个性化反思
  reflections: string[];
}
