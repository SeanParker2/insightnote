import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { LoginControl } from '@/components/auth/LoginControl';
import { SidebarLink } from '@/components/SidebarLink';
import { UnreadBadge } from '@/components/ui/UnreadBadge';
import { isSubscriptionActive } from '@/lib/utils';
import { Home, Layers, Bell, Settings, BookOpen, Briefcase, BarChart3, Zap, Activity, Compass, FileText, Target, Swords, Edit3 } from 'lucide-react';
import { cache } from 'react';

const getUserProfile = cache(async () => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { user: null, profile: null, isProActive: false };
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_end_date, is_admin')
    .eq('id', user.id)
    .maybeSingle();
  return { user, profile, isProActive: isSubscriptionActive(profile?.subscription_status, profile?.subscription_end_date) };
});

export async function AppSidebar() {
  const { user, profile, isProActive } = await getUserProfile();

  return (
    <aside className="hidden lg:flex flex-col w-[200px] min-h-screen border-r border-neutral-100 bg-white">
      {/* Logo */}
      <div className="h-14 flex items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">IN</span>
          </div>
          <span className="text-sm font-semibold text-neutral-900 tracking-tight">InsightNote</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <SidebarLink href="/" icon={<Home className="w-4 h-4" />} label="首页" />
        <SidebarLink href="/posts" icon={<FileText className="w-4 h-4" />} label="深度研究" />
        <SidebarLink href="/briefing" icon={<Activity className="w-4 h-4" />} label="每日晨报" badge={<UnreadBadge type="briefing" />} />
        
        <div className="h-px bg-neutral-100 my-3" />
        <div className="px-2 py-1 text-[10px] font-medium text-neutral-400 uppercase tracking-widest">分析工具</div>
        
        <SidebarLink href="/tools/butterfly" icon={<Target className="w-4 h-4" />} label="蝴蝶效应" />
        <SidebarLink href="/tools/graph-editor" icon={<Edit3 className="w-4 h-4" />} label="图谱编辑" />
        <SidebarLink href="/scenario" icon={<Compass className="w-4 h-4" />} label="情景模拟" />
        <SidebarLink href="/battle-map" icon={<Layers className="w-4 h-4" />} label="作战地图" />
        <SidebarLink href="/controversies" icon={<Swords className="w-4 h-4" />} label="争议地图" />

        <div className="h-px bg-neutral-100 my-3" />
        <div className="px-2 py-1 text-[10px] font-medium text-neutral-400 uppercase tracking-widest">个人</div>
        
        <SidebarLink href="/journal" icon={<BookOpen className="w-4 h-4" />} label="决策日志" />
        <SidebarLink href="/portfolio" icon={<Briefcase className="w-4 h-4" />} label="持仓管理" />
        <SidebarLink href="/reviews" icon={<BarChart3 className="w-4 h-4" />} label="周度复盘" />
        <SidebarLink href="/notifications" icon={<Bell className="w-4 h-4" />} label="预警" badge={<UnreadBadge type="alerts" />} />
        <SidebarLink href="/account" icon={<Settings className="w-4 h-4" />} label="设置" />
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-neutral-100">
        {!isProActive && (
          <div className="mb-3 p-3 rounded-xl bg-neutral-900 text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-semibold">升级 Pro</span>
            </div>
            <p className="text-[11px] text-neutral-400 mb-2.5 leading-relaxed">解锁全部深度研究</p>
            <Button size="sm" className="w-full h-7 text-[11px] bg-white text-neutral-900 hover:bg-neutral-100 rounded-lg" asChild>
              <Link href="/pricing">立即开通</Link>
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <LoginControl initialEmail={user?.email ?? null} initialSubscriptionStatus={isProActive ? 'pro' : 'free'} compact />
        </div>
      </div>
    </aside>
  );
}
