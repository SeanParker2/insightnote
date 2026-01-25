import { memo } from 'react';
import { Prediction } from '@/types';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PredictionBadgeProps {
  prediction: Prediction;
  className?: string;
}

export const PredictionBadge = memo(({ prediction, className }: PredictionBadgeProps) => {
  const calculateReturn = () => {
    if (!prediction.start_price || !prediction.target_price) return 0;
    const diff = prediction.target_price - prediction.start_price;
    return ((diff / prediction.start_price) * 100).toFixed(1);
  };

  const returnPct = calculateReturn();
  const isBullish = prediction.direction === 'bullish';

  if (prediction.status === 'won') {
    return (
      <Badge variant="outline" className={cn("bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5 py-1", className)}>
        <CheckCircle className="w-3.5 h-3.5" />
        <span>目标达成 (收益 +{returnPct}%)</span>
      </Badge>
    );
  }

  if (prediction.status === 'lost') {
    return (
      <Badge variant="outline" className={cn("bg-rose-500/10 text-rose-600 border-rose-500/20 gap-1.5 py-1", className)}>
        <XCircle className="w-3.5 h-3.5" />
        <span>未达预期</span>
      </Badge>
    );
  }

  if (prediction.status === 'expired') {
    return (
      <Badge variant="outline" className={cn("bg-slate-500/10 text-slate-600 border-slate-500/20 gap-1.5 py-1", className)}>
        <Clock className="w-3.5 h-3.5" />
        <span>已过期</span>
      </Badge>
    );
  }

  // Active status
  return (
    <Badge variant="outline" className={cn("bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1.5 py-1", className)}>
      {isBullish ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      <span>
        追踪中: {prediction.symbol} 目标 {prediction.target_price}
      </span>
    </Badge>
  );
});

PredictionBadge.displayName = 'PredictionBadge';
