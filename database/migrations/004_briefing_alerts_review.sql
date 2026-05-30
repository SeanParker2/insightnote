-- ============================================================
-- InsightNote 2.0 - 晨报 + 预警 + 复盘系统数据库迁移
-- ============================================================

-- ============================================================
-- 1. 个性化晨报系统
-- ============================================================

CREATE TABLE daily_briefings (
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

CREATE INDEX idx_daily_briefings_user_date ON daily_briefings(user_id, briefing_date DESC);
CREATE INDEX idx_daily_briefings_unread ON daily_briefings(user_id, is_read) WHERE is_read = false;

-- ============================================================
-- 2. 智能预警系统
-- ============================================================

CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'price_change',       -- 价格异动
    'volume_spike',       -- 成交量异常
    'news_impact',        -- 新闻影响
    'butterfly_trigger',  -- 蝴蝶链触发
    'consensus_shift',    -- 机构共识变化
    'bias_warning'        -- 认知偏差预警
  )),
  symbol TEXT,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE alerts (
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

CREATE INDEX idx_alerts_user_unread ON alerts(user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_alerts_user_type ON alerts(user_id, alert_type, created_at DESC);
CREATE INDEX idx_alert_rules_user ON alert_rules(user_id, is_active);

-- ============================================================
-- 3. 周度复盘系统
-- ============================================================

CREATE TABLE weekly_reviews (
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

CREATE INDEX idx_weekly_reviews_user ON weekly_reviews(user_id, week_start DESC);

-- ============================================================
-- 4. 阅读历史增强
-- ============================================================

ALTER TABLE user_reading_history ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';
ALTER TABLE user_reading_history ADD COLUMN IF NOT EXISTS sentiment_at_read TEXT;

-- ============================================================
-- 5. 用户偏好设置
-- ============================================================

CREATE TABLE user_preferences (
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
-- RLS 策略
-- ============================================================

ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_briefings_select_own ON daily_briefings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY daily_briefings_update_own ON daily_briefings FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY alert_rules_select_own ON alert_rules FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY alert_rules_insert_own ON alert_rules FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY alert_rules_update_own ON alert_rules FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY alert_rules_delete_own ON alert_rules FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY alerts_select_own ON alerts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY alerts_update_own ON alerts FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY weekly_reviews_select_own ON weekly_reviews FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY user_preferences_select_own ON user_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_preferences_insert_own ON user_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_preferences_update_own ON user_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid());
