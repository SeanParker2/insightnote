// 用户资料类型
export interface Profile {
  id: string;
  email: string;
  subscription_status: 'free' | 'pro';
  subscription_end_date: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

// 文章内容类型
export interface Post {
  id: string;
  slug: string;
  title: string;
  summary_tldr: string;
  content_mdx: string | null;
  is_premium: boolean;
  published_at: string | Date;
  source_institution: string | null;
  source_date: string | Date | null;
  tags: string[];
  created_at: string | Date;
  updated_at: string | Date;
}

// 蝴蝶效应节点类型
export interface ButterflyNode {
  id: string;
  post_id: string;
  label: string;
  type: 'root' | 'event' | 'impact' | 'ticker';
  parent_id: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

// 文章列表项类型 (简化版，用于列表展示)
export interface PostListItem {
  id: string;
  slug: string;
  title: string;
  summary_tldr: string;
  is_premium: boolean;
  published_at: string | Date;
  source_institution: string | null;
  source_date: string | Date | null;
  tags: string[];
}

// 文章详情类型 (包含关联的蝴蝶节点)
export interface PostDetail extends Post {
  butterfly_nodes: ButterflyNode[];
}

export interface SecurePost {
  id: string;
  slug: string;
  title: string;
  summary_tldr: string;
  content_mdx: string;
  is_unlocked: boolean;
  is_premium: boolean;
  published_at: string | Date;
  source_institution: string | null;
  source_date: string | Date | null;
  tags: string[];
  created_at: string | Date;
  updated_at: string | Date;
}

export interface SecurePostDetail extends SecurePost {
  butterfly_nodes: ButterflyNode[];
}

export interface EventRow {
  id: number;
  user_id: string | null;
  event_name: string;
  payload: Record<string, unknown>;
  created_at: string | Date;
}

export interface CustomerFeedback {
  id: number;
  user_id: string | null;
  email: string | null;
  category: 'general' | 'bug' | 'feature' | 'billing';
  message: string;
  rating: number | null;
  page_path: string | null;
  user_agent: string | null;
  created_at: string | Date;
}
