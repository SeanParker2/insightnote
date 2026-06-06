'use client';

import type { FlowNode } from '@/lib/butterfly/graph';

interface ButterflySidebarProps {
  sessionTitle: string;
  slug: string | null;
  slugDraft: string;
  onSlugDraftChange: (value: string) => void;
  onSubmitSlug: (e?: React.FormEvent) => void;
  nodes: FlowNode[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
}

export function ButterflySidebar({
  sessionTitle,
  slug,
  slugDraft,
  onSlugDraftChange,
  onSubmitSlug,
  nodes,
  selectedNodeId,
  onNodeSelect,
}: ButterflySidebarProps) {
  return (
    <aside className="w-[280px] border-r border-[#333333] bg-[#0a0a0a] flex flex-col shrink-0 z-10">
      <div className="p-4 border-b border-[#333333]">
        <div className="text-[10px] text-gray-500 font-bold uppercase mb-2">当前会话</div>
        <h2 className="text-sm font-bold text-white leading-tight">{sessionTitle}</h2>
        <div className="mt-2 text-xs text-gray-400 font-mono">slug: {slug ?? '—'}</div>
        <form className="mt-3 flex gap-2" onSubmit={onSubmitSlug}>
          <input
            value={slugDraft}
            onChange={(e) => onSlugDraftChange(e.target.value)}
            placeholder="粘贴文章 slug…"
            className="flex-1 h-8 rounded border border-[#333333] bg-black px-2 text-xs text-gray-200 font-mono outline-none focus-visible:border-gray-500"
          />
          <button
            type="submit"
            className="h-8 px-2 rounded border border-[#333333] bg-black text-gray-300 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors"
          >
            加载
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-[10px] text-gray-500 font-bold uppercase">逻辑节点</div>
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`flex items-center gap-2 text-xs p-2 rounded border cursor-pointer transition ${
              selectedNodeId === node.id
                ? 'bg-white/10 border-white/20 text-white'
                : 'text-gray-300 border-transparent hover:bg-white/5'
            }`}
            onClick={() => onNodeSelect(node.id)}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                node.type === 'trigger'
                  ? 'bg-blue-500'
                  : node.type === 'impact'
                    ? 'bg-yellow-600'
                    : 'bg-green-500'
              }`}
            ></div>
            <span className="truncate">{node.data.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
