import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

const SITE_URL = process.env.SITE_URL?.trim() || 'https://insightnote.ai';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select('slug, published_at, updated_at')
    .order('published_at', { ascending: false })
    .limit(500);

  const postEntries: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${SITE_URL}/posts/${post.slug}`,
    lastModified: new Date(post.updated_at ?? post.published_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/posts`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/tools/butterfly`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    ...postEntries,
  ];
}
