declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.87.1' {
  export function createClient(url: string, key: string, options?: unknown): any;
}
