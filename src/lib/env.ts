type EnvSource = Record<string, string | undefined>;

function readRequired(env: EnvSource, name: string) {
  const value = env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const defaultPublicEnv: EnvSource = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export function getPublicSupabaseUrl(env: EnvSource = defaultPublicEnv) {
  return readRequired(env, 'NEXT_PUBLIC_SUPABASE_URL');
}

export function getPublicSupabaseAnonKey(env: EnvSource = defaultPublicEnv) {
  return readRequired(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
}
