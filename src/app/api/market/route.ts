import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { marketData as mockData } from '@/lib/mock/market.mock';

export const revalidate = 60; // Cache client-side requests for 60s

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 尝试从数据库获取最新行情
    const { data: dbData, error } = await supabase
      .from('market_prices')
      .select('*');

    if (error || !dbData || dbData.length === 0) {
      // 如果数据库为空或出错，降级使用 Mock 数据
      console.warn('Market data fetch failed or empty, using mock data:', error);
      return NextResponse.json({
        items: mockData,
        source: 'mock'
      });
    }

    // 格式化为前端组件需要的格式
    // DB Format: { symbol: '000001.SS', name: '上证指数', price: 3200.5, change_percent: 1.2, ... }
    // UI Format: { symbol: '上证指数', value: '3,200.50', change: '+1.20%', isUp: true }
    
    const items = dbData.map((item: any) => {
      const isUp = item.change_percent >= 0;
      const sign = isUp ? '+' : '';
      
      return {
        symbol: item.name, // 前端组件的 "symbol" 其实显示的是名称 (如 "上证指数")
        value: Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        change: `${sign}${Number(item.change_percent).toFixed(2)}%`,
        isUp: isUp
      };
    });

    return NextResponse.json({
      items,
      source: 'database',
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      items: mockData,
      source: 'mock-fallback'
    });
  }
}
