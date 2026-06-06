'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Flame } from 'lucide-react';

type RankedUser = {
  rank: number;
  user_id: string;
  display_name: string;
  total_predictions: number;
  won_count: number;
  lost_count: number;
  accuracy_rate: number;
  avg_confidence: number | null;
  season_total: number;
  season_won: number;
  season_lost: number;
  season_accuracy: number;
};

type TournamentData = {
  rankings: RankedUser[];
  champion: RankedUser | null;
  season: string;
  season_label: string;
  total_predictors: number;
  badges: Array<{ user_id: string; badges: string[] }>;
};

const SEASONS = [
  { value: 'weekly', label: '本周', icon: Flame },
  { value: 'monthly', label: '本月', icon: Calendar },
  { value: 'alltime', label: '全部', icon: Trophy },
];

export default function TournamentPage() {
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<string>('alltime');

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tournament?season=${season}`);
    if (res.ok) {
      const result = await res.json();
      setData(result.data);
    }
    setLoading(false);
  }, [season]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="min-h-screen bg-surface-1 flex items-center justify-center"><div className="text-text-tertiary">加载中...</div></div>;
  }

  if (!data || data.rankings.length === 0) {
    return (
      <div className="min-h-screen bg-surface-1">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="text-6xl mb-6">🏆</div>
          <h1 className="text-3xl font-bold text-text-primary mb-4">预测锦标赛</h1>
          <p className="text-text-tertiary mb-6">暂无排行榜数据。至少需要 3 条已验证预测才能上榜。</p>
          <p className="text-sm text-text-tertiary">
            去 <a href="/predictions" className="text-brand-light underline">预测市场</a> 发表你的第一个预测吧
          </p>
        </div>
      </div>
    );
  }

  function getUserBadges(userId: string): string[] {
    return data?.badges.find(b => b.user_id === userId)?.badges ?? [];
  }

  return (
    <div className="min-h-screen bg-surface-1 pb-20">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-text-primary">预测锦标赛</h1>
          <p className="mt-2 text-sm text-text-tertiary">
            {data.total_predictors} 位预测者参与竞争
          </p>
        </div>

        {/* Season Selector */}
        <div className="flex gap-2 mb-8">
          {SEASONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSeason(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                season === value 
                  ? 'bg-brand text-white' 
                  : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Champion */}
        {data.champion && (
          <div className="mb-10 p-6 rounded-xl border border-amber-500/30 bg-amber-500/10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">👑</span>
              <div>
                <div className="text-xs text-amber-400 font-medium uppercase">{data.season_label}冠军</div>
                <div className="text-xl font-bold text-amber-300">{data.champion.display_name}</div>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-amber-400">
              <span>{data.season_label}预测: {data.champion.season_total}</span>
              <span>正确: {data.champion.season_won}</span>
              <span>准确率: {data.champion.season_accuracy}%</span>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-4">{data.season_label}排行榜</h2>
          <div className="space-y-3">
            {data.rankings.map((user) => {
              const userBadges = getUserBadges(user.user_id);
              return (
                <div
                  key={user.user_id}
                  className={`p-4 rounded-xl border flex items-center gap-4 transition-colors ${user.rank <= 3 ? 'border-amber-500/30 bg-amber-500/10' : 'border-border-default hover:border-border-strong'}`}
                >
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${user.rank === 1 ? 'bg-amber-500 text-white' : user.rank === 2 ? 'bg-slate-400 text-white' : user.rank === 3 ? 'bg-amber-700 text-white' : 'bg-surface-2 text-text-secondary'}`}>
                    {user.rank}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">{user.display_name}</span>
                      {user.rank === 1 && <Badge className="bg-amber-500/100 text-[10px]">冠军</Badge>}
                      {user.rank === 2 && <Badge className="bg-slate-400 text-[10px]">亚军</Badge>}
                      {user.rank === 3 && <Badge className="bg-amber-700 text-[10px]">季军</Badge>}
                      {userBadges.includes('sharpshooter') && <Badge className="bg-purple-500 text-[10px]">精准射手</Badge>}
                      {userBadges.includes('active_predictor') && <Badge className="bg-blue-500 text-[10px]">活跃预测者</Badge>}
                      {userBadges.includes('ten_wins') && <Badge className="bg-emerald-500 text-[10px]">十胜达成</Badge>}
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      {season === 'alltime' 
                        ? `${user.total_predictions} 次预测 · ${user.won_count} 胜 · ${user.lost_count} 负`
                        : `${user.season_total} 次预测 · ${user.season_won} 胜 · ${user.season_lost} 负`
                      }
                    </div>
                  </div>

                  {/* Accuracy */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-signal-down">
                      {season === 'alltime' ? user.accuracy_rate : user.season_accuracy}%
                    </div>
                    <div className="text-xs text-text-tertiary">准确率</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
