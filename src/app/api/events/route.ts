import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type EventsRequestBody = {
  event_name?: string;
  payload?: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({} as EventsRequestBody))) as EventsRequestBody;
  const eventName = typeof body.event_name === 'string' ? body.event_name.trim() : '';

  if (eventName.length < 1 || eventName.length > 80) {
    return NextResponse.json({ error: 'invalid_event_name' }, { status: 400 });
  }

  const payload = isPlainObject(body.payload) ? body.payload : {};
  const payloadSize = JSON.stringify(payload).length;
  if (payloadSize > 10_000) {
    return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
  }

  const userAgent = request.headers.get('user-agent') ?? null;
  const referer = request.headers.get('referer') ?? null;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const enrichedPayload = {
    ...payload,
    user_agent: userAgent,
    referer,
  };

  const { error } = await supabase.from('events').insert({
    user_id: userId,
    event_name: eventName,
    payload: enrichedPayload,
  });

  if (error) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
