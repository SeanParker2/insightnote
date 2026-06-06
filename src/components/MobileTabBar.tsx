"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Activity, Briefcase, Settings } from 'lucide-react';

const TABS = [
  { href: '/', icon: Home, label: '首页' },
  { href: '/posts', icon: FileText, label: '研究' },
  { href: '/briefing', icon: Activity, label: '晨报' },
  { href: '/portfolio', icon: Briefcase, label: '持仓' },
  { href: '/account', icon: Settings, label: '设置' },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-1 border-t border-border-default safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {TABS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? 'text-brand' : 'text-text-tertiary'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
