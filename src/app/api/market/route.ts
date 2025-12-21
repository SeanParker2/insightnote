import { NextResponse } from 'next/server';

export const revalidate = 60;

type MarketItem = {
  symbol: string;
  value: string;
  change: string;
  isUp: boolean;
};

type MissingItem = {
  symbol: string;
  reason: string;
};

function toSignedPercent(value: number) {
  if (!Number.isFinite(value)) return null;
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

function parseCsvLines(csv: string) {
  return csv
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDailyCloseChangeFromCsv(csv: string, closeIndex: number) {
  const lines = parseCsvLines(csv);
  if (lines.length < 2) return null;

  const closes: number[] = [];
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]!;
    const parts = line.split(',');
    if (parts.length <= closeIndex) continue;
    const close = Number(parts[closeIndex]);
    if (!Number.isFinite(close)) continue;
    closes.push(close);
    if (closes.length >= 2) break;
  }

  if (closes.length < 2) return null;
  const lastClose = closes[0]!;
  const prevClose = closes[1]!;
  if (prevClose === 0) return null;
  const changePercent = ((lastClose - prevClose) / prevClose) * 100;
  return { lastClose, prevClose, changePercent };
}

function parseStooqQuoteChange(csv: string) {
  const lines = parseCsvLines(csv);
  if (lines.length < 2) return null;
  const last = lines[lines.length - 1]!;
  const parts = last.split(',');
  if (parts.length < 9) return null;
  const close = Number(parts[6]);
  const prev = Number(parts[8]);
  if (!Number.isFinite(close) || !Number.isFinite(prev) || prev === 0) return null;
  const changePercent = ((close - prev) / prev) * 100;
  return { lastClose: close, prevClose: prev, changePercent };
}

function parseCboeVixDailyChange(csv: string) {
  return parseDailyCloseChangeFromCsv(csv, 4);
}

