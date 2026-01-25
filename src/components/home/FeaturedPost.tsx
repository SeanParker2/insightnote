import { memo } from 'react';
import { PostListItem } from '@/types';
import { Playfair_Display } from '@/lib/fonts';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { formatDateCN } from '@/lib/utils';
import Image from 'next/image';

const playfair = Playfair_Display({ subsets: ['latin'] });

interface FeaturedPostProps {
  post: PostListItem;
  heroImage?: string;
}

export const FeaturedPost = memo(({ post, heroImage = '/images/hero-bg.jpg' }: FeaturedPostProps) => {
  return (
    <article className="relative mb-16 group overflow-hidden rounded-2xl shadow-2xl">
      <TrackedLink
        href={`/posts/${post.slug}`}
        className="block cursor-pointer relative h-[600px] w-full"
        eventName="home_featured_post_click"
        eventPayload={{ slug: post.slug, is_premium: post.is_premium, source_institution: post.source_institution }}
      >
        {/* Hero Background Image */}
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 flex flex-col gap-6">
          <div className="flex items-center gap-3 text-sm font-medium text-white/80">
            <span className="uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded backdrop-blur-sm border border-emerald-400/20">
              {post.source_institution || '精选研报'}
            </span>
            <span>•</span>
            <span>{formatDateCN(post.published_at)}</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white text-balance drop-shadow-lg max-w-4xl">
            {post.title}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-5xl">
            <div className="md:col-span-2">
              <p className="text-lg md:text-xl text-slate-200 leading-relaxed text-pretty line-clamp-3 drop-shadow-md">
                {post.summary_tldr || '暂无摘要。'}
              </p>
              
              <div className="mt-8 flex items-center gap-3 group/btn">
                <span className="bg-white text-black px-6 py-3 rounded-full font-semibold text-sm hover:bg-emerald-400 hover:text-white transition-colors duration-300">
                  阅读深度分析
                </span>
              </div>
            </div>

            {/* Minimalist Data Visualization (Overlay) */}
            <div className="hidden md:block md:col-span-1">
               <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-6">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">市场影响</div>
                  <div className="flex items-end gap-2 mb-4">
                     <span className="text-4xl font-bold text-white tabular-nums">+12.4%</span>
                     <span className="text-emerald-400 text-sm font-medium mb-1">↑ 年初至今</span>
                  </div>
                  <div className="h-16 flex items-end gap-1">
                    {[40, 65, 45, 80, 55, 90, 70, 85].map((height, i) => (
                      <div key={i} className="flex-1 bg-emerald-500/80 h-full relative rounded-t-sm overflow-hidden">
                        <div 
                          className="absolute top-0 w-full bg-white/20 transition-all duration-500 group-hover:bg-emerald-400" 
                          style={{ height: `${100 - height}%` }}
                        ></div>
                      </div>
                    ))}
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
