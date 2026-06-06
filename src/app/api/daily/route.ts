import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDailyBriefing } from '@/lib/daily-assistant';

export const revalidate = 300; // 5 minutes cache

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const userId = userData.user.id;

    const [{ data: portfolios }, { data: prefs }, { data: readings }, { data: decisions }] = await Promise.all([
      supabase.from('user_portfolios').select('id').eq('user_id', userId).limit(1),
      supabase.from('user_preferences').select('watchlist').eq('user_id', userId).maybeSingle(),
      supabase.from('user_reading_history').select('post_id, posts(title, sentiment)').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('journal_entries').select('symbol, action, emotion_label, actual_return_pct').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    ]);

    let holdings: Array<{ symbol: string; name: string; quantity: number; avgCost: number; sector?: string }> = [];
    
    if (portfolios?.length) {
      const { data: holdingsData } = await supabase
        .from('portfolio_holdings')
        .select('symbol, name, quantity, avg_cost, sector')
        .eq('portfolio_id', portfolios[0].id);
      
      holdings = (holdingsData || []).map(h => ({
        symbol: h.symbol,
        name: h.name || h.symbol,
        quantity: h.quantity,
        avgCost: h.avg_cost,
        sector: h.sector || undefined,
      }));
    }

    const briefing = await generateDailyBriefing({
      userId,
      holdings,
      watchlist: Array.isArray(prefs?.watchlist) ? prefs.watchlist : [],
      recentReading: (readings || []).map((r: any) => ({
        title: r.posts?.title || '',
        sentiment: r.posts?.sentiment || undefined,
      })),
      recentDecisions: (decisions || []).map((d: any) => ({
        symbol: d.symbol,
        action: d.action,
        emotion: d.emotion_label || undefined,
        returnPct: d.actual_return_pct || undefined,
      })),
    });

    return NextResponse.json({ ok: true, data: briefing });
  } catch (error: any) {
    console.error('Daily briefing error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'briefing_failed' }, { status: 500 });
  }
}
