import { NextResponse } from 'next/server';
import { timingSafeCompare } from '@/lib/crypto';
import { generateAllBriefings } from '@/lib/briefing-engine';

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

  try {
    const result = await generateAllBriefings();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Briefing cron error:', error);
    return NextResponse.json({ ok: false, error: 'generation_failed' }, { status: 500 });
  }
}
