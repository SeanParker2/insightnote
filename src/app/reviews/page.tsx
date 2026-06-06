'use client';
import { useEffect, useState, useCallback } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

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
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/reviews?limit=10');
    if (res.ok) { const d = await res.json(); setReviews(d.data ?? []); if (d.data?.length > 0) setSelected(d.data[0]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/reviews', { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        if (d.ok && d.data) {
          await load();
        }
      }
    } catch (error) {
      console.error('Failed to generate review:', error);
    }
    setGenerating(false);
  }

  if (loading) return <div className="min-h-screen"><LoadingState /></div>;

  if (reviews.length === 0) return (
    <div className="min-h-screen">
      <PageHeader 
        title="周度复盘" 
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '周度复盘' }]}
        actions={
          <button 
            onClick={handleGenerate} 
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? '生成中...' : '生成本周复盘'}
          </button>
        }
      />
      <EmptyState 
        icon={<BarChart3 className="w-5 h-5 text-text-tertiary" />} 
        title="每周一自动生成复盘报告" 
        description="也可以点击右上角按钮手动生成"
      />
    </div>
  );

  const r = selected;
  const reading = r?.reading_summary;
  const bias = r?.bias_analysis;

  return (
    <div className="min-h-screen">
      <PageHeader 
        title="周度复盘" 
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '周度复盘' }]}
        actions={
          <button 
            onClick={handleGenerate} 
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? '生成中...' : '生成本周复盘'}
          </button>
        }
      />
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">{reviews.map(rv => <button key={rv.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selected?.id === rv.id ? 'bg-brand text-white' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'}`} onClick={() => setSelected(rv)}>{new Date(rv.week_start).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} ~ {new Date(rv.week_end).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</button>)}</div>

        {r && <div className="space-y-6">
          {r.ai_insights && <div className="p-5 rounded-xl bg-brand/5 border border-brand/20"><h3 className="text-xs font-semibold text-brand-light mb-2">AI 复盘建议</h3><p className="text-sm text-text-secondary leading-relaxed">{r.ai_insights}</p></div>}

          {reading && <div className="p-5 rounded-xl bg-surface-1 border border-border-default">
            <h3 className="text-sm font-semibold text-text-primary mb-4">阅读概览</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center"><div className="text-2xl font-bold text-text-primary">{reading.articles_read}</div><div className="text-xs text-text-tertiary">文章</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-signal-up">{reading.sentiment_distribution.bullish}</div><div className="text-xs text-text-tertiary">看多</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-signal-down">{reading.sentiment_distribution.bearish}</div><div className="text-xs text-text-tertiary">看空</div></div>
            </div>
            {reading.top_tags.length > 0 && <div className="flex gap-1.5 flex-wrap"><span className="text-xs text-text-tertiary">标签：</span>{reading.top_tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 bg-surface-2 rounded text-text-secondary">{t}</span>)}</div>}
          </div>}

          {bias && <div className={`p-5 rounded-xl border ${bias.confirmation_bias_detected ? 'border-signal-up/30 bg-signal-up-bg' : 'border-signal-down/30 bg-signal-down-bg'}`}>
            <h3 className="text-sm font-semibold text-text-primary mb-2">认知偏差</h3>
            <div className="flex items-center gap-2 mb-1"><span className={`w-1.5 h-1.5 rounded-full ${bias.confirmation_bias_detected ? 'bg-signal-up' : 'bg-signal-down'}`} /><span className="text-xs font-medium text-text-primary">{bias.confirmation_bias_detected ? '检测到确认偏差' : '未发现明显偏差'}</span></div>
            <p className="text-xs text-text-secondary mb-1">{bias.description}</p>
            <p className="text-xs text-text-tertiary italic">{bias.recommendation}</p>
          </div>}

          {r.prediction_accuracy.total > 0 && <div className="p-5 rounded-xl bg-surface-1 border border-border-default">
            <h3 className="text-sm font-semibold text-text-primary mb-3">预测表现</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center"><div className="text-2xl font-bold text-text-primary">{r.prediction_accuracy.total}</div><div className="text-xs text-text-tertiary">总预测</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-signal-down">{r.prediction_accuracy.correct}</div><div className="text-xs text-text-tertiary">正确</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-brand">{r.prediction_accuracy.accuracy_pct}%</div><div className="text-xs text-text-tertiary">准确率</div></div>
            </div>
          </div>}
        </div>}
      </div>
    </div>
  );
}
