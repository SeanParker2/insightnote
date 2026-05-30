import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('post_id');
  const scope = searchParams.get('scope') || 'public'; // public | mine
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  const { data: userData } = await supabase.auth.getUser();

  let query = supabase
    .from('user_graphs')
    .select('id, user_id, post_id, title, description, is_public, fork_count, forked_from, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (scope === 'mine' && userData.user) {
    query = query.eq('user_id', userData.user.id);
  } else {
    query = query.eq('is_public', true);
  }

  if (postId) {
    query = query.eq('post_id', postId);
  }

  const { data: graphs, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  if (!graphs || graphs.length === 0) {
    return NextResponse.json({ ok: true, data: [] });
  }

  // Fetch nodes for all graphs
  const graphIds = graphs.map((g) => g.id);
  const { data: nodes } = await supabase
    .from('user_graph_nodes')
    .select('*')
    .in('graph_id', graphIds);

  const nodesMap = new Map<string, typeof nodes>();
  (nodes ?? []).forEach((n) => {
    const list = nodesMap.get(n.graph_id) ?? [];
    list.push(n);
    nodesMap.set(n.graph_id, list);
  });

  const result = graphs.map((g) => ({
    ...g,
    nodes: nodesMap.get(g.id) ?? [],
  }));

  return NextResponse.json({ ok: true, data: result });
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit(`graph:${ip}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 100) : '';
  if (!title) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  // Create the graph
  const { data: graph, error: graphError } = await supabase
    .from('user_graphs')
    .insert({
      user_id: userData.user.id,
      post_id: typeof body.post_id === 'string' ? body.post_id : null,
      title,
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 500) : null,
      is_public: Boolean(body.is_public),
      forked_from: typeof body.forked_from === 'string' ? body.forked_from : null,
    })
    .select()
    .single();

  if (graphError) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  // Insert nodes if provided
  const nodes = Array.isArray(body.nodes) ? body.nodes : [];
  if (nodes.length > 0) {
    const nodeRows = nodes.map((n: Record<string, unknown>) => ({
      graph_id: graph.id,
      label: String(n.label || 'Node'),
      type: ['root', 'event', 'impact', 'ticker', 'custom'].includes(String(n.type)) ? String(n.type) : 'event',
      parent_id: typeof n.parent_id === 'string' ? n.parent_id : null,
      probability: typeof n.probability === 'number' ? n.probability : null,
      impact_direction: ['bullish', 'bearish', 'neutral'].includes(String(n.impact_direction)) ? String(n.impact_direction) : null,
      time_delay_hours: typeof n.time_delay_hours === 'number' ? n.time_delay_hours : 0,
      evidence_text: typeof n.evidence_text === 'string' ? n.evidence_text : null,
      position_x: typeof n.position_x === 'number' ? n.position_x : null,
      position_y: typeof n.position_y === 'number' ? n.position_y : null,
      ticker_symbol: typeof n.ticker_symbol === 'string' ? n.ticker_symbol : null,
    }));

    await supabase.from('user_graph_nodes').insert(nodeRows);
  }

  // If forking, increment fork count on original
  if (body.forked_from) {
    // Note: fork count increment would need a DB trigger or separate update
    try {
      const { data: current } = await supabase
        .from('user_graphs')
        .select('fork_count')
        .eq('id', body.forked_from)
        .single();
      if (current) {
        await supabase
          .from('user_graphs')
          .update({ fork_count: (current.fork_count ?? 0) + 1 })
          .eq('id', body.forked_from);
      }
    } catch {
      // non-critical
    }
  }

  return NextResponse.json({ ok: true, data: graph }, { status: 201 });
}
