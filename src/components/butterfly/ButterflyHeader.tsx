'use client';

interface ButterflyHeaderProps {
  loadState: 'idle' | 'loading' | 'loaded' | 'error';
  latencyMs: number | null;
}

export function ButterflyHeader({ loadState, latencyMs }: ButterflyHeaderProps) {
  return (
    <header className="h-12 border-b border-[#333333] bg-black flex items-center justify-between px-4 select-none shrink-0 z-50">
      <div className="flex items-center gap-4">
        <div className="text-brand-gold font-bold tracking-widest text-sm">
          INSIGHT<span className="text-white">NOTE</span>{' '}
          <span className="text-[10px] bg-brand-gold text-black px-1 rounded ml-1">终端</span>
        </div>
        <div className="h-4 w-px bg-[#333333]"></div>
        <div className="flex gap-1 text-xs text-gray-400 font-mono">
          <span className="hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-white/10">文件</span>
          <span className="hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-white/10">视图</span>
          <span className="hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-white/10">数据</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs font-mono text-green-500">
        <span>● 系统在线</span>
        <span className="text-gray-500">
          {loadState === 'loading' ? '加载中…' : `延迟：${latencyMs === null ? '—' : `${latencyMs}ms`}`}
        </span>
      </div>
    </header>
  );
}
