'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type NodeData = {
  id: string;
  label: string;
  type: 'root' | 'event' | 'impact' | 'ticker' | 'custom';
  parent_id: string | null;
  probability: number | null;
  impact_direction: string | null;
};

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  root: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  event: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  impact: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  ticker: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
  custom: { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6' },
};

function CustomNode({ data }: { data: { label: string; nodeType: string; probability: number | null; impactDirection: string | null } }) {
  const colors = NODE_COLORS[data.nodeType] || NODE_COLORS.custom;
  
  return (
    <div
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '10px 16px',
        minWidth: '120px',
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.border }} />
      <div style={{ color: colors.text, fontWeight: 600, fontSize: '13px' }}>{data.label}</div>
      {data.probability && (
        <div style={{ color: colors.text, fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>
          {(data.probability * 100).toFixed(0)}% 概率
        </div>
      )}
      {data.impactDirection && (
        <div style={{ 
          color: data.impactDirection === 'positive' ? '#10b981' : data.impactDirection === 'negative' ? '#ef4444' : '#6b7280',
          fontSize: '10px', 
          marginTop: '2px' 
        }}>
          {data.impactDirection === 'positive' ? '↑ 正面' : data.impactDirection === 'negative' ? '↓ 负面' : '→ 中性'}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: colors.border }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface GraphVisualizationProps {
  nodes: NodeData[];
  onNodeClick?: (nodeId: string) => void;
  selectedNode?: string | null;
}

export function GraphVisualization({ nodes, onNodeClick, selectedNode }: GraphVisualizationProps) {
  // Convert nodes to ReactFlow format
  const { flowNodes, flowEdges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    
    // Build hierarchy levels
    const levels = new Map<string, number>();
    const nodeMap = new Map<string, NodeData>();
    
    nodes.forEach(n => nodeMap.set(n.id, n));
    
    // Calculate levels using BFS
    const roots = nodes.filter(n => !n.parent_id);
    const queue: Array<{ id: string; level: number }> = roots.map(r => ({ id: r.id, level: 0 }));
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      levels.set(id, level);
      
      const children = nodes.filter(n => n.parent_id === id);
      children.forEach(c => queue.push({ id: c.id, level: level + 1 }));
    }
    
    // Position nodes
    const levelGroups = new Map<number, NodeData[]>();
    nodes.forEach(n => {
      const level = levels.get(n.id) ?? 0;
      if (!levelGroups.has(level)) levelGroups.set(level, []);
      levelGroups.get(level)!.push(n);
    });
    
    levelGroups.forEach((group, level) => {
      const totalWidth = group.length * 180;
      const startX = -(totalWidth / 2) + 90;
      
      group.forEach((node, index) => {
        flowNodes.push({
          id: node.id,
          type: 'custom',
          position: { x: startX + index * 180, y: level * 120 },
          data: { 
            label: node.label, 
            nodeType: node.type,
            probability: node.probability,
            impactDirection: node.impact_direction,
          },
          selected: node.id === selectedNode,
        });
        
        if (node.parent_id) {
          flowEdges.push({
            id: `e-${node.parent_id}-${node.id}`,
            source: node.parent_id,
            target: node.id,
            animated: true,
            style: { stroke: '#94a3b8' },
          });
        }
      });
    });
    
    return { flowNodes, flowEdges };
  }, [nodes, selectedNode]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(flowNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Update when props change
  useMemo(() => {
    setRfNodes(flowNodes);
    setRfEdges(flowEdges);
  }, [flowNodes, flowEdges, setRfNodes, setRfEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onNodeClick?.(node.id);
  }, [onNodeClick]);

  if (nodes.length === 0) {
    return (
      <div className="h-[400px] rounded-xl border border-dashed border-border-default flex items-center justify-center text-text-tertiary text-sm">
        添加节点后将显示可视化图谱
      </div>
    );
  }

  return (
    <div className="h-[500px] rounded-xl border border-border-default overflow-hidden bg-surface-1">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const colors = NODE_COLORS[node.data?.nodeType as string] || NODE_COLORS.custom;
            return colors.border;
          }}
          maskColor="rgba(0,0,0,0.1)"
        />
      </ReactFlow>
    </div>
  );
}
