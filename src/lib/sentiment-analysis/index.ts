import { callAI } from '@/lib/ai-utils';

export interface SentimentResult {
  text: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  keywords: string[];
  reasoning: string;
}

export interface BatchSentimentResult {
  results: SentimentResult[];
  summary: {
    overallSentiment: 'bullish' | 'bearish' | 'neutral';
    averageScore: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
  };
}

function fallbackSentiment(text: string): SentimentResult {
  const bullishWords = ['上涨', '利好', '看多', '突破', '新高', '增长', '超预期', '买入', '推荐'];
  const bearishWords = ['下跌', '利空', '看空', '跌破', '新低', '下滑', '低于预期', '卖出', '风险'];

  const lowerText = text.toLowerCase();
  let bullishScore = 0;
  let bearishScore = 0;

  bullishWords.forEach(word => { if (lowerText.includes(word)) bullishScore++; });
  bearishWords.forEach(word => { if (lowerText.includes(word)) bearishScore++; });

  const total = bullishScore + bearishScore || 1;
  const score = (bullishScore - bearishScore) / total;

  return {
    text,
    sentiment: score > 0.2 ? 'bullish' : score < -0.2 ? 'bearish' : 'neutral',
    score,
    confidence: 0.3,
    keywords: [],
    reasoning: '基于关键词分析',
  };
}

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const system = `你是金融情绪分析专家。分析文本的市场情绪。
返回 JSON：
{
  "sentiment": "bullish | bearish | neutral",
  "score": -1到1之间的数字，bullish为正，bearish为负
  "confidence": 0到1之间的置信度
  "keywords": ["关键词1", "关键词2"]
  "reasoning": "30字以内的分析理由"
}`;

  const result = await callAI<{
    sentiment?: string;
    score?: number;
    confidence?: number;
    keywords?: string[];
    reasoning?: string;
  }>({ system, user: text.slice(0, 1000), temperature: 0.1, maxTokens: 256, responseFormat: 'json_object' });

  if (!result.success || !result.data) {
    return fallbackSentiment(text);
  }

  const data = result.data;
  return {
    text,
    sentiment: ['bullish', 'bearish', 'neutral'].includes(data.sentiment ?? '') ? data.sentiment as SentimentResult['sentiment'] : 'neutral',
    score: typeof data.score === 'number' ? Math.max(-1, Math.min(1, data.score)) : 0,
    confidence: typeof data.confidence === 'number' ? Math.max(0, Math.min(1, data.confidence)) : 0.5,
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    reasoning: data.reasoning || '',
  };
}

export async function batchAnalyzeSentiment(texts: string[]): Promise<BatchSentimentResult> {
  const results = await Promise.all(texts.map(text => analyzeSentiment(text)));

  const bullishCount = results.filter(r => r.sentiment === 'bullish').length;
  const bearishCount = results.filter(r => r.sentiment === 'bearish').length;
  const neutralCount = results.filter(r => r.sentiment === 'neutral').length;
  const averageScore = results.reduce((s, r) => s + r.score, 0) / results.length;

  return {
    results,
    summary: {
      overallSentiment: averageScore > 0.1 ? 'bullish' : averageScore < -0.1 ? 'bearish' : 'neutral',
      averageScore,
      bullishCount,
      bearishCount,
      neutralCount,
    },
  };
}

export async function analyzeNewsSentiment(newsItems: Array<{ title: string; summary?: string }>): Promise<{
  items: Array<{ title: string; sentiment: SentimentResult }>;
  overall: 'bullish' | 'bearish' | 'neutral';
  score: number;
}> {
  const items = await Promise.all(
    newsItems.map(async (item) => ({
      title: item.title,
      sentiment: await analyzeSentiment(`${item.title} ${item.summary || ''}`),
    }))
  );

  const avgScore = items.reduce((s, item) => s + item.sentiment.score, 0) / items.length;

  return {
    items,
    overall: avgScore > 0.1 ? 'bullish' : avgScore < -0.1 ? 'bearish' : 'neutral',
    score: avgScore,
  };
}
