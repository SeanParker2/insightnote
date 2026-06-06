import type { Kline } from '@/lib/data-provider/types';

export type IndicatorType = 
  | 'sma' | 'ema' | 'macd' | 'rsi' | 'bollinger' | 'atr' | 'adx' | 'stochastic'
  | 'cci' | 'williams' | 'momentum' | 'roc' | 'obv' | 'vwap';

export interface IndicatorResult {
  name: string;
  value: number | Record<string, number>;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export interface TechnicalAnalysis {
  symbol: string;
  timestamp: string;
  indicators: IndicatorResult[];
  summary: {
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    overallSignal: 'bullish' | 'bearish' | 'neutral';
    strength: 'strong' | 'moderate' | 'weak';
  };
  supportResistance: {
    support: number[];
    resistance: number[];
  };
}

export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((s, v) => s + v, 0) / period);
    }
  }
  return result;
}

export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      const slice = data.slice(0, period);
      result.push(slice.reduce((s, v) => s + v, 0) / period);
    } else {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }

  return [NaN, ...result];
}

export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  
  const macdLine: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (isNaN(emaFast[i]) || isNaN(emaSlow[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(emaFast[i] - emaSlow[i]);
    }
  }

  const validMacd = macdLine.filter(v => !isNaN(v));
  const signalLine = calculateEMA(validMacd, signalPeriod);
  
  const signal: number[] = [];
  const histogram: number[] = [];
  let signalIdx = 0;
  
  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i])) {
      signal.push(NaN);
      histogram.push(NaN);
    } else {
      signal.push(signalLine[signalIdx] || NaN);
      histogram.push(macdLine[i] - (signalLine[signalIdx] || 0));
      signalIdx++;
    }
  }

  return { macd: macdLine, signal, histogram };
}

export function calculateBollinger(
  data: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (isNaN(middle[i])) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = data.slice(Math.max(0, i - period + 1), i + 1);
      const mean = middle[i];
      const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / slice.length;
      const std = Math.sqrt(variance);
      
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }

  return { upper, middle, lower };
}

export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number[] {
  const tr: number[] = [];
  
  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      tr.push(highs[i] - lows[i]);
    } else {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      tr.push(Math.max(hl, hc, lc));
    }
  }

  return calculateSMA(tr, period);
}

export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14,
  smoothK: number = 3,
  smoothD: number = 3
): { k: number[]; d: number[] } {
  const rawK: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      rawK.push(NaN);
    } else {
      const highSlice = highs.slice(i - period + 1, i + 1);
      const lowSlice = lows.slice(i - period + 1, i + 1);
      const highest = Math.max(...highSlice);
      const lowest = Math.min(...lowSlice);
      
      if (highest === lowest) {
        rawK.push(50);
      } else {
        rawK.push(((closes[i] - lowest) / (highest - lowest)) * 100);
      }
    }
  }

  const k = calculateSMA(rawK.filter(v => !isNaN(v)), smoothK);
  const d = calculateSMA(k.filter(v => !isNaN(v)), smoothD);

  return { k: [NaN, ...k], d: [NaN, NaN, ...d] };
}

export function findSupportResistance(
  highs: number[],
  lows: number[],
  closes: number[],
  lookback: number = 20
): { support: number[]; resistance: number[] } {
  const support: number[] = [];
  const resistance: number[] = [];

  for (let i = lookback; i < closes.length; i++) {
    const windowHighs = highs.slice(i - lookback, i);
    const windowLows = lows.slice(i - lookback, i);

    const localMax = Math.max(...windowHighs);
    const localMin = Math.min(...windowLows);

    if (!resistance.includes(localMax)) resistance.push(localMax);
    if (!support.includes(localMin)) support.push(localMin);
  }

  return {
    support: support.sort((a, b) => a - b).slice(-3),
    resistance: resistance.sort((a, b) => b - a).slice(-3),
  };
}

export interface TechnicalAnalysisOptions {
  enhanced?: boolean;
}

