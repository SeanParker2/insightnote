'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trackEvent } from '@/lib/analytics';

type AuthFactorSnapshot = {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string | null;
  created_at?: string | null;
};

type TrustedDeviceSnapshot = {
  id: number;
  fingerprint: string;
  label: string | null;
  user_agent: string | null;
  last_seen_at: string;
  created_at: string;
};

type RecoveryCodeSnapshot = {
  id: number;
  created_at: string;
  used_at: string | null;
};

type EventSnapshot = {
  id: number;
  event_name: string;
  created_at: string;
};

function getOrCreateDeviceFingerprint() {
  if (typeof window === 'undefined') return null;
  try {
    const key = 'insightnote_device_fingerprint_v1';
    const existing = window.localStorage.getItem(key);
    if (existing && existing.length >= 8) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return null;
  }
}

function formatFactorLabel(factor: AuthFactorSnapshot) {
  const label = typeof factor.friendly_name === 'string' && factor.friendly_name.trim() ? factor.friendly_name.trim() : null;
  if (label) return label;
  if (factor.factor_type === 'totp') return 'TOTP（验证器应用）';
  if (factor.factor_type === 'webauthn') return 'Passkey / WebAuthn';
  if (factor.factor_type === 'phone') return '短信 / 电话';
  return factor.factor_type;
}

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('zh-CN', { hour12: false });
}

async function sha256Base64Url(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const raw = String.fromCharCode(...new Uint8Array(digest));
  const b64 = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return b64;
}

function generateRecoveryCodes(count = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codes: string[] = [];
  const bytes = new Uint8Array(count * 10);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < count; i += 1) {
    let s = '';
    for (let j = 0; j < 8; j += 1) {
      const b = bytes[i * 10 + j] ?? 0;
      s += alphabet[b % alphabet.length];
    }
    codes.push(`${s.slice(0, 4)}-${s.slice(4, 8)}`);
  }
  return codes;
}

