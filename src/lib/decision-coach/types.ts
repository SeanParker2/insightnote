export interface DecisionCoach {
  // 决策前：帮你理清思路
  preDecisionCheck(decision: PreDecisionInput): Promise<PreDecisionResult>;
  
  // 决策后：自动复盘
  postDecisionReview(decisionId: string): Promise<ReviewResult>;
  
  // 周期性：行为分析
  behaviorAnalysis(userId: string, period: string): Promise<BehaviorReport>;
}

export interface PreDecisionInput {
  symbol: string;
  action: 'buy' | 'sell' | 'hold' | 'add' | 'reduce';
  reasoning: string;
  confidence: number; // 1-5
  emotionState: string;
  targetPrice?: number;
  stopLoss?: number;
}

export interface PreDecisionResult {
  approved: boolean;
  warnings: Warning[];
  checklist: ChecklistItem[];
  alternativeViews: string[];
  riskScore: number; // 0-100
}

export interface Warning {
  type: 'bias' | 'risk' | 'emotional' | 'factual';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

export interface ChecklistItem {
  question: string;
  answered: boolean;
  answer?: string;
  importance: 'required' | 'recommended' | 'optional';
}

export interface ReviewResult {
  decisionId: string;
  outcome: 'pending' | 'completed';
  actualReturn?: number;
  benchmarkReturn?: number;
  excessReturn?: number;
  
  // 决策质量评分
  qualityScore: number; // 0-100
  qualityBreakdown: {
    informationQuality: number; // 信息质量
    analysisDepth: number; // 分析深度
    emotionalControl: number; // 情绪控制
    riskManagement: number; // 风险管理
    timingQuality: number; // 时机选择
  };
  
  // 教练反馈
  feedback: CoachFeedback;
  
  // 经验教训
  lessons: string[];
  
  // 行为模式识别
  patterns: BehaviorPattern[];
}

export interface CoachFeedback {
  tone: 'encouraging' | 'neutral' | 'corrective';
  summary: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  suggestion: string;
}

export interface BehaviorReport {
  userId: string;
  period: { start: string; end: string };
  
  // 投资风格画像
  styleProfile: {
    primaryStyle: string;
    riskTolerance: string;
    timeHorizon: string;
    consistency: number;
  };
  
  // 认知偏差追踪
  biasTracker: BiasTrackerItem[];
  
  // 情绪模式
  emotionalPatterns: EmotionalPatternItem[];
  
  // 决策质量趋势
  qualityTrend: Array<{ date: string; score: number }>;
  
  // 教练建议
  coachAdvice: CoachAdvice;
}

export interface BiasTrackerItem {
  bias: string;
  occurrences: number;
  severity: 'mild' | 'moderate' | 'severe';
  trend: 'improving' | 'stable' | 'worsening';
  examples: string[];
  intervention: string;
}

export interface EmotionalPatternItem {
  emotion: string;
  frequency: number;
  avgReturnWhenEmotional: number;
  bestAction: string;
  worstAction: string;
}

export interface CoachAdvice {
  priority: 'focus' | 'maintain' | 'celebrate';
  message: string;
  weeklyGoals: string[];
  practiceExercises: string[];
}
