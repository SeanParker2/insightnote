import type { PreDecisionInput, PreDecisionResult, ReviewResult, BehaviorReport, Warning, ChecklistItem, CoachFeedback, BehaviorPattern, BiasTrackerItem, EmotionalPatternItem, CoachAdvice } from './types';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';

export async function preDecisionCheck(input: PreDecisionInput): Promise<PreDecisionResult> {
  const warnings: Warning[] = [];
  const checklist: ChecklistItem[] = [];

  // Emotional checks
  if (input.emotionState === 'fearful' || input.emotionState === 'anxious') {
    warnings.push({
      type: 'emotional',
      severity: 'high',
      message: '当前情绪状态可能影响判断',
      suggestion: '建议等待情绪平复后再做决策，或设置更严格的止损位',
    });
  }

  if (input.emotionState === 'fomo' || input.emotionState === 'euphoric') {
    warnings.push({
      type: 'emotional',
      severity: 'high',
      message: 'FOMO/兴奋情绪下容易追涨',
      suggestion: '建议冷静 24 小时后再决定',
    });
  }

  // Confidence checks
  if (input.confidence === 5) {
    warnings.push({
      type: 'bias',
      severity: 'medium',
      message: '极高信心度可能表示过度自信',
      suggestion: '列出 3 个可能出错的理由',
    });
  }

  // Action-specific checks
  if (input.action === 'buy' || input.action === 'add') {
    checklist.push(
      { question: '你了解这个公司的商业模式吗？', answered: false, importance: 'required' },
      { question: '你设定了止损位吗？', answered: false, importance: 'required' },
      { question: '这笔投资占你总持仓的多少？', answered: false, importance: 'recommended' },
      { question: '如果下跌 20%，你会怎么做？', answered: false, importance: 'recommended' },
    );
  }

  if (input.action === 'sell' || input.action === 'reduce') {
    checklist.push(
      { question: '卖出的理由是什么？', answered: false, importance: 'required' },
      { question: '是基于事实还是情绪？', answered: false, importance: 'required' },
      { question: '你考虑过部分卖出而非全部吗？', answered: false, importance: 'recommended' },
    );
  }

  // Risk score
  let riskScore = 30;
  if (input.confidence >= 4) riskScore += 20;
  if (['fearful', 'greedy', 'fomo', 'euphoric'].includes(input.emotionState)) riskScore += 30;
  if (!input.stopLoss) riskScore += 10;
  riskScore = Math.min(100, riskScore);

  // Alternative views via AI
  const alternativeViews = await generateAlternativeViews(input);

  return {
    approved: warnings.filter(w => w.severity === 'high').length === 0,
    warnings,
    checklist,
    alternativeViews,
    riskScore,
  };
}

async function generateAlternativeViews(input: PreDecisionInput): Promise<string[]> {
  if (!isDeepSeekConfigured()) {
    return ['建议多角度分析后再决定'];
  }

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: '给出 2 个相反观点，帮助用户全面思考。每个观点 30 字以内。'
        },
        {
          role: 'user',
          content: `用户计划${input.action === 'buy' ? '买入' : input.action === 'sell' ? '卖出' : '持有'} ${input.symbol}，理由：${input.reasoning}`,
        },
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.7,
      max_tokens: 128,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) return [];

    const result = JSON.parse(content);
    return Array.isArray(result.views) ? result.views : [];
  } catch {
    return [];
  }
}

export async function postDecisionReview(
  decisionId: string,
  decision: {
    symbol: string;
    action: string;
    reasoning: string;
    confidence: number;
    emotionState: string;
    actualReturn?: number;
    benchmarkReturn?: number;
  }
): Promise<ReviewResult> {
  const qualityScore = calculateQualityScore(decision);
  const feedback = await generateFeedback(decision, qualityScore);
  const lessons = extractLessons(decision);
  const patterns = identifyPatterns(decision);

  return {
    decisionId,
    outcome: decision.actualReturn !== undefined ? 'completed' : 'pending',
    actualReturn: decision.actualReturn,
    benchmarkReturn: decision.benchmarkReturn,
    excessReturn: decision.actualReturn !== undefined && decision.benchmarkReturn !== undefined
      ? decision.actualReturn - decision.benchmarkReturn
      : undefined,
    qualityScore,
    qualityBreakdown: {
      informationQuality: Math.min(100, decision.reasoning.length * 2),
      analysisDepth: decision.confidence <= 3 ? 70 : 50,
      emotionalControl: ['neutral', 'confident'].includes(decision.emotionState) ? 80 : 40,
      riskManagement: 60,
      timingQuality: 50,
    },
    feedback,
    lessons,
    patterns,
  };
}

