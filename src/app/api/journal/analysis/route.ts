import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CognitivePattern, CognitiveBiasReport } from '@/types/vision';

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Fetch cognitive patterns from the view
  const { data: patterns } = await supabase
    .from('user_cognitive_patterns')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!patterns || patterns.total_decisions === 0) {
    return NextResponse.json({
      ok: true,
      data: null,
      message: '需要至少 5 条决策记录才能生成分析报告',
    });
  }

  const p = patterns as CognitivePattern;

  // Build bias report
  const avgReturnOverall = (
    (p.avg_return_when_confident ?? 0) * p.confident_count +
    (p.avg_return_when_fearful ?? 0) * p.fearful_count +
    (p.avg_return_when_greedy ?? 0) * p.greedy_count
  ) / Math.max(p.confident_count + p.fearful_count + p.greedy_count, 1);

  const report: CognitiveBiasReport = {
    overconfidence: {
      detected: p.confident_count >= 3 && (p.avg_return_when_confident ?? 0) < avgReturnOverall,
      description: p.confident_count >= 3 && (p.avg_return_when_confident ?? 0) < avgReturnOverall
        ? `你在"非常自信"时的平均收益(${(p.avg_return_when_confident ?? 0).toFixed(1)}%)低于整体平均水平(${avgReturnOverall.toFixed(1)}%)，存在过度自信偏差`
        : '暂未检测到明显的过度自信偏差',
      avg_return_when_confident: p.avg_return_when_confident,
      avg_return_overall: avgReturnOverall,
    },
    loss_aversion: {
      detected: (p.avg_holding_days ?? 0) > 30,
      description: (p.avg_holding_days ?? 0) > 30
        ? `你的平均持仓周期为${Math.round(p.avg_holding_days ?? 0)}天，较长的持仓时间可能暗示损失厌恶——不愿止损`
        : '暂未检测到明显的损失厌恶偏差',
      avg_holding_winners: null,
      avg_holding_losers: null,
    },
    directional_bias: {
      detected: Math.abs(p.bullish_count - p.bearish_count) > p.total_decisions * 0.7,
      description: Math.abs(p.bullish_count - p.bearish_count) > p.total_decisions * 0.7
        ? `你的预测中${p.bullish_count > p.bearish_count ? '看多' : '看空'}占绝对主导(${Math.max(p.bullish_count, p.bearish_count)}/${p.total_decisions})，可能存在方向性偏差`
        : '你的多空方向分布较为均衡',
      bullish_pct: p.total_decisions > 0 ? (p.bullish_count / p.total_decisions) * 100 : 50,
      bearish_pct: p.total_decisions > 0 ? (p.bearish_count / p.total_decisions) * 100 : 50,
    },
    emotional_trading: {
      detected: (p.greedy_count ?? 0) >= 2 && (p.avg_return_when_greedy ?? 0) < 0,
      description: (p.greedy_count ?? 0) >= 2 && (p.avg_return_when_greedy ?? 0) < 0
        ? `你在"贪婪"情绪下的平均收益为${(p.avg_return_when_greedy ?? 0).toFixed(1)}%，建议在情绪激动时暂缓交易决策`
        : '暂未检测到明显的情绪化交易模式',
      greedy_return: p.avg_return_when_greedy,
      fearful_return: p.avg_return_when_fearful,
    },
  };

  return NextResponse.json({ ok: true, data: report, patterns: p });
}
