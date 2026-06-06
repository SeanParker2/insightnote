'use client';

import type { FlowNode } from '@/lib/butterfly/graph';

interface ButterflyDetailPanelProps {
  selectedNode: FlowNode | null;
  selectedNodeTypeLabel: string;
  nodes: FlowNode[];
  marketData: Record<string, { price?: number; changePercent?: number }> | undefined;
  onNodeSelect: (nodeId: string) => void;
}

export function ButterflyDetailPanel({
  selectedNode,
  selectedNodeTypeLabel,
  nodes,
  marketData,
  onNodeSelect,
}: ButterflyDetailPanelProps) {
  return (
    <aside className="w-[320px] border-l border-[#333333] bg-[#0a0a0a] flex flex-col shrink-0 z-10">
      {selectedNode ? (
        <div className="flex-1 flex flex-col border-b border-[#333333]">
          <div className="p-3 border-b border-[#333333] bg-black flex justify-between items-center">
            <div className="text-[10px] font-bold text-gray-500 uppercase">节点详情</div>
            <div className="text-[10px] font-mono text-blue-500">ID: {selectedNode.id}</div>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">类型</label>
              <div
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  selectedNode.type === 'trigger'
                    ? 'bg-blue-500/20 text-blue-400'
                    : selectedNode.type === 'impact'
                      ? 'bg-yellow-600/20 text-yellow-500'
                      : 'bg-green-500/20 text-green-400'
                }`}
              >
                {selectedNodeTypeLabel || selectedNode.type}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">名称</label>
              <div className="text-sm text-white font-medium bg-[#1a1a1a] p-2 rounded border border-[#333333]">
                {selectedNode.data.label}
              </div>
            </div>
            {selectedNode.data.description && (
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">说明</label>
                <div className="text-xs text-gray-400 leading-relaxed font-mono bg-[#1a1a1a] p-2 rounded border border-[#333333]">
                  {selectedNode.data.description}
                </div>
              </div>
            )}
            {selectedNode.type === 'ticker' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">代码</label>
                  <div className="text-sm font-mono text-white bg-[#1a1a1a] p-2 rounded border border-[#333333]">
                    {selectedNode.data.ticker}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">涨跌</label>
                  <div
                    className={`text-sm font-mono bg-[#1a1a1a] p-2 rounded border border-[#333333] ${
                      (selectedNode.data.changePercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {(selectedNode.data.changePercent || 0) >= 0 ? '+' : ''}
                    {selectedNode.data.changePercent ?? 0}%
                  </div>
                </div>
              </div>
            )}
            {selectedNode.type === 'ticker' && (selectedNode.data.reason as string) && (
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">AI 归因</label>
                <div className="text-xs text-brand-gold leading-relaxed font-mono bg-[#1a1a1a] p-2 rounded border border-[#333333] animate-pulse">
                  {selectedNode.data.reason as string}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-600 font-mono p-8 text-center border-b border-[#333333]">
          选择节点查看详情
        </div>
      )}

      <div className="h-1/3 flex flex-col bg-[#0a0a0a]">
        <div className="p-3 border-b border-[#333333] bg-black">
          <div className="text-[10px] font-bold text-gray-500 uppercase">相关标的</div>
        </div>
        <div className="overflow-y-auto divide-y divide-[#1a1a1a]">
          {nodes
            .filter((n) => n.type === 'ticker')
            .map((node) => (
              <div
                key={node.id}
                className="p-3 flex justify-between items-center hover:bg-white/5 cursor-pointer transition"
                onClick={() => onNodeSelect(node.id)}
              >
                <div>
                  <div className="font-bold text-sm text-white">{node.data.ticker}</div>
                  <div className="text-[10px] text-gray-500">{node.data.label}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono text-sm ${
                      (node.data.changePercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {node.data.ticker && marketData?.[node.data.ticker as string]?.price != null 
                      ? Number(marketData[node.data.ticker as string]?.price).toFixed(2) 
                      : '—'}
                  </div>
                  <div
                    className={`text-[10px] ${
                      (node.data.changePercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {(node.data.changePercent || 0) >= 0 ? '+' : ''}
                    {node.data.changePercent ?? 0}%
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </aside>
  );
}
