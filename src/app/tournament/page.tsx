'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';

type RankedUser = {
  rank: number;
  user_id: string;
  display_name: string;
  total_predictions: number;
  won_count: number;
  lost_count: number;
  accuracy_rate: number;
  avg_confidence: number | null;
  weekly: { total: number; won: number } | null;
};

type TournamentData = {
  rankings: RankedUser[];
  weekly_champion: RankedUser | null;
  total_predictors: number;
};

export default function TournamentPage() {
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/tournament');
    if (res.ok) {
      const result = await res.json();
      setData(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="text-slate-400">加载中...</div></div>;
  }

  if (!data || data.rankings.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="text-6xl mb-6">🏆</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">预测锦标赛</h1>
          <p className="text-slate-500 mb-6">暂无排行榜数据。至少需要 3 条已验证预测才能上榜。</p>
          <p className="text-sm text-slate-400">
            去 <a href="/predictions" className="text-brand-900 underline">预测市场</a> 发表你的第一个预测吧
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900">预测锦标赛</h1>
          <p className="mt-2 text-sm text-slate-500">
            {data.total_predictors} 位预测者参与竞争
          </p>
        </div>

        {/* Weekly Champion */}
        {data.weekly_champion && (
          <div className="mb-10 p-6 rounded-xl border border-amber-200 bg-amber-50">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">👑</span>
              <div>
                <div className="text-xs text-amber-600 font-medium uppercase">本周之星</div>
                <div className="text-xl font-bold text-amber-900">{data.weekly_champion.display_name}</div>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-amber-700">
              <span>本周预测: {data.weekly_champion.weekly?.total ?? 0}</span>
              <span>正确: {data.weekly_champion.weekly?.won ?? 0}</span>
              <span>总准确率: {data.weekly_champion.accuracy_rate}%</span>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">总排行榜</h2>
          <div className="space-y-3">
            {data.rankings.map((user) => (
              <div
                key={user.user_id}
                className={`p-4 rounded-xl border flex items-center gap-4 transition-colors ${user.rank <= 3 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                {/* Rank */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${user.rank === 1 ? 'bg-amber-400 text-white' : user.rank === 2 ? 'bg-slate-300 text-white' : user.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {user.rank}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{user.display_name}</span>
                    {user.rank === 1 && <Badge className="bg-amber-500 text-[10px]">冠军</Badge>}
                    {user.rank === 2 && <Badge className="bg-slate-400 text-[10px]">亚军</Badge>}
                    {user.rank === 3 && <Badge className="bg-amber-700 text-[10px]">季军</Badge>}
                    {user.accuracy_rate >= 80 && <Badge className="bg-purple-500 text-[10px]">精准射手</Badge>}
                    {user.total_predictions >= 20 && <Badge className="bg-blue-500 text-[10px]">活跃预测者</Badge>}
                    {user.won_count >= 10 && <Badge className="bg-emerald-500 text-[10px]">十胜达成</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {user.total_predictions} 次预测 · {user.won_count} 胜 · {user.lost_count} 负
                    {user.weekly && <span className="ml-2">· 本周 {user.weekly.won}/{user.weekly.total}</span>}
                  </div>
                </div>

                {/* Accuracy */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-600">{user.accuracy_rate}%</div>
                  <div className="text-xs text-slate-400">准确率</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