export function AccountSecurity() {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [factorsLoading, setFactorsLoading] = useState(false);
  const [factorsError, setFactorsError] = useState<string | null>(null);
  const [factors, setFactors] = useState<AuthFactorSnapshot[]>([]);
  const [aalCurrent, setAalCurrent] = useState<string | null>(null);
  const [aalNext, setAalNext] = useState<string | null>(null);
  const [mfaStepUpCode, setMfaStepUpCode] = useState('');

  const [mfaEnrollOpen, setMfaEnrollOpen] = useState(false);
  const [mfaEnrollBusy, setMfaEnrollBusy] = useState(false);
  const [mfaEnrollFactorId, setMfaEnrollFactorId] = useState<string | null>(null);
  const [mfaEnrollQr, setMfaEnrollQr] = useState<string | null>(null);
  const [mfaEnrollSecret, setMfaEnrollSecret] = useState<string | null>(null);
  const [mfaEnrollCode, setMfaEnrollCode] = useState('');

  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devices, setDevices] = useState<TrustedDeviceSnapshot[]>([]);

  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<RecoveryCodeSnapshot[]>([]);
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
  const [recoveryPlainCodes, setRecoveryPlainCodes] = useState<string[] | null>(null);

  const [eventsLoading, setEventsLoading] = useState(false);
  const [events, setEvents] = useState<EventSnapshot[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const id = data.user?.id ?? null;
      setUserId(id);
      setDeviceFingerprint(getOrCreateDeviceFingerprint());
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function reloadMfa() {
    setFactorsLoading(true);
    setFactorsError(null);
    try {
      const [{ data: factorsData, error: factorsErr }, { data: aalData, error: aalErr }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      if (factorsErr) {
        setFactorsError(factorsErr.message);
        setFactors([]);
      } else {
        const all = Array.isArray((factorsData as any)?.all) ? ((factorsData as any).all as any[]) : [];
        const normalized = all
          .filter((f) => f && typeof f === 'object')
          .map((f) => ({
            id: String((f as any).id ?? ''),
            factor_type: String((f as any).factor_type ?? ''),
            status: String((f as any).status ?? ''),
            friendly_name: typeof (f as any).friendly_name === 'string' ? ((f as any).friendly_name as string) : null,
            created_at: typeof (f as any).created_at === 'string' ? ((f as any).created_at as string) : null,
          }))
          .filter((f) => f.id && f.factor_type);
        setFactors(normalized);
      }

      if (aalErr) {
        setAalCurrent(null);
        setAalNext(null);
      } else {
        setAalCurrent(typeof (aalData as any)?.currentLevel === 'string' ? ((aalData as any).currentLevel as string) : null);
        setAalNext(typeof (aalData as any)?.nextLevel === 'string' ? ((aalData as any).nextLevel as string) : null);
      }
    } finally {
      setFactorsLoading(false);
    }
  }

  async function reloadDevices() {
    setDevicesLoading(true);
    try {
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('id, fingerprint, label, user_agent, last_seen_at, created_at')
        .order('last_seen_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const list = Array.isArray(data) ? (data as any[]) : [];
      setDevices(
        list
          .filter((row) => row && typeof row === 'object')
          .map((row) => ({
            id: Number((row as any).id),
            fingerprint: String((row as any).fingerprint ?? ''),
            label: typeof (row as any).label === 'string' ? ((row as any).label as string) : null,
            user_agent: typeof (row as any).user_agent === 'string' ? ((row as any).user_agent as string) : null,
            last_seen_at: String((row as any).last_seen_at ?? ''),
            created_at: String((row as any).created_at ?? ''),
          }))
          .filter((row) => row.id && row.fingerprint),
      );
    } catch (err: any) {
      setDevices([]);
      const message = typeof err?.message === 'string' ? err.message : '加载设备失败';
      setErrorMessage(message);
    } finally {
      setDevicesLoading(false);
    }
  }

  async function reloadRecoveryCodes() {
    setRecoveryLoading(true);
    try {
      const { data, error } = await supabase
        .from('mfa_recovery_codes')
        .select('id, created_at, used_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const list = Array.isArray(data) ? (data as any[]) : [];
      setRecoveryCodes(
        list
          .filter((row) => row && typeof row === 'object')
          .map((row) => ({
            id: Number((row as any).id),
            created_at: String((row as any).created_at ?? ''),
            used_at: typeof (row as any).used_at === 'string' ? ((row as any).used_at as string) : null,
          }))
          .filter((row) => row.id),
      );
    } catch (err: any) {
      setRecoveryCodes([]);
      const message = typeof err?.message === 'string' ? err.message : '加载恢复码失败';
      setErrorMessage(message);
    } finally {
      setRecoveryLoading(false);
    }
  }

  async function reloadEvents() {
    setEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, event_name, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const list = Array.isArray(data) ? (data as any[]) : [];
      setEvents(
        list
          .filter((row) => row && typeof row === 'object')
          .map((row) => ({
            id: Number((row as any).id),
            event_name: String((row as any).event_name ?? ''),
            created_at: String((row as any).created_at ?? ''),
          }))
          .filter((row) => row.id && row.event_name),
      );
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    void reloadMfa();
    void reloadDevices();
    void reloadRecoveryCodes();
    void reloadEvents();
  }, [userId]);

  useEffect(() => {
    if (!userId || !deviceFingerprint) return;
    const label = '本机浏览器';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
    const now = new Date().toISOString();

    void supabase
      .from('trusted_devices')
      .upsert(
        {
          user_id: userId,
          fingerprint: deviceFingerprint,
          label,
          user_agent: userAgent,
          last_seen_at: now,
        },
        { onConflict: 'user_id,fingerprint' },
      )
      .then(({ error }) => {
        if (!error) void reloadDevices();
      });
  }, [deviceFingerprint, supabase, userId]);

  function hasVerifiedMfa() {
    return factors.some((f) => f.status === 'verified');
  }

  async function ensureStepUp() {
    if (!hasVerifiedMfa()) return true;
    if (aalCurrent === 'aal2') return true;
    const code = mfaStepUpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setErrorMessage('请输入 6 位两步验证码');
      return false;
    }

    const factor = factors.find((f) => f.status === 'verified' && f.factor_type === 'totp') ?? null;
    if (!factor) {
      setErrorMessage('未找到可用的验证器因子');
      return false;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('account_mfa_step_up_submit', {});
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (error) {
        setErrorMessage(error.message);
        trackEvent('account_mfa_step_up_error', { message: error.message });
        return false;
      }
      setMfaStepUpCode('');
      setSuccessMessage('已完成安全验证');
      trackEvent('account_mfa_step_up_success', {});
      await reloadMfa();
      return true;
    } finally {
      setSubmitting(false);
    }
  }

  async function onUpdatePassword() {
    if (!password || password.length < 8) {
      setErrorMessage('密码至少 8 位');
      setSuccessMessage(null);
      return;
    }
    if (password !== password2) {
      setErrorMessage('两次输入的密码不一致');
      setSuccessMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('account_password_update_submit', {});
    try {
      const stepOk = await ensureStepUp();
      if (!stepOk) return;

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage(error.message);
        trackEvent('account_password_update_error', { message: error.message });
        return;
      }
      setPassword('');
      setPassword2('');
      setSuccessMessage('密码已更新');
      trackEvent('account_password_update_success', {});
    } finally {
      setSubmitting(false);
    }
  }

  async function onLogoutAll() {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('auth_logout_all_submit', {});
    try {
      const stepOk = await ensureStepUp();
      if (!stepOk) return;

      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        setErrorMessage(error.message);
        trackEvent('auth_logout_all_error', { message: error.message });
        return;
      }
      trackEvent('auth_logout_all_success', {});
      if (typeof window !== 'undefined') window.location.assign('/login');
    } finally {
      setSubmitting(false);
    }
  }

  async function onLogoutOthers() {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('auth_logout_others_submit', {});
    try {
      const stepOk = await ensureStepUp();
      if (!stepOk) return;

      const { error } = await supabase.auth.signOut({ scope: 'others' } as any);
      if (error) {
        setErrorMessage(error.message);
        trackEvent('auth_logout_others_error', { message: error.message });
        return;
      }
      setSuccessMessage('已退出其他设备');
      trackEvent('auth_logout_others_success', {});
    } finally {
      setSubmitting(false);
    }
  }

  async function onLogout() {
    trackEvent('auth_logout', {});
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') window.location.assign('/login');
  }

  async function onStartEnrollTotp() {
    setMfaEnrollBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('account_mfa_enroll_totp_submit', {});
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'InsightNote' } as any);
      if (error) {
        setErrorMessage(error.message);
        trackEvent('account_mfa_enroll_totp_error', { message: error.message });
        return;
      }
      const factorId = (data as any)?.id ? String((data as any).id) : null;
      const qr = typeof (data as any)?.totp?.qr_code === 'string' ? ((data as any).totp.qr_code as string) : null;
      const secret = typeof (data as any)?.totp?.secret === 'string' ? ((data as any).totp.secret as string) : null;
      if (!factorId) {
        setErrorMessage('创建两步验证失败');
        return;
      }
      setMfaEnrollFactorId(factorId);
      setMfaEnrollQr(qr);
      setMfaEnrollSecret(secret);
      setMfaEnrollOpen(true);
    } finally {
      setMfaEnrollBusy(false);
    }
  }

  async function onVerifyEnrollTotp() {
    const factorId = mfaEnrollFactorId;
    if (!factorId) return;
    const code = mfaEnrollCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setErrorMessage('请输入 6 位验证码');
      return;
    }

    setMfaEnrollBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('account_mfa_enroll_totp_verify_submit', {});
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) {
        setErrorMessage(error.message);
        trackEvent('account_mfa_enroll_totp_verify_error', { message: error.message });
        return;
      }
      setMfaEnrollOpen(false);
      setMfaEnrollCode('');
      setMfaEnrollFactorId(null);
      setMfaEnrollQr(null);
      setMfaEnrollSecret(null);
      setSuccessMessage('两步验证已开启');
      trackEvent('account_mfa_enroll_totp_verify_success', {});
      await reloadMfa();
    } finally {
      setMfaEnrollBusy(false);
    }
  }

  async function onDisableFactor(factorId: string) {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('account_mfa_unenroll_submit', {});
    try {
      const stepOk = await ensureStepUp();
      if (!stepOk) return;

      const { error } = await supabase.auth.mfa.unenroll({ factorId } as any);
      if (error) {
        setErrorMessage(error.message);
        trackEvent('account_mfa_unenroll_error', { message: error.message });
        return;
      }
      setSuccessMessage('两步验证已移除');
      trackEvent('account_mfa_unenroll_success', {});
      await reloadMfa();
    } finally {
      setSubmitting(false);
    }
  }

  async function onRevokeDevice(id: number) {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('account_trusted_device_revoke_submit', { id });
    try {
      const stepOk = await ensureStepUp();
      if (!stepOk) return;

      const { error } = await supabase.from('trusted_devices').delete().eq('id', id);
      if (error) throw error;
      setSuccessMessage('设备已移除');
      trackEvent('account_trusted_device_revoke_success', { id });
      await reloadDevices();
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '移除设备失败';
      setErrorMessage(message);
      trackEvent('account_trusted_device_revoke_error', { message });
    } finally {
      setSubmitting(false);
    }
  }

  async function onGenerateRecoveryCodes() {
    if (!userId) return;
    setRecoveryLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('account_recovery_codes_generate_submit', {});
    try {
      const stepOk = await ensureStepUp();
      if (!stepOk) return;

      const codes = generateRecoveryCodes(10);
      const hashes = await Promise.all(codes.map((c) => sha256Base64Url(c)));
      const rows = hashes.map((hash) => ({ user_id: userId, code_hash: hash }));

      await supabase.from('mfa_recovery_codes').delete().eq('user_id', userId);
      const { error } = await supabase.from('mfa_recovery_codes').insert(rows as any);
      if (error) throw error;

      setRecoveryPlainCodes(codes);
      setRecoveryDialogOpen(true);
      setSuccessMessage('恢复码已生成');
      trackEvent('account_recovery_codes_generate_success', {});
      await reloadRecoveryCodes();
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '生成恢复码失败';
      setErrorMessage(message);
      trackEvent('account_recovery_codes_generate_error', { message });
    } finally {
      setRecoveryLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-base font-bold text-slate-900">账号安全</div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">新密码</span>
          <input
            className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 8 位"
            type="password"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">确认新密码</span>
          <input
            className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            type="password"
          />
        </label>
      </div>

      {hasVerifiedMfa() && aalCurrent !== 'aal2' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">两步验证码</span>
            <input
              className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
              value={mfaStepUpCode}
              onChange={(e) => setMfaStepUpCode(e.target.value)}
              placeholder="例如 123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={submitting}
            />
            <div className="text-xs text-slate-500">为敏感操作验证身份（本次会话：{aalCurrent ?? 'aal1'}）</div>
          </label>
        </div>
      )}

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <Button className="bg-brand-900 hover:bg-brand-800" onClick={onUpdatePassword} disabled={submitting}>
          {submitting ? '处理中…' : '更新密码'}
        </Button>
        <Button variant="outline" onClick={onLogoutOthers} disabled={submitting}>
          退出其他设备
        </Button>
        <Button variant="outline" onClick={onLogoutAll} disabled={submitting}>
          退出所有设备
        </Button>
        <Button variant="outline" onClick={onLogout}>
          退出登录
        </Button>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">两步验证（2FA）</div>
          <div className="text-xs text-slate-500">{factorsLoading ? '加载中…' : aalCurrent ? `会话等级：${aalCurrent}` : ''}</div>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <Button onClick={onStartEnrollTotp} disabled={mfaEnrollBusy || factorsLoading}>
            {mfaEnrollBusy ? '处理中…' : '开启验证器'}
          </Button>
          <Button variant="outline" onClick={() => void reloadMfa()} disabled={factorsLoading}>
            刷新
          </Button>
        </div>

        {factorsError && <div className="mt-3 text-sm text-red-600">{factorsError}</div>}

        <div className="mt-4 space-y-2">
          {factors.length === 0 && !factorsLoading ? (
            <div className="text-sm text-slate-600">未开启两步验证。</div>
          ) : (
            factors.map((f) => (
              <div key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">{formatFactorLabel(f)}</div>
                  <div className="text-xs text-slate-500">
                    状态：{f.status}
                    {f.created_at ? ` · 创建于：${formatTime(f.created_at)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => void onDisableFactor(f.id)} disabled={submitting || f.status !== 'verified'}>
                    移除
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">信任设备</div>
          <div className="text-xs text-slate-500">{devicesLoading ? '加载中…' : ''}</div>
        </div>
        <div className="mt-3 flex gap-3">
          <Button variant="outline" onClick={() => void reloadDevices()} disabled={devicesLoading}>
            刷新
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {devices.length === 0 && !devicesLoading ? (
            <div className="text-sm text-slate-600">暂无设备记录。</div>
          ) : (
            devices.map((d) => (
              <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">
                    {d.label || '设备'}
                    {deviceFingerprint && d.fingerprint === deviceFingerprint ? <span className="ml-2 text-xs text-emerald-700">当前设备</span> : null}
                  </div>
                  <div className="text-xs text-slate-500">
                    最近使用：{formatTime(d.last_seen_at)}
                    {d.user_agent ? ` · ${d.user_agent.slice(0, 80)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void onRevokeDevice(d.id)}
                    disabled={submitting || (deviceFingerprint !== null && d.fingerprint === deviceFingerprint)}
                  >
                    移除
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">恢复码</div>
          <div className="text-xs text-slate-500">{recoveryLoading ? '加载中…' : ''}</div>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <Button onClick={() => void onGenerateRecoveryCodes()} disabled={recoveryLoading || submitting}>
            {recoveryLoading ? '处理中…' : '生成恢复码'}
          </Button>
          <Button variant="outline" onClick={() => void reloadRecoveryCodes()} disabled={recoveryLoading}>
            刷新
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {recoveryCodes.length === 0 && !recoveryLoading ? (
            <div className="text-sm text-slate-600">尚未生成恢复码。</div>
          ) : (
            recoveryCodes.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="text-sm text-slate-700">
                  生成时间：{formatTime(c.created_at)}
                  {c.used_at ? <span className="ml-2 text-xs text-slate-400">已使用</span> : <span className="ml-2 text-xs text-emerald-700">未使用</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">审计日志</div>
          <div className="text-xs text-slate-500">{eventsLoading ? '加载中…' : ''}</div>
        </div>
        <div className="mt-3 flex gap-3">
          <Button variant="outline" onClick={() => void reloadEvents()} disabled={eventsLoading}>
            刷新
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {events.length === 0 && !eventsLoading ? (
            <div className="text-sm text-slate-600">暂无记录。</div>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="text-sm text-slate-700">{e.event_name}</div>
                <div className="text-xs text-slate-500">{formatTime(e.created_at)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {(errorMessage || successMessage) && (
        <div
          className={`mt-6 rounded-lg border p-4 text-sm ${
            errorMessage ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {errorMessage ?? successMessage}
        </div>
      )}

      <Dialog
        open={mfaEnrollOpen}
        onOpenChange={(open) => {
          setMfaEnrollOpen(open);
          if (!open) {
            setMfaEnrollCode('');
            setMfaEnrollFactorId(null);
            setMfaEnrollQr(null);
            setMfaEnrollSecret(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>开启两步验证</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {mfaEnrollQr ? (
              mfaEnrollQr.trim().startsWith('<svg') ? (
                <div className="rounded-md border border-slate-200 bg-white p-3" dangerouslySetInnerHTML={{ __html: mfaEnrollQr }} />
              ) : (
                <img alt="二维码" className="w-56 h-56" src={mfaEnrollQr} />
              )
            ) : null}

            {mfaEnrollSecret ? (
              <div className="text-xs text-slate-600">
                密钥：<span className="font-mono">{mfaEnrollSecret}</span>
              </div>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">输入验证码</span>
              <input
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                value={mfaEnrollCode}
                onChange={(e) => setMfaEnrollCode(e.target.value)}
                placeholder="例如 123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={mfaEnrollBusy}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMfaEnrollOpen(false)} disabled={mfaEnrollBusy}>
              取消
            </Button>
            <Button className="bg-brand-900 hover:bg-brand-800" onClick={() => void onVerifyEnrollTotp()} disabled={mfaEnrollBusy}>
              {mfaEnrollBusy ? '处理中…' : '确认开启'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={recoveryDialogOpen}
        onOpenChange={(open) => {
          setRecoveryDialogOpen(open);
          if (!open) setRecoveryPlainCodes(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>恢复码（仅展示一次）</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {recoveryPlainCodes?.length ? (
              <div className="grid grid-cols-2 gap-2">
                {recoveryPlainCodes.map((c) => (
                  <div key={c} className="rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900">
                    {c}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">暂无恢复码。</div>
            )}
          </div>
          <DialogFooter>
            <Button className="bg-brand-900 hover:bg-brand-800" onClick={() => setRecoveryDialogOpen(false)}>
              我已保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
