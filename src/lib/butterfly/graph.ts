import type { Edge, Node } from '@xyflow/react';
import type { ButterflyNode } from '@/types';
import type { ButterflyNodeData } from '@/types/butterfly';

export type FlowNodeType = 'trigger' | 'impact' | 'ticker';
export type FlowNode = Node<ButterflyNodeData, FlowNodeType>;

function toFlowType(type: ButterflyNode['type']): FlowNodeType {
  if (type === 'ticker') return 'ticker';
  if (type === 'impact') return 'impact';
  return 'trigger';
}

function extractTicker(label: string): string | undefined {
  const trimmed = label.trimStart();
  const startMatch = trimmed.match(/^([A-Z]{1,5})(?:\b|[^A-Z])/);
  if (startMatch?.[1]) {
    const candidate = startMatch[1];
    const nextChar = trimmed[candidate.length];
    if (!(candidate.length === 1 && typeof nextChar === 'string' && /[a-z]/.test(nextChar))) return candidate;
  }

  const parenMatch = label.match(/\(([A-Z]{1,5})\)/);
  if (parenMatch?.[1]) return parenMatch[1];

  const anyMatch = label.match(/\b([A-Z]{1,5})\b/);
  return anyMatch?.[1];
}

export function buildFlowGraph(butterflyNodes: ButterflyNode[]) {
  const byId = new Map<string, ButterflyNode>();
  const childrenByParentId = new Map<string, ButterflyNode[]>();

  for (const n of butterflyNodes) {
    byId.set(n.id, n);
    if (n.parent_id) {
      const arr = childrenByParentId.get(n.parent_id) ?? [];
      arr.push(n);
      childrenByParentId.set(n.parent_id, arr);
    }
  }

  const roots = butterflyNodes.filter((n) => !n.parent_id || !byId.has(n.parent_id));

  const depthById = new Map<string, number>();
  const queue: string[] = [];
  for (const r of roots) {
    depthById.set(r.id, 0);
    queue.push(r.id);
  }

  let queueHead = 0;
  while (queueHead < queue.length) {
    const currentId = queue[queueHead]!;
    queueHead += 1;
    const currentDepth = depthById.get(currentId) ?? 0;
    const children = childrenByParentId.get(currentId) ?? [];
    for (const child of children) {
      if (depthById.has(child.id)) continue;
      depthById.set(child.id, currentDepth + 1);
      queue.push(child.id);
    }
  }

  for (const n of butterflyNodes) {
    if (!depthById.has(n.id)) depthById.set(n.id, 0);
  }

  const groups = new Map<number, ButterflyNode[]>();
  for (const n of butterflyNodes) {
    const depth = depthById.get(n.id) ?? 0;
    const arr = groups.get(depth) ?? [];
    arr.push(n);
    groups.set(depth, arr);
  }

  for (const arr of groups.values()) {
    if (arr.length > 1) arr.sort((a, b) => a.label.localeCompare(b.label));
  }

  const nodes: FlowNode[] = [];
  for (const [depth, arr] of Array.from(groups.entries()).sort((a, b) => a[0] - b[0])) {
    for (let i = 0; i < arr.length; i++) {
      const n = arr[i]!;
      const flowType = toFlowType(n.type);
      const ticker = flowType === 'ticker' ? extractTicker(n.label) ?? n.label : undefined;

      nodes.push({
        id: n.id,
        type: flowType,
        position: { x: 120 + depth * 320, y: 80 + i * 140 },
        data: { label: n.label, ticker },
      });
    }
  }

  const edges: Edge[] = butterflyNodes
    .filter((n) => n.parent_id && byId.has(n.parent_id))
    .map((n) => ({
      id: `e-${n.parent_id}-${n.id}`,
      source: n.parent_id as string,
      target: n.id,
      animated: true,
    }));

  return { nodes, edges };
}

export const __private__ = {
  extractTicker,
};
