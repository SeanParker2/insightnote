import type { DecisionChain, CognitiveBias, BiasType, ReviewReport, BiasSummary, EmotionPattern, StyleProfile, EmotionState } from './types';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';

export function analyzeDecision(decision: DecisionChain): CognitiveBias[] {
  const biases: CognitiveBias[] = [];

  // Overconfidence detection
  if (decision.confidence >= 4 && decision.emotionState === 'confident') {
    biases.push({
      type: 'overconfidence',
      severity: decision.confidence === 5 ? 'severe' : 'moderate',
      description: '高度自信可能忽视风险',
      evidence: `信心度 ${decision.confidence}/5，情绪状态：自信`,
    });
  }

  // Loss aversion detection
  if (decision.action === 'hold' && decision.emotionState === 'fearful') {
    biases.push({
      type: 'loss_aversion',
      severity: 'moderate',
      description: '因害怕损失而持有亏损头寸',
      evidence: '恐惧情绪下选择持有而非止损',
    });
  }

  // FOMO detection
  if (decision.emotionState === 'fomo' || decision.emotionState === 'euphoric') {
    biases.push({
      type: 'emotional_trading',
      severity: 'severe',
      description: '情绪化交易，可能追涨杀跌',
      evidence: `情绪状态：${decision.emotionState}`,
    });
  }

  // Confirmation bias detection
  if (decision.informationSources.length > 0) {
    const sameTypeSources = decision.informationSources.filter(s => s.influence === 'high');
    if (sameTypeSources.length >= 3) {
      biases.push({
        type: 'confirmation',
        severity: 'mild',
        description: '信息来源单一，可能存在确认偏差',
        evidence: `${sameTypeSources.length} 个高影响力来源`,
      });
    }
  }

  // Anchoring detection
  if (decision.targetPrice) {
    const hasPriceReference = decision.newsContext.some(n => 
      n.includes('目标价') || n.includes('估值')
    );
    if (hasPriceReference) {
      biases.push({
        type: 'anchoring',
        severity: 'mild',
        description: '可能被外部目标价锚定',
        evidence: '参考了外部价格目标',
      });
    }
  }

  return biases;
}

export async function generateReviewSummary(decisions: DecisionChain[]): Promise<string> {
  if (!isDeepSeekConfigured() || decisions.length === 0) {
    return generateFallbackSummary(decisions);
  }

  const decisionSummary = decisions.slice(0, 10).map((d, i) => {
    const outcome = d.outcome ? `收益 ${d.outcome.actualReturn.toFixed(2)}%` : '待验证';
    return `${i + 1}. ${d.symbol} ${d.action} | 信心度 ${d.confidence}/5 | ${d.emotionState} | ${outcome}`;
  }).join('\n');

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `你是投资行为教练。分析用户的决策记录，给出简洁的复盘建议。
要求：
1. 先肯定做得好的地方
2. 指出最大的问题
3. 给出具体改进建议
4. 150字以内`
        },
        { role: 'user', content: decisionSummary },
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.3,
      max_tokens: 256,
    });

    return completion.choices[0].message.content || generateFallbackSummary(decisions);
  } catch {
    return generateFallbackSummary(decisions);
  }
}

function generateFallbackSummary(decisions: DecisionChain[]): string {
  if (decisions.length === 0) return '暂无决策记录';
  
  const profitable = decisions.filter(d => d.outcome && d.outcome.actualReturn > 0).length;
  const avgConfidence = decisions.reduce((s, d) => s + d.confidence, 0) / decisions.length;
  
  const parts = [`共 ${decisions.length} 次决策`];
  if (decisions.some(d => d.outcome)) {
    parts.push(`胜率 ${((profitable / decisions.length) * 100).toFixed(0)}%`);
  }
  parts.push(`平均信心度 ${avgConfidence.toFixed(1)}/5`);
  
  return parts.join('，');
}

