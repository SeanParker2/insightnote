import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Season = 'weekly' | 'monthly' | 'alltime';

function getSeasonDates(season: Season): { start: string; end: string; label: string } {
  const now = new Date();
  let start: Date;
  let label: string;

  switch (season) {
    case 'weekly': {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      start.setHours(0, 0, 0, 0);
      label = '本周';
      break;
    }
    case 'monthly': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      label = '本月';
      break;
    }
    case 'alltime':
    default:
      start = new Date('2020-01-01');
      label = '全部';
      break;
  }

  return { start: start.toISOString(), end: now.toISOString(), label };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const season = (searchParams.get('season') || 'alltime') as Season;

  // Get leaderboard with more details
  const { data: stats } = await supabase
    .from('user_prediction_stats')
    .select('*')
    .order('accuracy_rate', { ascending: false })
    .limit(50);

  if (!stats || stats.length === 0) {
    return NextResponse.json({ ok: true, data: { rankings: [], weekly_champion: null, monthly_champion: null, season } });
  }

  // Get user profiles
  const userIds = stats.map((s) => s.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('id', userIds);

  const profileMap = new Map<string, string>();
  (profiles ?? []).forEach((p) => profileMap.set(p.id, p.nickname ?? '匿名'));

  // Get season predictions
  const { start: seasonStart, label: seasonLabel } = getSeasonDates(season);
  const { data: seasonPreds } = await supabase
    .from('predictions')
    .select('user_id, status, created_at')
    .gte('created_at', seasonStart)
    .not('user_id', 'is', null);

  const seasonStats = new Map<string, { total: number; won: number; lost: number }>();
  (seasonPreds ?? []).forEach((p) => {
    if (!p.user_id) return;
    const current = seasonStats.get(p.user_id) ?? { total: 0, won: 0, lost: 0 };
    current.total++;
    if (p.status === 'won') current.won++;
    if (p.status === 'lost') current.lost++;
    seasonStats.set(p.user_id, current);
  });

  // Build rankings based on season
  const rankings = stats
    .map((s) => {
      const seasonStat = seasonStats.get(s.user_id);
      const seasonTotal = seasonStat?.total ?? 0;
      const seasonWon = seasonStat?.won ?? 0;
      const seasonLost = seasonStat?.lost ?? 0;
      const seasonAccuracy = seasonTotal > 0 ? (seasonWon / (seasonWon + seasonLost)) * 100 : 0;

      return {
        user_id: s.user_id,
        display_name: profileMap.get(s.user_id) ?? '匿名',
        // All-time stats
        total_predictions: s.total_predictions,
        won_count: s.won_count,
        lost_count: s.lost_count,
        accuracy_rate: s.accuracy_rate,
        avg_confidence: s.avg_confidence ? Number(Number(s.avg_confidence).toFixed(1)) : null,
        // Season stats
        season_total: seasonTotal,
        season_won: seasonWon,
        season_lost: seasonLost,
        season_accuracy: Math.round(seasonAccuracy * 10) / 10,
      };
    })
    .filter((s) => season === 'alltime' ? s.total_predictions >= 3 : s.season_total >= 2)
    .sort((a, b) => {
      if (season === 'alltime') return b.accuracy_rate - a.accuracy_rate;
      return b.season_accuracy - a.season_accuracy;
    })
    .map((s, i) => ({ ...s, rank: i + 1 }));

  // Season champion
  const champion = rankings[0] ?? null;

  // Badge calculations
  const badges = rankings.slice(0, 10).map((r) => {
    const badgeList: string[] = [];
    if (r.rank === 1) badgeList.push('champion');
    if (r.rank === 2) badgeList.push('runner_up');
    if (r.rank === 3) badgeList.push('third_place');
    if (r.season_accuracy >= 70) badgeList.push('sharpshooter');
    if (r.season_total >= 10) badgeList.push('active_predictor');
    if (r.won_count >= 10) badgeList.push('ten_wins');
    return { user_id: r.user_id, badges: badgeList };
  });

  return NextResponse.json({
    ok: true,
    data: {
      rankings,
      champion,
      season,
      season_label: seasonLabel,
      total_predictors: stats.length,
      badges,
    },
  });
}
