interface LoadingStateProps {
  text?: string;
}

export function LoadingState({ text = '加载中' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-24">
      <span className="text-xs text-[#444]">{text}</span>
    </div>
  );
}
