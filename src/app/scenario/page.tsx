'use client';

import { useState, useEffect } from 'react';
import { Compass, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SentimentBadge } from '@/components/ui/SentimentBadge';
import { LoadingState } from '@/components/ui/LoadingState';

type Result = {
  scenario_summary: string;
  impact_analysis: Array<{ symbol: string; name: string; expected_impact: string; expected_change_pct: number; reasoning: string }>;
  portfolio_total_impact: number;
  historical_reference: string;
  hedging_suggestion: string;
  risk_level: string;
};

type HistoryItem = {
  id: string;
  scenario: string;
  result: Result;
  created_at: string;
};

const EXAMPLES = ['如果美联储在6月降息50个基点', '如果中美贸易战升级', '如果AI行业出现重大监管政策', '如果原油价格突破100美元/桶', '如果人民币贬值到7.5', '如果半导体供应链中断'];

export default function ScenarioPage() {
  const [scenario, setScenario] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load history on mount
  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const res = await fetch('/api/scenario?limit=10');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.data)) {
            setHistory(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to load scenario history:', error);
      }
      setLoadingHistory(false);
    }
    loadHistory();
  }, []);

  async function handleSimulate() {
    if (!scenario.trim()) return;
    setLoading(true); setError(null); setResult(null);
    const res = await fetch('/api/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: scenario.trim() }) });
    const data = await res.json();
    if (data.ok) { 
      setResult(data.data); 
      // Reload history
      const histRes = await fetch('/api/scenario?limit=10');
      if (histRes.ok) {
        const histData = await histRes.json();
        if (histData.ok) setHistory(histData.data);
      }
    }
    else setError(data.error === 'unauthorized' ? '请先登录并添加持仓' : '模拟失败');
    setLoading(false);
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="情景模拟" breadcrumbs={[{ label: '首页', href: '/' }, { label: '情景模拟' }]} />

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-2">如果...会怎样？</h2>
          <p className="text-sm text-text-secondary">输入宏观情景假设，AI 将分析对你的持仓影响</p>
        </div>

        <div className="flex gap-3 mb-4">
          <input className="flex-1 h-11 rounded-xl border border-border-default bg-surface-2 px-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/40" value={scenario} onChange={e => setScenario(e.target.value)} placeholder="如果..." onKeyDown={e => e.key === 'Enter' && handleSimulate()} />
          <button onClick={handleSimulate} disabled={loading || scenario.trim().length < 5} className="px-5 h-11 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark disabled:opacity-50 transition-colors">{loading ? '模拟中...' : '开始模拟'}</button>
        </div>

        {!result && !loading && (
          <div className="flex flex-wrap gap-2 mb-10">{EXAMPLES.map(ex => <button key={ex} className="px-3 py-1.5 border border-border-default text-xs text-text-tertiary rounded-full hover:border-border-strong hover:text-text-secondary transition-colors" onClick={() => setScenario(ex)}>{ex}</button>)}</div>
        )}

        {error && <div className="mb-6 p-4 rounded-xl bg-signal-up-bg border border-signal-up/20 text-sm text-signal-up">{error}</div>}

        {result && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-6 rounded-xl bg-surface-1 border border-border-default">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-text-primary">{result.scenario_summary}</h3>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${result.risk_level === 'high' ? 'bg-signal-up-bg text-signal-up' : result.risk_level === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-signal-down-bg text-signal-down'}`}>
                  风险: {result.risk_level === 'high' ? '高' : result.risk_level === 'medium' ? '中' : '低'}
                </span>
              </div>
              <div className={`text-3xl font-bold ${result.portfolio_total_impact >= 0 ? 'text-signal-up' : 'text-signal-down'}`}>
                {result.portfolio_total_impact >= 0 ? '+' : ''}{result.portfolio_total_impact.toFixed(2)}%
              </div>
              <div className="text-xs text-text-tertiary mt-1">组合整体预估影响</div>
            </div>

            <div className="space-y-3">{result.impact_analysis.map(item => (
              <div key={item.symbol} className="p-4 rounded-xl bg-surface-1 border border-border-default flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2"><span className="text-sm font-semibold text-text-primary">{item.symbol}</span>{item.name && <span className="text-xs text-text-tertiary">{item.name}</span>}</div>
                  <p className="text-xs text-text-secondary mt-1">{item.reasoning}</p>
                </div>
                <span className={`text-lg font-bold font-mono ${item.expected_change_pct >= 0 ? 'text-signal-up' : 'text-signal-down'}`}>{item.expected_change_pct >= 0 ? '+' : ''}{item.expected_change_pct.toFixed(1)}%</span>
              </div>
            ))}</div>

            {result.historical_reference && <div className="p-5 rounded-xl bg-brand/5 border border-brand/20"><h4 className="text-xs font-semibold text-brand-light mb-1">历史参考</h4><p className="text-sm text-text-secondary">{result.historical_reference}</p></div>}
            {result.hedging_suggestion && <div className="p-5 rounded-xl bg-surface-1 border border-border-default"><h4 className="text-xs font-semibold text-text-primary mb-1">对冲建议</h4><p className="text-sm text-text-secondary">{result.hedging_suggestion}</p></div>}
          </div>
        )}

        {history.length > 0 && !loading && (
          <div className="mt-10"><h3 className="text-sm font-semibold text-text-primary mb-3">模拟历史</h3>
            <div className="space-y-2">{history.map((h) => (
              <button key={h.id} className="w-full text-left p-3 rounded-lg border border-border-default hover:bg-surface-2 transition-colors flex items-center justify-between" onClick={() => { setScenario(h.scenario); setResult(h.result); }}>
                <span className="text-sm text-text-secondary truncate">{h.scenario}</span>
                <div className="flex items-center gap-2 shrink-0 ml-4"><span className={`text-sm font-bold ${h.result.portfolio_total_impact >= 0 ? 'text-signal-up' : 'text-signal-down'}`}>{h.result.portfolio_total_impact >= 0 ? '+' : ''}{h.result.portfolio_total_impact.toFixed(1)}%</span><Clock className="w-3 h-3 text-text-tertiary" /></div>
              </button>
            ))}</div>
          </div>
        )}
      </div>
    </div>
  );
}
