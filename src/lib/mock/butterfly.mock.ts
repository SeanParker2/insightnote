import { Node, Edge } from '@xyflow/react';
import type { ButterflyNodeData } from '@/types/butterfly';

export type ButterflyNode = Node<ButterflyNodeData, 'trigger' | 'impact' | 'ticker'>;

export const initialNodes: ButterflyNode[] = [
  {
    id: 'node-1',
    type: 'trigger',
    position: { x: 100, y: 300 },
    data: { 
      label: 'AI Compute Demand Explodes',
      description: 'Hyperscalers ramping up data center buildout'
    },
  },
  {
    id: 'node-2',
    type: 'impact',
    position: { x: 400, y: 300 },
    data: { 
      label: 'Power Shortage',
      description: 'Grid capacity unable to meet demand in short term'
    },
  },
  {
    id: 'node-3',
    type: 'impact',
    position: { x: 700, y: 200 },
    data: { 
      label: 'Electricity Prices Surge',
      description: '+40% Premium Est. for baseload power'
    },
  },
  {
    id: 'node-4',
    type: 'ticker',
    position: { x: 700, y: 400 },
    data: { 
      label: 'Vistra Corp',
      ticker: 'VST',
      changePercent: 2.3,
      description: 'Largest competitive power generator in US'
    },
  },
  {
    id: 'node-5',
    type: 'ticker',
    position: { x: 1000, y: 400 },
    data: { 
      label: 'Constellation',
      ticker: 'CEG',
      changePercent: 1.8,
      description: 'Nuclear energy play'
    },
  },
];

export const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true },
  { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true },
  { id: 'e2-4', source: 'node-2', target: 'node-4', animated: true },
  { id: 'e4-5', source: 'node-4', target: 'node-5', animated: true, style: { strokeDasharray: '5,5' } },
];
