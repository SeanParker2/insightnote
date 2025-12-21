'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TriggerNode, ImpactNode, TickerNode } from '@/components/butterfly/nodes/CustomNodes';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { SecurePostDetail } from '@/types';
import { trackEvent } from '@/lib/analytics';
import { buildFlowGraph, type FlowNode } from '@/lib/butterfly/graph';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  impact: ImpactNode,
  ticker: TickerNode,
};

export default function ButterflyMapClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = useMemo(() => searchParams.get('slug'), [searchParams]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>('蝴蝶效应图谱');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [slugDraft, setSlugDraft] = useState<string>('');
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [errorKind, setErrorKind] = useState<'not_found' | 'fetch_failed' | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [hasUser, setHasUser] = useState(false);
  const [postLocked, setPostLocked] = useState(false);
  const [postIsPremium, setPostIsPremium] = useState(false);

  useEffect(() => {
    setSlugDraft(slug ?? '');
  }, [slug]);

  const navigateToSlug = useCallback(
    (nextSlug: string) => {
      const trimmed = nextSlug.trim();
      router.push(trimmed ? `/tools/butterfly?slug=${encodeURIComponent(trimmed)}` : '/tools/butterfly');
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!slug) {
        setNodes([]);
        setEdges([]);
        setSessionTitle('蝴蝶效应图谱');
        setLatencyMs(null);
        setLoadState('idle');
        setErrorKind(null);
        setHasUser(false);
        setPostLocked(false);
        setPostIsPremium(false);
        trackEvent('butterfly_clear', {});
        return;
      }

      setLoadState('loading');
      setErrorKind(null);
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const nextHasUser = Boolean(userData.user);
      setHasUser(nextHasUser);
      const { data, error } = await supabase.functions.invoke('post-by-slug', {
        body: { slug },
      });

      if (cancelled) return;

      if (error || !data?.data) {
        const status = (error as any)?.context?.response?.status ?? (error as any)?.context?.status ?? null;
        setNodes([]);
        setEdges([]);
        setSessionTitle('蝴蝶效应图谱');
        setLatencyMs(null);
        setLoadState('error');
        setErrorKind(status === 404 ? 'not_found' : 'fetch_failed');
        setPostLocked(false);
        setPostIsPremium(false);
        trackEvent('butterfly_load_failed', { slug, status });
        return;
      }

      const post = data.data as SecurePostDetail;
      const durationMs = typeof data.duration_ms === 'number' ? data.duration_ms : null;

      const isPremium = Boolean((post as any).is_premium);
      const isUnlocked = Boolean((post as any).is_unlocked);
      const locked = isPremium && !isUnlocked;

      const graph = buildFlowGraph(post.butterfly_nodes ?? []);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setSelectedNodeId(null);
      setSessionTitle(post.title ?? '蝴蝶效应图谱');
      setLatencyMs(durationMs);
      setLoadState('loaded');
      setErrorKind(null);
      setPostLocked(locked);
      setPostIsPremium(isPremium);
      trackEvent('butterfly_loaded', {
        slug,
        latency_ms: durationMs,
        node_count: graph.nodes.length,
        edge_count: graph.edges.length,
      });
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey, setEdges, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const showEmptyOverlay = (loadState === 'idle' || loadState === 'error') && nodes.length === 0;
  const selectedNodeTypeLabel =
    selectedNode?.type === 'trigger'
      ? '触发'
      : selectedNode?.type === 'impact'
        ? '影响'
        : selectedNode?.type === 'ticker'
          ? '标的'
          : selectedNode?.type ?? '';

  const onSubmitSlug = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = slugDraft.trim();
      trackEvent('butterfly_slug_submit', { slug_present: Boolean(trimmed) });
      navigateToSlug(trimmed);
    },
    [navigateToSlug, slugDraft],
  );

  const onRetry = useCallback(() => {
    trackEvent('butterfly_retry', { slug: slug ?? null });
    setReloadKey((v) => v + 1);
  }, [slug]);

  const onClear = useCallback(() => {
    trackEvent('butterfly_clear_click', {});
    setSelectedNodeId(null);
    navigateToSlug('');
  }, [navigateToSlug]);

  const onAddNode = useCallback(() => {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `local-${crypto.randomUUID()}`
        : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const nextNode: FlowNode = {
      id,
      type: 'impact',
      position: { x: 120, y: 80 },
      data: { label: '新节点' },
    };

    setNodes((ns) => [...ns, nextNode]);
    setSelectedNodeId(id);
    trackEvent('butterfly_add_node', {});
  }, [setNodes]);

  const onAutoLayout = useCallback(() => {
    setNodes((ns) => {
      const byDepth = new Map<number, FlowNode[]>();
      for (const n of ns) {
        const depth = Math.round((n.position.x - 120) / 320);
        const arr = byDepth.get(depth) ?? [];
        arr.push(n);
        byDepth.set(depth, arr);
      }

      for (const arr of byDepth.values()) {
        if (arr.length > 1) arr.sort((a, b) => a.data.label.localeCompare(b.data.label));
      }

      const next: FlowNode[] = [];
      for (const [depth, arr] of Array.from(byDepth.entries()).sort((a, b) => a[0] - b[0])) {
        for (let i = 0; i < arr.length; i++) {
          const n = arr[i]!;
          next.push({
            ...n,
            position: { x: 120 + depth * 320, y: 80 + i * 140 },
          });
        }
      }

      return next;
    });
    trackEvent('butterfly_auto_layout', { node_count: nodes.length });
  }, [nodes.length, setNodes]);

  const loginHref = slug ? `/login?next=${encodeURIComponent(`/tools/butterfly?slug=${slug}`)}` : '/login';
  const pricingHref = slug ? `/pricing?next=${encodeURIComponent(`/tools/butterfly?slug=${slug}`)}` : '/pricing';

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden font-sans">
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

      {loadState === 'loaded' && postLocked && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-black/70 p-6 text-center">
            <div className="text-brand-gold font-bold tracking-widest text-sm mb-2">访问受限</div>
            <div className="text-white text-base font-semibold mb-2">该图谱对应 Pro 内容</div>
            <div className="text-gray-300 text-sm leading-relaxed mb-5">
              {hasUser ? '开通或续费 Pro 后可立即查看完整图谱。' : '登录后可校验账号权益并查看可访问的图谱。'}
            </div>
            <button
              className="w-full h-10 rounded-md bg-brand-gold text-black font-bold"
              onClick={() => {
                trackEvent('butterfly_paywall_cta_click', { slug, has_user: hasUser, is_premium: postIsPremium });
                router.push(hasUser ? pricingHref : loginHref);
              }}
            >
              {hasUser ? '查看开通方式' : '登录后继续'}
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-[280px] border-r border-[#333333] bg-[#0a0a0a] flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-[#333333]">
            <div className="text-[10px] text-gray-500 font-bold uppercase mb-2">当前会话</div>
            <h2 className="text-sm font-bold text-white leading-tight">{sessionTitle}</h2>
            <div className="mt-2 text-xs text-gray-400 font-mono">slug: {slug ?? '—'}</div>
            <form className="mt-3 flex gap-2" onSubmit={onSubmitSlug}>
              <input
                value={slugDraft}
                onChange={(e) => setSlugDraft(e.target.value)}
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
                onClick={() => setSelectedNodeId(node.id)}
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

          <div className="absolute top-4 left-4 flex gap-2 z-10">
            <button
              className="bg-black border border-[#333333] text-gray-300 px-3 py-1.5 text-xs font-mono rounded hover:bg-gray-900 transition-colors"
              onClick={onAddNode}
              type="button"
            >
              + 新建节点
            </button>
            <button
              className="bg-black border border-[#333333] text-gray-300 px-3 py-1.5 text-xs font-mono rounded hover:bg-gray-900 transition-colors"
              onClick={onAutoLayout}
              type="button"
            >
              自动布局
            </button>
            {(slug || nodes.length > 0) && (
              <button
                className="bg-black border border-[#333333] text-gray-300 px-3 py-1.5 text-xs font-mono rounded hover:bg-gray-900 transition-colors"
                onClick={onClear}
                type="button"
              >
                清空
              </button>
            )}
          </div>

          {showEmptyOverlay && (
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
                    onChange={(e) => setSlugDraft(e.target.value)}
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
          )}
        </div>

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
                        {selectedNode.data.changePercent}%
                      </div>
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
                        {(100 + (node.id.charCodeAt(0) % 50)).toFixed(2)}
                      </div>
                      <div
                        className={`text-[10px] ${
                          (node.data.changePercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {(node.data.changePercent || 0) >= 0 ? '+' : ''}
                        {node.data.changePercent}%
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
