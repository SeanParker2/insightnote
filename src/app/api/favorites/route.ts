import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'favorites'; // 'favorites' | 'history'
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  if (type === 'history') {
    // Get reading history
    const { data: history, error } = await supabase
      .from('user_reading_history')
      .select('id, post_id, created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
    }

    // Get post details
    const postIds = (history ?? []).map(h => h.post_id);
    const { data: posts } = postIds.length > 0
      ? await supabase
          .from('posts')
          .select('id, slug, title, summary_tldr, sentiment, published_at')
          .in('id', postIds)
      : { data: [] };

    const postMap = new Map((posts ?? []).map(p => [p.id, p]));
    
    const result = (history ?? []).map(h => {
      const post = postMap.get(h.post_id);
      return {
        id: h.id,
        post_id: h.post_id,
        read_at: h.created_at,
        title: post?.title || '未知文章',
        slug: post?.slug,
        summary: post?.summary_tldr,
        sentiment: post?.sentiment,
      };
    });

    return NextResponse.json({ ok: true, data: result });
  }

  // Get favorites
  const { data: favorites, error } = await supabase
    .from('user_favorites')
    .select('id, post_id, created_at')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  // Get post details
  const postIds = (favorites ?? []).map(f => f.post_id);
  const { data: posts } = postIds.length > 0
    ? await supabase
        .from('posts')
        .select('id, slug, title, summary_tldr, sentiment, published_at')
        .in('id', postIds)
    : { data: [] };

  const postMap = new Map((posts ?? []).map(p => [p.id, p]));
  
  const result = (favorites ?? []).map(f => {
    const post = postMap.get(f.post_id);
    return {
      id: f.id,
      post_id: f.post_id,
      favorited_at: f.created_at,
      title: post?.title || '未知文章',
      slug: post?.slug,
      summary: post?.summary_tldr,
      sentiment: post?.sentiment,
    };
  });

  return NextResponse.json({ ok: true, data: result });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.post_id) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  const { post_id } = body;

  // Check if already favorited
  const { data: existing } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('post_id', post_id)
    .maybeSingle();

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: 'removed' });
  }

  // Add favorite
  const { error } = await supabase
    .from('user_favorites')
    .insert({
      user_id: userData.user.id,
      post_id,
    });

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: 'added' });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const favoriteId = searchParams.get('id');

  if (!favoriteId) {
    return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('id', favoriteId)
    .eq('user_id', userData.user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
