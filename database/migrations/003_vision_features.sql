-- ============================================================
-- InsightNote 2.0 - 核心功能数据库迁移
-- 功能: 决策日志、社区预测、持仓管理、争议地图、图谱编辑
-- ============================================================

-- ============================================================
-- 1. 蝴蝶效应图谱 2.0 - 增强现有表
-- ============================================================

-- 给 butterfly_nodes 添加新字段
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS probability NUMERIC CHECK (probability >= 0 AND probability <= 1);
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS impact_direction TEXT CHECK (impact_direction IN ('bullish', 'bearish', 'neutral'));
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS time_delay_hours INTEGER DEFAULT 0;
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS evidence_text TEXT;
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS position_x REAL;
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS position_y REAL;

-- 用户自建图谱
CREATE TABLE user_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  fork_count INTEGER NOT NULL DEFAULT 0,
  forked_from UUID REFERENCES user_graphs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE user_graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES user_graphs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('root', 'event', 'impact', 'ticker', 'custom')),
  parent_id UUID REFERENCES user_graph_nodes(id) ON DELETE CASCADE,
  probability NUMERIC CHECK (probability >= 0 AND probability <= 1),
  impact_direction TEXT CHECK (impact_direction IN ('bullish', 'bearish', 'neutral')),
  time_delay_hours INTEGER DEFAULT 0,
  evidence_text TEXT,
  position_x REAL,
  position_y REAL,
  ticker_symbol TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE user_graph_votes (
  id BIGSERIAL PRIMARY KEY,
  graph_id UUID NOT NULL REFERENCES user_graphs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (graph_id, user_id)
);

CREATE TABLE user_graph_comments (
  id BIGSERIAL PRIMARY KEY,
  graph_id UUID NOT NULL REFERENCES user_graphs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id BIGINT REFERENCES user_graph_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. 社区预测系统
-- ============================================================

-- 扩展现有 predictions 表
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS reasoning TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS graph_node_id UUID REFERENCES butterfly_nodes(id) ON DELETE SET NULL;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS confidence INTEGER CHECK (confidence >= 1 AND confidence <= 10);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS resolution_reason TEXT;

-- 预测投票（对预测本身进行投票）
CREATE TABLE prediction_endorsements (
  id BIGSERIAL PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (prediction_id, user_id)
);

-- 用户预测统计视图
CREATE OR REPLACE VIEW user_prediction_stats AS
SELECT
  p.user_id,
  COUNT(*) AS total_predictions,
  COUNT(*) FILTER (WHERE p.status = 'won') AS won_count,
  COUNT(*) FILTER (WHERE p.status = 'lost') AS lost_count,
  COUNT(*) FILTER (WHERE p.status = 'expired') AS expired_count,
  COUNT(*) FILTER (WHERE p.status = 'active') AS active_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE p.status IN ('won', 'lost')) > 0
    THEN ROUND(
      COUNT(*) FILTER (WHERE p.status = 'won')::NUMERIC /
      COUNT(*) FILTER (WHERE p.status IN ('won', 'lost')) * 100,
      1
    )
    ELSE NULL
  END AS accuracy_rate,
  AVG(p.confidence) AS avg_confidence
FROM predictions p
WHERE p.user_id IS NOT NULL
GROUP BY p.user_id;

-- ============================================================
-- 3. 决策日志系统
-- ============================================================

CREATE TABLE decision_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell', 'hold', 'reduce', 'add')),
  price NUMERIC,
  quantity NUMERIC,
  reasoning TEXT NOT NULL,
  graph_node_id UUID REFERENCES butterfly_nodes(id) ON DELETE SET NULL,
  prediction_id UUID REFERENCES predictions(id) ON DELETE SET NULL,
  emotion_level INTEGER CHECK (emotion_level >= 1 AND emotion_level <= 5),
  emotion_label TEXT CHECK (emotion_label IN ('confident', 'neutral', 'hesitant', 'fearful', 'greedy')),
  expected_direction TEXT CHECK (expected_direction IN ('bullish', 'bearish', 'neutral')),
  expected_target_price NUMERIC,
  expected_timeframe_days INTEGER,
  actual_outcome TEXT CHECK (actual_outcome IN ('better_than_expected', 'as_expected', 'worse_than_expected', 'pending')),
  actual_return_pct NUMERIC,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 认知偏差分析视图
