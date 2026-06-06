'use client';

interface ButterflyEmptyOverlayProps {
  loadState: 'idle' | 'loading' | 'loaded' | 'error';
  errorKind: 'not_found' | 'fetch_failed' | null;
  slugDraft: string;
  onSlugDraftChange: (value: string) => void;
  onSubmitSlug: (e?: React.FormEvent) => void;
  onRetry: () => void;
  onClear: () => void;
}

export function ButterflyEmptyOverlay({
  loadState,
  errorKind,
  slugDraft,
  onSlugDraftChange,
  onSubmitSlug,
  onRetry,
  onClear,
}: ButterflyEmptyOverlayProps) {
  if (loadState !== 'idle' && loadState !== 'error') return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md mx-4 rounded-lg border border-[#333333] bg-black/90 p-5">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
          {loadState === 'idle' ? '开始会话' : errorKind === 'not_found' ? '未找到' : '加载失败'}
        </div>
        <div className="mt-2 text-sm text-white font-bold">
          {loadState === 'idle'
            ? '输入文章 slug 生成因果链图谱'
            : errorKind === 'not_found'
              ? '找不到该文章（slug 不存在）'
              : '网络或服务异常，稍后重试'}
        </div>
        <form className="mt-4 flex gap-2" onSubmit={onSubmitSlug}>
          <input
            value={slugDraft}
            onChange={(e) => onSlugDraftChange(e.target.value)}
            placeholder="例如：ai-utilities-power-squeeze"
            className="flex-1 h-10 rounded border border-[#333333] bg-black px-3 text-sm text-gray-200 font-mono outline-none focus-visible:border-gray-500"
          />
          <button
            type="submit"
            className="h-10 px-4 rounded bg-brand-gold text-black text-xs font-bold uppercase tracking-widest hover:opacity-90 transition"
          >
            加载
          </button>
        </form>
        {loadState === 'error' && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="h-9 px-3 rounded border border-[#333333] bg-black text-gray-300 text-xs font-mono hover:bg-gray-900 transition-colors"
              onClick={onRetry}
            >
              重试
            </button>
            <button
              type="button"
              className="h-9 px-3 rounded border border-[#333333] bg-black text-gray-300 text-xs font-mono hover:bg-gray-900 transition-colors"
              onClick={onClear}
            >
              清空
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
