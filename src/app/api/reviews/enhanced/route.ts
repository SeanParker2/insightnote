import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReviewReport, analyzeDecision, generateReviewSummary } from '@/lib/decision-review';
import type { DecisionChain } from '@/lib/decision-review/types';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30d';

  try {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date(Date.now() - days * 86400000).toISOString();

    const { data: entries } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userData.user.id)
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (!entries?.length) {
      return NextResponse.json({ ok: true, data: null, message: 'no_entries' });
    }

    const decisions: DecisionChain[] = entries.map(e => ({
      id: e.id,
      userId: userData.user!.id,
      symbol: e.symbol,
      timestamp: e.created_at,
      informationSources: [],
      newsContext: [],
      analysisProcess: '',
      action: e.action,
      reasoning: e.reasoning,
      confidence: 3,
      timeHorizon: 'medium',
      emotionState: e.emotion_label || 'neutral',
      cognitiveBiases: analyzeDecision({
        id: e.id,
        userId: userData.user!.id,
        symbol: e.symbol,
        timestamp: e.created_at,
        informationSources: [],
        newsContext: [],
        analysisProcess: '',
        action: e.action,
        reasoning: e.reasoning,
        confidence: 3,
        timeHorizon: 'medium',
        emotionState: e.emotion_label || 'neutral',
        cognitiveBiases: [],
      }),
      outcome: e.actual_return_pct ? {
        actualReturn: e.actual_return_pct,
        benchmarkReturn: 0,
        excessReturn: e.actual_return_pct,
        holdingPeriod: 7,
        maxDrawdown: 0,
        maxGain: 0,
        lessonsLearned: '',
        rating: e.actual_return_pct > 0 ? 4 : 2,
      } : undefined,
    }));

    const report = generateReviewReport(
      userData.user.id,
      decisions,
      startDate,
      new Date().toISOString()
    );

    const summary = await generateReviewSummary(decisions);

    return NextResponse.json({ ok: true, data: { report, summary } });
  } catch (error: any) {
    console.error('Review error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'review_failed' }, { status: 500 });
  }
}
