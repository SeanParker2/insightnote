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
      <Badge variant="outline" className={cn("bg-signal-down-bg text-signal-down border-signal-down/30 gap-1.5 py-1", className)}>
        <CheckCircle className="w-3.5 h-3.5" />
        <span>目标达成 (收益 +{returnPct}%)</span>
      </Badge>
    );
  }

  if (prediction.status === 'lost') {
    return (
      <Badge variant="outline" className={cn("bg-signal-up-bg text-signal-up border-signal-up/30 gap-1.5 py-1", className)}>
        <XCircle className="w-3.5 h-3.5" />
        <span>未达预期</span>
      </Badge>
    );
  }

  if (prediction.status === 'expired') {
    return (
      <Badge variant="outline" className={cn("bg-surface-2 text-text-tertiary border-border-default gap-1.5 py-1", className)}>
        <Clock className="w-3.5 h-3.5" />
        <span>已过期</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("bg-brand/10 text-brand-light border-brand/30 gap-1.5 py-1", className)}>
      {isBullish ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      <span>追踪中: {prediction.symbol} 目标 {prediction.target_price}</span>
    </Badge>
  );
});

PredictionBadge.displayName = 'PredictionBadge';
