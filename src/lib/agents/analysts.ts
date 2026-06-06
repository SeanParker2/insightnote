import { callAI } from '@/lib/ai-utils';
import type { AgentRole, AgentAnalysis, Signal } from './types';
import type { Quote, Financials, NewsItem, Kline } from '@/lib/data-provider/types';

interface AgentContext {
  symbol: string;
  quote: Quote | null;
  financials: Financials | null;
  news: NewsItem[];
  klines: Kline[];
  userHoldings?: { symbol: string; quantity: number; avgCost: number }[];
}

const AGENT_PROMPTS: Record<AgentRole, { system: string; buildUserPrompt: (ctx: AgentContext) => string }> = {
  fundamental: {
    system: `你是一位严谨的基本面分析师，专注于公司内在价值评估。
分析框架：估值指标、盈利能力、财务健康、成长性
输出规则：只基于数据说话，给出明确信号，信心度 1-5`,
    buildUserPrompt: (ctx) => {
      const parts = [`标的：${ctx.symbol}`];
      if (ctx.quote) parts.push(`当前价格：${ctx.quote.price}，涨跌：${ctx.quote.changePercent.toFixed(2)}%`);
      if (ctx.financials) {
        const f = ctx.financials;
        parts.push(`基本面数据：PE=${f.peRatio?.toFixed(2) ?? '-'}, PB=${f.pbRatio?.toFixed(2) ?? '-'}, EPS=${f.eps?.toFixed(2) ?? '-'}`);
      }
      return parts.join('\n');
    },
  },

  sentiment: {
    system: `你是一位情绪分析师，专注于市场情绪和舆论分析。
分析框架：新闻情绪、市场热度、资金流向、情绪周期
输出规则：基于数据，识别情绪极端值，信心度 1-5`,
    buildUserPrompt: (ctx) => {
      const parts = [`标的：${ctx.symbol}`];
      if (ctx.news.length > 0) {
        parts.push(`近期新闻（${ctx.news.length}条）：`);
        ctx.news.slice(0, 5).forEach((n, i) => { parts.push(`${i + 1}. ${n.title} [${n.source}]`); });
      }
      return parts.join('\n');
    },
  },

  technical: {
    system: `你是一位技术分析师，专注于价格走势和技术指标。
分析框架：趋势判断、动量指标、量价关系、形态识别
输出规则：基于 K 线数据，识别支撑/阻力位，信心度 1-5`,
    buildUserPrompt: (ctx) => {
      const parts = [`标的：${ctx.symbol}`];
      if (ctx.klines.length > 0) {
        const recent = ctx.klines.slice(-20);
        const last = recent[recent.length - 1];
        const high20 = Math.max(...recent.map(k => k.high));
        const low20 = Math.min(...recent.map(k => k.low));
        parts.push(`近20日K线：最高=${high20.toFixed(2)}, 最低=${low20.toFixed(2)}, 最新收盘=${last.close.toFixed(2)}`);
      }
      return parts.join('\n');
    },
  },

  risk: {
    system: `你是一位风险管理专家，专注于风险评估和控制。
分析框架：个股风险、组合风险、宏观风险、流动性风险
输出规则：识别风险因素并量化，给出控制建议，信心度 1-5`,
    buildUserPrompt: (ctx) => {
      const parts = [`标的：${ctx.symbol}`];
      if (ctx.quote) parts.push(`当前价格：${ctx.quote.price}`);
      if (ctx.userHoldings?.length) parts.push(`持仓情况：${ctx.userHoldings.length}只`);
      return parts.join('\n');
    },
  },

  portfolio_manager: {
    system: `你是一位投资组合经理，综合所有分析做出最终决策。
输出规则：必须给出明确建议，目标价和止损位，说明时间框架`,
    buildUserPrompt: (ctx) => `标的：${ctx.symbol}\n请综合各分析师结论，给出最终投资建议。`,
  },
};

export function getAgentPrompt(role: AgentRole): { system: string; buildUserPrompt: (ctx: AgentContext) => string } {
  return AGENT_PROMPTS[role];
}

export async function runAgent(role: AgentRole, ctx: AgentContext): Promise<AgentAnalysis> {
  const { system, buildUserPrompt } = AGENT_PROMPTS[role];
  const userPrompt = buildUserPrompt(ctx);

  const result = await callAI<{
    summary?: string;
    signals?: Array<{ type?: string; strength?: string; reason?: string }>;
    confidence?: number;
    reasoning?: string;
  }>({ system, user: userPrompt, temperature: 0.3, maxTokens: 1024, responseFormat: 'json_object' });

  if (!result.success || !result.data) {
    console.error(`Agent ${role} failed:`, result.error);
    return getMockAnalysis(role, ctx);
  }

  const data = result.data;
  return {
    role,
    summary: data.summary ?? '',
    signals: Array.isArray(data.signals) ? data.signals.map((s) => ({
      type: (['buy', 'sell', 'hold'].includes(s.type ?? '') ? s.type : 'hold') as Signal['type'],
      strength: (['strong', 'moderate', 'weak'].includes(s.strength ?? '') ? s.strength : 'moderate') as Signal['strength'],
      reason: s.reason ?? '',
      source: role,
    })) : [],
    confidence: typeof data.confidence === 'number' ? Math.min(5, Math.max(1, data.confidence)) : 3,
    reasoning: data.reasoning ?? '',
  };
}

function getMockAnalysis(role: AgentRole, ctx: AgentContext): AgentAnalysis {
  const change = ctx.quote?.changePercent ?? 0;
  const isUp = change > 0;

  const mockData: Record<AgentRole, { summary: string; signal: Signal }> = {
    fundamental: {
      summary: `${ctx.symbol} 基本面${isUp ? '稳健' : '有待观察'}`,
      signal: { type: 'hold', strength: 'moderate', reason: '基本面数据不足', source: 'fundamental' },
    },
    sentiment: {
      summary: `市场情绪${isUp ? '偏乐观' : '偏谨慎'}`,
      signal: { type: isUp ? 'buy' : 'sell', strength: 'weak', reason: '基于价格变动推断', source: 'sentiment' },
    },
    technical: {
      summary: `技术面${isUp ? '呈上升趋势' : '呈下降趋势'}`,
      signal: { type: isUp ? 'buy' : 'sell', strength: 'moderate', reason: '基于近期走势', source: 'technical' },
    },
    risk: {
      summary: `当前风险等级：${Math.abs(change) > 3 ? '中' : '低'}`,
      signal: { type: 'hold', strength: 'moderate', reason: '波动率评估', source: 'risk' },
    },
    portfolio_manager: {
      summary: '综合建议持有观望',
      signal: { type: 'hold', strength: 'moderate', reason: '各维度信号不一致', source: 'portfolio_manager' },
    },
  };

  const mock = mockData[role];
  return {
    role,
    summary: mock.summary,
    signals: [mock.signal],
    confidence: 2,
    reasoning: 'AI 分析不可用，使用基础规则推断',
  };
}
