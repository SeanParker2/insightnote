import { callAI } from '@/lib/ai-utils';
import type { AgentRole, AgentAnalysis, AgentMessage, DebateTopic, DebateResult, AnalysisResult, Recommendation } from './types';
import type { Quote, Financials, NewsItem, Kline } from '@/lib/data-provider/types';
import { runAgent } from './analysts';

interface AnalysisContext {
  symbol: string;
  quote: Quote | null;
  financials: Financials | null;
  news: NewsItem[];
  klines: Kline[];
  userHoldings?: { symbol: string; quantity: number; avgCost: number }[];
}

export async function runFullAnalysis(ctx: AnalysisContext): Promise<AnalysisResult> {
  const agentRoles: AgentRole[] = ['fundamental', 'sentiment', 'technical', 'risk'];
  const agentResults = await Promise.all(agentRoles.map(role => runAgent(role, ctx)));
  const [fundamental, sentiment, technical, risk] = agentResults;

  const debate = await runDebate({
    id: `debate-${ctx.symbol}-${Date.now()}`,
    question: `${ctx.symbol} 当前是否值得投资？`,
    context: buildDebateContext(ctx, agentResults),
    symbol: ctx.symbol,
  }, agentResults);

  const recommendation = await generateRecommendation(ctx, agentResults, debate);

  return {
    symbol: ctx.symbol,
    timestamp: new Date().toISOString(),
    agents: { fundamental, sentiment, technical, risk },
    debate,
    recommendation,
  };
}

function buildDebateContext(ctx: AnalysisContext, analyses: AgentAnalysis[]): string {
  const parts = [`标的：${ctx.symbol}`];
  if (ctx.quote) parts.push(`当前价格：${ctx.quote.price}，涨跌：${ctx.quote.changePercent.toFixed(2)}%`);
  analyses.forEach(a => {
    parts.push(`\n[${a.role}分析师] ${a.summary}`);
    parts.push(`信号：${a.signals.map(s => `${s.type}(${s.strength})`).join(', ')}`);
  });
  return parts.join('\n');
}

async function runDebate(topic: DebateTopic, analyses: AgentAnalysis[]): Promise<DebateResult> {
  const system = `你是投资决策仲裁者。综合分析师观点，进行辩论，达成共识。
返回 JSON：{ "consensus": "bullish|bearish|neutral", "confidence": 1-5, "for_arguments": [], "against_arguments": [], "final_decision": "", "dissenting": "" }`;

  const result = await callAI<{
    consensus?: string;
    confidence?: number;
    for_arguments?: string[];
    against_arguments?: string[];
    final_decision?: string;
    dissenting?: string;
  }>({ system, user: `主题：${topic.question}\n背景：${topic.context}`, temperature: 0.3, maxTokens: 1024, responseFormat: 'json_object' });

  if (!result.success || !result.data) {
    return getMockDebate(topic, analyses);
  }

  const data = result.data;
  return {
    topicId: topic.id,
    consensus: (['bullish', 'bearish', 'neutral'].includes(data.consensus ?? '') ? data.consensus : 'neutral') as DebateResult['consensus'],
    confidence: typeof data.confidence === 'number' ? Math.min(5, Math.max(1, data.confidence)) : 3,
    arguments: {
      for: (data.for_arguments || []).map((a: string) => ({
        role: 'portfolio_manager' as AgentRole,
        content: a,
        confidence: 3,
        timestamp: new Date().toISOString(),
      })),
      against: (data.against_arguments || []).map((a: string) => ({
        role: 'risk' as AgentRole,
        content: a,
        confidence: 3,
        timestamp: new Date().toISOString(),
      })),
    },
    finalDecision: data.final_decision ?? '',
    dissenting: data.dissenting ? [{
      role: 'risk' as AgentRole,
      content: data.dissenting,
      confidence: 2,
      timestamp: new Date().toISOString(),
    }] : [],
  };
}

function getMockDebate(topic: DebateTopic, analyses: AgentAnalysis[]): DebateResult {
  const bullishCount = analyses.filter(a => a.signals.some(s => s.type === 'buy')).length;
  const bearishCount = analyses.filter(a => a.signals.some(s => s.type === 'sell')).length;
  const consensus = bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral';

  return {
    topicId: topic.id,
    consensus,
    confidence: 2,
    arguments: {
      for: [{ role: 'portfolio_manager', content: '基于价格趋势', confidence: 2, timestamp: new Date().toISOString() }],
      against: [{ role: 'risk', content: '数据不充分', confidence: 2, timestamp: new Date().toISOString() }],
    },
    finalDecision: '建议持有观望，等待更多数据',
    dissenting: [],
  };
}

async function generateRecommendation(
  ctx: AnalysisContext,
  analyses: AgentAnalysis[],
  debate: DebateResult
): Promise<Recommendation> {
  const system = `你是一位投资组合经理，根据辩论结果给出最终投资建议。
返回 JSON：{ "action": "buy|sell|hold|add|reduce", "target_price": null, "stop_loss": null, "time_horizon": "short|medium|long", "reasoning": "", "confidence": 1-5, "risks": [] }`;

  const context = `标的：${ctx.symbol}\n当前价格：${ctx.quote?.price ?? '未知'}\n辩论共识：${debate.consensus}\n最终判断：${debate.finalDecision}`;

  const result = await callAI<{
    action?: string;
    target_price?: number | null;
    stop_loss?: number | null;
    time_horizon?: string;
    reasoning?: string;
    confidence?: number;
    risks?: string[];
  }>({ system, user: context, temperature: 0.2, maxTokens: 512, responseFormat: 'json_object' });

  if (!result.success || !result.data) {
    return getMockRecommendation(ctx, debate);
  }

  const data = result.data;
  return {
    action: (['buy', 'sell', 'hold', 'add', 'reduce'].includes(data.action ?? '') ? data.action : 'hold') as Recommendation['action'],
    targetPrice: typeof data.target_price === 'number' ? data.target_price : undefined,
    stopLoss: typeof data.stop_loss === 'number' ? data.stop_loss : undefined,
    timeHorizon: (['short', 'medium', 'long'].includes(data.time_horizon ?? '') ? data.time_horizon : 'medium') as Recommendation['timeHorizon'],
    reasoning: data.reasoning ?? '',
    confidence: typeof data.confidence === 'number' ? Math.min(5, Math.max(1, data.confidence)) : 3,
    risks: Array.isArray(data.risks) ? data.risks : [],
  };
}

function getMockRecommendation(ctx: AnalysisContext, debate: DebateResult): Recommendation {
  const price = ctx.quote?.price ?? 0;
  return {
    action: debate.consensus === 'bullish' ? 'buy' : debate.consensus === 'bearish' ? 'sell' : 'hold',
    targetPrice: debate.consensus === 'bullish' ? price * 1.1 : debate.consensus === 'bearish' ? price * 0.9 : undefined,
    stopLoss: debate.consensus === 'bullish' ? price * 0.95 : undefined,
    timeHorizon: 'medium',
    reasoning: debate.finalDecision || '综合分析建议持有',
    confidence: debate.confidence,
    risks: ['数据不充分', '市场波动'],
  };
}
