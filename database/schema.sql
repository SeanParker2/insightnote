CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE profiles (
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

CREATE TABLE posts (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE post_contents (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  content_mdx TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE butterfly_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('root', 'event', 'impact', 'ticker')),
  parent_id UUID REFERENCES butterfly_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_feedback (
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

CREATE TABLE daily_briefing_subscribers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  source TEXT,
  referer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE billing_orders (
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

CREATE TABLE trusted_devices (
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

CREATE TABLE mfa_recovery_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published_at ON posts(published_at);
CREATE INDEX idx_posts_is_premium ON posts(is_premium);
CREATE INDEX idx_butterfly_nodes_post_id ON butterfly_nodes(post_id);
CREATE INDEX idx_butterfly_nodes_parent_id ON butterfly_nodes(parent_id);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_event_name ON events(event_name);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_customer_feedback_user_id ON customer_feedback(user_id);
CREATE INDEX idx_customer_feedback_created_at ON customer_feedback(created_at);
CREATE INDEX idx_customer_feedback_category ON customer_feedback(category);
CREATE INDEX idx_daily_briefing_subscribers_created_at ON daily_briefing_subscribers(created_at);
CREATE INDEX idx_billing_orders_user_id ON billing_orders(user_id);
CREATE INDEX idx_billing_orders_created_at ON billing_orders(created_at);
CREATE INDEX idx_billing_orders_status ON billing_orders(status);
CREATE INDEX idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX idx_trusted_devices_last_seen_at ON trusted_devices(last_seen_at);
CREATE INDEX idx_mfa_recovery_codes_user_id ON mfa_recovery_codes(user_id);
CREATE INDEX idx_mfa_recovery_codes_used_at ON mfa_recovery_codes(used_at);

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
  p.tags
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
  p.created_at,
  p.updated_at
FROM posts p
LEFT JOIN post_contents pc ON pc.post_id = p.id;

CREATE OR REPLACE FUNCTION get_post_secure_by_slug(slug_in TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT to_jsonb(row)
      FROM (
        SELECT
          ps.*,
          (
            SELECT COALESCE(jsonb_agg(to_jsonb(bn) ORDER BY bn.created_at), '[]'::jsonb)
            FROM butterfly_nodes bn
            WHERE bn.post_id = ps.id
          ) AS butterfly_nodes
        FROM posts_secure ps
        WHERE ps.slug = slug_in
      ) row
    ),
    NULL
  );
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE butterfly_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefing_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY profiles_insert_own
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY posts_select_all
ON posts
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY posts_admin_insert
ON posts
FOR INSERT
TO authenticated
WITH CHECK (is_admin_user());

CREATE POLICY posts_admin_update
ON posts
FOR UPDATE
TO authenticated
USING (is_admin_user())
WITH CHECK (is_admin_user());

CREATE POLICY posts_admin_delete
ON posts
FOR DELETE
TO authenticated
USING (is_admin_user());

CREATE POLICY post_contents_admin_insert
ON post_contents
FOR INSERT
TO authenticated
WITH CHECK (is_admin_user());

CREATE POLICY post_contents_admin_update
ON post_contents
FOR UPDATE
TO authenticated
USING (is_admin_user())
WITH CHECK (is_admin_user());

CREATE POLICY post_contents_admin_delete
ON post_contents
FOR DELETE
TO authenticated
USING (is_admin_user());

CREATE POLICY post_contents_select_unlocked
ON post_contents
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM posts p
    WHERE p.id = post_contents.post_id
      AND is_content_unlocked(p.is_premium, p.published_at, current_subscription_status())
  )
);

CREATE POLICY butterfly_nodes_select_unlocked
ON butterfly_nodes
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM posts p
    WHERE p.id = butterfly_nodes.post_id
      AND is_content_unlocked(p.is_premium, p.published_at, current_subscription_status())
  )
);

CREATE POLICY butterfly_nodes_admin_insert
ON butterfly_nodes
FOR INSERT
TO authenticated
WITH CHECK (is_admin_user());

CREATE POLICY butterfly_nodes_admin_update
ON butterfly_nodes
FOR UPDATE
TO authenticated
USING (is_admin_user())
WITH CHECK (is_admin_user());

CREATE POLICY butterfly_nodes_admin_delete
ON butterfly_nodes
FOR DELETE
TO authenticated
USING (is_admin_user());

CREATE POLICY events_insert
ON events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL) OR
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY events_select_own
ON events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY customer_feedback_insert
ON customer_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL) OR
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY customer_feedback_select_own
ON customer_feedback
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY billing_orders_select_own
ON billing_orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY billing_orders_insert_own
ON billing_orders
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY billing_orders_update_own
ON billing_orders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY trusted_devices_select_own
ON trusted_devices
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY trusted_devices_insert_own
ON trusted_devices
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY trusted_devices_update_own
ON trusted_devices
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY trusted_devices_delete_own
ON trusted_devices
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY mfa_recovery_codes_select_own
ON mfa_recovery_codes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY mfa_recovery_codes_insert_own
ON mfa_recovery_codes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY mfa_recovery_codes_update_own
ON mfa_recovery_codes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY daily_briefing_subscribers_insert
ON daily_briefing_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL) OR
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);
