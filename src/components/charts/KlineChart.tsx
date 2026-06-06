'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Kline, KlinePeriod } from '@/lib/data-provider/types';

interface KlineChartProps {
  symbol: string;
  className?: string;
}

const PERIODS: { label: string; value: KlinePeriod }[] = [
  { label: '1月', value: '1mo' },
  { label: '3月', value: '3mo' },
  { label: '6月', value: '6mo' },
  { label: '1年', value: '1y' },
  { label: '5年', value: '5y' },
];

export function KlineChart({ symbol, className }: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  const [period, setPeriod] = useState<KlinePeriod>('3mo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<{ price: number; change: number; changePercent: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let chart: any;
    let mounted = true;

    async function initChart() {
      try {
        const { createChart, ColorType, CrosshairMode } = await import('lightweight-charts');
        
        if (!mounted || !containerRef.current) return;

        chart = createChart(containerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#a1a1aa',
            fontSize: 11,
          },
          grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: { color: 'rgba(255, 255, 255, 0.2)', width: 1, style: 2 },
            horzLine: { color: 'rgba(255, 255, 255, 0.2)', width: 1, style: 2 },
          },
          rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.06)',
            scaleMargins: { top: 0.1, bottom: 0.25 },
          },
          timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.06)',
            timeVisible: false,
          },
          handleScroll: { vertTouchDrag: false },
        });

        chartRef.current = chart;

        const candleSeries = chart.addCandlestickSeries({
          upColor: '#ef4444',
          downColor: '#22c55e',
          borderUpColor: '#ef4444',
          borderDownColor: '#22c55e',
          wickUpColor: '#ef4444',
          wickDownColor: '#22c55e',
        });
        candleSeriesRef.current = candleSeries;

        const volumeSeries = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        volumeSeriesRef.current = volumeSeries;

        chart.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        });

        const handleResize = () => {
          if (containerRef.current && chart) {
            chart.applyOptions({ width: containerRef.current.clientWidth });
          }
        };

        window.addEventListener('resize', handleResize);
      } catch (err) {
        console.error('Chart init failed:', err);
      }
    }

    initChart();

    return () => {
      mounted = false;
      if (chart) {
        try { chart.remove(); } catch {}
      }
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}&type=kline&period=${period}`);
      const data = await res.json();

      if (!data.ok || !data.data?.length) {
        setError('暂无数据');
        return;
      }

      const klines: Kline[] = data.data;

      const candleData = klines.map(k => ({
        time: k.time as any,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }));

      const volumeData = klines.map(k => ({
        time: k.time as any,
        value: k.volume,
        color: k.close >= k.open ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)',
      }));

      candleSeriesRef.current?.setData(candleData);
      volumeSeriesRef.current?.setData(volumeData);
      chartRef.current?.timeScale().fitContent();

      if (klines.length > 0) {
        const last = klines[klines.length - 1];
        const first = klines[0];
        setCurrentPrice({
          price: last.close,
          change: last.close - first.open,
          changePercent: ((last.close - first.open) / first.open) * 100,
        });
      }
    } catch (err) {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [symbol, period]);

  useEffect(() => { loadData(); }, [loadData]);

  const isUp = (currentPrice?.change ?? 0) >= 0;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold text-text-primary">{symbol}</span>
          {currentPrice && (
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-text-primary tabular-nums">
                {currentPrice.price.toFixed(2)}
              </span>
              <span className={`text-sm font-medium ${isUp ? 'text-signal-up' : 'text-signal-down'}`}>
                {isUp ? '+' : ''}{currentPrice.change.toFixed(2)} ({isUp ? '+' : ''}{currentPrice.changePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-brand text-white'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-surface-0/50">
            <div className="w-4 h-4 border-2 border-border-strong border-t-brand rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-sm text-text-tertiary">{error}</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-[400px]" />
      </div>
    </div>
  );
}
