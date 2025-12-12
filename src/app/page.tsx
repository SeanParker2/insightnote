import { MarketTicker } from '@/components/home/MarketTicker';
import { FeaturedPost } from '@/components/home/FeaturedPost';
import { LatestIntelligence } from '@/components/home/LatestIntelligence';
import { SidebarTool } from '@/components/home/SidebarTool';
import { marketData } from '@/lib/mock/market.mock';
import { butterflyEffects, editorPicks } from '@/lib/mock/tools.mock';
import { createClient } from '@/lib/supabase/server';
import { Post } from '@/lib/types';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  const supabase = await createClient();
  
  // Fetch posts from Supabase
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    // You might want to show an error message or fallback UI here
  }

  const allPosts = (posts as Post[]) || [];
  const featuredPost = allPosts.length > 0 ? allPosts[0] : null;
  const latestPosts = allPosts.length > 1 ? allPosts.slice(1) : [];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* 1. Market Ticker */}
      <MarketTicker data={marketData} />
      
      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-12 gap-10">
        
        {/* Left Column (8/12) */}
        <div className="col-span-12 lg:col-span-8">
          
          {/* 2. Featured Post (Hero) */}
          {featuredPost ? (
            <FeaturedPost post={featuredPost} />
          ) : (
            <div className="mb-12 pb-12 border-b border-solid border-gray-200 text-center text-slate-500">
              Loading insights...
            </div>
          )}
          
          {/* 3. Latest Intelligence (Feed) */}
          <LatestIntelligence posts={latestPosts} />
          
        </div>

        {/* Right Column (4/12) - Sidebar */}
        {/* 4. Sidebar Tools */}
        <SidebarTool 
          butterflyEffects={butterflyEffects} 
          editorPicks={editorPicks} 
        />
        
      </main>
    </div>
  );
}
