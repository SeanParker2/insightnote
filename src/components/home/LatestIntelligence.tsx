import { memo } from 'react';
import { Post } from '@/lib/types';
import { Playfair_Display } from '@/lib/fonts';
import { Lock } from 'lucide-react';
import Link from 'next/link';

const playfair = Playfair_Display({ subsets: ['latin'] });

interface LatestIntelligenceProps {
  posts: Post[];
}

export const LatestIntelligence = memo(({ posts }: LatestIntelligenceProps) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-sm">
        暂无更多文章
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center pb-2 border-b border-black">
        <h3 className="font-bold text-sm tracking-widest uppercase">Latest Intelligence</h3>
        <span className="text-xs font-bold text-amber-500 hover:text-brand-900 transition-colors cursor-pointer">View All →</span>
      </div>

      {posts.map((post) => (
        <Link href={`/posts/${post.slug}`} key={post.id}>
          <div 
            className={`group cursor-pointer ${post.is_premium ? 'opacity-90 hover:opacity-100 transition duration-300' : ''}`}
          >
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3 text-right pt-1">
                <span className="block text-xs font-bold text-slate-900">
                  {new Date(post.published_at).toLocaleDateString()}
                </span>
                {post.tags && post.tags.length > 0 && (
                  <span className="block text-[10px] text-slate-400 uppercase mt-1">
                    {post.tags[0]}
                  </span>
                )}
                {post.is_premium && (
                  <span className="inline-block mt-1 border border-brand-900 text-brand-900 text-[9px] font-bold px-1 py-px uppercase">
                    Pro Only
                  </span>
                )}
              </div>
              
              <div className="col-span-9 border-l border-solid border-gray-200 pl-6 relative">
                {!post.is_premium && (
                  <div className="absolute -left-[3px] top-2 w-[5px] h-[5px] rounded-full bg-slate-300 group-hover:bg-amber-500 transition"></div>
                )}
                
                <h4 className={`${playfair.className} text-xl font-bold text-slate-900 mb-2 group-hover:text-brand-900/80 flex items-center gap-2`}>
                  {post.is_premium && <Lock className="w-4 h-4 text-slate-400" />}
                  {post.title}
                </h4>
                
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                  {post.tldr_content}
                </p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
});

LatestIntelligence.displayName = 'LatestIntelligence';