export function performTechnicalAnalysis(
  symbol: string, 
  klines: Kline[], 
  options: TechnicalAnalysisOptions = {}
): TechnicalAnalysis {
  const closes = klines.map(k => k.close);
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);
  const volumes = klines.map(k => k.volume);

  const indicators: IndicatorResult[] = [];

  // SMA
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const lastSma20 = sma20[sma20.length - 1];
  const lastSma50 = sma50[sma50.length - 1];
  const lastClose = closes[closes.length - 1];

  if (!isNaN(lastSma20) && !isNaN(lastSma50)) {
    const smaSignal = lastClose > lastSma20 ? 'bullish' : lastClose < lastSma20 ? 'bearish' : 'neutral';
    indicators.push({
      name: 'SMA',
      value: { sma20: lastSma20, sma50: lastSma50 },
      signal: smaSignal,
      description: `价格${smaSignal === 'bullish' ? '高于' : '低于'}20日均线`,
    });
  }

  // RSI
  const rsi = calculateRSI(closes);
  const lastRsi = rsi[rsi.length - 1];
  if (!isNaN(lastRsi)) {
    const rsiSignal = lastRsi > 70 ? 'bearish' : lastRsi < 30 ? 'bullish' : 'neutral';
    indicators.push({
      name: 'RSI',
      value: lastRsi,
      signal: rsiSignal,
      description: `RSI ${lastRsi.toFixed(1)}，${lastRsi > 70 ? '超买' : lastRsi < 30 ? '超卖' : '中性'}`,
    });
  }

  // MACD
  const macd = calculateMACD(closes);
  const lastMacd = macd.macd[macd.macd.length - 1];
  const lastSignal = macd.signal[macd.signal.length - 1];
  const lastHistogram = macd.histogram[macd.histogram.length - 1];

  if (!isNaN(lastMacd) && !isNaN(lastSignal)) {
    const macdSignal = lastHistogram > 0 ? 'bullish' : lastHistogram < 0 ? 'bearish' : 'neutral';
    indicators.push({
      name: 'MACD',
      value: { macd: lastMacd, signal: lastSignal, histogram: lastHistogram },
      signal: macdSignal,
      description: `MACD ${macdSignal === 'bullish' ? '金叉' : macdSignal === 'bearish' ? '死叉' : '中性'}`,
    });
  }

  // Bollinger Bands
  const bollinger = calculateBollinger(closes);
  const lastUpper = bollinger.upper[bollinger.upper.length - 1];
  const lastMiddle = bollinger.middle[bollinger.middle.length - 1];
  const lastLower = bollinger.lower[bollinger.lower.length - 1];

  if (!isNaN(lastUpper) && !isNaN(lastLower)) {
    const bollingerSignal = lastClose > lastUpper ? 'bearish' : lastClose < lastLower ? 'bullish' : 'neutral';
    indicators.push({
      name: 'Bollinger',
      value: { upper: lastUpper, middle: lastMiddle, lower: lastLower },
      signal: bollingerSignal,
      description: `价格${bollingerSignal === 'bearish' ? '触及上轨' : bollingerSignal === 'bullish' ? '触及下轨' : '在通道内'}`,
    });
  }

  // Stochastic
  const stochastic = calculateStochastic(highs, lows, closes);
  const lastK = stochastic.k[stochastic.k.length - 1];
  const lastD = stochastic.d[stochastic.d.length - 1];

  if (!isNaN(lastK) && !isNaN(lastD)) {
    const stochSignal = lastK > 80 ? 'bearish' : lastK < 20 ? 'bullish' : 'neutral';
    indicators.push({
      name: 'Stochastic',
      value: { k: lastK, d: lastD },
      signal: stochSignal,
      description: `K值 ${lastK.toFixed(1)}，${stochSignal === 'bearish' ? '超买' : stochSignal === 'bullish' ? '超卖' : '中性'}`,
    });
  }

  // Summary
  const bullishCount = indicators.filter(i => i.signal === 'bullish').length;
  const bearishCount = indicators.filter(i => i.signal === 'bearish').length;
  const neutralCount = indicators.filter(i => i.signal === 'neutral').length;

  const overallSignal = bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral';
  const total = indicators.length || 1;
  const strength = Math.abs(bullishCount - bearishCount) / total > 0.5 ? 'strong' : 
                   Math.abs(bullishCount - bearishCount) / total > 0.2 ? 'moderate' : 'weak';

  // Support/Resistance
  const supportResistance = findSupportResistance(highs, lows, closes);

  // Enhanced indicators (if requested)
  let enhancedIndicators: IndicatorResult[] = [];
  if (options.enhanced) {
    try {
      const { getEnhancedIndicators } = require('./enhanced-indicators');
      enhancedIndicators = getEnhancedIndicators(klines);
    } catch (error) {
      console.warn('Enhanced indicators not available:', error);
    }
  }

  const allIndicators = [...indicators, ...enhancedIndicators];
  
  // Recalculate summary with all indicators
  const finalBullishCount = allIndicators.filter(i => i.signal === 'bullish').length;
  const finalBearishCount = allIndicators.filter(i => i.signal === 'bearish').length;
  const finalNeutralCount = allIndicators.filter(i => i.signal === 'neutral').length;
  const finalOverallSignal = finalBullishCount > finalBearishCount ? 'bullish' : finalBearishCount > finalBullishCount ? 'bearish' : 'neutral';
  const finalTotal = allIndicators.length || 1;
  const finalStrength = Math.abs(finalBullishCount - finalBearishCount) / finalTotal > 0.5 ? 'strong' : 
                        Math.abs(finalBullishCount - finalBearishCount) / finalTotal > 0.2 ? 'moderate' : 'weak';

  return {
    symbol,
    timestamp: new Date().toISOString(),
    indicators: allIndicators,
    summary: {
      bullishCount: finalBullishCount,
      bearishCount: finalBearishCount,
      neutralCount: finalNeutralCount,
      overallSignal: finalOverallSignal,
      strength: finalStrength,
    },
    supportResistance,
  };
}
