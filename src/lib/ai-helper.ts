import OpenAI from 'openai';
import { ButterflyNode } from '@/types';

// IMPORTANT: In a production environment, this key should be in process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-7534f5c8db3e4d9b97ebac2be27e62e6';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

const openai = new OpenAI({
  baseURL: DEEPSEEK_BASE_URL,
  apiKey: DEEPSEEK_API_KEY,
  dangerouslyAllowBrowser: true // Allowed for this demo environment, but use server-side in prod
});

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
  if (!DEEPSEEK_API_KEY) {
    console.warn('DEEPSEEK_API_KEY is missing, falling back to mock analysis.');
    return getMockAnalysis(text);
  }

  try {
    const prompt = `
      You are a professional financial analyst for InsightNote. 
      Analyze the following financial text (which may be a news snippet, research report, or article) and extract key insights.
      
      Output ONLY a valid JSON object with the following structure:
      {
        "summary_tldr": "A concise summary in Chinese (max 150 characters)",
        "tags": ["Tag1", "Tag2"], // Relevant tags in Chinese (e.g. 宏观, 科技, AI)
        "sentiment": "bullish" | "bearish" | "neutral",
        "related_tickers": ["AAPL", "BTC-USD"], // Extract stock/crypto tickers mentioned or relevant
        "difficulty": "easy" | "medium" | "hard",
        "butterfly_nodes": [
          // A causal chain graph: Root Event -> Market Reaction -> Sector Impact -> Ticker
          // At least 4 nodes. type can be: 'root' | 'event' | 'impact' | 'ticker'
          // Ensure parent_id creates a connected chain. The first node has parent_id: null.
          // Example:
          // { "label": "美联储降息", "type": "root", "parent_id": null, "id": "1" },
          // { "label": "美元走弱", "type": "event", "parent_id": "1", "id": "2" },
          // { "label": "黄金上涨", "type": "impact", "parent_id": "2", "id": "3" },
          // { "label": "GLD", "type": "ticker", "parent_id": "3", "id": "4" }
        ]
      }

      Text to analyze:
      "${text.slice(0, 3000).replace(/"/g, '\\"')}"
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful financial analysis assistant that outputs strictly JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'deepseek-chat',
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
  if (!DEEPSEEK_API_KEY) {
    return { status: 'active', reason: 'Missing API Key for verification' };
  }

  try {
    const prompt = `
      You are a strict financial auditor. Verify if the following prediction came true based on the provided market context.
      
      Prediction:
      Symbol: ${symbol}
      Direction: ${direction} (User expected price to go ${direction === 'bullish' ? 'UP' : direction === 'bearish' ? 'DOWN' : 'SIDEWAYS'})
      Target Price (if any): ${targetPrice || 'N/A'}
      
      Current Market Context (Live Data/News):
      "${marketContext.slice(0, 1000)}"

      Task:
      Determine if the prediction is 'won' (successful), 'lost' (failed), or 'active' (too early to tell/ambiguous).
      If a Target Price is provided, strictly compare the context price against it.
      If no Target Price, judge based on the general trend described in context.

      Output ONLY valid JSON:
      {
        "status": "won" | "lost" | "active",
        "reason": "Short explanation in Chinese (max 50 chars)"
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a strict financial auditor that outputs strictly JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'deepseek-chat',
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
  if (!DEEPSEEK_API_KEY) return changePercent > 0 ? '强势上涨' : '震荡回调';

  try {
    const prompt = `
      Provide a very short (max 10 chars) Chinese reason for why ${symbol} moved ${changePercent.toFixed(2)}% today.
      Be creative but professional (e.g. "AI热潮", "财报超预期", "技术回调").
      Don't use complete sentences, just a phrase.
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 20
    });

    return completion.choices[0].message.content?.trim() || (changePercent > 0 ? '资金流入' : '获利了结');
  } catch {
    return changePercent > 0 ? '资金流入' : '获利了结';
  }
}
