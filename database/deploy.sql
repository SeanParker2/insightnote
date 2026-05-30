-- ============================================================
-- InsightNote 完整数据库部署脚本
-- 使用方法：在 Supabase Dashboard > SQL Editor 中执行此文件
-- 执行顺序：此文件包含所有表、视图、函数、索引、RLS 策略
-- 注意：使用 IF NOT EXISTS 确保可重复执行
-- ============================================================

-- ============================================================
-- 第一部分：基础表（来自 schema.sql）
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  security_question TEXT,
  security_answer_phc TEXT,
  nickname TEXT,
  avatar_path TEXT,
  language TEXT,
  timezone TEXT,
  email_subscribed BOOLEAN NOT NULL DEFAULT true,
  email_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (email_frequency IN ('daily', 'weekly', 'monthly')),
  subscription_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (subscription_interval IN ('monthly', 'quarterly', 'yearly')),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  subscription_status VARCHAR(10) NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro')),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  summary_tldr TEXT NOT NULL,
  content_mdx TEXT NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  source_institution VARCHAR(100),
  source_date DATE,
  tags VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR(100)[],
  sentiment TEXT CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  related_tickers TEXT[] DEFAULT ARRAY[]::TEXT[],
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_contents (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  content_mdx TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS butterfly_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('root', 'event', 'impact', 'ticker')),
  parent_id UUID REFERENCES butterfly_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255),
  category TEXT NOT NULL CHECK (category IN ('general', 'bug', 'feature', 'billing')),
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  page_path TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_briefing_subscribers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  source TEXT,
  referer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'pro',
  interval TEXT NOT NULL CHECK (interval IN ('monthly', 'quarterly', 'yearly')),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'cny',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS trusted_devices (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  label TEXT,
  user_agent TEXT,
  last_ip TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- 第二部分：市场数据表
-- ============================================================

CREATE TABLE IF NOT EXISTS market_prices (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC,
  change_percent NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 第三部分：预测与投票表（迁移 001 + 002）
-- ============================================================

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('bullish', 'bearish', 'neutral')),
  start_price NUMERIC,
  target_price NUMERIC,
  timeframe_days INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'expired')),
  reasoning TEXT,
  graph_node_id UUID,
  confidence INTEGER CHECK (confidence >= 1 AND confidence <= 10),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  direction TEXT CHECK (direction IN ('up', 'down')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ============================================================
-- 第四部分：2.0 新功能表（迁移 003）
-- ============================================================

-- 蝴蝶效应图谱 2.0 增强
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS probability NUMERIC CHECK (probability >= 0 AND probability <= 1);
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS impact_direction TEXT CHECK (impact_direction IN ('bullish', 'bearish', 'neutral'));
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS time_delay_hours INTEGER DEFAULT 0;
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS evidence_text TEXT;
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS position_x REAL;
ALTER TABLE butterfly_nodes ADD COLUMN IF NOT EXISTS position_y REAL;

-- 预测表增强
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS reasoning TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS graph_node_id UUID;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS confidence INTEGER CHECK (confidence >= 1 AND confidence <= 10);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS resolution_reason TEXT;

-- posts 表增强
ALTER TABLE posts ADD COLUMN IF NOT EXISTS success_rate NUMERIC DEFAULT NULL;

-- 用户自建图谱
CREATE TABLE IF NOT EXISTS user_graphs (
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

CREATE TABLE IF NOT EXISTS user_graph_nodes (
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

CREATE TABLE IF NOT EXISTS user_graph_votes (
  id BIGSERIAL PRIMARY KEY,
  graph_id UUID NOT NULL REFERENCES user_graphs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (graph_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_graph_comments (
  id BIGSERIAL PRIMARY KEY,
  graph_id UUID NOT NULL REFERENCES user_graphs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id BIGINT REFERENCES user_graph_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 预测支持
CREATE TABLE IF NOT EXISTS prediction_endorsements (
  id BIGSERIAL PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (prediction_id, user_id)
);

-- 决策日志
CREATE TABLE IF NOT EXISTS decision_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell', 'hold', 'reduce', 'add')),
  price NUMERIC,
  quantity NUMERIC,
  reasoning TEXT NOT NULL,
  graph_node_id UUID,
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

-- 持仓管理
CREATE TABLE IF NOT EXISTS user_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '默认组合',
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_holdings (
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

-- 争议地图
CREATE TABLE IF NOT EXISTS controversies (
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

CREATE TABLE IF NOT EXISTS controversy_sides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controversy_id UUID NOT NULL REFERENCES controversies(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('for', 'against')),
  title TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS controversy_arguments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  side_id UUID NOT NULL REFERENCES controversy_sides(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  evidence_url TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS controversy_stances (
  id BIGSERIAL PRIMARY KEY,
  controversy_id UUID NOT NULL REFERENCES controversies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('for', 'against', 'undecided')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (controversy_id, user_id)
);

-- 阅读历史
CREATE TABLE IF NOT EXISTS user_reading_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  read_duration_seconds INTEGER,
  read_percentage NUMERIC CHECK (read_percentage >= 0 AND read_percentage <= 100),
  source TEXT DEFAULT 'web',
  sentiment_at_read TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id, created_at)
);

-- ============================================================
-- 第五部分：晨报 + 预警 + 复盘表（迁移 004）
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  headline TEXT NOT NULL,
  portfolio_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  watchlist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  bias_warning TEXT,
  ai_analysis TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, briefing_date)
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('price_change', 'volume_spike', 'news_impact', 'butterfly_trigger', 'consensus_shift', 'bias_warning')),
  symbol TEXT,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  symbol TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  portfolio_return_pct NUMERIC,
  benchmark_return_pct NUMERIC,
  alpha NUMERIC,
  top_contributors JSONB NOT NULL DEFAULT '[]'::jsonb,
  reading_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  bias_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  prediction_accuracy JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_enabled BOOLEAN NOT NULL DEFAULT true,
  briefing_time TIME NOT NULL DEFAULT '06:00:00',
  alert_email_enabled BOOLEAN NOT NULL DEFAULT true,
  alert_push_enabled BOOLEAN NOT NULL DEFAULT true,
  weekly_review_enabled BOOLEAN NOT NULL DEFAULT true,
  watchlist TEXT[] DEFAULT '{}',
  risk_tolerance TEXT NOT NULL DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 第六部分：索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_is_premium ON posts(is_premium);
CREATE INDEX IF NOT EXISTS idx_butterfly_nodes_post_id ON butterfly_nodes(post_id);
CREATE INDEX IF NOT EXISTS idx_butterfly_nodes_parent_id ON butterfly_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_user_id ON customer_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON customer_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_category ON customer_feedback(category);
CREATE INDEX IF NOT EXISTS idx_daily_briefing_subscribers_created_at ON daily_briefing_subscribers(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_orders_user_id ON billing_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_created_at ON billing_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_orders_status ON billing_orders(status);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_last_seen_at ON trusted_devices(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user_id ON mfa_recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_used_at ON mfa_recovery_codes(used_at);
CREATE INDEX IF NOT EXISTS idx_predictions_post_id ON predictions(post_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_symbol ON predictions(symbol);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON post_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_graphs_user_id ON user_graphs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_graphs_post_id ON user_graphs(post_id);
CREATE INDEX IF NOT EXISTS idx_user_graphs_is_public ON user_graphs(is_public);
CREATE INDEX IF NOT EXISTS idx_user_graph_nodes_graph_id ON user_graph_nodes(graph_id);
CREATE INDEX IF NOT EXISTS idx_user_graph_votes_graph_id ON user_graph_votes(graph_id);
CREATE INDEX IF NOT EXISTS idx_user_graph_comments_graph_id ON user_graph_comments(graph_id);
CREATE INDEX IF NOT EXISTS idx_prediction_endorsements_prediction_id ON prediction_endorsements(prediction_id);
CREATE INDEX IF NOT EXISTS idx_decision_journals_user_id ON decision_journals(user_id);
CREATE INDEX IF NOT EXISTS idx_decision_journals_symbol ON decision_journals(symbol);
CREATE INDEX IF NOT EXISTS idx_decision_journals_created_at ON decision_journals(created_at);
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON user_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol ON portfolio_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_controversies_status ON controversies(status);
CREATE INDEX IF NOT EXISTS idx_controversies_symbol ON controversies(symbol);
CREATE INDEX IF NOT EXISTS idx_controversy_sides_controversy_id ON controversy_sides(controversy_id);
CREATE INDEX IF NOT EXISTS idx_controversy_arguments_side_id ON controversy_arguments(side_id);
CREATE INDEX IF NOT EXISTS idx_controversy_stances_controversy_id ON controversy_stances(controversy_id);
CREATE INDEX IF NOT EXISTS idx_user_reading_history_user_id ON user_reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reading_history_post_id ON user_reading_history(post_id);
CREATE INDEX IF NOT EXISTS idx_daily_briefings_user_date ON daily_briefings(user_id, briefing_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_briefings_unread ON daily_briefings(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON alerts(user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_alerts_user_type ON alerts(user_id, alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_rules_user ON alert_rules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user ON weekly_reviews(user_id, week_start DESC);

-- ============================================================
-- 第七部分：数据库函数
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT is_admin
      FROM profiles
      WHERE id = auth.uid()
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION is_content_unlocked(post_is_premium BOOLEAN, post_published_at TIMESTAMPTZ, user_status VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin_user() OR
         NOT post_is_premium OR
         user_status = 'pro' OR
         (post_published_at < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION current_subscription_status()
RETURNS VARCHAR
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT
        CASE
          WHEN subscription_status = 'pro'
               AND (subscription_end_date IS NULL OR subscription_end_date > NOW())
            THEN 'pro'
          ELSE 'free'
        END
      FROM profiles
      WHERE id = auth.uid()
    ),
    'free'
  );
$$;

CREATE OR REPLACE FUNCTION set_admin_by_email(target_email TEXT, make_admin BOOLEAN DEFAULT true)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
  updated_count INTEGER;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  normalized := lower(trim(target_email));
  IF normalized = '' THEN
    RAISE EXCEPTION 'email_required';
  END IF;

  UPDATE profiles
  SET is_admin = make_admin,
      updated_at = NOW()
  WHERE lower(email) = normalized;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION set_admin_by_email(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_admin_by_email(TEXT, BOOLEAN) TO service_role;

-- ============================================================
-- 第八部分：视图
-- ============================================================

CREATE OR REPLACE VIEW posts_list_secure AS
SELECT
  p.id,
  p.slug,
  p.title,
  p.summary_tldr,
  p.is_premium,
  p.published_at,
  p.source_institution,
  p.source_date,
  p.tags,
  p.sentiment,
  p.related_tickers,
  p.difficulty
FROM posts p;

CREATE OR REPLACE VIEW posts_secure AS
SELECT
  p.id,
  p.slug,
  p.title,
  p.summary_tldr,
  CASE
    WHEN is_content_unlocked(p.is_premium, p.published_at, current_subscription_status()) THEN pc.content_mdx
    ELSE p.content_mdx
  END AS content_mdx,
  is_content_unlocked(p.is_premium, p.published_at, current_subscription_status()) AS is_unlocked,
  p.is_premium,
  p.published_at,
  p.source_institution,
  p.source_date,
  p.tags,
  p.sentiment,
  p.related_tickers,
  p.difficulty,
  p.created_at,
  p.updated_at
FROM posts p
LEFT JOIN post_contents pc ON pc.post_id = p.id;

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

CREATE OR REPLACE VIEW user_cognitive_patterns AS
SELECT
  dj.user_id,
  COUNT(*) AS total_decisions,
  COUNT(*) FILTER (WHERE dj.emotion_label = 'confident') AS confident_count,
  COUNT(*) FILTER (WHERE dj.emotion_label = 'fearful') AS fearful_count,
  COUNT(*) FILTER (WHERE dj.emotion_label = 'greedy') AS greedy_count,
  AVG(dj.actual_return_pct) FILTER (WHERE dj.emotion_label = 'confident') AS avg_return_when_confident,
  AVG(dj.actual_return_pct) FILTER (WHERE dj.emotion_label = 'fearful') AS avg_return_when_fearful,
  AVG(dj.actual_return_pct) FILTER (WHERE dj.emotion_label = 'greedy') AS avg_return_when_greedy,
  COUNT(*) FILTER (WHERE dj.expected_direction = 'bullish') AS bullish_count,
  COUNT(*) FILTER (WHERE dj.expected_direction = 'bearish') AS bearish_count,
  AVG(
    CASE WHEN dj.reviewed_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (dj.reviewed_at - dj.created_at)) / 86400
    ELSE NULL END
  ) AS avg_holding_days,
  MAX(dj.created_at) AS last_decision_at
FROM decision_journals dj
GROUP BY dj.user_id;

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
-- 第九部分：RLS 策略
-- ============================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_insert_own ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_select_all ON posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY posts_admin_insert ON posts FOR INSERT TO authenticated WITH CHECK (is_admin_user());
CREATE POLICY posts_admin_update ON posts FOR UPDATE TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY posts_admin_delete ON posts FOR DELETE TO authenticated USING (is_admin_user());

-- post_contents
ALTER TABLE post_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_contents_admin_insert ON post_contents FOR INSERT TO authenticated WITH CHECK (is_admin_user());
CREATE POLICY post_contents_admin_update ON post_contents FOR UPDATE TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY post_contents_admin_delete ON post_contents FOR DELETE TO authenticated USING (is_admin_user());
CREATE POLICY post_contents_select_unlocked ON post_contents FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM posts p WHERE p.id = post_contents.post_id AND is_content_unlocked(p.is_premium, p.published_at, current_subscription_status()))
);

-- butterfly_nodes
ALTER TABLE butterfly_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY butterfly_nodes_select_unlocked ON butterfly_nodes FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM posts p WHERE p.id = butterfly_nodes.post_id AND is_content_unlocked(p.is_premium, p.published_at, current_subscription_status()))
);
CREATE POLICY butterfly_nodes_admin_insert ON butterfly_nodes FOR INSERT TO authenticated WITH CHECK (is_admin_user());
CREATE POLICY butterfly_nodes_admin_update ON butterfly_nodes FOR UPDATE TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY butterfly_nodes_admin_delete ON butterfly_nodes FOR DELETE TO authenticated USING (is_admin_user());

-- events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_insert ON events FOR INSERT TO anon, authenticated WITH CHECK ((auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));
CREATE POLICY events_select_own ON events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- customer_feedback
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_feedback_insert ON customer_feedback FOR INSERT TO anon, authenticated WITH CHECK ((auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));
CREATE POLICY customer_feedback_select_own ON customer_feedback FOR SELECT TO authenticated USING (user_id = auth.uid());

-- billing_orders
ALTER TABLE billing_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_orders_select_own ON billing_orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY billing_orders_insert_own ON billing_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY billing_orders_update_own ON billing_orders FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- trusted_devices
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_devices_select_own ON trusted_devices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY trusted_devices_insert_own ON trusted_devices FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY trusted_devices_update_own ON trusted_devices FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY trusted_devices_delete_own ON trusted_devices FOR DELETE TO authenticated USING (user_id = auth.uid());

-- mfa_recovery_codes
ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY mfa_recovery_codes_select_own ON mfa_recovery_codes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY mfa_recovery_codes_insert_own ON mfa_recovery_codes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY mfa_recovery_codes_update_own ON mfa_recovery_codes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- daily_briefing_subscribers
ALTER TABLE daily_briefing_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_briefing_subscribers_insert ON daily_briefing_subscribers FOR INSERT TO anon, authenticated WITH CHECK ((auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));

-- market_prices
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY market_prices_select_all ON market_prices FOR SELECT USING (true);
CREATE POLICY market_prices_service_all ON market_prices FOR ALL USING (auth.role() = 'service_role');

-- predictions
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY predictions_select_all ON predictions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY predictions_insert_own ON predictions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin_user());
CREATE POLICY predictions_update_own ON predictions FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin_user());

-- post_votes
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_votes_select_all ON post_votes FOR SELECT USING (true);
CREATE POLICY post_votes_insert_own ON post_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY post_votes_update_own ON post_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY post_votes_delete_own ON post_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_graphs
ALTER TABLE user_graphs ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_graphs_select_public ON user_graphs FOR SELECT TO authenticated USING (is_public OR user_id = auth.uid());
CREATE POLICY user_graphs_insert_own ON user_graphs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_graphs_update_own ON user_graphs FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_graphs_delete_own ON user_graphs FOR DELETE TO authenticated USING (user_id = auth.uid());

-- user_graph_nodes
ALTER TABLE user_graph_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_graph_nodes_select_public ON user_graph_nodes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_graphs ug WHERE ug.id = user_graph_nodes.graph_id AND (ug.is_public OR ug.user_id = auth.uid())));
CREATE POLICY user_graph_nodes_insert_own ON user_graph_nodes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_graphs ug WHERE ug.id = user_graph_nodes.graph_id AND ug.user_id = auth.uid()));
CREATE POLICY user_graph_nodes_update_own ON user_graph_nodes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_graphs ug WHERE ug.id = user_graph_nodes.graph_id AND ug.user_id = auth.uid()));
CREATE POLICY user_graph_nodes_delete_own ON user_graph_nodes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_graphs ug WHERE ug.id = user_graph_nodes.graph_id AND ug.user_id = auth.uid()));

