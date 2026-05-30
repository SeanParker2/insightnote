import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';
import { buildScenarioPrompt } from '@/lib/prompts';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit(`scenario:${ip}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.scenario !== 'string' || body.scenario.trim().length < 5) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  const scenario = body.scenario.trim().slice(0, 500);

  // Get user's holdings
  const { data: portfolios } = await supabase
    .from('user_portfolios')
    .select('id')
    .eq('user_id', userData.user.id);

  const portfolioIds = (portfolios ?? []).map((p) => p.id);
  const { data: holdings } = portfolioIds.length > 0
    ? await supabase
        .from('portfolio_holdings')
        .select('symbol, name, quantity, avg_cost, sector')
        .in('portfolio_id', portfolioIds)
    : { data: [] };

  const holdingsStr = holdings && holdings.length > 0
    ? holdings.map((h) => `${h.symbol}(${h.name ?? '未知'}, ${h.quantity}股, 板块:${h.sector ?? '未知'})`).join('；')
    : '用户暂无持仓';

  const { system, user } = buildScenarioPrompt(scenario, holdingsStr);

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      model: 'deepseek-chat',
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ ok: false, error: 'ai_error' }, { status: 500 });
    }

    const result = JSON.parse(content);
    return NextResponse.json({ ok: true, data: result });
  } catch {
    return NextResponse.json({ ok: false, error: 'ai_error' }, { status: 500 });
  }
}
