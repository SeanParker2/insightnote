export interface DailyBriefing {
  date: string;
  userId: string;
  
  // 今日核心（1 句话）
  headline: string;
  
  // 3 件你需要知道的事
  topInsights: Insight[];
  
  // 你的持仓表现
  portfolioSummary: PortfolioDailySummary;
  
  // 1 个行动建议
  actionSuggestion: ActionSuggestion | null;
  
  // 认知偏差提醒
  biasAlert: BiasAlert | null;
  
  // 阅读推荐（3 篇）
  readingList: ReadingRecommendation[];
  
  // 市场情绪温度计
  marketSentiment: MarketSentiment;
}

export interface Insight {
  id: string;
  category: 'macro' | 'sector' | 'stock' | 'event' | 'risk';
  title: string;
  summary: string; // 50字以内
  impact: 'bullish' | 'bearish' | 'neutral';
  affectedSymbols: string[];
  importance: 'high' | 'medium' | 'low';
  actionRequired: boolean;
}

export interface PortfolioDailySummary {
  totalValue: number;
  dayChange: number;
  dayChangePct: number;
  bestPerformer: { symbol: string; change: number } | null;
  worstPerformer: { symbol: string; change: number } | null;
  alertsCount: number;
  holdings: HoldingDailyStatus[];
}

export interface HoldingDailyStatus {
  symbol: string;
  name: string;
  price: number;
  dayChange: number;
  dayChangePct: number;
  news: string | null; // 一句话相关新闻
  signal: 'buy' | 'sell' | 'hold' | 'watch';
  signalReason: string;
}

export interface ActionSuggestion {
  type: 'rebalance' | 'take_profit' | 'cut_loss' | 'add_position' | 'research' | 'review';
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  relatedSymbols: string[];
  reasoning: string;
}

export interface BiasAlert {
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  title: string;
  description: string;
  suggestion: string;
}

export interface ReadingRecommendation {
  id: string;
  title: string;
  summary: string;
  reason: string; // 为什么推荐给你
  category: string;
  estimatedReadTime: number; // minutes
}

export interface MarketSentiment {
  score: number; // -100 to 100
  label: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  indicators: {
    fearGreedIndex?: number;
    putCallRatio?: number;
    vixLevel?: number;
  };
  description: string;
}
