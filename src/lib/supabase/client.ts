import { createBrowserClient } from '@supabase/ssr'
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from '@/lib/env'

export function createClient() {
  const supabaseUrl = getPublicSupabaseUrl()
  const anonKey = getPublicSupabaseAnonKey()

  const fetchWithApiKey: typeof fetch = async (input, init) => {
    const resolvedUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    if (!resolvedUrl.startsWith(supabaseUrl)) {
      return fetch(input, init)
    }

    const baseHeaders = input instanceof Request ? input.headers : undefined

    const headers = new Headers(baseHeaders ?? undefined)
    const initHeaders = init?.headers
    if (initHeaders) {
      new Headers(initHeaders).forEach((value, key) => headers.set(key, value))
    }

    if (!headers.has('apikey')) headers.set('apikey', anonKey)
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${anonKey}`)

    if (typeof input === 'string') {
      return fetch(input, { ...init, headers })
    }

    if (input instanceof URL) {
      return fetch(input, { ...init, headers })
    }

    return fetch(new Request(input, { ...init, headers }))
  }

  return createBrowserClient(supabaseUrl, anonKey, {
    global: { fetch: fetchWithApiKey },
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    isSingleton: true,
  })
}
