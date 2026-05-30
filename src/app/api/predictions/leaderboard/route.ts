import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  // Get user prediction stats
  const { data: stats } = await supabase
    .from('user_prediction_stats')
    .select('*')
    .order('accuracy_rate', { ascending: false })
    .limit(limit);

  if (!stats || stats.length === 0) {
    return NextResponse.json({ ok: true, data: [] });
  }

  // Get user display info
  const userIds = stats.map((s) => s.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('id', userIds);

  const profileMap = new Map<string, string>();
  (profiles ?? []).forEach((p) => {
    profileMap.set(p.id, p.nickname ?? '匿名用户');
  });

  const leaderboard = stats
    .filter((s) => s.won_count + s.lost_count >= 3) // Minimum 3 resolved predictions
    .map((s) => ({
      user_id: s.user_id,
      display_name: profileMap.get(s.user_id) ?? '匿名用户',
      total_predictions: s.total_predictions,
      won_count: s.won_count,
      lost_count: s.lost_count,
      accuracy_rate: s.accuracy_rate,
      avg_confidence: s.avg_confidence ? Number(Number(s.avg_confidence).toFixed(1)) : null,
    }));

  return NextResponse.json({ ok: true, data: leaderboard });
}
