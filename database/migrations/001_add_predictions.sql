-- 1. 新增预测表：用于记录文章中的核心判断
CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) NOT NULL,
  symbol text NOT NULL,                -- 标的代码，如 'AAPL', 'BTC-USD'
  direction text CHECK (direction IN ('bullish', 'bearish', 'neutral')), -- 方向
  start_price numeric,                 -- 推荐时的价格
  target_price numeric,                -- 目标价格
  timeframe_days int,                  -- 预测周期（天）
  status text DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'expired')), -- 当前状态
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 在 posts 表中增加胜率字段（为了前端查询性能，做反范式化处理）
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS success_rate numeric DEFAULT null; -- 该作者或该文章历史预测的胜率

-- 3. 为 predictions 表添加索引
CREATE INDEX IF NOT EXISTS idx_predictions_post_id ON public.predictions(post_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON public.predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_symbol ON public.predictions(symbol);

-- 4. 添加 RLS 策略 (Row Level Security)
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- 允许所有用户读取预测数据
CREATE POLICY predictions_select_all
ON public.predictions
FOR SELECT
TO anon, authenticated
USING (true);

-- 仅允许管理员修改预测数据
CREATE POLICY predictions_admin_all
ON public.predictions
FOR ALL
TO authenticated
USING (is_admin_user())
WITH CHECK (is_admin_user());
