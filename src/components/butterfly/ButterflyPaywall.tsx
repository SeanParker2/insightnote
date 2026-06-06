'use client';

import { useRouter } from 'next/navigation';

interface ButterflyPaywallProps {
  slug: string | null;
  hasUser: boolean;
  postIsPremium: boolean;
}

export function ButterflyPaywall({ slug, hasUser, postIsPremium }: ButterflyPaywallProps) {
  const router = useRouter();

  const loginHref = slug ? `/login?next=${encodeURIComponent(`/tools/butterfly?slug=${slug}`)}` : '/login';
  const pricingHref = slug ? `/pricing?next=${encodeURIComponent(`/tools/butterfly?slug=${slug}`)}` : '/pricing';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 px-6">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-black/70 p-6 text-center">
        <div className="text-brand-gold font-bold tracking-widest text-sm mb-2">访问受限</div>
        <div className="text-white text-base font-semibold mb-2">该图谱对应 Pro 内容</div>
        <div className="text-gray-300 text-sm leading-relaxed mb-5">
          {hasUser ? '开通或续费 Pro 后可立即查看完整图谱。' : '登录后可校验账号权益并查看可访问的图谱。'}
        </div>
        <button
          className="w-full h-10 rounded-md bg-brand-gold text-black font-bold"
          onClick={() => router.push(hasUser ? pricingHref : loginHref)}
        >
          {hasUser ? '查看开通方式' : '登录后继续'}
        </button>
      </div>
    </div>
  );
}
