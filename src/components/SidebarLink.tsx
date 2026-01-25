"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export function SidebarLink({ href, icon, label }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} className={`
        flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group
        ${isActive 
            ? 'bg-brand-primary/10 text-brand-accent border border-brand-primary/20' 
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
        }
    `}>
        <span className={isActive ? 'text-brand-accent' : 'text-slate-500 group-hover:text-slate-300'}>
            {icon}
        </span>
        <span className="text-sm font-medium">{label}</span>
        {isActive && <div className="ml-auto w-1 h-1 bg-brand-accent rounded-full shadow-[0_0_8px_var(--accent-gold)]" />}
    </Link>
  );
}
