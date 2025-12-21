'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { trackEvent } from '@/lib/analytics';

type PostRow = {
  id: string;
  slug: string;
  title: string;
  is_premium: boolean;
  published_at: string;
  updated_at: string;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toLocalDatetimeInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDatetimeInputValue(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function splitTags(value: string) {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function AdminDashboardClient() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [summaryTldr, setSummaryTldr] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [publishedAt, setPublishedAt] = useState('');
  const [sourceInstitution, setSourceInstitution] = useState('');
  const [sourceDate, setSourceDate] = useState('');
  const [tags, setTags] = useState('');
  const [teaserMdx, setTeaserMdx] = useState('');
  const [fullMdx, setFullMdx] = useState('');

  const selectedRow = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, slug, title, is_premium, published_at, updated_at')
        .order('published_at', { ascending: false })
        .limit(80);
      if (error) throw error;
      setRows(
        (Array.isArray(data) ? data : []).map((r: any) => ({
          id: String(r.id),
          slug: String(r.slug ?? ''),
          title: String(r.title ?? ''),
          is_premium: Boolean(r.is_premium),
          published_at: String(r.published_at ?? ''),
          updated_at: String(r.updated_at ?? ''),
        })),
      );
    } catch (err: any) {
      setLoadError(typeof err?.message === 'string' ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const loadPostDetail = useCallback(
    async (postId: string) => {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);
      try {
        const { data: p, error: pError } = await supabase.from('posts').select('*').eq('id', postId).maybeSingle();
        if (pError) throw pError;
        if (!p) throw new Error('post_not_found');

        const { data: c, error: cError } = await supabase.from('post_contents').select('content_mdx').eq('post_id', postId).maybeSingle();
        if (cError && (cError as any)?.code !== 'PGRST116') throw cError;

        const slugValue = typeof (p as any).slug === 'string' ? (p as any).slug : '';
        const titleValue = typeof (p as any).title === 'string' ? (p as any).title : '';
        const summaryValue = typeof (p as any).summary_tldr === 'string' ? (p as any).summary_tldr : '';
        const teaserValue = typeof (p as any).content_mdx === 'string' ? (p as any).content_mdx : '';
        const fullValue = typeof (c as any)?.content_mdx === 'string' ? (c as any).content_mdx : teaserValue;
        const published = typeof (p as any).published_at === 'string' ? (p as any).published_at : '';
        const inst = typeof (p as any).source_institution === 'string' ? (p as any).source_institution : '';
        const sourceDateValue = typeof (p as any).source_date === 'string' ? (p as any).source_date : '';
        const tagArray = Array.isArray((p as any).tags) ? ((p as any).tags as unknown[]) : [];
        const tagText = tagArray.filter((t): t is string => typeof t === 'string').join(', ');

        setSlug(slugValue);
        setTitle(titleValue);
        setSummaryTldr(summaryValue);
        setIsPremium(Boolean((p as any).is_premium));
        setPublishedAt(published ? toLocalDatetimeInputValue(published) : '');
        setSourceInstitution(inst);
        setSourceDate(sourceDateValue);
        setTags(tagText);
        setTeaserMdx(teaserValue);
        setFullMdx(fullValue);

        trackEvent('admin_post_open', { has_post: true });
      } catch (err: any) {
        setSaveError(typeof err?.message === 'string' ? err.message : '加载详情失败');
        trackEvent('admin_post_open_error', { message: typeof err?.message === 'string' ? err.message : 'unknown' });
      } finally {
        setSaving(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const resetEditor = useCallback(() => {
    setSelectedId(null);
    setSlug('');
    setTitle('');
    setSummaryTldr('');
    setIsPremium(false);
    setPublishedAt('');
    setSourceInstitution('');
    setSourceDate('');
    setTags('');
    setTeaserMdx('');
    setFullMdx('');
    setSaveError(null);
    setSaveSuccess(null);
  }, []);

  const onCreate = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const nextSlug = normalizeSlug(slug || title);
      if (!nextSlug) throw new Error('slug_required');
      if (!title.trim()) throw new Error('title_required');
      if (!summaryTldr.trim()) throw new Error('summary_required');

      const isoPublishedAt = publishedAt ? fromLocalDatetimeInputValue(publishedAt) : new Date().toISOString();
      if (!isoPublishedAt) throw new Error('published_at_invalid');

      const tagList = splitTags(tags);
      const teaser = teaserMdx.trim() || fullMdx.trim();
      const full = fullMdx.trim() || teaser;
      if (!teaser.trim() || !full.trim()) throw new Error('content_required');

      const now = new Date().toISOString();
      const { data: inserted, error: insertError } = await supabase
        .from('posts')
        .insert({
          slug: nextSlug,
          title: title.trim(),
          summary_tldr: summaryTldr.trim(),
          content_mdx: teaser,
          is_premium: isPremium,
          published_at: isoPublishedAt,
          source_institution: sourceInstitution.trim() || null,
          source_date: sourceDate.trim() || null,
          tags: tagList,
          updated_at: now,
        })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (!inserted?.id) throw new Error('insert_failed');

      const { error: upsertError } = await supabase.from('post_contents').upsert(
        {
          post_id: inserted.id,
          content_mdx: full,
          updated_at: now,
        },
        { onConflict: 'post_id' },
      );
      if (upsertError) throw upsertError;

      setSaveSuccess('已创建');
      setSelectedId(String(inserted.id));
      setSlug(nextSlug);
      trackEvent('admin_post_create_success', {});
      await loadPosts();
    } catch (err: any) {
      setSaveError(typeof err?.message === 'string' ? err.message : '创建失败');
      trackEvent('admin_post_create_error', { message: typeof err?.message === 'string' ? err.message : 'unknown' });
    } finally {
      setSaving(false);
    }
  }, [fullMdx, isPremium, loadPosts, publishedAt, slug, sourceDate, sourceInstitution, summaryTldr, supabase, tags, teaserMdx, title]);

  const onSave = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const nextSlug = normalizeSlug(slug);
      if (!nextSlug) throw new Error('slug_required');
      if (!title.trim()) throw new Error('title_required');
      if (!summaryTldr.trim()) throw new Error('summary_required');

      const isoPublishedAt = publishedAt ? fromLocalDatetimeInputValue(publishedAt) : null;
      if (publishedAt && !isoPublishedAt) throw new Error('published_at_invalid');

      const tagList = splitTags(tags);
      const teaser = teaserMdx.trim() || fullMdx.trim();
      const full = fullMdx.trim() || teaser;
      if (!teaser.trim() || !full.trim()) throw new Error('content_required');

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          slug: nextSlug,
          title: title.trim(),
          summary_tldr: summaryTldr.trim(),
          content_mdx: teaser,
          is_premium: isPremium,
          published_at: isoPublishedAt ?? new Date().toISOString(),
          source_institution: sourceInstitution.trim() || null,
          source_date: sourceDate.trim() || null,
          tags: tagList,
          updated_at: now,
        })
        .eq('id', selectedId);
      if (updateError) throw updateError;

      const { error: upsertError } = await supabase.from('post_contents').upsert(
        {
          post_id: selectedId,
          content_mdx: full,
          updated_at: now,
        },
        { onConflict: 'post_id' },
      );
      if (upsertError) throw upsertError;

      setSaveSuccess('已保存');
      trackEvent('admin_post_save_success', {});
      await loadPosts();
    } catch (err: any) {
      setSaveError(typeof err?.message === 'string' ? err.message : '保存失败');
      trackEvent('admin_post_save_error', { message: typeof err?.message === 'string' ? err.message : 'unknown' });
    } finally {
      setSaving(false);
    }
  }, [fullMdx, isPremium, loadPosts, publishedAt, selectedId, slug, sourceDate, sourceInstitution, summaryTldr, supabase, tags, teaserMdx, title]);

  const onDelete = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', selectedId);
      if (error) throw error;
      setSaveSuccess('已删除');
      trackEvent('admin_post_delete_success', {});
      resetEditor();
      await loadPosts();
    } catch (err: any) {
      setSaveError(typeof err?.message === 'string' ? err.message : '删除失败');
      trackEvent('admin_post_delete_error', { message: typeof err?.message === 'string' ? err.message : 'unknown' });
    } finally {
      setSaving(false);
    }
  }, [loadPosts, resetEditor, selectedId, supabase]);

  const onPublishNow = useCallback(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60_000);
    setPublishedAt(local.toISOString().slice(0, 16));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">文章列表</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void loadPosts()} disabled={loading}>
              刷新
            </Button>
            <Button
              className="bg-brand-900 hover:bg-brand-800"
              onClick={() => {
                resetEditor();
                trackEvent('admin_post_new_click', {});
              }}
            >
              新建
            </Button>
          </div>
        </div>

        {loadError ? <div className="p-4 text-sm text-red-600">{loadError}</div> : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标题</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>发布时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-slate-500">
                  加载中…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-slate-500">
                  暂无文章。
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const selected = r.id === selectedId;
                return (
                  <TableRow
                    key={r.id}
                    data-state={selected ? 'selected' : undefined}
                    className={selected ? 'bg-slate-50' : undefined}
                    onClick={() => {
                      setSelectedId(r.id);
                      void loadPostDetail(r.id);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell className="max-w-[260px] truncate">
                      <div className="font-medium text-slate-900 truncate">{r.title || '（无标题）'}</div>
                      <div className="text-xs text-slate-500 truncate">{r.slug}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.is_premium ? <Badge>Pro</Badge> : <Badge variant="outline">免费</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{r.published_at ? r.published_at.slice(0, 10) : '—'}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">{selectedId ? '编辑文章' : '新建文章'}</div>
          <div className="flex items-center gap-2">
            {selectedRow ? (
              <Button asChild variant="outline">
                <TrackedLink href={`/posts/${encodeURIComponent(selectedRow.slug)}`} eventName="admin_post_preview_click">
                  预览
                </TrackedLink>
              </Button>
            ) : null}
            <Button variant="outline" onClick={onPublishNow} disabled={saving}>
              设为现在发布
            </Button>
            {selectedId ? (
              <Button className="bg-brand-900 hover:bg-brand-800" onClick={() => void onSave()} disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </Button>
            ) : (
              <Button className="bg-brand-900 hover:bg-brand-800" onClick={() => void onCreate()} disabled={saving}>
                {saving ? '创建中…' : '创建'}
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {saveError ? <div className="text-sm text-red-600">{saveError}</div> : null}
          {saveSuccess ? <div className="text-sm text-emerald-700">{saveSuccess}</div> : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Slug</span>
              <input
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="例如 great-rotation-tech-utilities"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">标题</span>
              <input
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="文章标题"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">TL;DR</span>
            <textarea
              className="min-h-[80px] rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:border-slate-400"
              value={summaryTldr}
              onChange={(e) => setSummaryTldr(e.target.value)}
              placeholder="一句话要点摘要"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Pro 内容</div>
                <div className="mt-1 text-xs text-slate-500">开启后未订阅用户将看到锁定版本</div>
              </div>
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">发布时间</span>
              <input
                type="datetime-local"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2 md:col-span-1">
              <span className="text-sm font-medium text-slate-700">机构</span>
              <input
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                value={sourceInstitution}
                onChange={(e) => setSourceInstitution(e.target.value)}
                placeholder="例如 Goldman Sachs"
              />
            </label>
            <label className="flex flex-col gap-2 md:col-span-1">
              <span className="text-sm font-medium text-slate-700">来源日期</span>
              <input
                type="date"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                value={sourceDate}
                onChange={(e) => setSourceDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 md:col-span-1">
              <span className="text-sm font-medium text-slate-700">标签（逗号分隔）</span>
              <input
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="AI, Utilities, Macro"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">锁定时展示内容（MDX）</span>
            <textarea
              className="min-h-[200px] rounded-md border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus-visible:border-slate-400"
              value={teaserMdx}
              onChange={(e) => setTeaserMdx(e.target.value)}
              placeholder="未解锁时展示的内容（可放摘要、部分章节）"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">全文内容（MDX）</span>
            <textarea
              className="min-h-[380px] rounded-md border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus-visible:border-slate-400"
              value={fullMdx}
              onChange={(e) => setFullMdx(e.target.value)}
              placeholder="解锁后展示的完整内容"
            />
          </label>

          {selectedId ? (
            <div className="pt-2 flex items-center justify-between">
              <Button variant="outline" onClick={resetEditor} disabled={saving}>
                取消选择
              </Button>
              <Button variant="outline" onClick={() => void onDelete()} disabled={saving}>
                删除
              </Button>
            </div>
          ) : (
            <div className="pt-2 flex items-center justify-end">
              <Button variant="outline" onClick={resetEditor} disabled={saving}>
                清空
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

