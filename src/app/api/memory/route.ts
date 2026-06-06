import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateSymbol, validateAction, validateConfidence, validateEmotionState } from '@/lib/validation';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const action = searchParams.get('action') || 'buy';

  try {
    if (symbol) {
      // Get memory context for a specific symbol
      const { data: decisions } = await supabase
        .from('decision_memories')
        .select('*')
        .eq('user_id', userData.user.id)
        .or(`symbol.eq.${symbol},action.eq.${action}`)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: profile } = await supabase
        .from('decision_memories')
        .select('symbol, action, outcome, emotion_state, confidence')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      const allDecisions = profile || [];
      const verified = allDecisions.filter((d: any) => d.outcome);
      const wins = verified.filter((d: any) => d.outcome?.actualReturn > 0);

      const emotions: Record<string, number> = {};
      allDecisions.forEach((d: any) => {
        if (d.emotion_state) emotions[d.emotion_state] = (emotions[d.emotion_state] || 0) + 1;
      });

      const dominantBiases: string[] = [];
      if (allDecisions.filter((d: any) => d.confidence === 5).length > 3) dominantBiases.push('overconfidence');
      if (allDecisions.filter((d: any) => ['fearful', 'anxious'].includes(d.emotion_state)).length > 3) dominantBiases.push('loss_aversion');

      return NextResponse.json({
        ok: true,
        data: {
          userProfile: {
            totalDecisions: allDecisions.length,
            winRate: verified.length > 0 ? (wins.length / verified.length) * 100 : 0,
            avgReturn: verified.length > 0 ? verified.reduce((s: number, d: any) => s + (d.outcome?.actualReturn || 0), 0) / verified.length : 0,
            dominantBiases,
          },
          similarDecisions: (decisions || []).map((d: any) => ({
            id: d.id,
            symbol: d.symbol,
            action: d.action,
            outcome: d.outcome ? (d.outcome.actualReturn > 0 ? 'win' : 'loss') : 'pending',
            returnPct: d.outcome?.actualReturn,
            lesson: d.reflection?.lessonLearned,
            similarity: d.symbol === symbol ? 1 : 0.5,
          })),
          coachReminders: dominantBiases.length > 0 ? [`注意：你近期有 ${dominantBiases[0]} 倾向`] : [],
        },
      });
    }

    // Get all decisions
    const { data: decisions } = await supabase
      .from('decision_memories')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ ok: true, data: decisions || [] });
  } catch (error: any) {
    console.error('Decision memory error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  // Validate inputs
  if (!validateSymbol(body.symbol)) {
    return NextResponse.json({ ok: false, error: 'invalid_symbol' }, { status: 400 });
  }
  if (!validateAction(body.action)) {
    return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
  }
  if (!validateConfidence(body.confidence)) {
    return NextResponse.json({ ok: false, error: 'invalid_confidence' }, { status: 400 });
  }
  if (body.emotionState && !validateEmotionState(body.emotionState)) {
    return NextResponse.json({ ok: false, error: 'invalid_emotion' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('decision_memories')
      .insert({
        user_id: userData.user.id,
        symbol: body.symbol,
        action: body.action,
        reasoning: body.reasoning || '',
        confidence: body.confidence,
        emotion_state: body.emotionState || 'neutral',
        market_context: body.marketContext || {},
        triggered_by: body.triggeredBy || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error('Record decision error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.decisionId || !body?.currentPrice) {
    return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
  }

  try {
    const { data: decision } = await supabase
      .from('decision_memories')
      .select('*')
      .eq('id', body.decisionId)
      .eq('user_id', userData.user.id)
      .single();

    if (!decision) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    const entryPrice = decision.market_context?.price || 0;
    const actualReturn = entryPrice > 0 ? ((body.currentPrice - entryPrice) / entryPrice) * 100 : 0;
    const holdingDays = Math.floor((Date.now() - new Date(decision.created_at).getTime()) / 86400000);

    const outcome = {
      verifiedAt: new Date().toISOString(),
      actualPrice: body.currentPrice,
      actualReturn,
      benchmarkReturn: 0,
      excessReturn: actualReturn,
      holdingDays,
      maxDrawdown: 0,
      maxGain: 0,
    };

    const isWin = actualReturn > 0;
    const reflection = {
      summary: isWin ? `正确决策，收益 ${actualReturn.toFixed(2)}%` : `失误决策，亏损 ${Math.abs(actualReturn).toFixed(2)}%`,
      whatWentRight: isWin ? '决策方向正确' : '及时止损',
      whatWentWrong: isWin ? '' : '判断失误',
      lessonLearned: isWin ? '保持这种分析方法' : '需要更深入的分析',
      applicablePattern: '',
      biasDetected: undefined,
    };

    const { data: updated, error } = await supabase
      .from('decision_memories')
      .update({ outcome, reflection })
      .eq('id', body.decisionId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
