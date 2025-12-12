export interface MarketItem {
  symbol: string;
  change: string;
  isUp: boolean;
}

export const marketData: MarketItem[] = [
  { symbol: "S&P 500", change: "0.45%", isUp: true },
  { symbol: "NASDAQ", change: "1.20%", isUp: true },
  { symbol: "US 10Y", change: "4.12%", isUp: false },
  { symbol: "VIX", change: "1.5%", isUp: false },
  { symbol: "Gold", change: "0.8%", isUp: true },
];
