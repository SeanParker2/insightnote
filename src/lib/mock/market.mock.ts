export interface MarketItem {
  symbol: string;
  value: string;
  change: string;
  isUp: boolean;
}

export const marketData: MarketItem[] = [
  { symbol: "上证指数", value: "3,280.45", change: "+1.20%", isUp: true },
  { symbol: "深证成指", value: "10,432.10", change: "+0.80%", isUp: true },
  { symbol: "创业板指", value: "2,150.33", change: "-0.50%", isUp: false },
  { symbol: "恒生科技", value: "4,320.11", change: "+2.10%", isUp: true },
  { symbol: "离岸人民币", value: "7.12", change: "+0.01%", isUp: true },
  // 核心资产
  { symbol: "贵州茅台", value: "1,750.22", change: "+1.50%", isUp: true },
  { symbol: "宁德时代", value: "180.50", change: "-0.80%", isUp: false },
  { symbol: "招商银行", value: "32.10", change: "+0.40%", isUp: true },
  { symbol: "中信证券", value: "21.45", change: "+5.20%", isUp: true },
];

export const MOCK_STOCK_QUOTES = {
  "600519.SS": { price: 1750.22, change: 1.5, name: "贵州茅台" },
  "300750.SZ": { price: 180.50, change: -0.8, name: "宁德时代" },
  "600036.SS": { price: 32.10, change: 0.4, name: "招商银行" },
  "600030.SS": { price: 21.45, change: 5.2, name: "中信证券" },
};