function parseTreasury10yRates(xml: string) {
  const entries: Array<{ date: string; value: number }> = [];
  const dateRe = /<d:NEW_DATE[^>]*>(\d{4}-\d{2}-\d{2})T/gi;
  const valueRe = /<d:BC_10YEAR[^>]*>(-?\d+(?:\.\d+)?)<\/d:BC_10YEAR>/gi;

  const dates: string[] = [];
  let dm: RegExpExecArray | null = null;
  while ((dm = dateRe.exec(xml))) dates.push(dm[1]!);

  const values: number[] = [];
  let vm: RegExpExecArray | null = null;
  while ((vm = valueRe.exec(xml))) values.push(Number(vm[1]));

  const count = Math.min(dates.length, values.length);
  for (let i = 0; i < count; i += 1) {
    const date = dates[i]!;
    const value = values[i]!;
    if (date && Number.isFinite(value)) entries.push({ date, value });
  }

  const byDate = new Map<string, number>();
  for (const row of entries) byDate.set(row.date, row.value);
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function monthKey(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTextWithRetry(
  url: string,
  opts: { revalidateSeconds: number; timeoutMs: number; retries: number },
): Promise<string | null> {
  const { revalidateSeconds, timeoutMs, retries } = opts;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { next: { revalidate: revalidateSeconds }, signal: controller.signal });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const text = await res.text();
      const trimmed = typeof text === 'string' ? text.trim() : '';
      if (!trimmed) throw new Error('empty_body');
      return trimmed;
    } catch {
      if (attempt >= retries) return null;
      await sleep(250 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

export async function GET() {
  const items: MarketItem[] = [];
  const missing: MissingItem[] = [];

  const revalidateSeconds = 60;
  const timeoutMs = 6000;
  const retries = 2;

  const tasks = [
    (async () => {
      try {
        const csv = await fetchTextWithRetry('https://stooq.com/q/l/?s=%5Espx&f=sd2t2ohlcvp&h&e=csv', {
          revalidateSeconds,
          timeoutMs,
          retries,
        });
        if (!csv) {
          missing.push({ symbol: 'S&P 500', reason: 'Stooq 行情请求失败' });
          return;
        }
        const parsed = parseStooqQuoteChange(csv);
        if (!parsed) {
          missing.push({ symbol: 'S&P 500', reason: 'Stooq 行情解析失败' });
          return;
        }
        const signed = toSignedPercent(parsed.changePercent);
        if (!signed) {
          missing.push({ symbol: 'S&P 500', reason: 'Stooq 未返回可用涨跌幅' });
          return;
        }
        items.push({ symbol: 'S&P 500', value: formatNumber(parsed.lastClose, 2), change: signed, isUp: parsed.changePercent >= 0 });
      } catch {
        missing.push({ symbol: 'S&P 500', reason: 'Stooq 行情不可达' });
      }
    })(),
    (async () => {
      try {
        const csv = await fetchTextWithRetry('https://stooq.com/q/l/?s=%5Endq&f=sd2t2ohlcvp&h&e=csv', {
          revalidateSeconds,
          timeoutMs,
          retries,
        });
        if (!csv) {
          missing.push({ symbol: 'NASDAQ', reason: 'Stooq 行情请求失败' });
          return;
        }
        const parsed = parseStooqQuoteChange(csv);
        if (!parsed) {
          missing.push({ symbol: 'NASDAQ', reason: 'Stooq 行情解析失败' });
          return;
        }
        const signed = toSignedPercent(parsed.changePercent);
        if (!signed) {
          missing.push({ symbol: 'NASDAQ', reason: 'Stooq 未返回可用涨跌幅' });
          return;
        }
        items.push({ symbol: 'NASDAQ', value: formatNumber(parsed.lastClose, 2), change: signed, isUp: parsed.changePercent >= 0 });
      } catch {
        missing.push({ symbol: 'NASDAQ', reason: 'Stooq 行情不可达' });
      }
    })(),
    (async () => {
      try {
        const xmlUrl = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${monthKey(new Date())}`;
        let xml = await fetchTextWithRetry(xmlUrl, { revalidateSeconds, timeoutMs: 9000, retries });
        if (!xml) {
          missing.push({ symbol: 'US 10Y', reason: 'Treasury 利率数据请求失败' });
          return;
        }
        let rows = parseTreasury10yRates(xml);

        if (rows.length < 2) {
          const prevMonthDate = new Date();
          prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1);
          const prevUrl = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${monthKey(prevMonthDate)}`;
          const prevXml = await fetchTextWithRetry(prevUrl, { revalidateSeconds, timeoutMs: 9000, retries });
          if (prevXml) rows = [...parseTreasury10yRates(prevXml), ...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        }

        if (rows.length < 2) {
          missing.push({ symbol: 'US 10Y', reason: 'Treasury 未返回足够的日度数据' });
          return;
        }

        const latest = rows[rows.length - 1]!;
        const prev = rows[rows.length - 2]!;
        const bp = (latest.value - prev.value) * 100;
        const sign = bp >= 0 ? '+' : '';
        items.push({ symbol: 'US 10Y', value: `${latest.value.toFixed(2)}%`, change: `${sign}${bp.toFixed(1)}bp`, isUp: bp >= 0 });
      } catch {
        missing.push({ symbol: 'US 10Y', reason: 'Treasury 利率数据不可达' });
      }
    })(),
    (async () => {
      try {
        const csv = await fetchTextWithRetry('https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv', {
          revalidateSeconds,
          timeoutMs,
          retries,
        });
        if (!csv) {
          missing.push({ symbol: 'VIX', reason: 'CBOE 行情请求失败' });
          return;
        }
        const parsed = parseCboeVixDailyChange(csv);
        if (!parsed) {
          missing.push({ symbol: 'VIX', reason: 'CBOE 行情解析失败' });
          return;
        }
        const signed = toSignedPercent(parsed.changePercent);
        if (!signed) {
          missing.push({ symbol: 'VIX', reason: 'CBOE 未返回可用涨跌幅' });
          return;
        }
        items.push({ symbol: 'VIX', value: formatNumber(parsed.lastClose, 2), change: signed, isUp: parsed.changePercent >= 0 });
      } catch {
        missing.push({ symbol: 'VIX', reason: 'CBOE 行情不可达' });
      }
    })(),
    (async () => {
      try {
        const csv = await fetchTextWithRetry('https://stooq.com/q/l/?s=xauusd&f=sd2t2ohlcvp&h&e=csv', {
          revalidateSeconds,
          timeoutMs,
          retries,
        });
        if (!csv) {
          missing.push({ symbol: 'Gold', reason: 'Stooq 行情请求失败' });
          return;
        }
        const parsed = parseStooqQuoteChange(csv);
        if (!parsed) {
          missing.push({ symbol: 'Gold', reason: 'Stooq 行情解析失败' });
          return;
        }
        const signed = toSignedPercent(parsed.changePercent);
        if (!signed) {
          missing.push({ symbol: 'Gold', reason: 'Stooq 未返回可用涨跌幅' });
          return;
        }
        items.push({ symbol: 'Gold', value: formatNumber(parsed.lastClose, 2), change: signed, isUp: parsed.changePercent >= 0 });
      } catch {
        missing.push({ symbol: 'Gold', reason: 'Stooq 行情不可达' });
      }
    })(),
  ];

  await Promise.all(tasks);

  const order = ['S&P 500', 'NASDAQ', 'US 10Y', 'VIX', 'Gold'];
  const orderIndex = new Map(order.map((k, i) => [k, i]));
  items.sort((a, b) => (orderIndex.get(a.symbol) ?? 999) - (orderIndex.get(b.symbol) ?? 999));
  missing.sort((a, b) => (orderIndex.get(a.symbol) ?? 999) - (orderIndex.get(b.symbol) ?? 999));

  const status = items.length === 0 ? 502 : 200;
  return NextResponse.json({ items, missing, source: 'stooq_treasury_cboe', updated_at: new Date().toISOString() }, { status });
}
