interface SentimentBadgeProps {
  sentiment: 'bullish' | 'bearish' | 'neutral' | null;
  className?: string;
}

export function SentimentBadge({ sentiment, className }: SentimentBadgeProps) {
  if (!sentiment) return null;

  const config = {
    bullish: { label: '看多', bg: 'bg-signal-up-bg', text: 'text-signal-up' },
    bearish: { label: '看空', bg: 'bg-signal-down-bg', text: 'text-signal-down' },
    neutral: { label: '中性', bg: 'bg-surface-2', text: 'text-text-tertiary' },
  };

  const { label, bg, text } = config[sentiment];

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${bg} ${text} ${className ?? ''}`}>
      {label}
    </span>
  );
}
