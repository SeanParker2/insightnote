import { createClient } from '@/lib/supabase/server';
import { DecisionMemoryStore } from '@/lib/decision-memory';
import { createDataProvider } from '@/lib/data-provider';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';

export interface AutoReflectionResult {
  verifiedCount: number;
  reflectionsGenerated: number;
  insights: string[];
}

export async function runAutoReflection(userId: string): Promise<AutoReflectionResult> {
  const supabase = await createClient();
  const provider = createDataProvider();
  const store = new DecisionMemoryStore(supabase, userId);

  const { data: pendingDecisions } = await supabase
    .from('decision_memories')
    .select('*')
    .eq('user_id', userId)
    .is('outcome', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!pendingDecisions?.length) {
    return { verifiedCount: 0, reflectionsGenerated: 0, insights: [] };
  }

  let verifiedCount = 0;
  let reflectionsGenerated = 0;
  const insights: string[] = [];

  for (const decision of pendingDecisions) {
    try {
      const quote = await provider.getQuote(decision.symbol);
      const entryPrice = decision.market_context?.price;

      if (!entryPrice) continue;

      const holdingDays = Math.floor((Date.now() - new Date(decision.created_at).getTime()) / 86400000);
      
      if (holdingDays < 1) continue;

      const actualReturn = ((quote.price - entryPrice) / entryPrice) * 100;

      const outcome = {
        verifiedAt: new Date().toISOString(),
        actualPrice: quote.price,
        actualReturn,
        benchmarkReturn: 0,
        excessReturn: actualReturn,
        holdingDays,
        maxDrawdown: 0,
        maxGain: 0,
      };

      const reflection = await generateReflection(decision, outcome);

      await supabase
        .from('decision_memories')
        .update({ outcome, reflection })
        .eq('id', decision.id);

      verifiedCount++;
      reflectionsGenerated++;

      if (reflection.lessonLearned) {
        insights.push(reflection.lessonLearned);
      }
    } catch (error) {
      console.error(`Failed to verify decision ${decision.id}:`, error);
    }
  }

  return { verifiedCount, reflectionsGenerated, insights: insights.slice(0, 5) };
}

async function generateReflection(decision: any, outcome: any) {
  const isWin = outcome.actualReturn > 0;
  const emotion = decision.emotion_state;
  const confidence = decision.confidence;

  if (!isDeepSeekConfigured()) {
    return generateFallbackReflection(decision, outcome);
  }

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `你是投资教练。根据决策和结果生成反思。

返回 JSON：
{
  "summary": "30字总结",
  "what_went_right": "做得好的地方",
  "what_went_wrong": "需要改进的地方",
  "lesson_learned": "经验教训",
  "applicable_pattern": "可复用的模式",
  "bias_detected": "检测到的偏差（如有）"
}`
        },
        {
          role: 'user',
          content: `决策：${decision.action} ${decision.symbol}
理由：${decision.reasoning}
信心度：${confidence}/5
情绪：${emotion}
入场价：${decision.market_context?.price}
当前价：${outcome.actualPrice}
收益：${outcome.actualReturn.toFixed(2)}%
持有天数：${outcome.holdingDays}`,
        },
      ],
      model: DEEPSEEK_MODEL,
      temperature: 0.3,
      max_tokens: 256,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) return generateFallbackReflection(decision, outcome);

    const result = JSON.parse(content);

    return {
      summary: result.summary || '',
      whatWentRight: result.what_went_right || '',
      whatWentWrong: result.what_went_wrong || '',
      lessonLearned: result.lesson_learned || '',
      applicablePattern: result.applicable_pattern || '',
      biasDetected: result.bias_detected || undefined,
    };
  } catch {
    return generateFallbackReflection(decision, outcome);
  }
}

function generateFallbackReflection(decision: any, outcome: any) {
  const isWin = outcome.actualReturn > 0;

  return {
    summary: isWin ? `正确决策，收益 ${outcome.actualReturn.toFixed(2)}%` : `失误决策，亏损 ${Math.abs(outcome.actualReturn).toFixed(2)}%`,
    whatWentRight: isWin ? '决策方向正确' : '及时止损',
    whatWentWrong: isWin ? '' : '判断失误',
    lessonLearned: isWin ? '保持这种分析方法' : '需要更深入的分析',
    applicablePattern: '',
    biasDetected: undefined,
  };
}

export async function generateWeeklyInsights(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: decisions } = await supabase
    .from('decision_memories')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: false });

  if (!decisions?.length) {
    return ['本周暂无决策记录'];
  }

  const verified = decisions.filter((d: any) => d.outcome);
  const wins = verified.filter((d: any) => d.outcome.actualReturn > 0);

  const insights: string[] = [];

  if (verified.length > 0) {
    const winRate = (wins.length / verified.length) * 100;
    insights.push(`本周胜率：${winRate.toFixed(0)}%（${wins.length}/${verified.length}）`);
  }

  const emotions = decisions.map((d: any) => d.emotion_state).filter(Boolean);
  const emotionCounts = new Map<string, number>();
  emotions.forEach((e: string) => emotionCounts.set(e, (emotionCounts.get(e) || 0) + 1));
  
  const dominantEmotion = Array.from(emotionCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (dominantEmotion) {
    insights.push(`主要情绪状态：${dominantEmotion[0]}（${dominantEmotion[1]}次）`);
  }

  return insights;
}
