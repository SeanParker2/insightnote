import { NextResponse } from 'next/server';
import { analyzeSentiment, batchAnalyzeSentiment } from '@/lib/sentiment-analysis';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  try {
    if (Array.isArray(body.texts)) {
      const result = await batchAnalyzeSentiment(body.texts);
      return NextResponse.json({ ok: true, data: result });
    }

    if (body.text) {
      const result = await analyzeSentiment(body.text);
      return NextResponse.json({ ok: true, data: result });
    }

    return NextResponse.json({ ok: false, error: 'missing_text' }, { status: 400 });
  } catch (error: any) {
    console.error('Sentiment analysis error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
