'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import {
  requestNotificationPermission,
  getNotificationPermission,
  getNotificationPreferences,
  setNotificationPreferences,
  type NotificationPermission,
  type NotificationPreferences,
} from '@/lib/notifications';

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [prefs, setPrefs] = useState<NotificationPreferences>(getNotificationPreferences());
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  async function handleRequestPermission() {
    setRequesting(true);
    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);
    setRequesting(false);
  }

  function handleTogglePref(key: keyof NotificationPreferences) {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    setNotificationPreferences(newPrefs);
  }

  const prefItems: Array<{ key: keyof NotificationPreferences; label: string; description: string }> = [
    { key: 'priceAlerts', label: '价格预警', description: '持仓标的价格大幅变动时通知' },
    { key: 'predictionResults', label: '预测结果', description: '预测验证完成时通知' },
    { key: 'newsAlerts', label: '新闻快讯', description: '重要市场新闻时通知' },
    { key: 'biasWarnings', label: '偏差预警', description: '检测到认知偏差时通知' },
  ];

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <div className="p-5 rounded-xl bg-surface-1 border border-border-default">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <div className="p-2 rounded-lg bg-signal-down-bg">
                <Bell className="w-5 h-5 text-signal-down" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-surface-2">
                <BellOff className="w-5 h-5 text-text-tertiary" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-text-primary">浏览器通知</h3>
              <p className="text-xs text-text-tertiary">
                {permission === 'granted' ? '已开启' : permission === 'denied' ? '已被拒绝' : '未开启'}
              </p>
            </div>
          </div>
          {permission !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              disabled={requesting}
              className="px-4 py-2 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
            >
              {requesting ? '请求中...' : '开启通知'}
            </button>
          )}
          {permission === 'granted' && (
            <div className="flex items-center gap-1.5 text-signal-down text-xs font-medium">
              <Check className="w-4 h-4" />
              已开启
            </div>
          )}
        </div>
        {permission === 'denied' && (
          <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-lg">
            通知权限已被拒绝。请在浏览器设置中手动开启。
          </p>
        )}
      </div>

      {/* Notification Preferences */}
      {permission === 'granted' && (
        <div className="p-5 rounded-xl bg-surface-1 border border-border-default">
          <h3 className="text-sm font-semibold text-text-primary mb-4">通知类型</h3>
          <div className="space-y-3">
            {prefItems.map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-sm font-medium text-text-primary">{label}</div>
                  <div className="text-xs text-text-tertiary">{description}</div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={() => handleTogglePref(key)}
                    className="sr-only"
                  />
                  <div
                    className={`w-10 h-6 rounded-full transition-colors ${
                      prefs[key] ? 'bg-brand' : 'bg-surface-3'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform mt-1 ${
                        prefs[key] ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
