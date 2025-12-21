import { buildFlowGraph, __private__ } from './graph';
import type { ButterflyNode } from '@/types';

function makeNode(partial: Partial<ButterflyNode> & Pick<ButterflyNode, 'id' | 'label'>): ButterflyNode {
  return {
    id: partial.id,
    post_id: partial.post_id ?? 'post-1',
    label: partial.label,
    type: partial.type ?? 'event',
    parent_id: partial.parent_id ?? null,
    created_at: partial.created_at ?? new Date().toISOString(),
    updated_at: partial.updated_at ?? new Date().toISOString(),
  };
}

describe('butterfly graph', () => {
  test('extractTicker handles common label formats', () => {
    expect(__private__.extractTicker('VST (Vistra)')).toBe('VST');
    expect(__private__.extractTicker('Vistra (VST)')).toBe('VST');
    expect(__private__.extractTicker('Buy VST on dips')).toBe('VST');
    expect(__private__.extractTicker('vistra')).toBeUndefined();
  });

  test('buildFlowGraph maps nodes and edges deterministically', () => {
    const a = makeNode({ id: 'a', label: 'AI Compute Demand', type: 'root' });
    const b = makeNode({ id: 'b', label: 'Power Shortage', type: 'event', parent_id: 'a' });
    const c = makeNode({ id: 'c', label: 'Nuclear Premium', type: 'impact', parent_id: 'b' });
    const d = makeNode({ id: 'd', label: 'VST (Vistra)', type: 'ticker', parent_id: 'c' });
    const orphan = makeNode({ id: 'e', label: 'Orphan', type: 'impact', parent_id: 'missing' });

    const { nodes, edges } = buildFlowGraph([d, c, b, a, orphan]);

    expect(nodes).toHaveLength(5);
    expect(edges).toHaveLength(3);

    const nodesById = new Map(nodes.map((n) => [n.id, n]));

    expect(nodesById.get('a')?.type).toBe('trigger');
    expect(nodesById.get('b')?.type).toBe('trigger');
    expect(nodesById.get('c')?.type).toBe('impact');
    expect(nodesById.get('d')?.type).toBe('ticker');

    expect(nodesById.get('d')?.data.ticker).toBe('VST');
    expect(nodesById.get('a')?.data.ticker).toBeUndefined();

    const rootNodes = nodes.filter((n) => n.position.x === 120);
    expect(rootNodes.map((n) => n.id)).toEqual(['a', 'e']);
    expect(rootNodes[0]?.position.y).toBe(80);
    expect(rootNodes[1]?.position.y).toBe(220);

    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'e-a-b', source: 'a', target: 'b' }),
        expect.objectContaining({ id: 'e-b-c', source: 'b', target: 'c' }),
        expect.objectContaining({ id: 'e-c-d', source: 'c', target: 'd' }),
      ]),
    );
  });

  test('buildFlowGraph stays fast for large graphs', () => {
    jest.setTimeout(15000);

    const nodeCount = 30000;
    const nodes: ButterflyNode[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const id = String(i);
      nodes.push(
        makeNode({
          id,
          label: `NODE_${i}`,
          type: 'event',
          parent_id: i === 0 ? null : String(i - 1),
        }),
      );
    }

    const started = performance.now();
    const graph = buildFlowGraph(nodes);
    const elapsedMs = performance.now() - started;

    expect(graph.nodes).toHaveLength(nodeCount);
    expect(graph.edges).toHaveLength(nodeCount - 1);
    expect(elapsedMs).toBeLessThan(3000);
  });
});

