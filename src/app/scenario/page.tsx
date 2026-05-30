'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Compass, Clock } from 'lucide-react';

type Result = {
  scenario_summary: string;
  impact_analysis: Array<{ symbol: string; name: string; expected_impact: string; expected_change_pct: number; reasoning: string }>;
  portfolio_total_impact: number;
  historical_reference: string;
  hedging_suggestion: string;
  risk_level: string;
};

const EXAMPLES = ['如果美联储在6月降息50个基点', '如果中美贸易战升级', '如果AI行业出现重大监管政策', '如果原油价格突破100美元/桶', '如果人民币贬值到7.5', '如果半导体供应链中断'];

export default function ScenarioPage() {
  const [scenario, setScenario] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ scenario: string; result: Result; time: Date }>>([]);

  async function handleSimulate() {
    if (!scenario.trim()) return;
    setLoading(true); setError(null); setResult(null);
    const res = await fetch('/api/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: scenario.trim() }) });
    const data = await res.json();
    if (data.ok) { setResult(data.data); setHistory(prev => [{ scenario: scenario.trim(), result: data.data, time: new Date() }, ...prev].slice(0, 10)); }
    else setError(data.error === 'unauthorized' ? '请先登录并添加持仓' : '模拟失败');
    setLoading(false);
  }

  return (
    <div className="min-h-screen">
      <header className="h-14 flex items-center px-8 border-b border-neutral-100 bg-white">
        <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600">首页</Link>
        <ChevronRight className="w-3 h-3 text-neutral-200" />
        <h1 className="text-sm font-semibold text-neutral-900">情景模拟</h1>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-neutral-900 mb-2">如果...会怎样？</h2>
          <p className="text-sm text-neutral-500">输入宏观情景假设，AI 将分析对你的持仓影响</p>
        </div>

        <div className="flex gap-3 mb-4">
          <input className="flex-1 h-11 rounded-xl border border-neutral-200 px-4 text-sm" value={scenario} onChange={e => setScenario(e.target.value)} placeholder="如果..." onKeyDown={e => e.key === 'Enter' && handleSimulate()} />
          <button onClick={handleSimulate} disabled={loading || scenario.trim().length < 5} className="px-5 h-11 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 disabled:opacity-50">{loading ? '模拟中...' : '开始模拟'}</button>
        </div>

        {!result && !loading && (
          <div className="flex flex-wrap gap-2 mb-10">{EXAMPLES.map(ex => <button key={ex} className="px-3 py-1.5 border border-neutral-200 text-xs text-neutral-500 rounded-full hover:border-neutral-400 hover:text-neutral-700 transition-colors" onClick={() => setScenario(ex)}>{ex}</button>)}</div>
        )}

        {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

        {result && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-6 rounded-xl bg-white border border-neutral-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-neutral-900">{result.scenario_summary}</h3>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${result.risk_level === 'high' ? 'bg-red-50 text-red-600' : result.risk_level === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  风险: {result.risk_level === 'high' ? '高' : result.risk_level === 'medium' ? '中' : '低'}
                </span>
              </div>
              <div className={`text-3xl font-bold ${result.portfolio_total_impact >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {result.portfolio_total_impact >= 0 ? '+' : ''}{result.portfolio_total_impact.toFixed(2)}%
              </div>
              <div className="text-xs text-neutral-400 mt-1">组合整体预估影响</div>
            </div>

            <div className="space-y-3">{result.impact_analysis.map(item => (
              <div key={item.symbol} className="p-4 rounded-xl bg-white border border-neutral-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2"><span className="text-sm font-semibold text-neutral-900">{item.symbol}</span>{item.name && <span className="text-xs text-neutral-400">{item.name}</span>}</div>
                  <p className="text-xs text-neutral-500 mt-1">{item.reasoning}</p>
                </div>
                <span className={`text-lg font-bold font-mono ${item.expected_change_pct >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>{item.expected_change_pct >= 0 ? '+' : ''}{item.expected_change_pct.toFixed(1)}%</span>
              </div>
            ))}</div>

            {result.historical_reference && <div className="p-5 rounded-xl bg-blue-50 border border-blue-100"><h4 className="text-xs font-semibold text-blue-700 mb-1">历史参考</h4><p className="text-sm text-blue-600">{result.historical_reference}</p></div>}
            {result.hedging_suggestion && <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-100"><h4 className="text-xs font-semibold text-neutral-700 mb-1">对冲建议</h4><p className="text-sm text-neutral-600">{result.hedging_suggestion}</p></div>}
          </div>
        )}

        {history.length > 0 && !loading && (
          <div className="mt-10"><h3 className="text-sm font-semibold text-neutral-900 mb-3">模拟历史</h3>
            <div className="space-y-2">{history.map((h, i) => (
              <button key={i} className="w-full text-left p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50 transition-colors flex items-center justify-between" onClick={() => { setScenario(h.scenario); setResult(h.result); }}>
                <span className="text-sm text-neutral-700 truncate">{h.scenario}</span>
                <div className="flex items-center gap-2 shrink-0 ml-4"><span className={`text-sm font-bold ${h.result.portfolio_total_impact >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>{h.result.portfolio_total_impact >= 0 ? '+' : ''}{h.result.portfolio_total_impact.toFixed(1)}%</span><Clock className="w-3 h-3 text-neutral-300" /></div>
              </button>
            ))}</div>
          </div>
        )}
      </div>
    </div>
  );
}
