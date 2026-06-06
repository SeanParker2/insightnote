'use client';

import { DailyDashboard } from '@/components/daily/DailyDashboard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Sun } from 'lucide-react';

export default function DailyPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="每日助手"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '每日助手' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <DailyDashboard />
      </div>
    </div>
  );
}
