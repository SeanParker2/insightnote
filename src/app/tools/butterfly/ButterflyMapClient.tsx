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
import useSWR from 'swr';
import MiniChart from '@/components/ui/MiniChart';
import { ButterflyHeader } from '@/components/butterfly/ButterflyHeader';
import { ButterflySidebar } from '@/components/butterfly/ButterflySidebar';
import { ButterflyDetailPanel } from '@/components/butterfly/ButterflyDetailPanel';
import { ButterflyEmptyOverlay } from '@/components/butterfly/ButterflyEmptyOverlay';
import { ButterflyPaywall } from '@/components/butterfly/ButterflyPaywall';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  const [activeSymbols, setActiveSymbols] = useState<string[]>([]);

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

      const symbols = graph.nodes
        .filter((n) => n.type === 'ticker' && n.data.ticker)
        .map((n) => n.data.ticker as string);
      setActiveSymbols(Array.from(new Set(symbols)));

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

  // Real-time Market Data Polling
  const { data: marketData } = useSWR(
    activeSymbols.length > 0 ? `/api/market/batch?symbols=${activeSymbols.join(',')}` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  useEffect(() => {
    if (!marketData) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.type !== 'ticker' || !node.data.ticker) return node;

        const ticker = node.data.ticker as string;
        const data = marketData[ticker];
        if (!data) return node;

        // Only update if changed to avoid unnecessary re-renders
        if (node.data.changePercent === data.changePercent) return node;

        const change = data.changePercent;
        const reason = data.reason;
        // 涨红跌绿 (Chinese Market Style)
        const isUp = change > 0;
        const glow = isUp
          ? 'shadow-[0_0_15px_rgba(239,68,68,0.5)]'
          : 'shadow-[0_0_15px_rgba(16,185,129,0.5)]';

        return {
          ...node,
          className: glow,
          data: {
            ...node.data,
            changePercent: change,
            reason: reason
          },
        };
      })
    );
  }, [marketData, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
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

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden font-sans">
      <ButterflyHeader loadState={loadState} latencyMs={latencyMs} />

      {loadState === 'loaded' && postLocked && (
        <ButterflyPaywall slug={slug} hasUser={hasUser} postIsPremium={postIsPremium} />
      )}

      <main className="flex-1 flex overflow-hidden">
        <ButterflySidebar
          sessionTitle={sessionTitle}
          slug={slug}
          slugDraft={slugDraft}
          onSlugDraftChange={setSlugDraft}
          onSubmitSlug={onSubmitSlug}
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
        />

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

          {/* MiniChart Integration */}
          {selectedNode?.type === 'ticker' && selectedNode.data.ticker && (
            <div className="absolute top-4 right-4 z-50 w-[380px] bg-[#0a0a0a] border border-[#333333] rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-10">
              <div className="flex justify-between items-center p-3 border-b border-[#333333] bg-[#111]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-sm font-bold text-white font-mono">
                    {selectedNode.data.ticker}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="p-0">
                <MiniChart
                  symbol={selectedNode.data.ticker as string}
                  width="100%"
                  height={220}
                  colorTheme="dark"
                  autosize={false}
                />
              </div>
            </div>
          )}

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

          <ButterflyEmptyOverlay
            loadState={loadState}
            errorKind={errorKind}
            slugDraft={slugDraft}
            onSlugDraftChange={setSlugDraft}
            onSubmitSlug={onSubmitSlug}
            onRetry={onRetry}
            onClear={onClear}
          />
        </div>

        <ButterflyDetailPanel
          selectedNode={selectedNode}
          selectedNodeTypeLabel={selectedNodeTypeLabel}
          nodes={nodes}
          marketData={marketData}
          onNodeSelect={setSelectedNodeId}
        />
      </main>
    </div>
  );
}
