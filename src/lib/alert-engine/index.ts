import type { AlertRule, AlertEvent, AnomalyDetection, NewsRiskScan, AlertSeverity } from './types';
import type { Quote, Kline, NewsItem } from '@/lib/data-provider/types';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';

export function evaluateAlertRule(rule: AlertRule, quote: Quote): AlertEvent | null {
  let triggered = false;
  let message = '';

  switch (rule.condition) {
    case 'above':
      triggered = quote.price > rule.threshold;
      message = `${rule.symbol} 当前价格 ${quote.price.toFixed(2)} 超过阈值 ${rule.threshold}`;
      break;
    case 'below':
      triggered = quote.price < rule.threshold;
      message = `${rule.symbol} 当前价格 ${quote.price.toFixed(2)} 低于阈值 ${rule.threshold}`;
      break;
    case 'increases_by':
      triggered = quote.changePercent > rule.threshold;
      message = `${rule.symbol} 涨幅 ${quote.changePercent.toFixed(2)}% 超过 ${rule.threshold}%`;
      break;
    case 'decreases_by':
      triggered = quote.changePercent < -rule.threshold;
      message = `${rule.symbol} 跌幅 ${Math.abs(quote.changePercent).toFixed(2)}% 超过 ${rule.threshold}%`;
      break;
  }

  if (!triggered) return null;

  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ruleId: rule.id,
    userId: rule.userId,
    symbol: rule.symbol,
    severity: rule.severity,
    title: `${rule.name} 触发`,
    message,
    triggeredAt: new Date().toISOString(),
    acknowledged: false,
    data: { price: quote.price, change: quote.changePercent },
  };
}

export function detectAnomalies(symbol: string, klines: Kline[]): AnomalyDetection[] {
  if (klines.length < 20) return [];

  const anomalies: AnomalyDetection[] = [];
  const recent = klines.slice(-5);
  const historical = klines.slice(-20, -5);

  // Price spike detection
  const avgClose = historical.reduce((s, k) => s + k.close, 0) / historical.length;
  const stdDev = Math.sqrt(historical.reduce((s, k) => s + Math.pow(k.close - avgClose, 2), 0) / historical.length);
  const latestClose = recent[recent.length - 1].close;
  const zScore = stdDev > 0 ? (latestClose - avgClose) / stdDev : 0;

  if (Math.abs(zScore) > 2) {
    anomalies.push({
      symbol,
      type: 'price_spike',
      detected: true,
      magnitude: Math.min(1, Math.abs(zScore) / 3),
      description: `价格${zScore > 0 ? '异常上涨' : '异常下跌'}，偏离均值 ${Math.abs(zScore).toFixed(1)} 个标准差`,
      timestamp: new Date().toISOString(),
    });
  }

  // Volume surge detection
  const avgVolume = historical.reduce((s, k) => s + k.volume, 0) / historical.length;
  const latestVolume = recent[recent.length - 1].volume;
  const volumeRatio = avgVolume > 0 ? latestVolume / avgVolume : 1;

  if (volumeRatio > 3) {
    anomalies.push({
      symbol,
      type: 'volume_surge',
      detected: true,
      magnitude: Math.min(1, volumeRatio / 5),
      description: `成交量异常放大，为近期均值的 ${volumeRatio.toFixed(1)} 倍`,
      timestamp: new Date().toISOString(),
    });
  }

  // Gap detection
  const todayOpen = recent[recent.length - 1].open;
  const yesterdayClose = recent.length > 1 ? recent[recent.length - 2].close : todayOpen;
  const gapPct = yesterdayClose > 0 ? Math.abs(todayOpen - yesterdayClose) / yesterdayClose * 100 : 0;

  if (gapPct > 3) {
    anomalies.push({
      symbol,
      type: 'gap',
      detected: true,
      magnitude: Math.min(1, gapPct / 10),
      description: `出现${todayOpen > yesterdayClose ? '向上' : '向下'}跳空缺口 ${gapPct.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  }

  return anomalies;
}

export async function scanNewsRisk(symbol: string, news: NewsItem[], holdings?: string[]): Promise<NewsRiskScan> {
  if (!isDeepSeekConfigured()) {
    return {
      symbol,
      riskLevel: 'low',
      riskFactors: [],
      sentiment: 'neutral',
      summary: 'AI 风险扫描不可用',
      newsItems: [],
    };
  }

  const newsSummary = news.slice(0, 5).map(n => `- ${n.title} [${n.source}]`).join('\n');
  const holdingsContext = holdings?.length ? `用户持仓：${holdings.join('、')}` : '';

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `分析新闻对投资标的风险影响。返回 JSON：
{
  "risk_level": "low | medium | high",
  "risk_factors": ["风险因素1", "风险因素2"],
  "sentiment": "bullish | bearish | neutral",
  "summary": "50字以内的风险评估"
}`
        },
        {
          role: 'user',
          content: `标的：${symbol}\n${holdingsContext}\n\n近期新闻：\n${newsSummary}`,
        },
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.2,
      max_tokens: 256,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response');

    const result = JSON.parse(content);

    return {
      symbol,
      riskLevel: ['low', 'medium', 'high'].includes(result.risk_level) ? result.risk_level : 'low',
      riskFactors: Array.isArray(result.risk_factors) ? result.risk_factors : [],
      sentiment: ['bullish', 'bearish', 'neutral'].includes(result.sentiment) ? result.sentiment : 'neutral',
      summary: result.summary || '',
      newsItems: news.map(n => ({
        title: n.title,
        source: n.source,
        relevance: 0.5,
      })),
    };
  } catch {
    return {
      symbol,
      riskLevel: 'low',
      riskFactors: [],
      sentiment: 'neutral',
      summary: '风险扫描失败',
      newsItems: [],
    };
  }
}

export function getDefaultAlertRules(userId: string, symbols: string[]): AlertRule[] {
  const rules: AlertRule[] = [];
  const now = new Date().toISOString();

  symbols.forEach(symbol => {
    rules.push({
      id: `rule-price-up-${symbol}`,
      userId,
      name: `${symbol} 大涨预警`,
      type: 'change',
      symbol,
      condition: 'increases_by',
      threshold: 5,
      severity: 'warning',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    rules.push({
      id: `rule-price-down-${symbol}`,
      userId,
      name: `${symbol} 大跌预警`,
      type: 'change',
      symbol,
      condition: 'decreases_by',
      threshold: 5,
      severity: 'critical',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  });

  return rules;
}
