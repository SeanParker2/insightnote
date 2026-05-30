"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: ReactNode;
}

export function SidebarLink({ href, icon, label, badge }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link 
      href={href} 
      className={`
        flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all duration-150
        ${isActive 
          ? 'bg-neutral-900 text-white font-medium' 
          : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
        }
      `}
    >
      <span className={isActive ? 'text-white' : 'text-neutral-400'}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge}
    </Link>
  );
}
