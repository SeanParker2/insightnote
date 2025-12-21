import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type FeedbackCategory = 'general' | 'bug' | 'feature' | 'billing';

type FeedbackRequestBody = {
  category?: FeedbackCategory;
  message?: string;
  rating?: number;
  email?: string;
  page_path?: string;
};

function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return value === 'general' || value === 'bug' || value === 'feature' || value === 'billing';
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({} as FeedbackRequestBody))) as FeedbackRequestBody;

  const category: FeedbackCategory = isFeedbackCategory(body.category) ? body.category : 'general';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const rating = typeof body.rating === 'number' ? body.rating : null;
  const email = typeof body.email === 'string' ? body.email.trim() : null;
  const pagePath = typeof body.page_path === 'string' ? body.page_path.trim() : null;

  if (message.length < 5 || message.length > 2000) {
    return NextResponse.json({ error: 'invalid_message' }, { status: 400 });
  }

  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'invalid_rating' }, { status: 400 });
  }

  if (email !== null && email.length > 255) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  if (pagePath !== null && pagePath.length > 500) {
    return NextResponse.json({ error: 'invalid_page_path' }, { status: 400 });
  }

  const userAgent = request.headers.get('user-agent') ?? null;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { error } = await supabase.from('customer_feedback').insert({
    user_id: userId,
    email,
    category,
    message,
    rating,
    page_path: pagePath,
    user_agent: userAgent,
  });

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

