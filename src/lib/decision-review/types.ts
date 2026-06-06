export interface DecisionChain {
  id: string;
  userId: string;
  symbol: string;
  timestamp: string;
  
  // 信息层
  informationSources: InformationSource[];
  newsContext: string[];
  
  // 分析层
  analysisProcess: string;
  agentAnalyses?: {
    fundamental?: string;
    sentiment?: string;
    technical?: string;
    risk?: string;
  };
  
  // 决策层
  action: 'buy' | 'sell' | 'hold' | 'add' | 'reduce';
  reasoning: string;
  confidence: number; // 1-5
  targetPrice?: number;
  stopLoss?: number;
  timeHorizon: 'short' | 'medium' | 'long';
  
  // 心理层
  emotionState: EmotionState;
  cognitiveBiases: CognitiveBias[];
  
  // 结果层
  outcome?: DecisionOutcome;
}

export interface InformationSource {
  type: 'news' | 'research' | 'social' | 'data' | 'agent';
  title: string;
  url?: string;
  influence: 'high' | 'medium' | 'low';
}

export type EmotionState = 
  | 'confident'    // 自信
  | 'neutral'      // 中性
  | 'anxious'      // 焦虑
  | 'greedy'       // 贪婪
  | 'fearful'      // 恐惧
  | 'fomo'         // 害怕错过
  | 'regretful'    // 后悔
  | 'euphoric';    // 兴奋

export interface CognitiveBias {
  type: BiasType;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  evidence: string;
}

export type BiasType = 
  | 'overconfidence'      // 过度自信
  | 'confirmation'        // 确认偏差
  | 'anchoring'           // 锚定效应
  | 'loss_aversion'       // 损失厌恶
  | 'disposition_effect'  // 处置效应
  | 'herding'             // 羊群效应
  | 'recency'             // 近因偏差
  | 'availability'        // 可得性偏差
  | 'representativeness'  // 代表性偏差
  | 'emotional_trading';  // 情绪化交易

export interface DecisionOutcome {
  actualReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  holdingPeriod: number; // days
  maxDrawdown: number;
  maxGain: number;
  lessonsLearned: string;
  rating: number; // 1-5, 决策质量评分
}

export interface ReviewReport {
  userId: string;
  period: { start: string; end: string };
  
  // 统计
  totalDecisions: number;
  profitableDecisions: number;
  averageReturn: number;
  averageConfidence: number;
  
  // 偏差分析
  biasSummary: BiasSummary[];
  dominantBiases: BiasType[];
  
  // 行为模式
  tradingFrequency: 'over_trading' | 'normal' | 'under_trading';
  emotionalPattern: EmotionPattern;
  consistencyScore: number; // 0-100
  
  // 投资风格
  styleProfile: StyleProfile;
  
  // 改进建议
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface BiasSummary {
  type: BiasType;
  occurrences: number;
  severity: 'mild' | 'moderate' | 'severe';
  impactOnReturns: number;
  examples: string[];
}

export interface EmotionPattern {
  dominantEmotion: EmotionState;
  emotionDistribution: Record<EmotionState, number>;
  emotionReturnCorrelation: Array<{ emotion: EmotionState; avgReturn: number }>;
}

export interface StyleProfile {
  primaryStyle: 'value' | 'growth' | 'momentum' | 'income' | 'blend';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon: 'short' | 'medium' | 'long';
  consistency: number; // 0-100
  styleDrift: number; // 0-100, 风格漂移程度
}
