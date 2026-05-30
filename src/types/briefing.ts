// ============================================================
// InsightNote 2.0 - 晨报 / 预警 / 复盘 类型定义
// ============================================================

// ============================================================
// 个性化晨报
// ============================================================

export interface DailyBriefing {
  id: string;
  user_id: string;
  briefing_date: string;
  headline: string;
  portfolio_summary: PortfolioSummary;
  top_events: BriefingEvent[];
  watchlist_items: WatchlistItem[];
  bias_warning: string | null;
  ai_analysis: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface PortfolioSummary {
  holdings: Array<{
    symbol: string;
    name: string | null;
    change_pct: number | null;
    news: string | null;
  }>;
  total_change_pct: number | null;
  best_performer: string | null;
  worst_performer: string | null;
}

export interface BriefingEvent {
  title: string;
  summary: string;
  impact: 'bullish' | 'bearish' | 'neutral';
  affected_symbols: string[];
  butterfly_chain: string[];
}

export interface WatchlistItem {
  symbol: string;
  reason: string;
  direction: 'bullish' | 'bearish' | 'neutral';
}

// ============================================================
// 智能预警
// ============================================================

export interface AlertRule {
  id: string;
  user_id: string;
  rule_type: 'price_change' | 'volume_spike' | 'news_impact' | 'butterfly_trigger' | 'consensus_shift' | 'bias_warning';
  symbol: string | null;
  condition: AlertCondition;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertCondition {
  threshold?: number;
  direction?: 'up' | 'down' | 'both';
  timeframe_hours?: number;
  keywords?: string[];
}

export interface Alert {
  id: string;
  user_id: string;
  rule_id: string | null;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  symbol: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ============================================================
// 周度复盘
// ============================================================

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  portfolio_return_pct: number | null;
  benchmark_return_pct: number | null;
  alpha: number | null;
  top_contributors: Array<{
    symbol: string;
    contribution_pct: number;
    reason: string;
  }>;
  reading_summary: {
    articles_read: number;
    top_tags: string[];
    sentiment_distribution: {
      bullish: number;
      bearish: number;
      neutral: number;
    };
  };
  bias_analysis: {
    confirmation_bias_detected: boolean;
    description: string;
    recommendation: string;
  };
  prediction_accuracy: {
    total: number;
    correct: number;
    accuracy_pct: number;
  };
  ai_insights: string | null;
  created_at: string;
}

// ============================================================
// 用户偏好
// ============================================================

export interface UserPreferences {
  user_id: string;
  briefing_enabled: boolean;
  briefing_time: string;
  alert_email_enabled: boolean;
  alert_push_enabled: boolean;
  weekly_review_enabled: boolean;
  watchlist: string[];
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  created_at: string;
  updated_at: string;
}
