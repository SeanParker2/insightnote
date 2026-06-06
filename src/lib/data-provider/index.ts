import type { DataProvider, Quote, Kline, KlinePeriod, Financials, NewsItem, SearchResult } from './types';

export function createDataProvider(): DataProvider {
  const provider = process.env.DATA_PROVIDER || 'yahoo';
  
  switch (provider) {
    case 'tushare':
      return new TushareProvider();
    case 'yahoo':
    default:
      return new YahooProvider();
  }
}

async function getYahooFinance() {
  const mod = await import('yahoo-finance2');
  return mod.default;
}

class YahooProvider implements DataProvider {
  async getQuote(symbol: string): Promise<Quote> {
    const yahooFinance = await getYahooFinance();
    const quote = await yahooFinance.quote(symbol);
    
    return {
      symbol: (quote as any).symbol ?? symbol,
      name: (quote as any).shortName ?? (quote as any).longName ?? symbol,
      price: (quote as any).regularMarketPrice ?? 0,
      change: (quote as any).regularMarketChange ?? 0,
      changePercent: (quote as any).regularMarketChangePercent ?? 0,
      open: (quote as any).regularMarketOpen ?? 0,
      high: (quote as any).regularMarketDayHigh ?? 0,
      low: (quote as any).regularMarketDayLow ?? 0,
      close: (quote as any).regularMarketPrice ?? 0,
      previousClose: (quote as any).regularMarketPreviousClose ?? 0,
      volume: (quote as any).regularMarketVolume ?? 0,
      marketCap: (quote as any).marketCap ?? undefined,
      timestamp: new Date().toISOString(),
    };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const results = await Promise.allSettled(symbols.map(s => this.getQuote(s)));
    return results
      .filter((r): r is PromiseFulfilledResult<Quote> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  async getKline(symbol: string, period: KlinePeriod): Promise<Kline[]> {
    const yahooFinance = await getYahooFinance();
    
    const periodDays: Record<string, number> = {
      '1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '5y': 1825, 'max': 36500,
    };

    const intervalMap: Record<string, string> = {
      '1d': '5m', '5d': '15m', '1mo': '1d', '3mo': '1d', '6mo': '1d', '1y': '1wk', '5y': '1mo', 'max': '1mo',
    };

    const now = new Date();
    const periodDate = new Date(now);
    periodDate.setDate(now.getDate() - (periodDays[period] || 30));

    const result = await yahooFinance.chart(symbol, {
      period1: periodDate.toISOString().split('T')[0],
      interval: intervalMap[period] || '1d',
    });

    return ((result as any).quotes || []).map((q: any) => ({
      time: q.date ? new Date(q.date).toISOString().split('T')[0] : '',
      open: q.open ?? 0,
      high: q.high ?? 0,
      low: q.low ?? 0,
      close: q.close ?? 0,
      volume: q.volume ?? 0,
    })).filter((k: Kline) => k.time);
  }

  async getFinancials(symbol: string): Promise<Financials> {
    const yahooFinance = await getYahooFinance();
    const quote = await yahooFinance.quote(symbol);
    const q = quote as any;
    
    return {
      symbol,
      peRatio: q.trailingPE ?? undefined,
      pbRatio: q.priceToBook ?? undefined,
      eps: q.epsTrailingTwelveMonths ?? undefined,
      dividendYield: q.dividendYield ?? undefined,
      marketCap: q.marketCap ?? undefined,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? undefined,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? undefined,
    };
  }

  async getNews(symbol: string, limit = 10): Promise<NewsItem[]> {
    try {
      const yahooFinance = await getYahooFinance();
      const result = await yahooFinance.search(symbol, { newsCount: limit });
      
      return ((result as any).news || []).map((n: any, i: number) => ({
        id: `yahoo-${symbol}-${i}`,
        title: n.title ?? '',
        summary: n.summary ?? '',
        url: n.link ?? '',
        source: n.publisher ?? 'Yahoo Finance',
        publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : new Date().toISOString(),
        relatedSymbols: [symbol],
      }));
    } catch {
      return [];
    }
  }

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      const yahooFinance = await getYahooFinance();
      const result = await yahooFinance.search(query);
      
      return ((result as any).quotes || []).slice(0, limit).map((q: any) => ({
        symbol: q.symbol ?? '',
        name: q.shortname ?? q.longname ?? '',
        type: (q.quoteType === 'ETF' ? 'etf' : q.quoteType === 'CRYPTOCURRENCY' ? 'crypto' : 'stock') as SearchResult['type'],
        exchange: q.exchange ?? undefined,
        region: q.region ?? undefined,
      }));
    } catch {
      return [];
    }
  }
}

