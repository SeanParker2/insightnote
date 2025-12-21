'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import NextImage from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trackEvent } from '@/lib/analytics';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { isSubscriptionActive } from '@/lib/utils';

type ProfileSnapshot = {
  id: string;
  email: string;
  nickname: string | null;
  avatar_path: string | null;
  language: string | null;
  timezone: string | null;
  email_subscribed: boolean | null;
  email_frequency: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  cancel_at_period_end: boolean | null;
  subscription_interval: string | null;
};

type Props = {
  userId: string;
  email: string | null;
  initialProfile: ProfileSnapshot | null;
};

function normalizeLanguage(value: unknown) {
  if (value === 'zh-CN' || value === 'en-US' || value === 'ja-JP') return value;
  return null;
}

function normalizeFrequency(value: unknown) {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') return value;
  return null;
}

function guessTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

async function fileToImageBitmap(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image_load_failed'));
      el.src = url;
    });

    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function buildCroppedAvatarBlob(file: File, opts: { size: number; x: number; y: number; zoom: number }) {
  const bitmap = await fileToImageBitmap(file);
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const zoomedSize = sourceSize / clamp(opts.zoom, 1, 4);
  const maxX = (bitmap.width - zoomedSize) / 2;
  const maxY = (bitmap.height - zoomedSize) / 2;
  const centerX = bitmap.width / 2 + clamp(opts.x, -maxX, maxX);
  const centerY = bitmap.height / 2 + clamp(opts.y, -maxY, maxY);

  const sx = clamp(centerX - zoomedSize / 2, 0, bitmap.width - zoomedSize);
  const sy = clamp(centerY - zoomedSize / 2, 0, bitmap.height - zoomedSize);
  const sWidth = clamp(zoomedSize, 1, bitmap.width);
  const sHeight = clamp(zoomedSize, 1, bitmap.height);

  const canvas = document.createElement('canvas');
  canvas.width = opts.size;
  canvas.height = opts.size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_not_supported');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

  const qualities = [0.9, 0.85, 0.8, 0.75];
  let blob: Blob | null = null;
  for (const q of qualities) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', q));
    if (blob && blob.size <= 450_000) break;
  }

  if (!blob) throw new Error('avatar_encode_failed');
  return blob;
}

