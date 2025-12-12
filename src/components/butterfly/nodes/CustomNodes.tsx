import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { ButterflyNodeData } from '@/lib/mock/butterfly.mock';

type CustomNodeProps = NodeProps<Node<ButterflyNodeData>>;

export function TriggerNode({ data }: CustomNodeProps) {
  return (
    <div className="relative w-[180px] h-[80px] bg-black border border-blue-500 rounded-lg p-3 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
      <div className="text-[10px] text-blue-500 font-mono mb-1 uppercase tracking-wider">Event Trigger</div>
      <div className="font-bold text-white text-sm line-clamp-2">{data.label}</div>
      <Handle type="source" position={Position.Right} className="bg-blue-500! w-2! h-2! border-0!" />
    </div>
  );
}

export function ImpactNode({ data }: CustomNodeProps) {
  return (
    <div className="relative w-[180px] h-[80px] bg-black border border-dashed border-yellow-600 rounded p-3">
      <Handle type="target" position={Position.Left} className="bg-yellow-600! w-2! h-2! border-0!" />
      <div className="text-[10px] text-yellow-600 font-mono mb-1 uppercase tracking-wider">Consequence</div>
      <div className="font-bold text-white text-sm line-clamp-2">{data.label}</div>
      <Handle type="source" position={Position.Right} className="bg-yellow-600! w-2! h-2! border-0!" />
    </div>
  );
}

export function TickerNode({ data }: CustomNodeProps) {
  const isPositive = (data.changePercent || 0) >= 0;
  const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
  const borderClass = isPositive ? 'border-green-900/50' : 'border-red-900/50';
  
  return (
    <div className={`relative w-[180px] h-[80px] bg-black border ${borderClass} rounded p-3`}>
      <Handle type="target" position={Position.Left} className={`bg-gray-600! w-2! h-2! border-0!`} />
      <div className="flex justify-between items-start mb-1">
        <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Ticker</div>
        {data.changePercent !== undefined && (
          <div className={`text-[10px] font-mono ${colorClass}`}>
            {isPositive ? '+' : ''}{data.changePercent}%
          </div>
        )}
      </div>
      <div className={`font-bold text-lg ${colorClass}`}>{data.ticker}</div>
      <div className="text-xs text-white/80 truncate">{data.label}</div>
      <Handle type="source" position={Position.Right} className={`bg-gray-600! w-2! h-2! border-0!`} />
    </div>
  );
}
