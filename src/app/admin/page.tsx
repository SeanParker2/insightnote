import { notFound, redirect } from 'next/navigation';
import { playfair } from '@/lib/fonts';
import { createClient } from '@/lib/supabase/server';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/admin')}`);
  }

  if (user.email) {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  }

  const { data: profile } = await supabase.from('profiles').select('email, is_admin').eq('id', user.id).maybeSingle();
  const isAdmin = Boolean((profile as any)?.is_admin);
  if (!isAdmin) notFound();

  return (
    <div className="min-h-screen bg-surface-1 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <header className="flex items-end justify-between gap-6 border-b border-border-default pb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Admin</div>
            <h1 className={`${playfair.className} mt-2 text-4xl font-bold text-text-primary`}>管理后台</h1>
            <p className="mt-3 text-sm text-text-secondary">编辑与发布内容（仅管理员可见）。</p>
          </div>
          <div className="text-sm text-text-tertiary truncate max-w-[260px]">{profile?.email ?? user.email}</div>
        </header>

        <div className="mt-8">
          <AdminDashboardClient />
        </div>
      </div>
    </div>
  );
}

