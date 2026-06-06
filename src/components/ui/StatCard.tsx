interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className={`p-4 rounded-lg border border-[#1a1a1a] ${className ?? ''}`}>
      <div className="text-[10px] text-[#444] uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
