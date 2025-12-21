'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-sm font-bold uppercase tracking-widest text-slate-400">错误</div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">页面暂时不可用</h1>
        <p className="mt-3 text-sm text-slate-600">可能是网络或服务暂时不可用。你可以重试，或稍后再回来。</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => reset()}>重试</Button>
          <Button asChild variant="outline">
            <Link href="/">返回首页</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/feedback">提交反馈</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

