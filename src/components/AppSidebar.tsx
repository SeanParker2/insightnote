import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { LoginControl } from '@/components/auth/LoginControl';
import { SidebarLink } from '@/components/SidebarLink';
import { isSubscriptionActive } from '@/lib/utils';
import { Search, Activity, Layers, Zap, Wrench, Home, Star, Bell, LogOut, Settings } from 'lucide-react';
import { mono, playfair } from '@/lib/fonts';

export async function AppSidebar() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date, is_admin')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  const isProActive = isSubscriptionActive(profile?.subscription_status, profile?.subscription_end_date);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-white/5 bg-[#0B1120] text-slate-300 transition-all duration-300 z-50">
      {/* 1. Brand Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          {/* Logo Mark */}
          <div className="relative flex items-center justify-center w-8 h-8 rounded-sm bg-linear-to-br from-white/10 to-white/5 border border-white/10 group-hover:border-white/20 group-hover:from-white/15 group-hover:to-white/5 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-3 h-3 bg-white transform rotate-45 group-hover:rotate-0 transition-all duration-500 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-brand-accent/80" />
          </div>
          
          {/* Typographic Logo */}
          <div className="flex flex-col justify-center h-8">
            <h1 className="text-lg leading-none tracking-tight text-white flex items-baseline gap-0.5">
              <span className="font-bold tracking-tighter">INSIGHT</span>
              <span className={`font-serif italic font-medium text-slate-300 ${playfair.className}`}>Note</span>
            </h1>
          </div>
        </Link>
      </div>

      {/* 2. Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-4 px-2">Platform</div>
        
        <SidebarLink href="/" icon={<Home className="w-4 h-4" />} label="Market Overview" />
        <SidebarLink href="/research" icon={<Layers className="w-4 h-4" />} label="Deep Research" />
        <SidebarLink href="/news" icon={<Zap className="w-4 h-4" />} label="Live Wire" />
        <SidebarLink href="/tools" icon={<Wrench className="w-4 h-4" />} label="Terminal Tools" />

        <div className="my-6 border-t border-white/5" />
        
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-4 px-2">Personal</div>
        <SidebarLink href="/watchlist" icon={<Star className="w-4 h-4" />} label="Watchlist" />
        <SidebarLink href="/alerts" icon={<Bell className="w-4 h-4" />} label="Alerts" />
      </nav>

      {/* 3. Bottom Actions: Search & Profile */}
      <div className="p-4 border-t border-white/5 bg-[#0B1120]">
        {/* Search Trigger */}
        <button className="w-full flex items-center gap-2 px-3 py-2 mb-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-md text-xs text-slate-400 transition-colors group">
            <Search className="w-3.5 h-3.5 group-hover:text-white" />
            <span>Search ticker...</span>
            <kbd className={`ml-auto hidden lg:inline-flex h-4 items-center gap-1 rounded border border-white/10 bg-white/5 px-1 font-mono text-[9px] text-slate-500 opacity-100`}>
               ⌘K
            </kbd>
        </button>

        {/* User Profile / Upgrade */}
        {!isProActive && (
            <div className="mb-4 p-3 rounded-lg bg-linear-to-br from-indigo-900/20 to-purple-900/20 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3 h-3 text-brand-accent" />
                    <span className="text-xs font-bold text-white">Upgrade to Pro</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2 leading-tight">Unlock real-time data and premium research.</p>
                <Button size="sm" variant="secondary" className="w-full h-7 text-[10px] bg-white text-black hover:bg-slate-200">
                    Get Access
                </Button>
            </div>
        )}

        <div className="flex items-center justify-between pt-2">
           <LoginControl
             initialEmail={user?.email ?? null}
             initialSubscriptionStatus={isProActive ? 'pro' : 'free'}
             compact
           />
           {user && (
               <Link href="/settings">
                   <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-white">
                       <Settings className="w-4 h-4" />
                   </Button>
               </Link>
           )}
        </div>
      </div>
    </aside>
  );
}

