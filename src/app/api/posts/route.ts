import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapRowToPostListItem } from '@/lib/post-mapper';
import type { PostListItem } from '@/types';

const POST_LIST_FIELDS =
  'id, slug, title, summary_tldr, is_premium, published_at, source_institution, source_date, tags, sentiment, related_tickers, difficulty, success_rate';

function parseLimit(value: string | null): number {
  if (!value) return 20;
  const n = Number(value);
  if (!Number.isFinite(n)) return 20;
  return Math.max(1, Math.min(50, Math.trunc(n)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));

  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from('posts')
    .select(POST_LIST_FIELDS)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    const isMissingColumn =
      error.code === '42703' || (typeof error.message === 'string' && error.message.includes('summary_tldr'));

    if (!isMissingColumn) {
      return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
    }

    const fallback = await supabase
      .from('posts')
      .select('id, slug, title, summary_tldr, is_premium, published_at, source_institution, source_date, tags, sentiment, related_tickers, difficulty, success_rate, summary, tldr, abstract, description, excerpt, content_mdx, content, content_markdown, content_md, body, premium, is_paid, institution, topics, labels, created_at')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (fallback.error) {
      return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
    }

    const items: PostListItem[] = (fallback.data ?? []).map(mapRowToPostListItem);
    return NextResponse.json({ ok: true, data: items, updated_at: new Date().toISOString() });
  }

  const items: PostListItem[] = (posts ?? []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary_tldr: typeof row.summary_tldr === 'string' ? row.summary_tldr : '',
    is_premium: Boolean(row.is_premium),
    published_at: row.published_at,
    source_institution: row.source_institution ?? null,
    source_date: row.source_date ?? null,
    tags: Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === 'string') : [],
    sentiment: row.sentiment ?? null,
    related_tickers: Array.isArray(row.related_tickers) ? row.related_tickers.filter((t): t is string => typeof t === 'string') : [],
    difficulty: row.difficulty ?? null,
    success_rate: row.success_rate ?? null,
  }));

  return NextResponse.json({ ok: true, data: items, updated_at: new Date().toISOString() });
}
