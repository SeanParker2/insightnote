import type { DecisionMemory, MemoryContext, ReflectionReport } from './types';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';

export class DecisionMemoryStore {
  private supabase: any;
  private userId: string;

  constructor(supabase: any, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  async recordDecision(decision: Omit<DecisionMemory, 'id' | 'timestamp' | 'relatedDecisions' | 'reflection'>): Promise<DecisionMemory> {
    const { data, error } = await this.supabase
      .from('decision_memories')
      .insert({
        user_id: this.userId,
        symbol: decision.symbol,
        action: decision.action,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        emotion_state: decision.emotionState,
        market_context: decision.marketContext,
        outcome: decision.outcome || null,
        triggered_by: decision.triggeredBy || null,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapFromDb(data);
  }

  async verifyDecision(decisionId: string, currentPrice: number): Promise<DecisionMemory> {
    const { data: decision } = await this.supabase
      .from('decision_memories')
      .select('*')
      .eq('id', decisionId)
      .single();

    if (!decision) throw new Error('Decision not found');

    const entryPrice = decision.market_context?.price || 0;
    const actualReturn = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
    const holdingDays = Math.floor((Date.now() - new Date(decision.created_at).getTime()) / 86400000);

    const outcome = {
      verifiedAt: new Date().toISOString(),
      actualPrice: currentPrice,
      actualReturn,
      benchmarkReturn: 0,
      excessReturn: actualReturn,
      holdingDays,
      maxDrawdown: 0,
      maxGain: 0,
    };

    const reflection = await this.generateReflection(decision, outcome);

    const { data: updated } = await this.supabase
      .from('decision_memories')
      .update({ outcome, reflection })
      .eq('id', decisionId)
      .select()
      .single();

    return this.mapFromDb(updated);
  }

  async getMemoryContext(symbol: string, action: string): Promise<MemoryContext> {
    const [profile, similar, symbolHistory, biases] = await Promise.all([
      this.getUserProfile(),
      this.findSimilarDecisions(symbol, action),
      this.getSymbolHistory(symbol),
      this.getCurrentBiases(),
    ]);

    const coachReminders = this.generateCoachReminders(profile, similar, biases);

    return {
      userProfile: profile,
      similarDecisions: similar,
      symbolHistory,
      currentBiases: biases,
      coachReminders,
    };
  }

  async generateReflectionReport(periodStart: string, periodEnd: string): Promise<ReflectionReport> {
    const { data: decisions } = await this.supabase
      .from('decision_memories')
      .select('*')
      .eq('user_id', this.userId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .order('created_at', { ascending: false });

    const all: DecisionMemory[] = (decisions || []).map((d: any) => this.mapFromDb(d));
    const verified = all.filter((d: DecisionMemory) => d.outcome);
    const wins = verified.filter((d: DecisionMemory) => d.outcome!.actualReturn > 0);

    const winRate = verified.length > 0 ? (wins.length / verified.length) * 100 : 0;
    const avgReturn = verified.length > 0
      ? verified.reduce((s: number, d: DecisionMemory) => s + d.outcome!.actualReturn, 0) / verified.length
      : 0;

    const bestDecision = verified.sort((a: DecisionMemory, b: DecisionMemory) => (b.outcome?.actualReturn ?? 0) - (a.outcome?.actualReturn ?? 0))[0] || null;
    const worstDecision = verified.sort((a: DecisionMemory, b: DecisionMemory) => (a.outcome?.actualReturn ?? 0) - (b.outcome?.actualReturn ?? 0))[0] || null;

    const behaviorInsights = this.analyzeBehaviorInsights(verified);
    const reflections = await this.generatePeriodReflections(all, winRate, avgReturn);

    return {
      period: { start: periodStart, end: periodEnd },
      totalDecisions: all.length,
      verifiedDecisions: verified.length,
      winRate,
      avgReturn,
      bestDecision,
      worstDecision,
      behaviorInsights,
      learningProgress: {
        lessonsApplied: 0,
        patternsRecognized: 0,
        biasesReduced: 0,
        consistencyScore: 70,
      },
      reflections,
    };
  }

  private async getUserProfile() {
    const { data: decisions } = await this.supabase
      .from('decision_memories')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(100);

    const all: DecisionMemory[] = (decisions || []).map((d: any) => this.mapFromDb(d));
    const verified = all.filter((d: DecisionMemory) => d.outcome);
    const wins = verified.filter((d: DecisionMemory) => d.outcome!.actualReturn > 0);

    const emotions: Record<string, number> = {};
    all.forEach((d: DecisionMemory) => { emotions[d.emotionState] = (emotions[d.emotionState] || 0) + 1; });

    return {
      totalDecisions: all.length,
      winRate: verified.length > 0 ? (wins.length / verified.length) * 100 : 0,
      avgReturn: verified.length > 0 ? verified.reduce((s: number, d: DecisionMemory) => s + (d.outcome?.actualReturn ?? 0), 0) / verified.length : 0,
      dominantBiases: this.detectDominantBiases(all),
      emotionalTendencies: emotions,
      bestPerformingSector: '',
      worstPerformingSector: '',
    };
  }

  private async findSimilarDecisions(symbol: string, action: string) {
    const { data } = await this.supabase
      .from('decision_memories')
      .select('*')
      .eq('user_id', this.userId)
      .or(`symbol.eq.${symbol},action.eq.${action}`)
      .order('created_at', { ascending: false })
      .limit(10);

    return (data || []).map((d: any) => {
      const mapped = this.mapFromDb(d);
      return {
        id: mapped.id,
        symbol: mapped.symbol,
        action: mapped.action,
        outcome: mapped.outcome ? (mapped.outcome.actualReturn > 0 ? 'win' as const : 'loss' as const) : 'pending' as const,
        returnPct: mapped.outcome?.actualReturn,
        lesson: mapped.reflection?.lessonLearned,
        similarity: mapped.symbol === symbol ? 1 : 0.5,
      };
    });
  }

  private async getSymbolHistory(symbol: string) {
    const { data } = await this.supabase
      .from('decision_memories')
      .select('action, outcome, created_at')
      .eq('user_id', this.userId)
      .eq('symbol', symbol)
      .order('created_at', { ascending: false })
      .limit(20);

    return (data || []).map((d: any) => ({
      action: d.action,
      returnPct: d.outcome?.actualReturn,
      timestamp: d.created_at,
    }));
  }

  private async getCurrentBiases() {
    const profile = await this.getUserProfile();
    return profile.dominantBiases.map(bias => ({
      type: bias,
      severity: 'moderate',
      suggestion: this.getBiasSuggestion(bias),
    }));
  }

  private detectDominantBiases(decisions: DecisionMemory[]): string[] {
    const biasCounts: Record<string, number> = {};
    
    decisions.forEach(d => {
      if (d.confidence === 5) biasCounts['overconfidence'] = (biasCounts['overconfidence'] || 0) + 1;
      if (['fearful', 'anxious'].includes(d.emotionState)) biasCounts['loss_aversion'] = (biasCounts['loss_aversion'] || 0) + 1;
      if (['fomo', 'euphoric'].includes(d.emotionState)) biasCounts['emotional_trading'] = (biasCounts['emotional_trading'] || 0) + 1;
      if (d.reflection?.biasDetected) biasCounts[d.reflection.biasDetected] = (biasCounts[d.reflection.biasDetected] || 0) + 1;
    });

    return Object.entries(biasCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([bias]) => bias);
  }

  private getBiasSuggestion(bias: string): string {
    const suggestions: Record<string, string> = {
      overconfidence: '每次高信心决策前，列出 3 个可能出错的理由',
      loss_aversion: '设置明确的止损位，并在入场前确定',
      emotional_trading: '设置 24 小时冷静期，情绪平复后再决策',
      confirmation: '主动寻找反对观点，而不是只看支持信息',
      anchoring: '基于当前价值而非历史价格做决策',
    };
    return suggestions[bias] || '保持觉察，记录情绪状态';
  }

  private generateCoachReminders(profile: any, similar: any[], biases: any[]): string[] {
    const reminders: string[] = [];

    if (biases.length > 0) {
      reminders.push(`注意：你近期有 ${biases[0].type} 倾向`);
    }

    const recentLosses = similar.filter(s => s.outcome === 'loss').length;
    if (recentLosses >= 3) {
      reminders.push('近期连续亏损，建议降低仓位或暂停交易');
    }

    if (profile.winRate > 60) {
      reminders.push('你的胜率不错，但注意不要因此过度自信');
    }

    return reminders;
  }

  private analyzeBehaviorInsights(decisions: DecisionMemory[]) {
    const emotionMap = new Map<string, { returns: number[]; count: number }>();
    decisions.forEach(d => {
      if (!d.outcome) return;
      const existing = emotionMap.get(d.emotionState) || { returns: [], count: 0 };
      existing.returns.push(d.outcome.actualReturn);
      existing.count++;
      emotionMap.set(d.emotionState, existing);
    });

    return {
      emotionalImpact: Array.from(emotionMap.entries()).map(([emotion, data]) => ({
        emotion,
        avgReturn: data.returns.reduce((s, r) => s + r, 0) / data.returns.length,
        count: data.count,
      })),
      confidenceCalibration: [],
      biasPatterns: [],
    };
  }

  private async generatePeriodReflections(decisions: DecisionMemory[], winRate: number, avgReturn: number): Promise<string[]> {
    if (!isDeepSeekConfigured()) {
      return [`本期 ${decisions.length} 次决策，胜率 ${winRate.toFixed(0)}%，平均收益 ${avgReturn.toFixed(2)}%`];
    }

    const summary = decisions.slice(0, 10).map(d =>
      `${d.symbol} ${d.action}: ${d.outcome ? `${d.outcome.actualReturn.toFixed(2)}%` : '待验证'}`
    ).join('\n');

    try {
      const completion = await deepseek.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: '你是投资教练。根据决策记录给出 3 条简洁的反思。每条 30 字以内。'
          },
          { role: 'user', content: summary },
        ],
        model: DEEPSEEK_MODEL,
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) return [];
      const result = JSON.parse(content);
      return Array.isArray(result.reflections) ? result.reflections : [];
    } catch {
      return [];
    }
  }

  private async generateReflection(decision: any, outcome: any) {
    const isWin = outcome.actualReturn > 0;
    
    return {
      summary: isWin ? `正确决策，收益 ${outcome.actualReturn.toFixed(2)}%` : `失误决策，亏损 ${Math.abs(outcome.actualReturn).toFixed(2)}%`,
      whatWentRight: isWin ? '决策方向正确' : '及时止损',
      whatWentWrong: isWin ? '' : '判断失误',
      lessonLearned: isWin ? '保持这种分析方法' : '需要更深入的基本面分析',
      applicablePattern: '',
      biasDetected: undefined,
    };
  }

  private mapFromDb(row: any): DecisionMemory {
    return {
      id: row.id,
      userId: row.user_id,
      symbol: row.symbol,
      timestamp: row.created_at,
      action: row.action,
      reasoning: row.reasoning,
      confidence: row.confidence,
      emotionState: row.emotion_state,
      marketContext: row.market_context || {},
      outcome: row.outcome || undefined,
      reflection: row.reflection || undefined,
      relatedDecisions: [],
      triggeredBy: row.triggered_by || undefined,
    };
  }
}
