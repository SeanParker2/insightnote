import type { Holding, PortfolioMetrics, HoldingMetrics, SectorAllocation, RiskMetrics, ReturnAttribution, PortfolioSnapshot } from './types';

export function calculatePortfolioMetrics(holdings: Holding[], prices: Map<string, number>): PortfolioMetrics {
  const holdingsMetrics = calculateHoldingMetrics(holdings, prices);
  const totalValue = holdingsMetrics.reduce((s, h) => s + h.marketValue, 0);
  const totalCost = holdingsMetrics.reduce((s, h) => s + h.costBasis, 0);
  const totalReturn = totalValue - totalCost;
  const totalReturnPct = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
  const dayChange = holdingsMetrics.reduce((s, h) => s + h.dayChange, 0);
  const dayChangePct = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

  const sectorAllocation = calculateSectorAllocation(holdingsMetrics);
  const riskMetrics = calculateRiskMetrics(holdingsMetrics, totalValue);

  return {
    totalValue,
    totalCost,
    totalReturn,
    totalReturnPct,
    dayChange,
    dayChangePct,
    holdings: holdingsMetrics,
    sectorAllocation,
    riskMetrics,
  };
}

function calculateHoldingMetrics(holdings: Holding[], prices: Map<string, number>): HoldingMetrics[] {
  const totalValue = holdings.reduce((sum, h) => {
    const price = prices.get(h.symbol) ?? h.avgCost;
    return sum + h.quantity * price;
  }, 0);

  return holdings.map(h => {
    const currentPrice = prices.get(h.symbol) ?? h.avgCost;
    const marketValue = h.quantity * currentPrice;
    const costBasis = h.quantity * h.avgCost;
    const unrealizedPnL = marketValue - costBasis;
    const unrealizedPnLPct = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;
    const weight = totalValue > 0 ? marketValue / totalValue : 0;
    const dayChange = marketValue * 0.01; // Placeholder - would need historical data
    const dayChangePct = 1; // Placeholder

    return {
      symbol: h.symbol,
      name: h.name,
      quantity: h.quantity,
      avgCost: h.avgCost,
      currentPrice,
      marketValue,
      costBasis,
      unrealizedPnL,
      unrealizedPnLPct,
      weight,
      dayChange,
      dayChangePct,
      sector: h.sector,
    };
  });
}

function calculateSectorAllocation(holdings: HoldingMetrics[]): SectorAllocation[] {
  const sectorMap = new Map<string, { value: number; cost: number; count: number }>();

  holdings.forEach(h => {
    const sector = h.sector ?? '未分类';
    const existing = sectorMap.get(sector) ?? { value: 0, cost: 0, count: 0 };
    existing.value += h.marketValue;
    existing.cost += h.costBasis;
    existing.count += 1;
    sectorMap.set(sector, existing);
  });

  const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0);

  return Array.from(sectorMap.entries()).map(([sector, data]) => ({
    sector,
    value: data.value,
    weight: totalValue > 0 ? data.value / totalValue : 0,
    returnPct: data.cost > 0 ? ((data.value - data.cost) / data.cost) * 100 : 0,
    holdingCount: data.count,
  })).sort((a, b) => b.weight - a.weight);
}

function calculateRiskMetrics(holdings: HoldingMetrics[], totalValue: number): RiskMetrics {
  if (holdings.length === 0 || totalValue === 0) {
    return { volatility: 0, sharpeRatio: 0, maxDrawdown: 0, beta: 1, concentration: 0, topHoldingsWeight: 0, sectorConcentration: 0 };
  }

  // HHI Concentration
  const hhi = holdings.reduce((sum, h) => {
    const weight = h.marketValue / totalValue;
    return sum + weight * weight;
  }, 0);

  // Top 5 holdings weight
  const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  const top5Weight = sorted.slice(0, 5).reduce((s, h) => s + h.marketValue / totalValue, 0);

  // Sector concentration
  const sectorWeights = new Map<string, number>();
  holdings.forEach(h => {
    const sector = h.sector ?? '未分类';
    sectorWeights.set(sector, (sectorWeights.get(sector) ?? 0) + h.marketValue / totalValue);
  });
  const maxSectorWeight = Math.max(...sectorWeights.values(), 0);

  // Simplified risk metrics (would need historical data for accurate calculation)
  const volatility = 0.2; // Placeholder: 20% annualized
  const riskFreeRate = 0.02;
  const expectedReturn = holdings.reduce((s, h) => s + (h.unrealizedPnLPct / 100) * h.weight, 0);
  const sharpeRatio = volatility > 0 ? (expectedReturn - riskFreeRate) / volatility : 0;

  return {
    volatility,
    sharpeRatio,
    maxDrawdown: 0.15, // Placeholder
    beta: 1, // Placeholder
    concentration: hhi,
    topHoldingsWeight: top5Weight,
    sectorConcentration: maxSectorWeight,
  };
}

export function calculateReturnAttribution(
  holdings: Holding[],
  benchmarkReturns: Map<string, number>,
  prices: Map<string, number>
): ReturnAttribution {
  const totalCost = holdings.reduce((s, h) => s + h.quantity * h.avgCost, 0);
  const totalValue = holdings.reduce((s, h) => {
    const price = prices.get(h.symbol) ?? h.avgCost;
    return s + h.quantity * price;
  }, 0);
  const totalReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  const contributions = holdings.map(h => {
    const price = prices.get(h.symbol) ?? h.avgCost;
    const returnValue = h.quantity * (price - h.avgCost);
    const weight = totalCost > 0 ? (h.quantity * h.avgCost) / totalCost : 0;
    const returnPct = h.avgCost > 0 ? ((price - h.avgCost) / h.avgCost) * 100 : 0;
    const benchmark = benchmarkReturns.get(h.symbol) ?? 0;
    
    return {
      symbol: h.symbol,
      contribution: returnPct * weight,
      selection: (returnPct - benchmark) * weight,
      allocation: benchmark * (weight - 1 / holdings.length),
    };
  });

  const sorted = [...contributions].sort((a, b) => b.contribution - a.contribution);

  return {
    totalReturn,
    selectionReturn: contributions.reduce((s, c) => s + c.selection, 0),
    allocationReturn: contributions.reduce((s, c) => s + c.allocation, 0),
    interactionReturn: 0,
    topContributors: sorted.slice(0, 3).map(c => ({ symbol: c.symbol, contribution: c.contribution })),
    topDetractors: sorted.slice(-3).reverse().map(c => ({ symbol: c.symbol, contribution: c.contribution })),
  };
}

export function generateNetValueCurve(snapshots: PortfolioSnapshot[]): Array<{ date: string; value: number; returnPct: number }> {
  if (snapshots.length === 0) return [];

  const baseValue = snapshots[0].totalValue;
  return snapshots.map(s => ({
    date: s.date,
    value: s.totalValue,
    returnPct: baseValue > 0 ? ((s.totalValue - baseValue) / baseValue) * 100 : 0,
  }));
}
