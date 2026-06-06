import { ButterflyNode } from '@/types';
import { callAI } from '@/lib/ai-utils';
import { buildAnalyzeContentPrompt, buildVerifyPredictionPrompt, buildMarketInsightPrompt } from '@/lib/prompts';

export interface AnalysisResult {
  summary_tldr: string;
  tags: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  related_tickers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  butterfly_nodes: Omit<ButterflyNode, 'id' | 'post_id' | 'created_at' | 'updated_at'>[];
}

export interface VerificationResult {
  status: 'won' | 'lost' | 'active';
  reason: string;
}

function getMockAnalysis(text: string): AnalysisResult {
  const lowerText = text.toLowerCase();
  
  let sentiment: AnalysisResult['sentiment'] = 'neutral';
  if (lowerText.includes('growth') || lowerText.includes('bull') || lowerText.includes('up') || lowerText.includes('增长') || lowerText.includes('看多')) {
    sentiment = 'bullish';
  } else if (lowerText.includes('risk') || lowerText.includes('bear') || lowerText.includes('down') || lowerText.includes('风险') || lowerText.includes('看空')) {
    sentiment = 'bearish';
  }

  const commonTags = [
    { en: 'AI', cn: 'AI' },
    { en: 'Macro', cn: '宏观' },
    { en: 'Crypto', cn: '加密货币' },
    { en: 'Tech', cn: '科技' },
    { en: 'Energy', cn: '能源' },
    { en: 'Fed', cn: '美联储' }
  ];
  const tags: string[] = [];
  commonTags.forEach(tag => {
    if (lowerText.includes(tag.en.toLowerCase()) || lowerText.includes(tag.cn)) {
      tags.push(tag.cn);
    }
  });
  if (tags.length === 0) tags.push('市场');

  const tickerRegex = /\b[A-Z]{2,5}\b/g;
  const potentialTickers = text.match(tickerRegex) || [];
  const commonWords = ['THE', 'AND', 'FOR', 'BUT', 'NOT', 'YES', 'WHO', 'WHY'];
  const related_tickers = Array.from(new Set(potentialTickers.filter(t => !commonWords.includes(t)))).slice(0, 5);

  const summary_tldr = text.slice(0, 150) + (text.length > 150 ? '...' : '');
  const difficulty = text.length > 2000 ? 'hard' : text.length > 1000 ? 'medium' : 'easy';

  const nodes: AnalysisResult['butterfly_nodes'] = [
    { label: '核心事件', type: 'root', parent_id: null },
    { label: '市场反应', type: 'event', parent_id: 'root-placeholder' },
    { label: '板块影响', type: 'impact', parent_id: 'event-placeholder' },
    { label: related_tickers[0] || 'SPY', type: 'ticker', parent_id: 'impact-placeholder' },
  ];

  return { summary_tldr, tags, sentiment, related_tickers, difficulty, butterfly_nodes: nodes };
}

export async function analyzeContent(text: string): Promise<AnalysisResult> {
  const { system, user } = buildAnalyzeContentPrompt(text);

  const result = await callAI<AnalysisResult>(
    { system, user, temperature: 0.1, maxTokens: 1024, responseFormat: 'json_object' }
  );

  if (!result.success || !result.data) {
    return getMockAnalysis(text);
  }

  const data = result.data;
  return {
    summary_tldr: data.summary_tldr || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    sentiment: ['bullish', 'bearish', 'neutral'].includes(data.sentiment) ? data.sentiment : 'neutral',
    related_tickers: Array.isArray(data.related_tickers) ? data.related_tickers : [],
    difficulty: ['easy', 'medium', 'hard'].includes(data.difficulty) ? data.difficulty : 'medium',
    butterfly_nodes: Array.isArray(data.butterfly_nodes) ? data.butterfly_nodes.map((n) => ({
      label: n.label || 'Node',
      type: (['root', 'event', 'impact', 'ticker'].includes(n.type) ? n.type : 'event') as ButterflyNode['type'],
      parent_id: n.parent_id,
      tickerSymbol: n.type === 'ticker' ? (n.label || n.tickerSymbol) : undefined
    })) : []
  };
}

export async function verifyPrediction(
  symbol: string,
  direction: string,
  targetPrice: number | null,
  marketContext: string
): Promise<VerificationResult> {
  const { system, user } = buildVerifyPredictionPrompt(symbol, direction, targetPrice, marketContext);

  const result = await callAI<VerificationResult>(
    { system, user, temperature: 0, responseFormat: 'json_object' }
  );

  if (!result.success || !result.data) {
    return { status: 'active', reason: 'AI Verification unavailable' };
  }

  const data = result.data;
  return {
    status: ['won', 'lost', 'active'].includes(data.status) ? data.status : 'active',
    reason: data.reason || 'Verification pending',
  };
}

export async function generateMarketInsight(symbol: string, changePercent: number): Promise<string> {
  const prompt = buildMarketInsightPrompt(symbol, changePercent);

  const result = await callAI<string>(
    { system: '', user: prompt, temperature: 0.7, maxTokens: 20 }
  );

  return result.success && result.data ? result.data : (changePercent > 0 ? '资金流入' : '获利了结');
}
