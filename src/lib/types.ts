export interface Post {
  id: string;
  slug: string;
  title: string;
  tldr_content: string;
  full_content: string;
  institutional_source: string;
  report_date: string;
  published_at: string;
  is_premium: boolean;
  tags: string[];
}
