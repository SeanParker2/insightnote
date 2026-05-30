import type { PostListItem } from '@/types';
import { pickFirstString, summarizeContent, normalizeTags } from './markdown';

export function mapRowToPostListItem(row: Record<string, unknown>): PostListItem {
  return {
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
    published_at: (row.published_at as string) ?? (row.created_at as string) ?? new Date().toISOString(),
    source_institution: (row.source_institution as string) ?? (row.institution as string) ?? null,
    source_date: (row.source_date as string) ?? null,
    tags: normalizeTags(row.tags ?? row.topics ?? row.labels),
    sentiment: (row.sentiment as PostListItem['sentiment']) ?? null,
    related_tickers: normalizeTags(row.related_tickers),
    difficulty: (row.difficulty as PostListItem['difficulty']) ?? null,
    success_rate: (row.success_rate as number) ?? null,
  };
}
