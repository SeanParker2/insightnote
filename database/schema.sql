-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户资料表 (扩展 Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  subscription_status VARCHAR(10) NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro')),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 文章内容表
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  summary_tldr TEXT NOT NULL,
  content_mdx TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  source_institution VARCHAR(100),
  source_date DATE,
  tags VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR(100)[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 蝴蝶效应图谱节点表
CREATE TABLE butterfly_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('root', 'event', 'impact', 'ticker')),
  parent_id UUID REFERENCES butterfly_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引优化查询性能
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published_at ON posts(published_at);
CREATE INDEX idx_posts_is_premium ON posts(is_premium);
CREATE INDEX idx_butterfly_nodes_post_id ON butterfly_nodes(post_id);
CREATE INDEX idx_butterfly_nodes_parent_id ON butterfly_nodes(parent_id);

-- 业务逻辑函数：判断内容是否解锁
CREATE OR REPLACE FUNCTION is_content_unlocked(post_is_premium BOOLEAN, post_published_at TIMESTAMPTZ, user_status VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT post_is_premium OR
         user_status = 'pro' OR
         (post_published_at < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;
