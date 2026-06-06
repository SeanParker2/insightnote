import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LoginControl } from '@/components/auth/LoginControl';
import { SidebarLink } from '@/components/SidebarLink';
import { isSubscriptionActive } from '@/lib/utils';
import { 
  Home, 
  BarChart2, 
  FileText, 
  Briefcase, 
  Bell, 
  Settings,
  Brain,
  Target,
  Compass,
  BookOpen,
  Zap
} from 'lucide-react';
import { cache } from 'react';

const getUserProfile = cache(async () => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { user: null, isProActive: false };
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_end_date')
    .eq('id', user.id)
    .maybeSingle();
  return { user, isProActive: isSubscriptionActive(profile?.subscription_status, profile?.subscription_end_date) };
});

export async function AppSidebar() {
  const { user, isProActive } = await getUserProfile();

  return (
    <aside className="hidden lg:flex flex-col w-56 h-screen border-r border-[#1a1a1a] bg-[#0a0a0a]">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-[#1a1a1a]">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          InsightNote
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <SidebarLink href="/" icon={<Home size={16} />} label="首页" />
        <SidebarLink href="/market" icon={<BarChart2 size={16} />} label="行情" />
        <SidebarLink href="/posts" icon={<FileText size={16} />} label="研究" />
        
        <div className="h-px bg-[#1a1a1a] my-3 mx-2" />
        
        <SidebarLink href="/agents" icon={<Brain size={16} />} label="AI 分析" />
        <SidebarLink href="/tools/butterfly" icon={<Target size={16} />} label="蝴蝶效应" />
        <SidebarLink href="/scenario" icon={<Compass size={16} />} label="情景模拟" />
        
        <div className="h-px bg-[#1a1a1a] my-3 mx-2" />
        
        <SidebarLink href="/portfolio" icon={<Briefcase size={16} />} label="持仓" />
        <SidebarLink href="/journal" icon={<BookOpen size={16} />} label="日志" />
        <SidebarLink href="/notifications" icon={<Bell size={16} />} label="通知" />
        <SidebarLink href="/account" icon={<Settings size={16} />} label="设置" />
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[#1a1a1a]">
        {!isProActive && (
          <Link href="/pricing" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#666] hover:text-[#999] hover:bg-[#141414] transition-colors">
            <Zap size={14} />
            <span>升级 Pro</span>
          </Link>
        )}
        <div className="mt-2">
          <LoginControl initialEmail={user?.email ?? null} initialSubscriptionStatus={isProActive ? 'pro' : 'free'} compact />
        </div>
      </div>
    </aside>
  );
}
