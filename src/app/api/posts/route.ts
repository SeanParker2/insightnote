import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { heroArticle, latestFeed } from '@/lib/mock/feed.mock';
import type { PostListItem } from '@/types';

function getMockPosts(): PostListItem[] {
  const mockHero: PostListItem = {
    id: heroArticle.id,
    slug: 'mock-hero',
    title: heroArticle.title,
    summary_tldr: heroArticle.summary,
    is_premium: false,
    published_at: new Date().toISOString(),
    source_institution: heroArticle.author || '高盛',
    source_date: new Date().toISOString(),
    tags: ['宏观', '公用事业'],
    sentiment: 'bullish',
    related_tickers: ['NVDA', 'XLU'],
    difficulty: 'medium',
  };

  const mockFeed: PostListItem[] = latestFeed.map((item) => ({
    id: item.id,
    slug: `mock-${item.id}`,
    title: item.title,
    summary_tldr: item.summary,
    is_premium: item.isPro || false,
    published_at: new Date().toISOString(),
    source_institution: '摩根士丹利',
    source_date: new Date().toISOString(),
    tags: [item.category || '通用'],
    sentiment: 'neutral',
    related_tickers: [],
    difficulty: 'medium',
  }));
  return [mockHero, ...mockFeed];
}

function parseLimit(value: string | null) {
  if (!value) return 20;
  const n = Number(value);
  if (!Number.isFinite(n)) return 20;
  return Math.max(1, Math.min(50, Math.trunc(n)));
}

function toPlainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/[>#*_~=-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarizeContent(markdown: unknown) {
  if (typeof markdown !== 'string' || !markdown.trim()) return '';
  const text = toPlainText(markdown);
  if (!text) return '';
  return text.length > 180 ? `${text.slice(0, 180).trim()}…` : text;
}

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((tag): tag is string => typeof tag === 'string');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));

  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, slug, title, summary_tldr, is_premium, published_at, source_institution, source_date, tags, sentiment, related_tickers, difficulty')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    const isMissingSummary =
      error.code === '42703' || (typeof error.message === 'string' && error.message.includes('summary_tldr'));

    if (!isMissingSummary) {
      console.error('API Error, using mock data:', error);
      return NextResponse.json({ ok: true, data: getMockPosts() });
    }

    const fallback = await supabase
      .from('posts')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (fallback.error) {
      const fallbackNoOrder = await supabase.from('posts').select('*').limit(limit);
      if (fallbackNoOrder.error) {
        console.error('API Fallback Error, using mock data:', fallbackNoOrder.error);
        return NextResponse.json({ ok: true, data: getMockPosts() });
      }

      const items: PostListItem[] = (fallbackNoOrder.data ?? []).map((row: any) => ({
        id: String(row.id),
        slug: String(row.slug),
        title: String(row.title),
        summary_tldr: pickFirstString(
          row.summary_tldr,
          row.summary,
          row.tldr,
          row.abstract,
          row.description,
          row.excerpt,
          summarizeContent(
            pickFirstString(row.content_mdx, row.content, row.content_markdown, row.content_md, row.body),
          ),
        ),
        is_premium: Boolean(row.is_premium ?? row.premium ?? row.is_paid),
        published_at: row.published_at ?? row.created_at ?? new Date().toISOString(),
        source_institution: row.source_institution ?? row.institution ?? null,
        source_date: row.source_date ?? null,
        tags: normalizeTags(row.tags ?? row.topics ?? row.labels),
        sentiment: row.sentiment ?? null,
        related_tickers: normalizeTags(row.related_tickers),
        difficulty: row.difficulty ?? null,
      }));

      return NextResponse.json({ ok: true, data: items, updated_at: new Date().toISOString() });
    }

    const items: PostListItem[] = (fallback.data ?? []).map((row: any) => ({
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      summary_tldr: pickFirstString(
        row.summary_tldr,
        row.summary,
        row.tldr,
        row.abstract,
        row.description,
        row.excerpt,
        summarizeContent(pickFirstString(row.content_mdx, row.content, row.content_markdown, row.content_md, row.body)),
      ),
      is_premium: Boolean(row.is_premium ?? row.premium ?? row.is_paid),
      published_at: row.published_at ?? row.created_at ?? new Date().toISOString(),
      source_institution: row.source_institution ?? null,
      source_date: row.source_date ?? null,
      tags: normalizeTags(row.tags ?? row.topics ?? row.labels),
      sentiment: row.sentiment ?? null,
      related_tickers: normalizeTags(row.related_tickers),
      difficulty: row.difficulty ?? null,
    }));

    return NextResponse.json({ ok: true, data: items, updated_at: new Date().toISOString() });
  }

  const items: PostListItem[] = (posts ?? []).map((row: any) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary_tldr: typeof row.summary_tldr === 'string' ? row.summary_tldr : '',
    is_premium: Boolean(row.is_premium),
    published_at: row.published_at,
    source_institution: row.source_institution ?? null,
    source_date: row.source_date ?? null,
    tags: normalizeTags(row.tags),
    sentiment: row.sentiment ?? null,
    related_tickers: normalizeTags(row.related_tickers),
    difficulty: row.difficulty ?? null,
  }));

  return NextResponse.json({ ok: true, data: items, updated_at: new Date().toISOString() });
}