-- user_graph_votes
ALTER TABLE user_graph_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_graph_votes_select_all ON user_graph_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY user_graph_votes_insert_own ON user_graph_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_graph_votes_update_own ON user_graph_votes FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- user_graph_comments
ALTER TABLE user_graph_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_graph_comments_select_public ON user_graph_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_graphs ug WHERE ug.id = user_graph_comments.graph_id AND (ug.is_public OR ug.user_id = auth.uid())));
CREATE POLICY user_graph_comments_insert_own ON user_graph_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- prediction_endorsements
ALTER TABLE prediction_endorsements ENABLE ROW LEVEL SECURITY;
CREATE POLICY prediction_endorsements_select_all ON prediction_endorsements FOR SELECT TO authenticated USING (true);
CREATE POLICY prediction_endorsements_insert_own ON prediction_endorsements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY prediction_endorsements_delete_own ON prediction_endorsements FOR DELETE TO authenticated USING (user_id = auth.uid());

-- decision_journals
ALTER TABLE decision_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_journals_select_own ON decision_journals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY decision_journals_insert_own ON decision_journals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY decision_journals_update_own ON decision_journals FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY decision_journals_delete_own ON decision_journals FOR DELETE TO authenticated USING (user_id = auth.uid());

-- user_portfolios
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_portfolios_select_own ON user_portfolios FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_portfolios_insert_own ON user_portfolios FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_portfolios_update_own ON user_portfolios FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_portfolios_delete_own ON user_portfolios FOR DELETE TO authenticated USING (user_id = auth.uid());

