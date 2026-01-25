import { memo } from 'react';
import { PostListItem } from '@/types';
import { playfair } from '@/lib/fonts';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { formatDateCN } from '@/lib/utils';
import { PredictionBadge } from '@/components/predictions/PredictionBadge';
import Image from 'next/image';

interface FeaturedPostProps {
  post: PostListItem;
  heroImage?: string;
}

export const FeaturedPost = memo(({ post, heroImage = '/images/hero-bg.jpg' }: FeaturedPostProps) => {
  return (
    <article className="relative mb-16 group overflow-hidden rounded-xl shadow-2xl border border-slate-800 bg-slate-950">
      <TrackedLink
        href={`/posts/${post.slug}`}
        className="block cursor-pointer relative h-[500px] w-full"
        eventName="home_featured_post_click"
        eventPayload={{ slug: post.slug, is_premium: post.is_premium, source_institution: post.source_institution }}
      >
        {/* Hero Background Image */}
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent opacity-90" />
          <div className="absolute inset-0 bg-linear-to-r from-black/80 via-transparent to-transparent opacity-80" />
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 p-8 md:p-16 flex flex-col justify-end md:justify-center h-full">
          <div className="max-w-4xl space-y-8 z-10">
            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-white/80 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              <span className="uppercase tracking-widest font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full backdrop-blur-md border border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                {post.source_institution || '核心研报'}
              </span>
              {post.predictions && post.predictions.length > 0 && (
                <PredictionBadge prediction={post.predictions[0]} />
              )}
              <span className="text-white/60">•</span>
              <span className="font-mono tracking-wide text-white/80">{formatDateCN(post.published_at)}</span>
            </div>
            
            {/* Title */}
            <h2 className="text-4xl md:text-7xl font-bold tracking-tight text-white text-balance drop-shadow-2xl leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              {post.title}
            </h2>
            
            {/* Summary & Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-end pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <div className="lg:col-span-2 space-y-8">
                <p className="text-lg md:text-xl text-slate-300 leading-relaxed text-pretty line-clamp-3 border-l-2 border-emerald-500/50 pl-6">
                  {post.summary_tldr || '暂无摘要。'}
                </p>
                
                <div className="flex items-center gap-4 group/btn">
                  <button className="relative overflow-hidden bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm px-8 py-3 rounded transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(234,88,12,0.5)]">
                    <span className="relative z-10 flex items-center gap-2">
                      阅读深度分析
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </span>
                  </button>
                </div>
              </div>

              {/* Minimalist Data Visualization (Overlay) */}
              <div className="hidden lg:block lg:col-span-1">
                 <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg p-6 hover:bg-slate-900/90 transition-colors duration-500 group/chart">
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono">市场影响</div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-6">
                       <span className="text-4xl font-bold text-white tracking-tighter tabular-nums font-mono">+12.4%</span>
                       <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">↑ 年初至今</span>
                    </div>
                    <div className="h-24 flex items-end gap-1">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95].map((height, i) => (
                        <div key={i} className="flex-1 bg-slate-800/50 h-full relative overflow-hidden">
                          <div 
                            className="absolute bottom-0 w-full bg-emerald-500 transition-all duration-700 ease-out group-hover/chart:bg-emerald-400" 
                            style={{ 
                              height: `${height}%`,
                              transitionDelay: `${i * 50}ms`
                            }}
                          ></div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </TrackedLink>
    </article>
  );
});

FeaturedPost.displayName = 'FeaturedPost';
