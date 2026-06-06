export type AlertRuleType = 'price' | 'volume' | 'change' | 'technical' | 'news' | 'custom';
export type AlertCondition = 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'increases_by' | 'decreases_by';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  type: AlertRuleType;
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  triggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  userId: string;
  symbol: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  triggeredAt: string;
  acknowledged: boolean;
  data?: Record<string, any>;
}

export interface AnomalyDetection {
  symbol: string;
  type: 'price_spike' | 'volume_surge' | 'volatility_spike' | 'gap' | 'momentum_shift';
  detected: boolean;
  magnitude: number; // 0-1
  description: string;
  timestamp: string;
}

export interface NewsRiskScan {
  symbol: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  summary: string;
  newsItems: Array<{
    title: string;
    source: string;
    relevance: number;
  }>;
}
