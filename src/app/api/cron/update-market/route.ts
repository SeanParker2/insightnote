import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { timingSafeCompare } from '@/lib/crypto';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY?.trim() ?? '';

// 关注列表映射 (Internal Symbol -> Alpha Vantage Symbol)
const SYMBOL_MAPPING: Record<string, string> = {
  '000001.SS': '000001.SH', // 上证指数
  '399001.SZ': '399001.SZ', // 深证成指
  '600519.SS': '600519.SH', // 贵州茅台
  '300750.SZ': '300750.SZ', // 宁德时代
  '0700.HK':   '0700.HK',   // 腾讯控股
  'CNY=X':     'USDCNY'     // 美元兑人民币 (Special case)
};

const NAME_MAPPING: Record<string, string> = {
  '000001.SS': '上证指数',
  '399001.SZ': '深证成指',
  '600519.SS': '贵州茅台',
  '300750.SZ': '宁德时代',
  '0700.HK':   '腾讯控股',
  'CNY=X':     '美元/人民币'
};

// 检查 A 股交易时间 (UTC+8 09:30-11:30, 13:00-15:00)
// Vercel Server 默认为 UTC 时间，所以我们需要转换
// UTC+8 09:30 = UTC 01:30
// UTC+8 11:30 = UTC 03:30
// UTC+8 13:00 = UTC 05:00
// UTC+8 15:00 = UTC 07:00
function isAShareTradingTime() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 is Sunday, 6 is Saturday
  
  // 周末不交易
  if (day === 0 || day === 6) return false;

  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const time = hour * 60 + minute; // Minutes from UTC 00:00

  // 01:30 (90 min) - 03:30 (210 min)
  // 05:00 (300 min) - 07:00 (420 min)
  
  const isMorningSession = time >= 90 && time <= 210;
  const isAfternoonSession = time >= 300 && time <= 420;

  return isMorningSession || isAfternoonSession;
}

async function fetchQuote(symbol: string) {
  // 处理外汇
  if (symbol === 'USDCNY') {
    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=CNY&apikey=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const rate = data['Realtime Currency Exchange Rate'];
    
    if (!rate) return null;
    
    return {
      price: parseFloat(rate['5. Exchange Rate']),
      change_percent: 0, // Alpha Vantage 实时汇率接口不直接提供涨跌幅，暂置为 0
    };
  }

  // 处理股票/指数
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const quote = data['Global Quote'];

  if (!quote || !quote['05. price']) return null;

  return {
    price: parseFloat(quote['05. price']),
    change_percent: parseFloat(quote['10. change percent'].replace('%', '')),
  };
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim() ?? '';
  if (!cronSecret) {
    return new Response('Server misconfigured', { status: 500 });
  }
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !timingSafeCompare(token, cronSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!API_KEY) {
    return NextResponse.json({ success: false, error: 'ALPHA_VANTAGE_API_KEY not configured' }, { status: 500 });
  }

  // 2. 检查交易时间 (A股时段)
  // 如果不在交易时间，直接跳过刷新，返回缓存状态（或直接结束）
  if (!isAShareTradingTime()) {
    return NextResponse.json({ 
      success: true, 
      message: 'Market closed, skipped refresh.',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const symbols = Object.keys(SYMBOL_MAPPING);
    const updates = [];

    // 3. 串行或并发获取数据 (Alpha Vantage 免费/标准 Key 可能有并发限制，建议适度控制)
    // 这里使用 Promise.all，如果遇到速率限制可能需要改为串行
    const results = await Promise.all(
      symbols.map(async (key) => {
        const avSymbol = SYMBOL_MAPPING[key];
        try {
          const data = await fetchQuote(avSymbol);
          if (data) {
            return {
              symbol: key, // Keep internal symbol (e.g. 000001.SS) for consistency
              name: NAME_MAPPING[key],
              price: data.price,
              change_percent: data.change_percent,
              updated_at: new Date().toISOString()
            };
          }
        } catch (e) {
          console.error(`Failed to fetch ${key}:`, e);
        }
        return null;
      })
    );

    const validUpdates = results.filter(item => item !== null) as any[];

    if (validUpdates.length > 0) {
      // 4. 存入 Supabase
      const supabase = await createClient();
      const { error } = await supabase
        .from('market_prices')
        .upsert(validUpdates, { onConflict: 'symbol' });

      if (error) throw error;
    }

    return NextResponse.json({ success: true, count: validUpdates.length, data: validUpdates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
