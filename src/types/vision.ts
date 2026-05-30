// ============================================================
// InsightNote 2.0 - 新功能类型定义
// ============================================================

// ============================================================
// 1. 蝴蝶效应图谱 2.0
// ============================================================

export interface EnhancedButterflyNode {
  id: string;
  post_id: string;
  label: string;
  type: 'root' | 'event' | 'impact' | 'ticker';
  parent_id: string | null;
  probability: number | null;
  impact_direction: 'bullish' | 'bearish' | 'neutral' | null;
  time_delay_hours: number;
  evidence_text: string | null;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserGraph {
  id: string;
  user_id: string;
  post_id: string | null;
  title: string;
  description: string | null;
  is_public: boolean;
  fork_count: number;
  forked_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserGraphNode {
  id: string;
  graph_id: string;
  label: string;
  type: 'root' | 'event' | 'impact' | 'ticker' | 'custom';
  parent_id: string | null;
  probability: number | null;
  impact_direction: 'bullish' | 'bearish' | 'neutral' | null;
  time_delay_hours: number;
  evidence_text: string | null;
  position_x: number | null;
  position_y: number | null;
  ticker_symbol: string | null;
  created_at: string;
}

export interface UserGraphVote {
  id: number;
  graph_id: string;
  user_id: string;
  direction: 'up' | 'down';
  created_at: string;
}

export interface UserGraphComment {
  id: number;
  graph_id: string;
  user_id: string;
  content: string;
  parent_id: number | null;
  created_at: string;
}

export interface UserGraphWithNodes extends UserGraph {
  nodes: UserGraphNode[];
  vote_count?: number;
  comment_count?: number;
  user_vote?: 'up' | 'down' | null;
}

// ============================================================
// 2. 社区预测系统
// ============================================================

export interface CommunityPrediction {
  id: string;
  post_id: string;
  user_id: string | null;
  symbol: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  start_price: number | null;
  target_price: number | null;
  timeframe_days: number | null;
  status: 'active' | 'won' | 'lost' | 'expired';
  reasoning: string | null;
  graph_node_id: string | null;
  confidence: number | null;
  resolved_at: string | null;
  resolution_reason: string | null;
  created_at: string;
}

export interface PredictionEndorsement {
  id: number;
  prediction_id: string;
  user_id: string;
  created_at: string;
}

export interface UserPredictionStats {
  user_id: string;
  total_predictions: number;
  won_count: number;
  lost_count: number;
  expired_count: number;
  active_count: number;
  accuracy_rate: number | null;
  avg_confidence: number | null;
}

export interface PredictionWithMeta extends CommunityPrediction {
  endorsement_count?: number;
  user_endorsed?: boolean;
  user_display_name?: string;
  post_title?: string;
}

export interface ConsensusPrediction {
  symbol: string;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  avg_target_price: number | null;
  consensus_direction: 'bullish' | 'bearish' | 'neutral';
  total_predictions: number;
}

// ============================================================
// 3. 决策日志系统
// ============================================================

export interface DecisionJournalEntry {
  id: string;
  user_id: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold' | 'reduce' | 'add';
  price: number | null;
  quantity: number | null;
  reasoning: string;
  graph_node_id: string | null;
  prediction_id: string | null;
  emotion_level: number | null;
  emotion_label: 'confident' | 'neutral' | 'hesitant' | 'fearful' | 'greedy' | null;
  expected_direction: 'bullish' | 'bearish' | 'neutral' | null;
  expected_target_price: number | null;
  expected_timeframe_days: number | null;
  actual_outcome: 'better_than_expected' | 'as_expected' | 'worse_than_expected' | 'pending' | null;
  actual_return_pct: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CognitivePattern {
  user_id: string;
  total_decisions: number;
  confident_count: number;
  fearful_count: number;
  greedy_count: number;
  avg_return_when_confident: number | null;
  avg_return_when_fearful: number | null;
  avg_return_when_greedy: number | null;
  bullish_count: number;
  bearish_count: number;
  avg_holding_days: number | null;
  last_decision_at: string | null;
}

export interface CognitiveBiasReport {
  overconfidence: {
    detected: boolean;
    description: string;
    avg_return_when_confident: number | null;
    avg_return_overall: number | null;
  };
  loss_aversion: {
    detected: boolean;
    description: string;
    avg_holding_winners: number | null;
    avg_holding_losers: number | null;
  };
  directional_bias: {
    detected: boolean;
    description: string;
    bullish_pct: number;
    bearish_pct: number;
  };
  emotional_trading: {
    detected: boolean;
    description: string;
    greedy_return: number | null;
    fearful_return: number | null;
  };
}

// ============================================================
// 4. 持仓管理系统
// ============================================================

export interface UserPortfolio {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortfolioHolding {
  id: string;
  portfolio_id: string;
  symbol: string;
  name: string | null;
  quantity: number;
  avg_cost: number;
  currency: string;
  asset_class: 'stock' | 'bond' | 'commodity' | 'crypto' | 'forex' | 'fund' | 'other';
  sector: string | null;
  added_at: string;
  updated_at: string;
}

export interface PortfolioWithHoldings extends UserPortfolio {
  holdings: PortfolioHolding[];
  total_cost: number;
  holding_count: number;
}

export interface SectorConcentration {
  sector: string;
  holding_count: number;
  total_cost: number;
  weight_pct: number;
}

export interface RiskAlert {
  type: 'concentration' | 'correlation' | 'event_impact';
  severity: 'low' | 'medium' | 'high';
  message: string;
  symbols: string[];
  details: Record<string, unknown>;
}

// ============================================================
// 5. 争议地图系统
// ============================================================

export interface Controversy {
  id: string;
  post_id: string | null;
  title: string;
  description: string | null;
  symbol: string | null;
  topic_tags: string[];
  status: 'active' | 'resolved' | 'expired';
  resolved_verdict: 'for_won' | 'against_won' | 'draw' | 'invalidated' | null;
  resolved_at: string | null;
  oracle_resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ControversySide {
  id: string;
  controversy_id: string;
  side: 'for' | 'against';
  title: string;
  summary: string | null;
  created_at: string;
}

export interface ControversyArgument {
  id: string;
  side_id: string;
  user_id: string | null;
  content: string;
  evidence_url: string | null;
  upvotes: number;
  created_at: string;
}

export interface ControversyStance {
  id: number;
  controversy_id: string;
  user_id: string;
  side: 'for' | 'against' | 'undecided';
  created_at: string;
  updated_at: string;
}

export interface ControversyWithSides extends Controversy {
  sides: Array<ControversySide & { arguments: ControversyArgument[] }>;
  for_count: number;
  against_count: number;
  undecided_count: number;
  user_stance: 'for' | 'against' | 'undecided' | null;
}

// ============================================================
// 6. 阅读历史
// ============================================================

export interface ReadingHistoryEntry {
  id: number;
  user_id: string | null;
  post_id: string;
  read_duration_seconds: number | null;
  read_percentage: number | null;
  created_at: string;
}
