import type { Kline } from '@/lib/data-provider/types';
import type { IndicatorResult } from './index';
import {
  IchimokuCloud,
  KeltnerChannels,
  MFI,
  TRIX,
  WilliamsR,
  CCI,
  ADX,
  ATR,
} from 'technicalindicators';

export interface EnhancedAnalysis {
  ichimoku?: {
    conversion: number;
    base: number;
    spanA: number;
    spanB: number;
    signal: 'bullish' | 'bearish' | 'neutral';
    description: string;
  };
  moneyFlow?: {
    mfi: number;
    signal: 'bullish' | 'bearish' | 'neutral';
    description: string;
  };
  volatilityChannels?: {
    keltner: { upper: number; middle: number; lower: number };
    signal: 'bullish' | 'bearish' | 'neutral';
    description: string;
  };
  additionalIndicators?: {
    williamsR: number;
    cci: number;
    adx: number;
    atr: number;
    trix: number;
  };
}

export function calculateIchimoku(
  highs: number[],
  lows: number[],
  closes: number[]
): EnhancedAnalysis['ichimoku'] {
  if (highs.length < 52) return undefined;

  const result = IchimokuCloud.calculate({
    high: highs,
    low: lows,
    conversionPeriod: 9,
    basePeriod: 26,
    spanPeriod: 52,
    displacement: 26,
  });

  const last = result[result.length - 1];
  if (!last) return undefined;

  const lastClose = closes[closes.length - 1];
  const isAboveCloud = lastClose > Math.max(last.spanA ?? 0, last.spanB ?? 0);
  const isBelowCloud = lastClose < Math.min(last.spanA ?? 0, last.spanB ?? 0);
  const isBullishCross = (last.conversion ?? 0) > (last.base ?? 0);

  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let description = '';

  if (isAboveCloud && isBullishCross) {
    signal = 'bullish';
    description = '价格在云层上方，转换线高于基准线，强势看涨';
  } else if (isBelowCloud && !isBullishCross) {
    signal = 'bearish';
    description = '价格在云层下方，转换线低于基准线，强势看跌';
  } else if (isAboveCloud) {
    signal = 'bullish';
    description = '价格在云层上方，趋势偏多';
  } else if (isBelowCloud) {
    signal = 'bearish';
    description = '价格在云层下方，趋势偏空';
  } else {
    description = '价格在云层内，震荡整理';
  }

  return {
    conversion: last.conversion ?? 0,
    base: last.base ?? 0,
    spanA: last.spanA ?? 0,
    spanB: last.spanB ?? 0,
    signal,
    description,
  };
}

export function calculateMoneyFlow(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): EnhancedAnalysis['moneyFlow'] {
  if (highs.length < 14) return undefined;

  const mfiResult = MFI.calculate({
    high: highs,
    low: lows,
    close: closes,
    volume: volumes,
    period: 14,
  });

  const lastMfi = mfiResult[mfiResult.length - 1];

  if (lastMfi === undefined) return undefined;

  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let description = '';

  if (lastMfi > 80) {
    signal = 'bearish';
    description = `MFI ${lastMfi.toFixed(1)}超买，资金流入过度`;
  } else if (lastMfi < 20) {
    signal = 'bullish';
    description = `MFI ${lastMfi.toFixed(1)}超卖，可能反弹`;
  } else {
    description = `MFI ${lastMfi.toFixed(1)}，资金流动中性`;
  }

  return {
    mfi: lastMfi,
    signal,
    description,
  };
}

export function calculateVolatilityChannels(
  highs: number[],
  lows: number[],
  closes: number[]
): EnhancedAnalysis['volatilityChannels'] {
  if (highs.length < 20) return undefined;

  const keltnerResult = KeltnerChannels.calculate({
    high: highs,
    low: lows,
    close: closes,
    maPeriod: 20,
    atrPeriod: 10,
    multiplier: 2,
    useSMA: false,
  });

  const lastKeltner = keltnerResult[keltnerResult.length - 1];

  if (!lastKeltner) return undefined;

  const lastClose = closes[closes.length - 1];
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let description = '';

  if (lastClose > (lastKeltner.upper ?? 0)) {
    signal = 'bullish';
    description = '价格突破肯特纳上轨，强势上涨';
  } else if (lastClose < (lastKeltner.lower ?? 0)) {
    signal = 'bearish';
    description = '价格跌破肯特纳下轨，弱势下跌';
  } else {
    description = '价格在波动通道内运行';
  }

  return {
    keltner: {
      upper: lastKeltner.upper ?? 0,
      middle: lastKeltner.middle ?? 0,
      lower: lastKeltner.lower ?? 0,
    },
    signal,
    description,
  };
}

