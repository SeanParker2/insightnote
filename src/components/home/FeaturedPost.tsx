import { memo } from 'react';
import { PostListItem } from '@/types';
import { Playfair_Display } from '@/lib/fonts';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { formatDateCN, uiTerms } from '@/lib/utils';

const playfair = Playfair_Display({ subsets: ['latin'] });

interface FeaturedPostProps {
  post: PostListItem;
}

export const FeaturedPost = memo(({ post }: FeaturedPostProps) => {
  return (
    <article className="mb-12 pb-12 border-b border-solid border-gray-200 group">
      <TrackedLink
        href={`/posts/${post.slug}`}
        className="block cursor-pointer"
        eventName="home_featured_post_click"
        eventPayload={{ slug: post.slug, is_premium: post.is_premium, source_institution: post.source_institution }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
            {post.source_institution}
          </span>
        </div>
        
        <h2 className={`${playfair.className} text-4xl leading-tight font-bold text-slate-900 mb-4 group-hover:text-amber-600 transition-colors duration-200`}>
          {post.title}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className={`${playfair.className} text-lg text-slate-600 leading-relaxed text-justify line-clamp-3`}>
              {post.summary_tldr || '暂无摘要'}
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs text-slate-400 font-medium">
              <span>作者：<span className="text-slate-900">{uiTerms.insightNoteResearch}</span></span>
              <span>•</span>
              <span>{formatDateCN(post.published_at)}</span>
            </div>
          </div>
          
          {/* Visualization Placeholder */}
          <div className="bg-slate-50 border border-solid border-gray-200 p-4 flex flex-col justify-between min-h-[160px]">
            <div className="text-[10px] uppercase text-slate-400 font-bold">公用事业板块 vs S&P 500（年初至今）</div>
            <div className="h-24 flex items-end gap-1 mt-2">
              {[40, 65, 45, 80, 55, 90, 70, 85].map((height, i) => (
                <div key={i} className="w-full bg-amber-500/20 h-full relative">
                  <div 
                    className="absolute bottom-0 w-full bg-amber-500 transition-all duration-500" 
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
              ))}
            </div>
            <div className="text-right text-xs font-bold text-amber-500 mt-2">+12.4% 跑赢</div>
          </div>
        </div>
      </TrackedLink>
    </article>
  );
});

FeaturedPost.displayName = 'FeaturedPost';
