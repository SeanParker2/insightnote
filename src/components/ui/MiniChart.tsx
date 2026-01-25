'use client';

import React, { useEffect, useRef, memo } from 'react';

export interface MiniChartProps {
  symbol: string;
  width?: string | number;
  height?: string | number;
  colorTheme?: 'light' | 'dark';
  autosize?: boolean;
}

const MiniChart: React.FC<MiniChartProps> = ({
  symbol,
  width = '100%',
  height = 220,
  colorTheme = 'dark',
  autosize = false,
}) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    // Clear previous widget
    container.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      width: width,
      height: height,
      locale: 'zh_CN',
      dateRange: '12M',
      colorTheme: colorTheme,
      trendLineColor: 'rgba(41, 98, 255, 1)',
      underLineColor: 'rgba(41, 98, 255, 0.3)',
      underLineBottomColor: 'rgba(41, 98, 255, 0)',
      isTransparent: false,
      autosize: autosize,
      largeChartUrl: '',
    });

    container.current.appendChild(script);
  }, [symbol, width, height, colorTheme, autosize]);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
};

export default memo(MiniChart);
