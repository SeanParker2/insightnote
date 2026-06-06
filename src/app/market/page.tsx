import { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { StockDetail } from '@/components/market/StockDetail';
import { MarketOverview } from '@/components/market/MarketOverview';

export const metadata: Metadata = {
  title: '行情 | InsightNote',
};

export default async function MarketPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const symbol = typeof params?.symbol === 'string' ? params.symbol : null;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="行情"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: symbol ? symbol : '行情' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {symbol ? <StockDetail symbol={symbol} /> : <MarketOverview />}
      </div>
    </div>
  );
}
