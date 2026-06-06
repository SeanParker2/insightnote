import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[#1a1a1a]">
      <div className="flex items-center gap-3">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#444]">
            {breadcrumbs.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={12} className="text-[#333]" />}
                {item.href ? (
                  <Link href={item.href} className="hover:text-[#666] transition-colors">{item.label}</Link>
                ) : (
                  <span className="text-[#666]">{item.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        {!breadcrumbs && (
          <h1 className="text-sm font-medium text-[#888]">{title}</h1>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