function calculateQualityScore(decision: { confidence: number; emotionState: string; reasoning: string }): number {
  let score = 50;

  // Confidence calibration
  if (decision.confidence >= 3 && decision.confidence <= 4) score += 10;
  if (decision.confidence === 5) score -= 10;

  // Emotional control
  if (['neutral', 'confident'].includes(decision.emotionState)) score += 15;
  if (['fearful', 'greedy', 'fomo'].includes(decision.emotionState)) score -= 15;

  // Reasoning quality
  if (decision.reasoning.length > 50) score += 10;
  if (decision.reasoning.length > 200) score += 10;

  return Math.max(0, Math.min(100, score));
}

async function generateFeedback(
  decision: { symbol: string; action: string; reasoning: string; confidence: number; emotionState: string; actualReturn?: number },
  qualityScore: number
): Promise<CoachFeedback> {
  if (!isDeepSeekConfigured()) {
    return {
      tone: qualityScore >= 70 ? 'encouraging' : qualityScore >= 40 ? 'neutral' : 'corrective',
      summary: `决策质量评分 ${qualityScore}/100`,
      strengths: qualityScore >= 60 ? ['有明确的决策理由'] : [],
      improvements: qualityScore < 60 ? ['建议加强情绪控制'] : [],
      nextSteps: ['继续记录和复盘'],
    };
  }

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `你是投资教练。根据决策记录给出反馈。
语气：${qualityScore >= 70 ? '鼓励为主' : qualityScore >= 40 ? '中立客观' : '纠正为主'}
返回 JSON：{ "summary": "50字总结", "strengths": ["优点"], "improvements": ["改进点"], "nextSteps": ["下一步"] }`
        },
        {
          role: 'user',
          content: `决策：${decision.action} ${decision.symbol}\n理由：${decision.reasoning}\n信心度：${decision.confidence}/5\n情绪：${decision.emotionState}\n质量分：${qualityScore}\n${decision.actualReturn !== undefined ? `实际收益：${decision.actualReturn.toFixed(2)}%` : '待验证'}`,
        },
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.3,
      max_tokens: 256,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty');

    const result = JSON.parse(content);
    return {
      tone: qualityScore >= 70 ? 'encouraging' : qualityScore >= 40 ? 'neutral' : 'corrective',
      summary: result.summary || '',
      strengths: Array.isArray(result.strengths) ? result.strengths : [],
      improvements: Array.isArray(result.improvements) ? result.improvements : [],
      nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps : [],
    };
  } catch {
    return {
      tone: 'neutral',
      summary: `决策质量评分 ${qualityScore}/100`,
      strengths: [],
      improvements: [],
      nextSteps: ['继续记录和复盘'],
    };
  }
}

function extractLessons(decision: { action: string; emotionState: string; actualReturn?: number }): string[] {
  const lessons: string[] = [];

  if (decision.actualReturn !== undefined) {
    if (decision.actualReturn > 0 && ['fearful', 'anxious'].includes(decision.emotionState)) {
      lessons.push('恐惧情绪下仍做出了正确决策，说明理性分析比情绪更重要');
    }
    if (decision.actualReturn < 0 && ['greedy', 'fomo', 'euphoric'].includes(decision.emotionState)) {
      lessons.push('贪婪情绪下做出了错误决策，下次应在冷静时再决定');
    }
  }

  return lessons;
}

function identifyPatterns(decision: { action: string; emotionState: string }): BehaviorPattern[] {
  const patterns: BehaviorPattern[] = [];

  if (['fearful', 'anxious'].includes(decision.emotionState)) {
    patterns.push({
      pattern: '恐惧交易',
      frequency: 1,
      impact: 'negative',
      description: '在恐惧情绪下做出决策',
      suggestion: '设置冷静期，等待情绪平复',
    });
  }

  return patterns;
}

