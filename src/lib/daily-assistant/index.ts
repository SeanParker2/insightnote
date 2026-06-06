import type { DailyBriefing, Insight, PortfolioDailySummary, ActionSuggestion, BiasAlert, ReadingRecommendation, MarketSentiment, HoldingDailyStatus } from './types';
import type { Quote, NewsItem } from '@/lib/data-provider/types';
import { createDataProvider } from '@/lib/data-provider';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';

interface UserContext {
  userId: string;
  holdings: Array<{ symbol: string; name: string; quantity: number; avgCost: number; sector?: string }>;
  watchlist: string[];
  recentReading: Array<{ title: string; sentiment?: string }>;
  recentDecisions: Array<{ symbol: string; action: string; emotion?: string; returnPct?: number }>;
}

export async function generateDailyBriefing(ctx: UserContext): Promise<DailyBriefing> {
  const provider = createDataProvider();
  
  const allSymbols = [...new Set([
    ...ctx.holdings.map(h => h.symbol),
    ...ctx.watchlist,
  ])];

  const [quotes, news] = await Promise.all([
    provider.getQuotes(allSymbols).catch(() => []),
    Promise.all(allSymbols.slice(0, 5).map(s => provider.getNews(s, 3).catch(() => []))),
  ]);

  const quoteMap = new Map<string, Quote>();
  quotes.forEach(q => quoteMap.set(q.symbol, q));

  const allNews = news.flat().slice(0, 10);

  const portfolioSummary = buildPortfolioSummary(ctx.holdings, quoteMap);
  const insights = await generateInsights(ctx, quotes, allNews);
  const actionSuggestion = await generateActionSuggestion(ctx, quotes, portfolioSummary);
  const biasAlert = detectBiasAlert(ctx);
  const readingList = await generateReadingList(ctx, allNews);
  const marketSentiment = calculateMarketSentiment(quotes);
  const headline = await generateHeadline(insights, portfolioSummary);

  return {
    date: new Date().toISOString().split('T')[0],
    userId: ctx.userId,
    headline,
    topInsights: insights.slice(0, 3),
    portfolioSummary,
    actionSuggestion,
    biasAlert,
    readingList,
    marketSentiment,
  };
}

function buildPortfolioSummary(
  holdings: UserContext['holdings'],
  quoteMap: Map<string, Quote>
): PortfolioDailySummary {
  const holdingStatuses: HoldingDailyStatus[] = holdings.map(h => {
    const quote = quoteMap.get(h.symbol);
    const price = quote?.price ?? h.avgCost;
    const dayChange = quote?.change ?? 0;
    const dayChangePct = quote?.changePercent ?? 0;
    const marketValue = h.quantity * price;

    return {
      symbol: h.symbol,
      name: h.name,
      price,
      dayChange,
      dayChangePct,
      news: null,
      signal: 'hold' as const,
      signalReason: '',
    };
  });

  const totalValue = holdingStatuses.reduce((s, h) => s + h.price * (holdings.find(x => x.symbol === h.symbol)?.quantity ?? 0), 0);
  const totalCost = holdings.reduce((s, h) => s + h.avgCost * h.quantity, 0);
  const dayChange = holdingStatuses.reduce((s, h) => s + h.dayChange * (holdings.find(x => x.symbol === h.symbol)?.quantity ?? 0), 0);
  const prevValue = totalValue - dayChange;
  const dayChangePct = prevValue > 0 ? (dayChange / prevValue) * 100 : 0;

  const sorted = [...holdingStatuses].sort((a, b) => b.dayChangePct - a.dayChangePct);

  return {
    totalValue,
    dayChange,
    dayChangePct,
    bestPerformer: sorted[0] ? { symbol: sorted[0].symbol, change: sorted[0].dayChangePct } : null,
    worstPerformer: sorted[sorted.length - 1] ? { symbol: sorted[sorted.length - 1].symbol, change: sorted[sorted.length - 1].dayChangePct } : null,
    alertsCount: 0,
    holdings: holdingStatuses,
  };
}

async function generateInsights(
  ctx: UserContext,
  quotes: Quote[],
  news: NewsItem[]
): Promise<Insight[]> {
  if (!isDeepSeekConfigured()) {
    return generateFallbackInsights(quotes, news);
  }

  const quotesSummary = quotes.slice(0, 5).map(q => 
    `${q.symbol}: ${q.price.toFixed(2)} (${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`
  ).join('\n');

  const newsSummary = news.slice(0, 5).map(n => `- ${n.title}`).join('\n');

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `你是投资分析师。根据持仓和新闻，生成 3 条最重要的洞察。
每条洞察 50 字以内，说明：发生了什么 → 意味着什么 → 影响什么。

返回 JSON：
{
  "insights": [
    {
      "category": "macro | sector | stock | event | risk",
      "title": "10字标题",
      "summary": "50字洞察",
      "impact": "bullish | bearish | neutral",
      "affected_symbols": ["代码"],
      "importance": "high | medium | low",
      "action_required": true/false
    }
  ]
}`
        },
        {
          role: 'user',
          content: `用户持仓：${ctx.holdings.map(h => h.symbol).join('、')}\n\n行情：\n${quotesSummary}\n\n新闻：\n${newsSummary}`,
        },
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.3,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) return generateFallbackInsights(quotes, news);

    const result = JSON.parse(content);
    return (result.insights || []).map((i: any, idx: number) => ({
      id: `insight-${idx}`,
      category: ['macro', 'sector', 'stock', 'event', 'risk'].includes(i.category) ? i.category : 'stock',
      title: i.title || '',
      summary: i.summary || '',
      impact: ['bullish', 'bearish', 'neutral'].includes(i.impact) ? i.impact : 'neutral',
      affectedSymbols: Array.isArray(i.affected_symbols) ? i.affected_symbols : [],
      importance: ['high', 'medium', 'low'].includes(i.importance) ? i.importance : 'medium',
      actionRequired: Boolean(i.action_required),
    }));
  } catch {
    return generateFallbackInsights(quotes, news);
  }
}

