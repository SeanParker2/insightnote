import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  // Get leaderboard with more details
  const { data: stats } = await supabase
    .from('user_prediction_stats')
    .select('*')
    .order('accuracy_rate', { ascending: false })
    .limit(50);

  if (!stats || stats.length === 0) {
    return NextResponse.json({ ok: true, data: { rankings: [], weekly_champion: null, monthly_champion: null } });
  }

  // Get user profiles
  const userIds = stats.map((s) => s.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('id', userIds);

  const profileMap = new Map<string, string>();
  (profiles ?? []).forEach((p) => profileMap.set(p.id, p.nickname ?? '匿名'));

  // Get weekly predictions (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: weeklyPreds } = await supabase
    .from('predictions')
    .select('user_id, status')
    .gte('created_at', weekAgo)
    .not('user_id', 'is', null);

  const weeklyStats = new Map<string, { total: number; won: number }>();
  (weeklyPreds ?? []).forEach((p) => {
    if (!p.user_id) return;
    const current = weeklyStats.get(p.user_id) ?? { total: 0, won: 0 };
    current.total++;
    if (p.status === 'won') current.won++;
    weeklyStats.set(p.user_id, current);
  });

  // Build rankings
  const rankings = stats
    .filter((s) => s.won_count + s.lost_count >= 3)
    .map((s, i) => ({
      rank: i + 1,
      user_id: s.user_id,
      display_name: profileMap.get(s.user_id) ?? '匿名',
      total_predictions: s.total_predictions,
      won_count: s.won_count,
      lost_count: s.lost_count,
      accuracy_rate: s.accuracy_rate,
      avg_confidence: s.avg_confidence ? Number(Number(s.avg_confidence).toFixed(1)) : null,
      weekly: weeklyStats.get(s.user_id) ?? null,
    }));

  // Weekly champion (most correct predictions this week among top accuracy users)
  const weeklyChampion = rankings
    .filter((r) => r.weekly && r.weekly.total >= 2)
    .sort((a, b) => {
      const aRate = a.weekly ? a.weekly.won / a.weekly.total : 0;
      const bRate = b.weekly ? b.weekly.won / b.weekly.total : 0;
      return bRate - aRate;
    })[0] ?? null;

  return NextResponse.json({
    ok: true,
    data: {
      rankings,
      weekly_champion: weeklyChampion,
      total_predictors: stats.length,
    },
  });
}
