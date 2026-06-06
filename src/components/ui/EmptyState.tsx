import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {icon && <div className="mb-4 text-[#333]">{icon}</div>}
      <h3 className="text-sm font-medium text-[#666] mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-[#444] max-w-[240px]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
