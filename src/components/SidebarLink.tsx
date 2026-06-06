"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface SidebarLinkProps {
  href: string;
  icon: ReactNode;
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
        flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors
        ${isActive
          ? 'bg-[#1a1a1a] text-white'
          : 'text-[#666] hover:text-[#999] hover:bg-[#111]'
        }
      `}
    >
      <span className={isActive ? 'text-white' : 'text-[#444]'}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge}
    </Link>
  );
}
