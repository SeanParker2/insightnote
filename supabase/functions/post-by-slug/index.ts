import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

type RequestBody = {
  slug?: string;
};

serve(async (req: Request) => {
  const startedAt = Date.now();

  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json', ...corsHeaders },
    });
  }

  const { slug } = (await req.json().catch(() => ({} as RequestBody))) as RequestBody;
  if (!slug || typeof slug !== 'string') {
    return new Response(JSON.stringify({ error: 'slug_required' }), {
      status: 400,
      headers: { 'content-type': 'application/json', ...corsHeaders },
    });
  }

  const denoEnv = (globalThis as any).Deno?.env;
  const supabaseUrl = denoEnv?.get?.('SUPABASE_URL');
  const supabaseAnonKey = denoEnv?.get?.('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'missing_supabase_env' }), {
      status: 500,
      headers: { 'content-type': 'application/json', ...corsHeaders },
    });
  }

  const authorization = req.headers.get('authorization') ?? '';

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authorization ? { authorization } : {},
    },
  });

  const { data, error } = await supabase.rpc('get_post_secure_by_slug', { slug_in: slug });
  if (error) {
    console.log(
      JSON.stringify({
        at: 'post-by-slug',
        slug,
        ok: false,
        ms: Date.now() - startedAt,
      }),
    );
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500,
      headers: { 'content-type': 'application/json', ...corsHeaders },
    });
  }

  if (!data) {
    console.log(
      JSON.stringify({
        at: 'post-by-slug',
        slug,
        ok: false,
        status: 404,
        ms: Date.now() - startedAt,
      }),
    );
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: { 'content-type': 'application/json', ...corsHeaders },
    });
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    JSON.stringify({
      at: 'post-by-slug',
      slug,
      ok: true,
      ms: durationMs,
    }),
  );

  return new Response(JSON.stringify({ data, duration_ms: durationMs }), {
    status: 200,
    headers: { 'content-type': 'application/json', ...corsHeaders },
  });
});