export function generateReviewReport(userId: string, decisions: DecisionChain[], periodStart: string, periodEnd: string): ReviewReport {
  const totalDecisions = decisions.length;
  const withOutcome = decisions.filter(d => d.outcome);
  const profitable = withOutcome.filter(d => d.outcome!.actualReturn > 0);
  
  const averageReturn = withOutcome.length > 0
    ? withOutcome.reduce((s, d) => s + d.outcome!.actualReturn, 0) / withOutcome.length
    : 0;
  
  const averageConfidence = decisions.length > 0
    ? decisions.reduce((s, d) => s + d.confidence, 0) / decisions.length
    : 0;

  // Bias analysis
  const biasMap = new Map<BiasType, { count: number; severity: string; examples: string[] }>();
  decisions.forEach(d => {
    d.cognitiveBiases.forEach(b => {
      const existing = biasMap.get(b.type) ?? { count: 0, severity: 'mild', examples: [] };
      existing.count += 1;
      if (b.severity === 'severe' || (b.severity === 'moderate' && existing.severity === 'mild')) {
        existing.severity = b.severity;
      }
      if (existing.examples.length < 3) {
        existing.examples.push(`${d.symbol} ${d.action}: ${b.description}`);
      }
      biasMap.set(b.type, existing);
    });
  });

  const biasSummary: BiasSummary[] = Array.from(biasMap.entries()).map(([type, data]) => ({
    type,
    occurrences: data.count,
    severity: data.severity as 'mild' | 'moderate' | 'severe',
    impactOnReturns: 0,
    examples: data.examples,
  }));

  const dominantBiases = biasSummary
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 3)
    .map(b => b.type);

  // Emotion pattern
  const emotionCounts = new Map<EmotionState, number>();
  decisions.forEach(d => {
    emotionCounts.set(d.emotionState, (emotionCounts.get(d.emotionState) ?? 0) + 1);
  });
  const dominantEmotion = Array.from(emotionCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';

  const emotionReturnMap = new Map<EmotionState, number[]>();
  withOutcome.forEach(d => {
    const returns = emotionReturnMap.get(d.emotionState) ?? [];
    returns.push(d.outcome!.actualReturn);
    emotionReturnMap.set(d.emotionState, returns);
  });

  const emotionReturnCorrelation = Array.from(emotionReturnMap.entries()).map(([emotion, returns]) => ({
    emotion,
    avgReturn: returns.reduce((s, r) => s + r, 0) / returns.length,
  }));

  // Style analysis
  const styleProfile = analyzeStyleProfile(decisions);

  // Trading frequency
  const daysDiff = (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000;
  const decisionsPerWeek = (totalDecisions / daysDiff) * 7;
  const tradingFrequency = decisionsPerWeek > 5 ? 'over_trading' : decisionsPerWeek < 1 ? 'under_trading' : 'normal';

  // Strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (averageConfidence >= 3 && averageConfidence <= 4) {
    strengths.push('信心度控制良好，不过度自信');
  }
  if (profitable.length / Math.max(withOutcome.length, 1) > 0.5) {
    strengths.push('决策胜率超过50%');
  }
  if (dominantBiases.includes('overconfidence')) {
    weaknesses.push('存在过度自信倾向');
    recommendations.push('在做出高信心决策前，列出3个反对理由');
  }
  if (dominantBiases.includes('loss_aversion')) {
    weaknesses.push('损失厌恶影响决策');
    recommendations.push('设置明确的止损点并严格执行');
  }
  if (tradingFrequency === 'over_trading') {
    weaknesses.push('交易过于频繁');
    recommendations.push('减少交易频率，提高决策质量');
  }

  return {
    userId,
    period: { start: periodStart, end: periodEnd },
    totalDecisions,
    profitableDecisions: profitable.length,
    averageReturn,
    averageConfidence,
    biasSummary,
    dominantBiases,
    tradingFrequency,
    emotionalPattern: {
      dominantEmotion,
      emotionDistribution: Object.fromEntries(emotionCounts) as Record<EmotionState, number>,
      emotionReturnCorrelation,
    },
    consistencyScore: calculateConsistencyScore(decisions),
    styleProfile,
    strengths,
    weaknesses,
    recommendations,
  };
}

function analyzeStyleProfile(decisions: DecisionChain[]): StyleProfile {
  // Simplified style analysis
  const shortTerm = decisions.filter(d => d.timeHorizon === 'short').length;
  const mediumTerm = decisions.filter(d => d.timeHorizon === 'medium').length;
  const longTerm = decisions.filter(d => d.timeHorizon === 'long').length;
  
  const primaryTimeHorizon = shortTerm > mediumTerm && shortTerm > longTerm ? 'short'
    : longTerm > mediumTerm ? 'long' : 'medium';

  return {
    primaryStyle: 'blend',
    riskTolerance: decisions.filter(d => d.confidence >= 4).length > decisions.length / 2 ? 'aggressive' : 'moderate',
    timeHorizon: primaryTimeHorizon,
    consistency: 70,
    styleDrift: 20,
  };
}

function calculateConsistencyScore(decisions: DecisionChain[]): number {
  if (decisions.length < 3) return 50;

  const confidenceVariance = calculateVariance(decisions.map(d => d.confidence));
  const emotionConsistency = new Set(decisions.map(d => d.emotionState)).size;
  
  let score = 100;
  score -= confidenceVariance * 10;
  score -= emotionConsistency * 5;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
}
