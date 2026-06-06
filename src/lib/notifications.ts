'use client';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission as NotificationPermission;
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission as NotificationPermission;
}

export function sendNotification(options: PushNotificationOptions): Notification | null {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || '/favicon.ico',
    badge: options.badge || '/favicon.ico',
    tag: options.tag,
    data: options.data,
    requireInteraction: options.requireInteraction,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  return notification;
}

export function sendAlertNotification(alert: {
  type: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}) {
  const iconMap = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return sendNotification({
    title: `${iconMap[alert.severity]} ${alert.title}`,
    body: alert.message,
    tag: `alert-${alert.type}-${Date.now()}`,
    requireInteraction: alert.severity === 'critical',
  });
}

export function sendPriceAlertNotification(symbol: string, price: number, change: number) {
  const direction = change >= 0 ? '📈' : '📉';
  const changeStr = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;

  return sendNotification({
    title: `${direction} ${symbol} 价格变动`,
    body: `当前价格: $${price.toFixed(2)} (${changeStr})`,
    tag: `price-${symbol}`,
  });
}

export function sendPredictionResultNotification(symbol: string, status: 'won' | 'lost') {
  const icon = status === 'won' ? '✅' : '❌';
  const label = status === 'won' ? '预测正确' : '预测错误';

  return sendNotification({
    title: `${icon} 预测结果`,
    body: `${symbol} 的预测${label}`,
    tag: `prediction-${symbol}`,
  });
}

// Store notification preferences
const NOTIFICATION_PREFS_KEY = 'insightnote_notification_prefs';

export interface NotificationPreferences {
  priceAlerts: boolean;
  predictionResults: boolean;
  newsAlerts: boolean;
  biasWarnings: boolean;
}

const defaultPrefs: NotificationPreferences = {
  priceAlerts: true,
  predictionResults: true,
  newsAlerts: true,
  biasWarnings: true,
};

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return defaultPrefs;
  
  try {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (stored) {
      return { ...defaultPrefs, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
  }
  
  return defaultPrefs;
}

export function setNotificationPreferences(prefs: Partial<NotificationPreferences>) {
  if (typeof window === 'undefined') return;
  
  const current = getNotificationPreferences();
  const updated = { ...current, ...prefs };
  
  try {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to set notification preferences:', error);
  }
}
