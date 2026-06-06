export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  volume: number;
  marketCap?: number;
  timestamp: string;
}

export interface Kline {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Financials {
  symbol: string;
  peRatio?: number;
  pbRatio?: number;
  eps?: number;
  dividendYield?: number;
  revenue?: number;
  netIncome?: number;
  totalDebt?: number;
  totalCash?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  relatedSymbols?: string[];
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'crypto' | 'index';
  exchange?: string;
  region?: string;
}

export type KlinePeriod = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' | 'max';

export interface DataProvider {
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getKline(symbol: string, period: KlinePeriod): Promise<Kline[]>;
  getFinancials(symbol: string): Promise<Financials>;
  getNews(symbol: string, limit?: number): Promise<NewsItem[]>;
  search(query: string, limit?: number): Promise<SearchResult[]>;
}
