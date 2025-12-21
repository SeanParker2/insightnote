import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from './env';

describe('env', () => {
  test('throws when required env is missing', () => {
    expect(() => getPublicSupabaseUrl({})).toThrow('NEXT_PUBLIC_SUPABASE_URL');
    expect(() => getPublicSupabaseAnonKey({})).toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  test('returns values when present', () => {
    expect(getPublicSupabaseUrl({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' })).toBe(
      'https://example.supabase.co',
    );
    expect(getPublicSupabaseAnonKey({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' })).toBe('anon');
  });
});