-- portfolio_holdings
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY portfolio_holdings_select_own ON portfolio_holdings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_portfolios up WHERE up.id = portfolio_holdings.portfolio_id AND up.user_id = auth.uid()));
CREATE POLICY portfolio_holdings_insert_own ON portfolio_holdings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_portfolios up WHERE up.id = portfolio_holdings.portfolio_id AND up.user_id = auth.uid()));
CREATE POLICY portfolio_holdings_update_own ON portfolio_holdings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_portfolios up WHERE up.id = portfolio_holdings.portfolio_id AND up.user_id = auth.uid()));
CREATE POLICY portfolio_holdings_delete_own ON portfolio_holdings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_portfolios up WHERE up.id = portfolio_holdings.portfolio_id AND up.user_id = auth.uid()));

-- controversies
ALTER TABLE controversies ENABLE ROW LEVEL SECURITY;
CREATE POLICY controversies_select_all ON controversies FOR SELECT TO authenticated USING (true);
CREATE POLICY controversies_insert_admin ON controversies FOR INSERT TO authenticated WITH CHECK (is_admin_user());
CREATE POLICY controversies_update_admin ON controversies FOR UPDATE TO authenticated USING (is_admin_user());

-- controversy_sides
ALTER TABLE controversy_sides ENABLE ROW LEVEL SECURITY;
CREATE POLICY controversy_sides_select_all ON controversy_sides FOR SELECT TO authenticated USING (true);
CREATE POLICY controversy_sides_insert_admin ON controversy_sides FOR INSERT TO authenticated WITH CHECK (is_admin_user());

