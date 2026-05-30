import { ButterflyNode } from '@/types';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';
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

// Fallback logic in case API fails
function getMockAnalysis(text: string): AnalysisResult {
  const lowerText = text.toLowerCase();
  
  // 1. Sentiment Analysis (Fallback)
  let sentiment: AnalysisResult['sentiment'] = 'neutral';
  if (lowerText.includes('growth') || lowerText.includes('bull') || lowerText.includes('up') || lowerText.includes('增长') || lowerText.includes('看多')) {
    sentiment = 'bullish';
  } else if (lowerText.includes('risk') || lowerText.includes('bear') || lowerText.includes('down') || lowerText.includes('风险') || lowerText.includes('看空')) {
    sentiment = 'bearish';
  }

  // 2. Tags (Fallback)
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

  // 3. Tickers (Fallback)
  const tickerRegex = /\b[A-Z]{2,5}\b/g;
  const potentialTickers = text.match(tickerRegex) || [];
  const commonWords = ['THE', 'AND', 'FOR', 'BUT', 'NOT', 'YES', 'WHO', 'WHY'];
  const related_tickers = Array.from(new Set(potentialTickers.filter(t => !commonWords.includes(t)))).slice(0, 5);

  // 4. Summary (Fallback)
  const summary_tldr = text.slice(0, 150) + (text.length > 150 ? '...' : '');

  // 5. Difficulty (Fallback)
  const difficulty = text.length > 2000 ? 'hard' : text.length > 1000 ? 'medium' : 'easy';

  // 6. Butterfly Nodes (Fallback)
  const nodes: AnalysisResult['butterfly_nodes'] = [
    { label: '核心事件', type: 'root', parent_id: null },
    { label: '市场反应', type: 'event', parent_id: 'root-placeholder' },
    { label: '板块影响', type: 'impact', parent_id: 'event-placeholder' },
    { label: related_tickers[0] || 'SPY', type: 'ticker', parent_id: 'impact-placeholder' },
  ];

  return { summary_tldr, tags, sentiment, related_tickers, difficulty, butterfly_nodes: nodes };
}

export async function analyzeContent(text: string): Promise<AnalysisResult> {
  if (!isDeepSeekConfigured()) {
    console.warn('DEEPSEEK_API_KEY is missing, falling back to mock analysis.');
    return getMockAnalysis(text);
  }

  try {
    const { system, user } = buildAnalyzeContentPrompt(text);

    const completion = await deepseek.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;

    if (!content) {
      throw new Error('Empty response from DeepSeek API');
    }

    const result = JSON.parse(content);
    
    // Post-processing to ensure valid structure
    return {
      summary_tldr: result.summary_tldr || '',
      tags: Array.isArray(result.tags) ? result.tags : [],
      sentiment: ['bullish', 'bearish', 'neutral'].includes(result.sentiment) ? result.sentiment : 'neutral',
      related_tickers: Array.isArray(result.related_tickers) ? result.related_tickers : [],
      difficulty: ['easy', 'medium', 'hard'].includes(result.difficulty) ? result.difficulty : 'medium',
      butterfly_nodes: Array.isArray(result.butterfly_nodes) ? result.butterfly_nodes.map((n: any) => ({
        label: n.label || 'Node',
        type: ['root', 'event', 'impact', 'ticker'].includes(n.type) ? n.type : 'event',
        parent_id: n.parent_id,
        tickerSymbol: n.type === 'ticker' ? (n.label || n.tickerSymbol) : undefined
      })) : []
    };

  } catch (error) {
    console.error('AI Analysis failed, falling back to mock:', error);
    return getMockAnalysis(text);
  }
}

/**
 * AI-Powered Prediction Verification
 * Compares a prediction against market context (text) to determine outcome.
 */
export async function verifyPrediction(
  symbol: string,
  direction: string,
  targetPrice: number | null,
  marketContext: string
): Promise<VerificationResult> {
  if (!isDeepSeekConfigured()) {
    return { status: 'active', reason: 'Missing API Key for verification' };
  }

  try {
    const { system, user } = buildVerifyPredictionPrompt(symbol, direction, targetPrice, marketContext);

    const completion = await deepseek.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.0,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty verification response');
    
    const result = JSON.parse(content);
    return {
      status: ['won', 'lost', 'active'].includes(result.status) ? result.status : 'active',
      reason: result.reason || 'Verification pending'
    };

  } catch (error) {
    console.error('AI Verification failed:', error);
    return { status: 'active', reason: 'AI Verification unavailable' };
  }
}

/**
 * AI-Powered Market Insight Generation
 * Generates a short reason for a price move.
 */
export async function generateMarketInsight(symbol: string, changePercent: number): Promise<string> {
  if (!isDeepSeekConfigured()) return changePercent > 0 ? '强势上涨' : '震荡回调';

  try {
    const prompt = buildMarketInsightPrompt(symbol, changePercent);

    const completion = await deepseek.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: DEEPSEEK_MODEL,
      temperature: 0.7,
      max_tokens: 20
    });

    return completion.choices[0].message.content?.trim() || (changePercent > 0 ? '资金流入' : '获利了结');
  } catch {
    return changePercent > 0 ? '资金流入' : '获利了结';
  }
}
