'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({ 
  className = '', 
  variant = 'text',
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-surface-2';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-xl',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseClasses} ${variantClasses[variant]} ${className}`}
          style={style}
        />
      ))}
    </>
  );
}

// Pre-built skeleton layouts
export function PostCardSkeleton() {
  return (
    <div className="p-5 rounded-xl bg-surface-1 border border-border-default">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton variant="rounded" width={60} height={20} />
        <Skeleton variant="rounded" width={40} height={20} />
      </div>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-2/3 mb-3" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function PostListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HoldingCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-surface-1 border border-border-default flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton variant="circular" width={32} height={32} />
    </div>
  );
}

export function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 rounded-xl bg-surface-1 border border-border-default">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <HoldingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-surface-1 border border-border-default">
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="rounded-xl bg-surface-1 border border-border-default p-4">
      <Skeleton variant="rectangular" height={height} />
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl bg-surface-1 border border-border-default overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-border-default">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-border-default last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}