export function AccountCenterClient({ userId, email, initialProfile }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [nickname, setNickname] = useState(initialProfile?.nickname ?? '');
  const [language, setLanguage] = useState(normalizeLanguage(initialProfile?.language) ?? 'zh-CN');
  const [timezone, setTimezone] = useState(initialProfile?.timezone ?? guessTimezone() ?? 'Asia/Shanghai');
  const [emailSubscribed, setEmailSubscribed] = useState(initialProfile?.email_subscribed ?? true);
  const [emailFrequency, setEmailFrequency] = useState(normalizeFrequency(initialProfile?.email_frequency) ?? 'daily');

  const [subscriptionStatus, setSubscriptionStatus] = useState(initialProfile?.subscription_status ?? 'free');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(initialProfile?.subscription_end_date ?? null);
  const [subscriptionInterval, setSubscriptionInterval] = useState<string | null>(initialProfile?.subscription_interval ?? null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(Boolean(initialProfile?.cancel_at_period_end));
  const [billingOrders, setBillingOrders] = useState<
    Array<{
      id: number;
      interval: string;
      amount_cents: number;
      currency: string;
      status: string;
      created_at: string;
      paid_at: string | null;
    }>
  >([]);
  const [billingLoading, setBillingLoading] = useState(false);

  const [avatarPath, setAvatarPath] = useState<string | null>(initialProfile?.avatar_path ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1.2);
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const nicknameSaveTimer = useRef<number | null>(null);

  function computeBillingMessage(nextStatus: string) {
    if (nextStatus === 'pro') return '我需要帮助管理/续费 InsightNote Pro（请协助确认账号状态）。';
    return '我想开通 InsightNote Pro（请协助开通/报价）。';
  }

  function formatMoney(amountCents: number, currency: string) {
    const amount = Math.round(amountCents) / 100;
    const upper = currency.toUpperCase();
    return `${amount.toFixed(2)} ${upper}`;
  }

  function formatTime(value: string) {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return value;
    const now = Date.now();
    const diffMs = timestamp - now;
    const absMs = Math.abs(diffMs);
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;

    const rtf =
      typeof Intl !== 'undefined' && typeof (Intl as any).RelativeTimeFormat === 'function'
        ? new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })
        : null;

    const formatRelative = (count: number, unit: Intl.RelativeTimeFormatUnit) => {
      if (rtf) return rtf.format(count, unit);
      const absCount = Math.abs(count);
      const suffix = count < 0 ? '前' : '后';
      const label = unit === 'second' ? '秒' : unit === 'minute' ? '分钟' : unit === 'hour' ? '小时' : unit === 'day' ? '天' : '周';
      return `${absCount}${label}${suffix}`;
    };

    if (absMs < minute) return formatRelative(Math.round(diffMs / 1000), 'second');
    if (absMs < hour) return formatRelative(Math.round(diffMs / minute), 'minute');
    if (absMs < day) return formatRelative(Math.round(diffMs / hour), 'hour');
    if (absMs < week) return formatRelative(Math.round(diffMs / day), 'day');
    if (absMs < month) return formatRelative(Math.round(diffMs / week), 'week');

    return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
  }

  useEffect(() => {
    let revoked = false;
    async function loadAvatar() {
      const path = avatarPath ?? null;
      if (!path) return;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      if (!revoked) setAvatarUrl(data.publicUrl || null);
    }
    loadAvatar();
    return () => {
      revoked = true;
    };
  }, [avatarPath, supabase]);

  useEffect(() => {
    let cancelled = false;
    async function loadBilling() {
      setBillingLoading(true);
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_end_date, cancel_at_period_end, subscription_interval')
          .eq('id', userId)
          .maybeSingle();
        if (profileError) throw profileError;
        if (!cancelled) {
          const nextStatus = typeof (profile as any)?.subscription_status === 'string' ? ((profile as any).subscription_status as string) : 'free';
          const nextEnd = typeof (profile as any)?.subscription_end_date === 'string' ? ((profile as any).subscription_end_date as string) : null;
          const nextCancel = Boolean((profile as any)?.cancel_at_period_end);
          const nextInterval = typeof (profile as any)?.subscription_interval === 'string' ? ((profile as any).subscription_interval as string) : null;
          setSubscriptionStatus(nextStatus);
          setSubscriptionEndDate(nextEnd);
          setCancelAtPeriodEnd(nextCancel);
          setSubscriptionInterval(nextInterval);
        }

        const { data: orders, error: ordersError } = await supabase
          .from('billing_orders')
          .select('id, interval, amount_cents, currency, status, created_at, paid_at')
          .order('created_at', { ascending: false })
          .limit(20);
        if (ordersError) throw ordersError;
        if (!cancelled) {
          setBillingOrders(
            (Array.isArray(orders) ? orders : []).map((row: any) => ({
              id: Number(row.id),
              interval: String(row.interval ?? ''),
              amount_cents: Number(row.amount_cents ?? 0),
              currency: String(row.currency ?? 'cny'),
              status: String(row.status ?? 'pending'),
              created_at: String(row.created_at ?? ''),
              paid_at: typeof row.paid_at === 'string' ? (row.paid_at as string) : null,
            })),
          );
        }
      } catch (err: any) {
        const message = typeof err?.message === 'string' ? err.message : '加载账单失败';
        if (!cancelled) setErrorMessage(message);
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    }
    loadBilling();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  async function onToggleCancelAtPeriodEnd(next: boolean) {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent(next ? 'account_billing_cancel_at_period_end_enable_submit' : 'account_billing_cancel_at_period_end_disable_submit', {});
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ cancel_at_period_end: next, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      setCancelAtPeriodEnd(next);
      setSuccessMessage(next ? '已设置到期后取消' : '已恢复续费状态');
      trackEvent(next ? 'account_billing_cancel_at_period_end_enable_success' : 'account_billing_cancel_at_period_end_disable_success', {});
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '更新失败';
      setErrorMessage(message);
      trackEvent('account_billing_cancel_at_period_end_update_error', { message });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (nicknameSaveTimer.current) window.clearTimeout(nicknameSaveTimer.current);
    if ((initialProfile?.nickname ?? '') === nickname) return;

    nicknameSaveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      trackEvent('account_profile_nickname_update_submit', { length: nickname.trim().length });
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: nickname.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) {
        setErrorMessage(error.message);
        trackEvent('account_profile_nickname_update_error', { message: error.message });
      } else {
        setSuccessMessage('昵称已保存');
        trackEvent('account_profile_nickname_update_success', {});
      }
      setSaving(false);
    }, 650);

    return () => {
      if (nicknameSaveTimer.current) window.clearTimeout(nicknameSaveTimer.current);
    };
  }, [initialProfile?.nickname, nickname, supabase, userId]);

  async function savePreferences(next: {
    language?: string | null;
    timezone?: string | null;
    email_subscribed?: boolean;
    email_frequency?: string | null;
  }) {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('account_profile_preferences_update_submit', { keys: Object.keys(next) });
    const { error } = await supabase
      .from('profiles')
      .update({ ...next, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) {
      setErrorMessage(error.message);
      trackEvent('account_profile_preferences_update_error', { message: error.message });
    } else {
      setSuccessMessage('设置已保存');
      trackEvent('account_profile_preferences_update_success', {});
    }
    setSaving(false);
  }

  function onPickAvatar(file: File | null) {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarFile(file);
    if (!file) {
      setAvatarPreviewUrl(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setErrorMessage('请选择图片文件');
      trackEvent('account_avatar_pick_invalid_type', { type: file.type || null });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setErrorMessage('请选择 10MB 以内的图片');
      trackEvent('account_avatar_pick_too_large', { size: file.size, type: file.type || null });
      return;
    }
    setAvatarZoom(1.2);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  async function onUploadAvatar() {
    if (!avatarFile) return;
    setAvatarUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('account_avatar_upload_submit', { size: avatarFile.size, type: avatarFile.type });

    try {
      const oldPath = avatarPath;
      const blob = await buildCroppedAvatarBlob(avatarFile, {
        size: 512,
        x: avatarOffsetX,
        y: avatarOffsetY,
        zoom: avatarZoom,
      });

      const fileExt = 'jpg';
      const path = `${userId}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_path: path, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (updateError) {
        await supabase.storage.from('avatars').remove([path]);
        throw updateError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarPath(path);
      setAvatarUrl(data.publicUrl || null);
      setSuccessMessage('头像已更新');
      trackEvent('account_avatar_upload_success', {});
      setAvatarDialogOpen(false);
      onPickAvatar(null);

      if (oldPath && oldPath !== path && oldPath.startsWith(`${userId}/`)) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '头像上传失败';
      setErrorMessage(message);
      trackEvent('account_avatar_upload_error', { message });
    } finally {
      setAvatarUploading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-base font-bold text-slate-900">订阅与账单</div>
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  当前方案：{isSubscriptionActive(subscriptionStatus, subscriptionEndDate) ? 'Pro' : '免费'}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {subscriptionEndDate ? `到期时间：${new Date(subscriptionEndDate).toLocaleDateString('zh-CN')}` : '到期时间：未设置'}
                  {subscriptionInterval ? ` · 周期：${subscriptionInterval}` : ''}
                  {cancelAtPeriodEnd ? <span className="ml-2 text-slate-400">（已设置到期后取消）</span> : null}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => void onToggleCancelAtPeriodEnd(!cancelAtPeriodEnd)}
                  disabled={saving || billingLoading || !isSubscriptionActive(subscriptionStatus, subscriptionEndDate)}
                >
                  {cancelAtPeriodEnd ? '恢复续费' : '到期后取消'}
                </Button>
                <Button asChild className="bg-brand-900 hover:bg-brand-800">
                  <TrackedLink
                    href={`/feedback?category=billing&message=${encodeURIComponent(computeBillingMessage(subscriptionStatus))}`}
                    eventName="account_billing_support_click"
                    eventPayload={{ status: subscriptionStatus }}
                  >
                    联系支持
                  </TrackedLink>
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">订单历史</div>
            <div className="mt-3 space-y-2">
              {billingLoading ? (
                <div className="text-sm text-slate-500">加载中…</div>
              ) : billingOrders.length === 0 ? (
                <div className="text-sm text-slate-600">暂无订单记录。</div>
              ) : (
                billingOrders.map((o) => (
                  <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-sm text-slate-700">
                      <span className="font-medium text-slate-900">#{o.id}</span>
                      <span className="ml-2">Pro · {o.interval}</span>
                      <span className="ml-2">{formatMoney(o.amount_cents, o.currency)}</span>
                      <span className="ml-2 text-xs text-slate-500">状态：{o.status}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {o.paid_at ? `支付：${formatTime(o.paid_at)}` : `创建：${formatTime(o.created_at)}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-base font-bold text-slate-900">账号资料</div>
        <div className="mt-4 flex flex-col sm:flex-row gap-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
              {avatarUrl ? (
                <NextImage
                  src={avatarUrl}
                  alt="头像"
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-xs text-slate-500">暂无头像</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium text-slate-700">昵称</div>
              <input
                className="h-10 w-full sm:w-72 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setSuccessMessage(null);
                  setErrorMessage(null);
                }}
                placeholder="填写一个展示昵称"
                disabled={saving}
              />
              <div className="text-xs text-slate-500">输入后自动保存</div>
            </div>
          </div>

          <div className="sm:ml-auto flex flex-col sm:items-end gap-2">
            <div className="text-sm font-medium text-slate-700">头像</div>
            <Button
              variant="outline"
              onClick={() => {
                setAvatarDialogOpen(true);
                trackEvent('account_avatar_dialog_open', {});
              }}
            >
              上传头像
            </Button>
            <div className="text-xs text-slate-500">支持裁剪与压缩</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-base font-bold text-slate-900">偏好设置</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">语言</span>
            <select
              className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
              value={language}
              disabled={saving}
              onChange={(e) => {
                const next = normalizeLanguage(e.target.value) ?? 'zh-CN';
                setLanguage(next);
                void savePreferences({ language: next });
              }}
            >
              <option value="zh-CN">中文（简体）</option>
              <option value="en-US">English</option>
              <option value="ja-JP">日本語</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">时区</span>
            <input
              className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
              value={timezone}
              disabled={saving}
              onChange={(e) => setTimezone(e.target.value)}
              onBlur={() => void savePreferences({ timezone: timezone.trim() || null })}
              placeholder="例如 Asia/Shanghai"
            />
            <div className="text-xs text-slate-500">支持 IANA 时区标识，失焦时保存</div>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-base font-bold text-slate-900">邮件偏好</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">接收更新邮件</div>
              <div className="mt-1 text-xs text-slate-500">默认开启，可随时退订</div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={emailSubscribed}
              disabled={saving}
              onChange={(e) => {
                const next = e.target.checked;
                setEmailSubscribed(next);
                void savePreferences({ email_subscribed: next });
              }}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">发送频率</span>
            <select
              className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
              value={emailFrequency}
              disabled={saving || !emailSubscribed}
              onChange={(e) => {
                const next = normalizeFrequency(e.target.value) ?? 'daily';
                setEmailFrequency(next);
                void savePreferences({ email_frequency: next });
              }}
            >
              <option value="daily">每日</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
            </select>
            <div className="text-xs text-slate-500">
              每封邮件都会包含免登录退订链接{email ? `（发送至：${email}）` : ''}
            </div>
          </label>
        </div>
      </div>

      {(errorMessage || successMessage) && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            errorMessage ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {errorMessage ?? successMessage}
        </div>
      )}

      <Dialog
        open={avatarDialogOpen}
        onOpenChange={(open) => {
          setAvatarDialogOpen(open);
          if (!open) onPickAvatar(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传头像</DialogTitle>
            <DialogDescription>选择图片后可调整裁剪范围与压缩质量。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
              disabled={avatarUploading}
            />

            {avatarPreviewUrl && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500 mb-2">预览（方形裁剪）</div>
                    <div className="aspect-square overflow-hidden rounded-md border border-slate-200 bg-white">
                    <div className="relative h-full w-full">
                      <NextImage
                        src={avatarPreviewUrl}
                        alt="头像预览"
                        fill
                        className="object-cover"
                        style={{
                          transform: `translate(${avatarOffsetX}px, ${avatarOffsetY}px) scale(${avatarZoom})`,
                          transformOrigin: 'center',
                        }}
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-600">缩放</span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={avatarZoom}
                      onChange={(e) => setAvatarZoom(Number(e.target.value))}
                      disabled={avatarUploading}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-600">水平偏移</span>
                    <input
                      type="range"
                      min={-120}
                      max={120}
                      step={1}
                      value={avatarOffsetX}
                      onChange={(e) => setAvatarOffsetX(Number(e.target.value))}
                      disabled={avatarUploading}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-600">垂直偏移</span>
                    <input
                      type="range"
                      min={-120}
                      max={120}
                      step={1}
                      value={avatarOffsetY}
                      onChange={(e) => setAvatarOffsetY(Number(e.target.value))}
                      disabled={avatarUploading}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAvatarDialogOpen(false)} disabled={avatarUploading}>
              取消
            </Button>
            <Button className="bg-brand-900 hover:bg-brand-800" onClick={onUploadAvatar} disabled={!avatarFile || avatarUploading}>
              {avatarUploading ? '上传中…' : '保存头像'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
