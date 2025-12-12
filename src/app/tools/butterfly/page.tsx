'use client';

import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { initialNodes, initialEdges } from '@/lib/mock/butterfly.mock';
import { TriggerNode, ImpactNode, TickerNode } from '@/components/butterfly/nodes/CustomNodes';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  impact: ImpactNode,
  ticker: TickerNode,
};

export default function ButterflyMapPage() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden font-sans">
      {/* Header */}
      <header className="h-12 border-b border-[#333333] bg-black flex items-center justify-between px-4 select-none shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="text-brand-gold font-bold tracking-widest text-sm">
            INSIGHT<span className="text-white">NOTE</span> <span className="text-[10px] bg-brand-gold text-black px-1 rounded ml-1">TERMINAL</span>
          </div>
          <div className="h-4 w-px bg-[#333333]"></div>
          <div className="flex gap-1 text-xs text-gray-400 font-mono">
            <span className="hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-white/10">FILE</span>
            <span className="hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-white/10">VIEW</span>
            <span className="hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-white/10">DATA</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-green-500">
          <span>● SYSTEM ONLINE</span>
          <span className="text-gray-500">LATENCY: 24ms</span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Node List */}
        <aside className="w-[280px] border-r border-[#333333] bg-[#0a0a0a] flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-[#333333]">
            <div className="text-[10px] text-gray-500 font-bold uppercase mb-2">Active Session</div>
            <h2 className="text-sm font-bold text-white leading-tight">AI Infrastructure & Energy Crisis</h2>
            <div className="mt-2 text-xs text-gray-400 font-mono">ID: RPT-2025-084</div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Logic Nodes</div>
            {nodes.map(node => (
              <div 
                key={node.id} 
                className={`flex items-center gap-2 text-xs p-2 rounded border cursor-pointer transition ${
                  selectedNodeId === node.id 
                    ? 'bg-white/10 border-white/20 text-white' 
                    : 'text-gray-300 border-transparent hover:bg-white/5'
                }`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <div className={`w-2 h-2 rounded-full ${
                  node.type === 'trigger' ? 'bg-blue-500' :
                  node.type === 'impact' ? 'bg-yellow-600' : 'bg-green-500'
                }`}></div>
                <span className="truncate">{node.data.label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Canvas */}
        <div className="flex-1 relative bg-[#000000]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            colorMode="dark"
            fitView
            minZoom={0.5}
            maxZoom={1.5}
          >
            <Background color="#333" gap={20} size={1} />
            <Controls className="bg-[#1a1a1a] border border-[#333333] text-white" />
          </ReactFlow>

          {/* Canvas Actions */}
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            <button className="bg-black border border-[#333333] text-gray-300 px-3 py-1.5 text-xs font-mono rounded hover:bg-gray-900 transition-colors">
              + Add Node
            </button>
            <button className="bg-black border border-[#333333] text-gray-300 px-3 py-1.5 text-xs font-mono rounded hover:bg-gray-900 transition-colors">
              Auto Layout
            </button>
          </div>
        </div>

        {/* Right Sidebar - Details & Tickers */}
        <aside className="w-[320px] border-l border-[#333333] bg-[#0a0a0a] flex flex-col shrink-0 z-10">
          {/* Node Details Panel */}
          {selectedNode ? (
            <div className="flex-1 flex flex-col border-b border-[#333333]">
              <div className="p-3 border-b border-[#333333] bg-black flex justify-between items-center">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Node Details</div>
                <div className="text-[10px] font-mono text-blue-500">ID: {selectedNode.id}</div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Type</label>
                  <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedNode.type === 'trigger' ? 'bg-blue-500/20 text-blue-400' :
                    selectedNode.type === 'impact' ? 'bg-yellow-600/20 text-yellow-500' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {selectedNode.type}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Label</label>
                  <div className="text-sm text-white font-medium bg-[#1a1a1a] p-2 rounded border border-[#333333]">
                    {selectedNode.data.label}
                  </div>
                </div>
                {selectedNode.data.description && (
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Description</label>
                    <div className="text-xs text-gray-400 leading-relaxed font-mono bg-[#1a1a1a] p-2 rounded border border-[#333333]">
                      {selectedNode.data.description}
                    </div>
                  </div>
                )}
                {selectedNode.type === 'ticker' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Ticker</label>
                      <div className="text-sm font-mono text-white bg-[#1a1a1a] p-2 rounded border border-[#333333]">
                        {selectedNode.data.ticker}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Change</label>
                      <div className={`text-sm font-mono bg-[#1a1a1a] p-2 rounded border border-[#333333] ${
                        (selectedNode.data.changePercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {(selectedNode.data.changePercent || 0) >= 0 ? '+' : ''}{selectedNode.data.changePercent}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-600 font-mono p-8 text-center border-b border-[#333333]">
              Select a node to view details
            </div>
          )}

          {/* Related Tickers List */}
          <div className="h-1/3 flex flex-col bg-[#0a0a0a]">
            <div className="p-3 border-b border-[#333333] bg-black">
              <div className="text-[10px] font-bold text-gray-500 uppercase">Related Tickers</div>
            </div>
            <div className="overflow-y-auto divide-y divide-[#1a1a1a]">
              {nodes.filter(n => n.type === 'ticker').map(node => (
                <div key={node.id} className="p-3 flex justify-between items-center hover:bg-white/5 cursor-pointer transition">
                  <div>
                    <div className="font-bold text-sm text-white">{node.data.ticker}</div>
                    <div className="text-[10px] text-gray-500">{node.data.label}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-sm ${(node.data.changePercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {/* Mock Price */}
                      {(100 + (node.id.charCodeAt(0) % 50)).toFixed(2)}
                    </div>
                    <div className={`text-[10px] ${(node.data.changePercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(node.data.changePercent || 0) >= 0 ? '+' : ''}{node.data.changePercent}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
