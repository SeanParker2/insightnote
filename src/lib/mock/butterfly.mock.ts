import { Node, Edge } from '@xyflow/react';
import type { ButterflyNodeData } from '@/types/butterfly';

export type ButterflyNode = Node<ButterflyNodeData, 'trigger' | 'impact' | 'ticker'>;

export const initialNodes: ButterflyNode[] = [
  {
    id: 'node-1',
    type: 'trigger',
    position: { x: 100, y: 300 },
    data: { 
      label: '政策面 (央行降准)',
      description: '货币政策宽松预期落地'
    },
  },
  {
    id: 'node-2',
    type: 'impact',
    position: { x: 400, y: 300 },
    data: { 
      label: '资金面 (流动性宽松)',
      description: '市场利率下行，资金成本降低'
    },
  },
  {
    id: 'node-3',
    type: 'impact',
    position: { x: 700, y: 200 },
    data: { 
      label: '板块 (券商/红利)',
      description: '高股息与资本市场受益板块'
    },
  },
  {
    id: 'node-4',
    type: 'ticker',
    position: { x: 700, y: 400 },
    data: { 
      label: '东方财富',
      ticker: '300059.SZ',
      changePercent: 5.2,
      description: '互联网券商龙头'
    },
  },
  {
    id: 'node-5',
    type: 'ticker',
    position: { x: 1000, y: 400 },
    data: { 
      label: '长江电力',
      ticker: '600900.SS',
      changePercent: 1.8,
      description: '水电红利龙头'
    },
  },
];

export const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true },
  { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true },
  { id: 'e2-4', source: 'node-2', target: 'node-4', animated: true },
  { id: 'e4-5', source: 'node-4', target: 'node-5', animated: true, style: { strokeDasharray: '5,5' } },
];