-- controversy_arguments
ALTER TABLE controversy_arguments ENABLE ROW LEVEL SECURITY;
CREATE POLICY controversy_arguments_select_all ON controversy_arguments FOR SELECT TO authenticated USING (true);
CREATE POLICY controversy_arguments_insert_own ON controversy_arguments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- controversy_stances
ALTER TABLE controversy_stances ENABLE ROW LEVEL SECURITY;
CREATE POLICY controversy_stances_select_all ON controversy_stances FOR SELECT TO authenticated USING (true);
CREATE POLICY controversy_stances_insert_own ON controversy_stances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY controversy_stances_update_own ON controversy_stances FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- user_reading_history
ALTER TABLE user_reading_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_reading_history_select_own ON user_reading_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_reading_history_insert_own ON user_reading_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- daily_briefings
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_briefings_select_own ON daily_briefings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY daily_briefings_update_own ON daily_briefings FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- alert_rules
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY alert_rules_select_own ON alert_rules FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY alert_rules_insert_own ON alert_rules FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY alert_rules_update_own ON alert_rules FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY alert_rules_delete_own ON alert_rules FOR DELETE TO authenticated USING (user_id = auth.uid());

-- alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY alerts_select_own ON alerts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY alerts_update_own ON alerts FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- weekly_reviews
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY weekly_reviews_select_own ON weekly_reviews FOR SELECT TO authenticated USING (user_id = auth.uid());

-- user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_preferences_select_own ON user_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_preferences_insert_own ON user_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_preferences_update_own ON user_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- 完成！所有表、视图、函数、索引、RLS 策略已创建
-- ============================================================
