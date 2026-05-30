import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { verifyPrediction } from '@/lib/ai-helper';
import { timingSafeCompare } from '@/lib/crypto';
import type { Prediction } from '@/types';

// Mock function to get market data
// In a real scenario, this would call Yahoo Finance, AlphaVantage, or a paid data provider
async function getMarketContext(symbol: string): Promise<string> {
  // Mock data for demo purposes - In a real app, fetch from Yahoo Finance/News API
  const mockPrices: Record<string, number> = {
    'AAPL': 230.50,
    'NVDA': 145.20,
    'BTC-USD': 98000.00,
    'TSLA': 350.00,
    'MSFT': 420.00,
    'GOOGL': 180.00,
  };

  const price = mockPrices[symbol] || (100 + Math.random() * 50);
  
  return `Market Report: ${new Date().toISOString()}. 
  The current trading price for ${symbol} is $${price.toFixed(2)}. 
  Market sentiment is generally volatile. Tech sector is showing strength.`;
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

  // 1. Fetch active predictions
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

  // 2. Iterate and verify using AI
  for (const prediction of predictions) {
    try {
      const marketContext = await getMarketContext(prediction.symbol);
      
      // Use DeepSeek AI to verify
      const verification = await verifyPrediction(
        prediction.symbol,
        prediction.direction,
        prediction.target_price,
        marketContext
      );

      // Check expiration as a fallback if AI says "active" but time is up
      let newStatus: 'active' | 'won' | 'lost' | 'expired' = verification.status;
      if (newStatus === 'active') {
        const now = new Date();
        const createdAt = new Date(prediction.created_at);
        const deadline = new Date(createdAt.getTime() + (prediction.timeframe_days || 30) * 24 * 60 * 60 * 1000);
        if (now > deadline) {
           newStatus = 'expired'; // Or 'lost' depending on business rule. Let's say expired.
        }
      }

      if (newStatus !== 'active') {
        // Update DB
        const { error: updateError } = await supabase
          .from('predictions')
          .update({ status: newStatus }) // We could also save verification.reason if we added a column
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

  // 3. Recalculate Success Rate for affected Posts (batched)
  if (updatedPostIds.size > 0) {
    const postIds = Array.from(updatedPostIds);
    const { data: allPredictions } = await supabase
      .from('predictions')
      .select('post_id, status')
      .in('post_id', postIds);

    if (allPredictions) {
      const rateMap = new Map<string, number>();
      for (const pid of postIds) {
        const postPreds = allPredictions.filter((p) => p.post_id === pid);
        const completed = postPreds.filter((p) => p.status === 'won' || p.status === 'lost');
        if (completed.length > 0) {
          const won = completed.filter((p) => p.status === 'won').length;
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