CREATE OR REPLACE VIEW user_cognitive_patterns AS
SELECT
  dj.user_id,
  COUNT(*) AS total_decisions,

  -- 情绪分布
  COUNT(*) FILTER (WHERE dj.emotion_label = 'confident') AS confident_count,
  COUNT(*) FILTER (WHERE dj.emotion_label = 'fearful') AS fearful_count,
  COUNT(*) FILTER (WHERE dj.emotion_label = 'greedy') AS greedy_count,

  -- 情绪-结果关联
  AVG(dj.actual_return_pct) FILTER (WHERE dj.emotion_label = 'confident') AS avg_return_when_confident,
  AVG(dj.actual_return_pct) FILTER (WHERE dj.emotion_label = 'fearful') AS avg_return_when_fearful,
  AVG(dj.actual_return_pct) FILTER (WHERE dj.emotion_label = 'greedy') AS avg_return_when_greedy,

  -- 方向偏好
  COUNT(*) FILTER (WHERE dj.expected_direction = 'bullish') AS bullish_count,
  COUNT(*) FILTER (WHERE dj.expected_direction = 'bearish') AS bearish_count,

  -- 持仓时间分析 (通过 created_at 和 reviewed_at 的差值)
  AVG(
    CASE WHEN dj.reviewed_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (dj.reviewed_at - dj.created_at)) / 86400
    ELSE NULL END
  ) AS avg_holding_days,

  -- 最近活跃度
  MAX(dj.created_at) AS last_decision_at
FROM decision_journals dj
GROUP BY dj.user_id;

-- ============================================================
-- 4. 持仓管理系统
-- ============================================================

CREATE TABLE user_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '默认组合',
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES user_portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  avg_cost NUMERIC NOT NULL CHECK (avg_cost > 0),
  currency TEXT NOT NULL DEFAULT 'CNY',
  asset_class TEXT NOT NULL DEFAULT 'stock' CHECK (asset_class IN ('stock', 'bond', 'commodity', 'crypto', 'forex', 'fund', 'other')),
  sector TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 持仓集中度分析视图
CREATE OR REPLACE VIEW portfolio_analysis AS
SELECT
  ph.portfolio_id,
  up.user_id,
  ph.sector,
  ph.asset_class,
  COUNT(*) AS holding_count,
  SUM(ph.quantity * ph.avg_cost) AS total_cost,
  COUNT(*)::FLOAT / SUM(COUNT(*)) OVER (PARTITION BY ph.portfolio_id) AS weight_pct
FROM portfolio_holdings ph
JOIN user_portfolios up ON up.id = ph.portfolio_id
GROUP BY ph.portfolio_id, up.user_id, ph.sector, ph.asset_class;

-- ============================================================
-- 5. 争议地图系统
-- ============================================================

CREATE TABLE controversies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  symbol TEXT,
  topic_tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'expired')),
  resolved_verdict TEXT CHECK (resolved_verdict IN ('for_won', 'against_won', 'draw', 'invalidated')),
  resolved_at TIMESTAMP WITH TIME ZONE,
  oracle_resolved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE controversy_sides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controversy_id UUID NOT NULL REFERENCES controversies(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('for', 'against')),
  title TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE controversy_arguments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  side_id UUID NOT NULL REFERENCES controversy_sides(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  evidence_url TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE controversy_stances (
  id BIGSERIAL PRIMARY KEY,
  controversy_id UUID NOT NULL REFERENCES controversies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('for', 'against', 'undecided')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (controversy_id, user_id)
);

-- ============================================================
-- 6. 阅读历史 (用于推荐引擎)
-- ============================================================

CREATE TABLE user_reading_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  read_duration_seconds INTEGER,
  read_percentage NUMERIC CHECK (read_percentage >= 0 AND read_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id, created_at)
);

-- ============================================================
-- 索引
-- ============================================================

-- 用户图谱
CREATE INDEX idx_user_graphs_user_id ON user_graphs(user_id);
CREATE INDEX idx_user_graphs_post_id ON user_graphs(post_id);
CREATE INDEX idx_user_graphs_is_public ON user_graphs(is_public);
CREATE INDEX idx_user_graph_nodes_graph_id ON user_graph_nodes(graph_id);
CREATE INDEX idx_user_graph_votes_graph_id ON user_graph_votes(graph_id);
CREATE INDEX idx_user_graph_comments_graph_id ON user_graph_comments(graph_id);

-- 预测
CREATE INDEX idx_predictions_user_id ON predictions(user_id);
CREATE INDEX idx_prediction_endorsements_prediction_id ON prediction_endorsements(prediction_id);

-- 决策日志
CREATE INDEX idx_decision_journals_user_id ON decision_journals(user_id);
CREATE INDEX idx_decision_journals_symbol ON decision_journals(symbol);
CREATE INDEX idx_decision_journals_created_at ON decision_journals(created_at);

-- 持仓
CREATE INDEX idx_user_portfolios_user_id ON user_portfolios(user_id);
CREATE INDEX idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX idx_portfolio_holdings_symbol ON portfolio_holdings(symbol);

-- 争议
CREATE INDEX idx_controversies_status ON controversies(status);
CREATE INDEX idx_controversies_symbol ON controversies(symbol);
CREATE INDEX idx_controversy_sides_controversy_id ON controversy_sides(controversy_id);
CREATE INDEX idx_controversy_arguments_side_id ON controversy_arguments(side_id);
CREATE INDEX idx_controversy_stances_controversy_id ON controversy_stances(controversy_id);