export function calculateAdditionalIndicators(
  highs: number[],
  lows: number[],
  closes: number[]
): EnhancedAnalysis['additionalIndicators'] {
  if (highs.length < 20) return undefined;

  try {
    const williamsResult = WilliamsR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
    });

    const cciResult = CCI.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 20,
    });

    const adxResult = ADX.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
    });

    const atrResult = ATR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
    });

    const trixResult = TRIX.calculate({
      values: closes,
      period: 15,
    });

    return {
      williamsR: williamsResult[williamsResult.length - 1] ?? 0,
      cci: cciResult[cciResult.length - 1] ?? 0,
      adx: adxResult[adxResult.length - 1]?.adx ?? 0,
      atr: atrResult[atrResult.length - 1] ?? 0,
      trix: trixResult[trixResult.length - 1] ?? 0,
    };
  } catch (error) {
    console.warn('Error calculating additional indicators:', error);
    return undefined;
  }
}

export function performEnhancedAnalysis(
  klines: Kline[]
): EnhancedAnalysis {
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);
  const closes = klines.map(k => k.close);
  const volumes = klines.map(k => k.volume);

  return {
    ichimoku: calculateIchimoku(highs, lows, closes),
    moneyFlow: calculateMoneyFlow(highs, lows, closes, volumes),
    volatilityChannels: calculateVolatilityChannels(highs, lows, closes),
    additionalIndicators: calculateAdditionalIndicators(highs, lows, closes),
  };
}

export function getEnhancedIndicators(klines: Kline[]): IndicatorResult[] {
  const analysis = performEnhancedAnalysis(klines);
  const indicators: IndicatorResult[] = [];

  if (analysis.ichimoku) {
    indicators.push({
      name: 'Ichimoku',
      value: {
        conversion: analysis.ichimoku.conversion,
        base: analysis.ichimoku.base,
        spanA: analysis.ichimoku.spanA,
        spanB: analysis.ichimoku.spanB,
      },
      signal: analysis.ichimoku.signal,
      description: analysis.ichimoku.description,
    });
  }

  if (analysis.moneyFlow) {
    indicators.push({
      name: 'MoneyFlow',
      value: { mfi: analysis.moneyFlow.mfi },
      signal: analysis.moneyFlow.signal,
      description: analysis.moneyFlow.description,
    });
  }

  if (analysis.volatilityChannels) {
    indicators.push({
      name: 'VolatilityChannels',
      value: {
        keltnerUpper: analysis.volatilityChannels.keltner.upper,
        keltnerMiddle: analysis.volatilityChannels.keltner.middle,
        keltnerLower: analysis.volatilityChannels.keltner.lower,
      },
      signal: analysis.volatilityChannels.signal,
      description: analysis.volatilityChannels.description,
    });
  }

  if (analysis.additionalIndicators) {
    const { williamsR, cci, adx, atr, trix } = analysis.additionalIndicators;
    
    // Williams %R signal
    let williamsSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (williamsR > -20) williamsSignal = 'bearish';
    else if (williamsR < -80) williamsSignal = 'bullish';

    // CCI signal
    let cciSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (cci > 100) cciSignal = 'bearish';
    else if (cci < -100) cciSignal = 'bullish';

    indicators.push({
      name: 'WilliamsR',
      value: williamsR,
      signal: williamsSignal,
      description: `Williams %R ${williamsR.toFixed(1)}，${williamsSignal === 'bearish' ? '超买' : williamsSignal === 'bullish' ? '超卖' : '中性'}`,
    });

    indicators.push({
      name: 'CCI',
      value: cci,
      signal: cciSignal,
      description: `CCI ${cci.toFixed(1)}，${cciSignal === 'bearish' ? '超买' : cciSignal === 'bullish' ? '超卖' : '中性'}`,
    });

    indicators.push({
      name: 'ADX',
      value: adx,
      signal: adx > 25 ? 'bullish' : 'neutral',
      description: `ADX ${adx.toFixed(1)}，趋势${adx > 25 ? '强劲' : '较弱'}`,
    });

    indicators.push({
      name: 'ATR',
      value: atr,
      signal: 'neutral',
      description: `ATR ${atr.toFixed(2)}，波动性指标`,
    });

    indicators.push({
      name: 'TRIX',
      value: trix,
      signal: trix > 0 ? 'bullish' : trix < 0 ? 'bearish' : 'neutral',
      description: `TRIX ${trix.toFixed(4)}，${trix > 0 ? '看涨' : trix < 0 ? '看跌' : '中性'}`,
    });
  }

  return indicators;
}
