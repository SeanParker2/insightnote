'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, BarChart3 } from 'lucide-react';

type Review = {
  id: string; week_start: string; week_end: string;
  reading_summary: { articles_read: number; top_tags: string[]; sentiment_distribution: { bullish: number; bearish: number; neutral: number } };
  bias_analysis: { confirmation_bias_detected: boolean; description: string; recommendation: string };
  prediction_accuracy: { total: number; correct: number; accuracy_pct: number };
  ai_insights: string | null;
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/reviews?limit=10');
    if (res.ok) { const d = await res.json(); setReviews(d.data ?? []); if (d.data?.length > 0) setSelected(d.data[0]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-400 text-sm">加载中...</div>;

  if (reviews.length === 0) return (
    <div className="min-h-screen">
      <header className="h-14 flex items-center px-8 border-b border-neutral-100 bg-white"><Link href="/" className="text-xs text-neutral-400">首页</Link><ChevronRight className="w-3 h-3 text-neutral-200" /><h1 className="text-sm font-semibold text-neutral-900">周度复盘</h1></header>
      <div className="max-w-5xl mx-auto px-8 py-20 text-center"><BarChart3 className="w-12 h-12 text-neutral-200 mx-auto mb-4" /><p className="text-sm text-neutral-500">每周一自动生成复盘报告</p></div>
    </div>
  );

  const r = selected;
  const reading = r?.reading_summary;
  const bias = r?.bias_analysis;

  return (
    <div className="min-h-screen">
      <header className="h-14 flex items-center px-8 border-b border-neutral-100 bg-white"><Link href="/" className="text-xs text-neutral-400">首页</Link><ChevronRight className="w-3 h-3 text-neutral-200" /><h1 className="text-sm font-semibold text-neutral-900">周度复盘</h1></header>
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">{reviews.map(rv => <button key={rv.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${selected?.id === rv.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`} onClick={() => setSelected(rv)}>{new Date(rv.week_start).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} ~ {new Date(rv.week_end).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</button>)}</div>

        {r && <div className="space-y-6">
          {r.ai_insights && <div className="p-5 rounded-xl bg-blue-50 border border-blue-100"><h3 className="text-xs font-semibold text-blue-700 mb-2">AI 复盘建议</h3><p className="text-sm text-blue-600 leading-relaxed">{r.ai_insights}</p></div>}

          {reading && <div className="p-5 rounded-xl bg-white border border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">阅读概览</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center"><div className="text-2xl font-bold text-neutral-900">{reading.articles_read}</div><div className="text-xs text-neutral-400">文章</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-red-600">{reading.sentiment_distribution.bullish}</div><div className="text-xs text-neutral-400">看多</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-emerald-600">{reading.sentiment_distribution.bearish}</div><div className="text-xs text-neutral-400">看空</div></div>
            </div>
            {reading.top_tags.length > 0 && <div className="flex gap-1.5 flex-wrap"><span className="text-xs text-neutral-400">标签：</span>{reading.top_tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 bg-neutral-100 rounded">{t}</span>)}</div>}
          </div>}

          {bias && <div className={`p-5 rounded-xl border ${bias.confirmation_bias_detected ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">认知偏差</h3>
            <div className="flex items-center gap-2 mb-1"><span className={`w-1.5 h-1.5 rounded-full ${bias.confirmation_bias_detected ? 'bg-red-500' : 'bg-emerald-500'}`} /><span className="text-xs font-medium">{bias.confirmation_bias_detected ? '检测到确认偏差' : '未发现明显偏差'}</span></div>
            <p className="text-xs text-neutral-600 mb-1">{bias.description}</p>
            <p className="text-xs text-neutral-500 italic">{bias.recommendation}</p>
          </div>}

          {r.prediction_accuracy.total > 0 && <div className="p-5 rounded-xl bg-white border border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">预测表现</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center"><div className="text-2xl font-bold text-neutral-900">{r.prediction_accuracy.total}</div><div className="text-xs text-neutral-400">总预测</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-emerald-600">{r.prediction_accuracy.correct}</div><div className="text-xs text-neutral-400">正确</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-blue-600">{r.prediction_accuracy.accuracy_pct}%</div><div className="text-xs text-neutral-400">准确率</div></div>
            </div>
          </div>}
        </div>}
      </div>
    </div>
  );
}