-- 阅读历史
CREATE INDEX idx_user_reading_history_user_id ON user_reading_history(user_id);
CREATE INDEX idx_user_reading_history_post_id ON user_reading_history(post_id);

-- ============================================================
-- RLS 策略
-- ============================================================

-- 用户图谱
ALTER TABLE user_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_graph_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_graph_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_graphs_select_public ON user_graphs FOR SELECT TO authenticated USING (is_public OR user_id = auth.uid());
CREATE POLICY user_graphs_insert_own ON user_graphs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_graphs_update_own ON user_graphs FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_graphs_delete_own ON user_graphs FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY user_graph_nodes_select_public ON user_graph_nodes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_graphs ug WHERE ug.id = user_graph_nodes.graph_id AND (ug.is_public OR ug.user_id = auth.uid()))
);
CREATE POLICY user_graph_nodes_insert_own ON user_graph_nodes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_graphs ug WHERE ug.id = user_graph_nodes.graph_id AND ug.user_id = auth.uid())
);
CREATE POLICY user_graph_nodes_update_own ON user_graph_nodes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_graphs ug WHERE ug.id = user_graph_nodes.graph_id AND ug.user_id = auth.uid())
);
CREATE POLICY user_graph_nodes_delete_own ON user_graph_nodes FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_graphs ug WHERE ug.id = user_graph_nodes.graph_id AND ug.user_id = auth.uid())
);

CREATE POLICY user_graph_votes_select_all ON user_graph_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY user_graph_votes_insert_own ON user_graph_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_graph_votes_update_own ON user_graph_votes FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY user_graph_comments_select_public ON user_graph_comments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_graphs ug WHERE ug.id = user_graph_comments.graph_id AND (ug.is_public OR ug.user_id = auth.uid()))
);
CREATE POLICY user_graph_comments_insert_own ON user_graph_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 预测投票
ALTER TABLE prediction_endorsements ENABLE ROW LEVEL SECURITY;
CREATE POLICY prediction_endorsements_select_all ON prediction_endorsements FOR SELECT TO authenticated USING (true);
CREATE POLICY prediction_endorsements_insert_own ON prediction_endorsements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY prediction_endorsements_delete_own ON prediction_endorsements FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 决策日志
ALTER TABLE decision_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_journals_select_own ON decision_journals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY decision_journals_insert_own ON decision_journals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY decision_journals_update_own ON decision_journals FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY decision_journals_delete_own ON decision_journals FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 持仓
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_portfolios_select_own ON user_portfolios FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_portfolios_insert_own ON user_portfolios FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_portfolios_update_own ON user_portfolios FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_portfolios_delete_own ON user_portfolios FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY portfolio_holdings_select_own ON portfolio_holdings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_portfolios up WHERE up.id = portfolio_holdings.portfolio_id AND up.user_id = auth.uid())
);
CREATE POLICY portfolio_holdings_insert_own ON portfolio_holdings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_portfolios up WHERE up.id = portfolio_holdings.portfolio_id AND up.user_id = auth.uid())
);
CREATE POLICY portfolio_holdings_update_own ON portfolio_holdings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_portfolios up WHERE up.id = portfolio_holdings.portfolio_id AND up.user_id = auth.uid())
);
CREATE POLICY portfolio_holdings_delete_own ON portfolio_holdings FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_portfolios up WHERE up.id = portfolio_holdings.portfolio_id AND up.user_id = auth.uid())
);

-- 争议
ALTER TABLE controversies ENABLE ROW LEVEL SECURITY;
ALTER TABLE controversy_sides ENABLE ROW LEVEL SECURITY;
ALTER TABLE controversy_arguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE controversy_stances ENABLE ROW LEVEL SECURITY;

CREATE POLICY controversies_select_all ON controversies FOR SELECT TO authenticated USING (true);
CREATE POLICY controversies_insert_admin ON controversies FOR INSERT TO authenticated WITH CHECK (is_admin_user());
CREATE POLICY controversies_update_admin ON controversies FOR UPDATE TO authenticated USING (is_admin_user());

CREATE POLICY controversy_sides_select_all ON controversy_sides FOR SELECT TO authenticated USING (true);
CREATE POLICY controversy_sides_insert_admin ON controversy_sides FOR INSERT TO authenticated WITH CHECK (is_admin_user());

CREATE POLICY controversy_arguments_select_all ON controversy_arguments FOR SELECT TO authenticated USING (true);
CREATE POLICY controversy_arguments_insert_own ON controversy_arguments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY controversy_stances_select_all ON controversy_stances FOR SELECT TO authenticated USING (true);
CREATE POLICY controversy_stances_insert_own ON controversy_stances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY controversy_stances_update_own ON controversy_stances FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- 阅读历史
ALTER TABLE user_reading_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_reading_history_select_own ON user_reading_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_reading_history_insert_own ON user_reading_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