class TushareProvider implements DataProvider {
  private token: string;
  private baseUrl = 'http://api.tushare.pro';

  constructor() {
    this.token = process.env.TUSHARE_TOKEN || '';
  }

  private async request(apiName: string, params: Record<string, any> = {}, fields = ''): Promise<any[]> {
    if (!this.token) throw new Error('TUSHARE_TOKEN not configured');
    
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_name: apiName,
        token: this.token,
        params,
        fields,
      }),
    });
    
    const data = await res.json();
    if (data.code !== 0) throw new Error(data.msg || 'Tushare API error');
    
    const items = data.data?.items || [];
    const fieldNames = (data.data?.fields || '').split(',');
    
    return items.map((item: any[]) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((f: string, i: number) => { obj[f] = item[i]; });
      return obj;
    });
  }

  async getQuote(symbol: string): Promise<Quote> {
    const tsCode = this.toTsCode(symbol);
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    const [daily] = await this.request('daily', {
      ts_code: tsCode,
      start_date: today,
      end_date: today,
    });

    if (!daily) {
      const [last] = await this.request('daily', { ts_code: tsCode, limit: '1' });
      if (!last) throw new Error(`No data for ${symbol}`);
      return this.mapDailyToQuote(last, symbol);
    }

    return this.mapDailyToQuote(daily, symbol);
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const results = await Promise.allSettled(symbols.map(s => this.getQuote(s)));
    return results
      .filter((r): r is PromiseFulfilledResult<Quote> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  async getKline(symbol: string, period: KlinePeriod): Promise<Kline[]> {
    const tsCode = this.toTsCode(symbol);
    const periodDays: Record<string, number> = {
      '1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '5y': 1825, 'max': 36500,
    };
    
    const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const startDate = new Date(Date.now() - periodDays[period] * 86400000).toISOString().split('T')[0].replace(/-/g, '');
    
    const data = await this.request('daily', {
      ts_code: tsCode,
      start_date: startDate,
      end_date: endDate,
    });

    return data.map((d: any) => ({
      time: d.trade_date ? `${d.trade_date.slice(0, 4)}-${d.trade_date.slice(4, 6)}-${d.trade_date.slice(6, 8)}` : '',
      open: Number(d.open) || 0,
      high: Number(d.high) || 0,
      low: Number(d.low) || 0,
      close: Number(d.close) || 0,
      volume: Number(d.vol) || 0,
    })).reverse();
  }

  async getFinancials(symbol: string): Promise<Financials> {
    const tsCode = this.toTsCode(symbol);
    const [basic] = await this.request('daily_basic', { ts_code: tsCode, limit: '1' });
    
    return {
      symbol,
      peRatio: basic?.pe_ttm ?? undefined,
      pbRatio: basic?.pb ?? undefined,
      dividendYield: basic?.dv_ttm ?? undefined,
      marketCap: basic?.total_mv ? basic.total_mv * 10000 : undefined,
    };
  }

  async getNews(_symbol: string, _limit = 10): Promise<NewsItem[]> {
    return [];
  }

  async search(_query: string, _limit = 10): Promise<SearchResult[]> {
    return [];
  }

  private toTsCode(symbol: string): string {
    if (symbol.includes('.')) return symbol;
    if (symbol.startsWith('6')) return `${symbol}.SH`;
    return `${symbol}.SZ`;
  }

  private mapDailyToQuote(daily: any, symbol: string): Quote {
    return {
      symbol,
      name: symbol,
      price: Number(daily.close) || 0,
      change: (Number(daily.close) || 0) - (Number(daily.pre_close) || 0),
      changePercent: daily.pct_chg ?? 0,
      open: Number(daily.open) || 0,
      high: Number(daily.high) || 0,
      low: Number(daily.low) || 0,
      close: Number(daily.close) || 0,
      previousClose: Number(daily.pre_close) || 0,
      volume: Number(daily.vol) || 0,
      timestamp: daily.trade_date ? `${daily.trade_date.slice(0, 4)}-${daily.trade_date.slice(4, 6)}-${daily.trade_date.slice(6, 8)}T00:00:00Z` : new Date().toISOString(),
    };
  }
}