function generateFallbackInsights(quotes: Quote[], news: NewsItem[]): Insight[] {
  const insights: Insight[] = [];
  
  const bigMovers = quotes.filter(q => Math.abs(q.changePercent) > 3);
  if (bigMovers.length > 0) {
    const q = bigMovers[0];
    insights.push({
      id: 'insight-0',
      category: 'stock',
      title: `${q.symbol} 异动`,
      summary: `${q.symbol} ${q.changePercent > 0 ? '上涨' : '下跌'} ${Math.abs(q.changePercent).toFixed(1)}%，需关注`,
      impact: q.changePercent > 0 ? 'bullish' : 'bearish',
      affectedSymbols: [q.symbol],
      importance: 'high',
      actionRequired: true,
    });
  }

  return insights;
}

async function generateActionSuggestion(
  ctx: UserContext,
  quotes: Quote[],
  summary: PortfolioDailySummary
): Promise<ActionSuggestion | null> {
  if (ctx.holdings.length === 0) return null;

  const losers = summary.holdings.filter(h => h.dayChangePct < -3);
  const winners = summary.holdings.filter(h => h.dayChangePct > 5);

  if (losers.length > 0) {
    return {
      type: 'review',
      title: '检查止损位',
      description: `${losers.map(l => l.symbol).join('、')} 今日跌幅较大，建议检查是否需要止损`,
      urgency: 'high',
      relatedSymbols: losers.map(l => l.symbol),
      reasoning: '大跌幅可能触发止损，需人工确认',
    };
  }

  if (winners.length > 0) {
    return {
      type: 'take_profit',
      title: '考虑部分止盈',
      description: `${winners.map(w => w.symbol).join('、')} 今日涨幅较大，可考虑部分止盈`,
      urgency: 'medium',
      relatedSymbols: winners.map(w => w.symbol),
      reasoning: '大幅上涨后可考虑锁定部分利润',
    };
  }

  return null;
}

function detectBiasAlert(ctx: UserContext): BiasAlert | null {
  const recentEmotions = ctx.recentDecisions.map(d => d.emotion).filter(Boolean);
  const fearCount = recentEmotions.filter(e => e === 'fearful' || e === 'anxious').length;
  const greedCount = recentEmotions.filter(e => e === 'greedy' || e === 'euphoric' || e === 'fomo').length;

  if (fearCount >= 3) {
    return {
      type: 'loss_aversion',
      severity: 'moderate',
      title: '损失厌恶倾向',
      description: '近期多次在恐惧情绪下做出决策',
      suggestion: '暂停交易，列出客观的止损理由而非情绪反应',
    };
  }

  if (greedCount >= 3) {
    return {
      type: 'overconfidence',
      severity: 'moderate',
      title: '过度自信倾向',
      description: '近期多次在贪婪情绪下做出决策',
      suggestion: '降低仓位，避免追涨',
    };
  }

  return null;
}

async function generateReadingList(
  ctx: UserContext,
  news: NewsItem[]
): Promise<ReadingRecommendation[]> {
  return news.slice(0, 3).map((n, i) => ({
    id: `reading-${i}`,
    title: n.title,
    summary: n.summary?.slice(0, 100) || '',
    reason: '与你的持仓相关',
    category: 'news',
    estimatedReadTime: 3,
  }));
}

function calculateMarketSentiment(quotes: Quote[]): MarketSentiment {
  const upCount = quotes.filter(q => q.changePercent > 0).length;
  const downCount = quotes.filter(q => q.changePercent < 0).length;
  const total = quotes.length || 1;
  
  const score = ((upCount - downCount) / total) * 100;
  
  let label: MarketSentiment['label'];
  if (score > 50) label = 'extreme_greed';
  else if (score > 20) label = 'greed';
  else if (score > -20) label = 'neutral';
  else if (score > -50) label = 'fear';
  else label = 'extreme_fear';

  return {
    score,
    label,
    indicators: {},
    description: label === 'extreme_greed' ? '市场极度贪婪，注意风险' :
                 label === 'greed' ? '市场情绪偏乐观' :
                 label === 'neutral' ? '市场情绪中性' :
                 label === 'fear' ? '市场情绪偏悲观' :
                 '市场极度恐惧，可能是机会',
  };
}

async function generateHeadline(
  insights: Insight[],
  summary: PortfolioDailySummary
): Promise<string> {
  if (!isDeepSeekConfigured()) {
    const change = summary.dayChangePct >= 0 ? '上涨' : '下跌';
    return `今日持仓${change} ${Math.abs(summary.dayChangePct).toFixed(2)}%`;
  }

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: '用一句话（15字以内）概括今日投资要点。直接给结论，不要废话。'
        },
        {
          role: 'user',
          content: `持仓涨跌：${summary.dayChangePct.toFixed(2)}%\n主要洞察：${insights[0]?.summary || '无'}`,
        },
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.7,
      max_tokens: 32,
    });

    return completion.choices[0].message.content || `持仓${summary.dayChangePct >= 0 ? '上涨' : '下跌'} ${Math.abs(summary.dayChangePct).toFixed(2)}%`;
  } catch {
    return `持仓${summary.dayChangePct >= 0 ? '上涨' : '下跌'} ${Math.abs(summary.dayChangePct).toFixed(2)}%`;
  }
}
