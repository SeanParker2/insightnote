'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type NodeData = {
  id: string;
  label: string;
  type: 'root' | 'event' | 'impact' | 'ticker' | 'custom';
  parent_id: string | null;
  probability: number | null;
  impact_direction: string | null;
};

const NODE_TYPES = [
  { value: 'root', label: '根事件', color: 'bg-red-500' },
  { value: 'event', label: '事件', color: 'bg-blue-500' },
  { value: 'impact', label: '影响', color: 'bg-amber-500' },
  { value: 'ticker', label: '标的', color: 'bg-emerald-500' },
  { value: 'custom', label: '自定义', color: 'bg-purple-500' },
];

export default function GraphEditorPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<NodeData[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Push to history on node change
  function pushHistory(newNodes: NodeData[]) {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newNodes);
    if (newHistory.length > 30) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }

  function undo() {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setNodes(history[newIndex]);
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setNodes(history[newIndex]);
  }

  // Export as JSON
  function handleExport() {
    const data = { title, description, nodes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-${title || 'untitled'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Add node
  function addNode(type: NodeData['type']) {
    const id = `node-${Date.now()}`;
    const newNode: NodeData = {
      id,
      label: type === 'root' ? '核心事件' : type === 'event' ? '新事件' : type === 'impact' ? '影响' : type === 'ticker' ? 'SYMBOL' : '自定义节点',
      type,
      parent_id: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
      probability: null,
      impact_direction: null,
    };
    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    pushHistory(newNodes);
    setSelectedNode(id);
  }

  // Update node
  function updateNode(id: string, updates: Partial<NodeData>) {
    const newNodes = nodes.map((n) => n.id === id ? { ...n, ...updates } : n);
    setNodes(newNodes);
    pushHistory(newNodes);
  }

  // Delete node
  function deleteNode(id: string) {
    const newNodes = nodes.filter((n) => n.id !== id).map((n) => n.parent_id === id ? { ...n, parent_id: null } : n);
    setNodes(newNodes);
    pushHistory(newNodes);
    if (selectedNode === id) setSelectedNode(null);
  }

  // Save graph
  async function handleSave() {
    if (!title.trim() || nodes.length === 0) return;
    setSaving(true);

    const res = await fetch('/api/graphs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        nodes: nodes.map((n) => ({
          label: n.label,
          type: n.type,
          parent_id: n.parent_id,
          probability: n.probability,
          impact_direction: n.impact_direction,
        })),
      }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  const selected = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">蝴蝶效应图谱编辑器</h1>
            <p className="mt-2 text-sm text-slate-500">
              构建你的因果传导链路，分享你的投资逻辑
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}>
              撤销
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
              重做
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={nodes.length === 0}>
              导出
            </Button>
            <Button variant="outline" onClick={() => { setNodes([]); setTitle(''); setDescription(''); pushHistory([]); }}>
              重置
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim() || nodes.length === 0}>
              {saving ? '保存中...' : saved ? '已保存' : '发布图谱'}
            </Button>
          </div>
        </div>

        {/* Templates */}
        {nodes.length === 0 && (
          <div className="mb-8">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">快速模板</div>
            <div className="flex flex-wrap gap-2">
              {[
                { name: '利率传导', nodes: [{ label: '央行降息', type: 'root' }, { label: '债券收益率下降', type: 'event' }, { label: '资金流入股市', type: 'impact' }, { label: '沪深300', type: 'ticker' }] },
                { name: '供应链冲击', nodes: [{ label: '供应链中断', type: 'root' }, { label: '原材料涨价', type: 'event' }, { label: '制造业利润承压', type: 'impact' }, { label: '工业板块', type: 'ticker' }] },
                { name: 'AI产业链', nodes: [{ label: 'AI技术突破', type: 'root' }, { label: '算力需求激增', type: 'event' }, { label: '半导体景气上行', type: 'impact' }, { label: 'NVDA', type: 'ticker' }] },
                { name: '地缘政治', nodes: [{ label: '地缘冲突升级', type: 'root' }, { label: '能源价格飙升', type: 'event' }, { label: '通胀预期上升', type: 'impact' }, { label: '黄金', type: 'ticker' }] },
              ].map((tpl) => (
                <button
                  key={tpl.name}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-brand-900 hover:text-brand-900 transition-colors"
                  onClick={() => {
                    setTitle(tpl.name);
                    setNodes(tpl.nodes.map((n, i) => ({
                      id: `tpl-${i}`,
                      label: n.label,
                      type: n.type as NodeData['type'],
                      parent_id: i > 0 ? `tpl-${i - 1}` : null,
                      probability: null,
                      impact_direction: null,
                    })));
                  }}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Graph Meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">图谱标题</span>
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：美联储降息传导链" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">描述（可选）</span>
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简要说明这个图谱的逻辑" />
          </label>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <span className="text-sm text-slate-600">公开发布</span>
          </label>
        </div>

        {/* Add Node Buttons */}
        <div className="flex gap-2 mb-6">
          {NODE_TYPES.map((t) => (
            <Button key={t.value} variant="outline" size="sm" onClick={() => addNode(t.value as NodeData['type'])}>
              <span className={`w-2 h-2 rounded-full ${t.color} mr-2`} />
              + {t.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chain Visualization */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">传导链路</h3>
            {nodes.length === 0 ? (
              <div className="p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                点击上方按钮添加节点，构建因果传导链路
              </div>
            ) : (
              <div className="space-y-2">
                {nodes.map((node, i) => {
                  const typeInfo = NODE_TYPES.find((t) => t.value === node.type);
                  return (
                    <div key={node.id}>
                      {i > 0 && (
                        <div className="flex items-center justify-center py-1">
                          <div className="w-px h-4 bg-slate-300" />
                          <span className="text-[10px] text-slate-400 mx-2">
                            {node.probability ? `${(node.probability * 100).toFixed(0)}%概率` : '→'}
                          </span>
                          <div className="w-px h-4 bg-slate-300" />
                        </div>
                      )}
                      <div
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedNode === node.id ? 'border-brand-900 ring-2 ring-brand-900/20 bg-white' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                        onClick={() => setSelectedNode(node.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${typeInfo?.color ?? 'bg-slate-400'}`} />
                            <span className="font-bold text-slate-900">{node.label}</span>
                            <Badge variant="outline" className="text-[10px]">{typeInfo?.label ?? node.type}</Badge>
                            {node.impact_direction && (
                              <Badge variant={node.impact_direction === 'bullish' ? 'default' : node.impact_direction === 'bearish' ? 'destructive' : 'secondary'} className="text-[10px]">
                                {node.impact_direction === 'bullish' ? '利好' : node.impact_direction === 'bearish' ? '利空' : '中性'}
                              </Badge>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}>
                            删除
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Node Editor */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">节点编辑</h3>
            {selected ? (
              <div className="p-5 rounded-xl border border-slate-200 space-y-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">标签</span>
                  <input
                    className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                    value={selected.label}
                    onChange={(e) => updateNode(selected.id, { label: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">类型</span>
                  <select
                    className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                    value={selected.type}
                    onChange={(e) => updateNode(selected.id, { type: e.target.value as NodeData['type'] })}
                  >
                    {NODE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">传导概率 (0-1)</span>
                  <input
                    className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={selected.probability ?? ''}
                    onChange={(e) => updateNode(selected.id, { probability: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0.7"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">影响方向</span>
                  <select
                    className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                    value={selected.impact_direction ?? ''}
                    onChange={(e) => updateNode(selected.id, { impact_direction: e.target.value || null })}
                  >
                    <option value="">未设置</option>
                    <option value="bullish">利好</option>
                    <option value="bearish">利空</option>
                    <option value="neutral">中性</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">连接到</span>
                  <select
                    className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                    value={selected.parent_id ?? ''}
                    onChange={(e) => updateNode(selected.id, { parent_id: e.target.value || null })}
                  >
                    <option value="">无（顶级节点）</option>
                    {nodes.filter((n) => n.id !== selected.id).map((n) => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-sm">
                点击左侧节点进行编辑
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
