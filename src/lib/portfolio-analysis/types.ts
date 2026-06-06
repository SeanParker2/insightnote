export interface Holding {
  symbol: string;
  name?: string;
  quantity: number;
  avgCost: number;
  currentPrice?: number;
  sector?: string;
  assetClass?: string;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPct: number;
  dayChange: number;
  dayChangePct: number;
  holdings: HoldingMetrics[];
  sectorAllocation: SectorAllocation[];
  riskMetrics: RiskMetrics;
}

export interface HoldingMetrics {
  symbol: string;
  name?: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  weight: number; // 占总组合比例
  dayChange: number;
  dayChangePct: number;
  sector?: string;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  weight: number;
  returnPct: number;
  holdingCount: number;
}

export interface RiskMetrics {
  volatility: number; // 年化波动率
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  concentration: number; // HHI 集中度
  topHoldingsWeight: number; // 前5大持仓占比
  sectorConcentration: number; // 最大板块占比
}

export interface ReturnAttribution {
  totalReturn: number;
  selectionReturn: number; // 选股贡献
  allocationReturn: number; // 配置贡献
  interactionReturn: number; // 交互贡献
  topContributors: Array<{ symbol: string; contribution: number }>;
  topDetractors: Array<{ symbol: string; contribution: number }>;
}

export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
}
