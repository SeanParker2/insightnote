import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.side_id !== 'string' || typeof body.content !== 'string' || body.content.trim().length < 5) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('controversy_arguments')
    .insert({
      side_id: body.side_id,
      user_id: userData.user.id,
      content: body.content.trim().slice(0, 1000),
      evidence_url: typeof body.evidence_url === 'string' ? body.evidence_url.trim().slice(0, 500) : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.argument_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  // Increment upvotes
  const { data: arg } = await supabase
    .from('controversy_arguments')
    .select('upvotes')
    .eq('id', body.argument_id)
    .single();

  if (arg) {
    await supabase
      .from('controversy_arguments')
      .update({ upvotes: (arg.upvotes ?? 0) + 1 })
      .eq('id', body.argument_id);
  }

  return NextResponse.json({ ok: true });
}
