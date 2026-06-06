import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { verifyPrediction } from '@/lib/ai-helper';
import { createDataProvider } from '@/lib/data-provider';
import { timingSafeCompare } from '@/lib/crypto';
import type { Prediction } from '@/types';

async function getMarketContext(symbol: string): Promise<string> {
  try {
    const provider = createDataProvider();
    const [quote, news] = await Promise.all([
      provider.getQuote(symbol).catch(() => null),
      provider.getNews(symbol, 3).catch(() => []),
    ]);

    const parts: string[] = [`Market Report: ${new Date().toISOString()}.`];

    if (quote) {
      parts.push(`The current trading price for ${symbol} is $${quote.price.toFixed(2)}.`);
      parts.push(`Daily change: ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%.`);
      parts.push(`Day range: $${quote.low.toFixed(2)} - $${quote.high.toFixed(2)}.`);
    }

    if (news.length > 0) {
      parts.push(`Recent news: ${news.map(n => n.title).join('; ')}.`);
    }

    return parts.join(' ');
  } catch (error) {
    console.error(`Failed to get market context for ${symbol}:`, error);
    return `Market data unavailable for ${symbol}.`;
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim() ?? '';
  if (!cronSecret) {
    return new Response('Server misconfigured', { status: 500 });
  }
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !timingSafeCompare(token, cronSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = await createClient();

  const { data: predictions, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({ message: 'No active predictions to verify' });
  }

  const results = [];
  const updatedPostIds = new Set<string>();

  for (const prediction of predictions) {
    try {
      const marketContext = await getMarketContext(prediction.symbol);
      
      const verification = await verifyPrediction(
        prediction.symbol,
        prediction.direction,
        prediction.target_price,
        marketContext
      );

      let newStatus: 'active' | 'won' | 'lost' | 'expired' = verification.status;
      if (newStatus === 'active') {
        const now = new Date();
        const createdAt = new Date(prediction.created_at);
        const deadline = new Date(createdAt.getTime() + (prediction.timeframe_days || 30) * 24 * 60 * 60 * 1000);
        if (now > deadline) {
          newStatus = 'expired';
        }
      }

      if (newStatus !== 'active') {
        const { error: updateError } = await supabase
          .from('predictions')
          .update({ status: newStatus })
          .eq('id', prediction.id);

        if (!updateError) {
          updatedPostIds.add(prediction.post_id);
          results.push({ 
            id: prediction.id, 
            symbol: prediction.symbol, 
            oldStatus: 'active', 
            newStatus, 
            reason: verification.reason
          });
        }
      } else {
        results.push({
          id: prediction.id,
          status: 'active',
          reason: verification.reason
        });
      }
    } catch (e) {
      console.error(`Error processing prediction ${prediction.id}:`, e);
      results.push({ id: prediction.id, error: String(e) });
    }
  }

  if (updatedPostIds.size > 0) {
    const postIds = Array.from(updatedPostIds);
    const { data: allPredictions } = await supabase
      .from('predictions')
      .select('post_id, status')
      .in('post_id', postIds);

    if (allPredictions) {
      const rateMap = new Map<string, number>();
      for (const pid of postIds) {
        const postPreds = allPredictions.filter((p: any) => p.post_id === pid);
        const completed = postPreds.filter((p: any) => p.status === 'won' || p.status === 'lost');
        if (completed.length > 0) {
          const won = completed.filter((p: any) => p.status === 'won').length;
          rateMap.set(pid, (won / completed.length) * 100);
        }
      }

      await Promise.all(
        Array.from(rateMap.entries()).map(([pid, rate]) =>
          supabase.from('posts').update({ success_rate: rate }).eq('id', pid),
        ),
      );
    }
  }

  return NextResponse.json({ 
    success: true, 
    processed: predictions.length, 
    updates: results,
    recalculated_posts: Array.from(updatedPostIds) 
  });
}
