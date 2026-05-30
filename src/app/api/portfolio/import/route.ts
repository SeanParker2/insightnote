import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

interface CsvRow {
  symbol: string;
  name?: string;
  quantity: number;
  avg_cost: number;
  currency?: string;
  asset_class?: string;
  sector?: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < 3) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });

    const symbol = (row.symbol ?? row.code ?? row.ticker ?? '').trim().toUpperCase();
    const quantity = parseFloat(row.quantity ?? row.shares ?? row.amount ?? '0');
    const avgCost = parseFloat(row.avg_cost ?? row.cost ?? row.price ?? row.average_cost ?? '0');

    if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(avgCost) || avgCost <= 0) {
      continue;
    }

    rows.push({
      symbol,
      name: (row.name ?? row.stock_name ?? '').trim() || undefined,
      quantity,
      avg_cost: avgCost,
      currency: (row.currency ?? 'CNY').trim() || 'CNY',
      asset_class: (row.asset_class ?? row.type ?? 'stock').trim() || 'stock',
      sector: (row.sector ?? row.industry ?? '').trim() || undefined,
    });
  }

  return rows;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit(`import:${ip}`, { windowMs: 300_000, max: 3 });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const csvText = typeof body.csv === 'string' ? body.csv : '';
  const portfolioId = typeof body.portfolio_id === 'string' ? body.portfolio_id : null;

  if (!csvText.trim()) {
    return NextResponse.json({ ok: false, error: 'empty_csv' }, { status: 400 });
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_valid_rows', message: '无法解析有效的持仓数据。请确保 CSV 包含 symbol, quantity, avg_cost 列。' }, { status: 400 });
  }

  // Get or create default portfolio
  let targetPortfolioId = portfolioId;
  if (!targetPortfolioId) {
    const { data: existing } = await supabase
      .from('user_portfolios')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('is_default', true)
      .maybeSingle();

    if (existing) {
      targetPortfolioId = existing.id;
    } else {
      const { data: created } = await supabase
        .from('user_portfolios')
        .insert({ user_id: userData.user.id, name: '默认组合', is_default: true })
        .select('id')
        .single();
      targetPortfolioId = created?.id ?? null;
    }
  }

  if (!targetPortfolioId) {
    return NextResponse.json({ ok: false, error: 'no_portfolio' }, { status: 500 });
  }

  // Verify ownership
  const { data: portfolio } = await supabase
    .from('user_portfolios')
    .select('id')
    .eq('id', targetPortfolioId)
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!portfolio) {
    return NextResponse.json({ ok: false, error: 'portfolio_not_found' }, { status: 404 });
  }

  // Batch insert
  const insertRows = rows.map((r) => ({
    portfolio_id: targetPortfolioId,
    symbol: r.symbol,
    name: r.name ?? null,
    quantity: r.quantity,
    avg_cost: r.avg_cost,
    currency: r.currency ?? 'CNY',
    asset_class: r.asset_class ?? 'stock',
    sector: r.sector ?? null,
  }));

  const { data, error } = await supabase
    .from('portfolio_holdings')
    .insert(insertRows)
    .select();

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      imported: data?.length ?? 0,
      portfolio_id: targetPortfolioId,
      holdings: data,
    },
  });
}