export async function generateBehaviorReport(
  userId: string,
  decisions: Array<{
    symbol: string;
    action: string;
    emotion: string;
    confidence: number;
    returnPct?: number;
    timestamp: string;
  }>,
  periodStart: string,
  periodEnd: string
): Promise<BehaviorReport> {
  // Bias tracking
  const biasMap = new Map<string, { count: number; examples: string[] }>();
  
  decisions.forEach(d => {
    if (d.confidence === 5) {
      const existing = biasMap.get('overconfidence') ?? { count: 0, examples: [] };
      existing.count++;
      if (existing.examples.length < 3) existing.examples.push(`${d.symbol} ${d.action}`);
      biasMap.set('overconfidence', existing);
    }
    if (['fearful', 'anxious'].includes(d.emotion)) {
      const existing = biasMap.get('loss_aversion') ?? { count: 0, examples: [] };
      existing.count++;
      if (existing.examples.length < 3) existing.examples.push(`${d.symbol} ${d.action}`);
      biasMap.set('loss_aversion', existing);
    }
    if (['fomo', 'euphoric'].includes(d.emotion)) {
      const existing = biasMap.get('emotional_trading') ?? { count: 0, examples: [] };
      existing.count++;
      if (existing.examples.length < 3) existing.examples.push(`${d.symbol} ${d.action}`);
      biasMap.set('emotional_trading', existing);
    }
  });

  const biasTracker: BiasTrackerItem[] = Array.from(biasMap.entries()).map(([bias, data]) => ({
    bias,
    occurrences: data.count,
    severity: data.count >= 5 ? 'severe' : data.count >= 3 ? 'moderate' : 'mild',
    trend: 'stable',
    examples: data.examples,
    intervention: bias === 'overconfidence' ? '每次高信心决策前列出 3 个反对理由' :
                  bias === 'loss_aversion' ? '设置明确止损位并严格执行' :
                  '设置 24 小时冷静期',
  }));

  // Emotional patterns
  const emotionMap = new Map<string, { count: number; returns: number[] }>();
  decisions.forEach(d => {
    const existing = emotionMap.get(d.emotion) ?? { count: 0, returns: [] };
    existing.count++;
    if (d.returnPct !== undefined) existing.returns.push(d.returnPct);
    emotionMap.set(d.emotion, existing);
  });

  const emotionalPatterns: EmotionalPatternItem[] = Array.from(emotionMap.entries()).map(([emotion, data]) => ({
    emotion,
    frequency: data.count,
    avgReturnWhenEmotional: data.returns.length > 0 ? data.returns.reduce((s, r) => s + r, 0) / data.returns.length : 0,
    bestAction: '',
    worstAction: '',
  }));

  // Quality trend
  const qualityTrend = decisions.map((d, i) => ({
    date: d.timestamp,
    score: calculateQualityScore({ confidence: d.confidence, emotionState: d.emotion, reasoning: '' }),
  }));

  // Coach advice
  const avgReturn = decisions.filter(d => d.returnPct !== undefined).reduce((s, d) => s + (d.returnPct ?? 0), 0) / Math.max(1, decisions.filter(d => d.returnPct !== undefined).length);
  const dominantBias = biasTracker.sort((a, b) => b.occurrences - a.occurrences)[0];

  const coachAdvice: CoachAdvice = {
    priority: avgReturn > 0 ? 'celebrate' : dominantBias ? 'focus' : 'maintain',
    message: avgReturn > 0 ? '近期表现不错，继续保持' : dominantBias ? `重点关注：${dominantBias.bias}` : '保持稳定',
    weeklyGoals: dominantBias ? [dominantBias.intervention] : ['继续记录决策'],
    practiceExercises: ['每次决策前写下 3 个理由', '设置冷静期后再执行'],
  };

  return {
    userId,
    period: { start: periodStart, end: periodEnd },
    styleProfile: {
      primaryStyle: 'blend',
      riskTolerance: decisions.filter(d => d.confidence >= 4).length > decisions.length / 2 ? 'aggressive' : 'moderate',
      timeHorizon: 'medium',
      consistency: 70,
    },
    biasTracker,
    emotionalPatterns,
    qualityTrend,
    coachAdvice,
  };
}
