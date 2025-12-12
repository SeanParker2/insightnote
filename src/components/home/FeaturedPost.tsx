import { memo } from 'react';
import { Post } from '@/lib/types';
import { Playfair_Display } from '@/lib/fonts';
import Link from 'next/link';

const playfair = Playfair_Display({ subsets: ['latin'] });

interface FeaturedPostProps {
  post: Post;
}

export const FeaturedPost = memo(({ post }: FeaturedPostProps) => {
  // Truncate summary if too long
  const summary = post.tldr_content.length > 150 
    ? `${post.tldr_content.substring(0, 150)}...` 
    : post.tldr_content;

  return (
    <article className="mb-12 pb-12 border-b border-solid border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        {/* We can use tags or is_premium to show a badge if needed, strictly following user request to replace variables */}
        <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
          {post.institutional_source}
        </span>
      </div>
      
      <Link href={`/posts/${post.slug}`}>
        <h2 className={`${playfair.className} text-4xl leading-tight font-bold text-slate-900 mb-4 hover:underline decoration-amber-500 underline-offset-4 cursor-pointer`}>
          {post.title}
        </h2>
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className={`${playfair.className} text-lg text-slate-600 leading-relaxed text-justify`}>
            {summary}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-400 font-medium">
            <span>By <span className="text-slate-900 uppercase">InsightNote Research</span></span>
            <span>•</span>
            <span>{new Date(post.published_at).toLocaleDateString()}</span>
          </div>
        </div>
        
        {/* Visualization Placeholder - Keeping static as per original design for now, or could be dynamic later */}
        <div className="bg-slate-50 border border-solid border-gray-200 p-4 flex flex-col justify-between min-h-[160px]">
          <div className="text-[10px] uppercase text-slate-400 font-bold">Utilities Sector vs S&P 500 (YTD)</div>
          <div className="h-24 flex items-end gap-1 mt-2">
            {[40, 65, 45, 80, 55, 90, 70, 85].map((height, i) => (
              <div key={i} className="w-full bg-amber-500/20 h-full relative group">
                <div 
                  className="absolute bottom-0 w-full bg-amber-500 transition-all duration-500" 
                  style={{ height: `${height}%` }}
                ></div>
              </div>
            ))}
          </div>
          <div className="text-right text-xs font-bold text-amber-500 mt-2">+12.4% Outperformance</div>
        </div>
      </div>
    </article>
  );
});

FeaturedPost.displayName = 'FeaturedPost';
