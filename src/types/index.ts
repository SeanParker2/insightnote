// 用户资料类型
export interface Profile {
  id: string;
  email: string;
  subscription_status: 'free' | 'pro';
  subscription_end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

// 文章内容类型
export interface Post {
  id: string;
  slug: string;
  title: string;
  summary_tldr: string;
  content_mdx: string | null;
  is_premium: boolean;
  published_at: Date;
  source_institution: string | null;
  source_date: Date | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

// 蝴蝶效应节点类型
export interface ButterflyNode {
  id: string;
  post_id: string;
  label: string;
  type: 'root' | 'event' | 'impact' | 'ticker';
  parent_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// 文章列表项类型 (简化版，用于列表展示)
export interface PostListItem {
  id: string;
  slug: string;
  title: string;
  summary_tldr: string;
  is_premium: boolean;
  published_at: Date;
  source_institution: string | null;
  source_date: Date | null;
  tags: string[];
}

// 文章详情类型 (包含关联的蝴蝶节点)
export interface PostDetail extends Post {
  butterfly_nodes: ButterflyNode[];
}
