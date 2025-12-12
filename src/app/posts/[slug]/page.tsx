import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Playfair_Display } from '@/lib/fonts';
import { Calendar, Share2, Download, User as UserIcon, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarkdownContent } from '@/components/post/MarkdownContent';
import { createClient } from '@/lib/supabase/server';
import { Post } from '@/lib/types';
import { ButterflyNode } from '@/types';
import { canAccessContent } from '@/lib/auth';
import { Profile } from '@/types';
import Link from 'next/link';

const playfair = Playfair_Display({ subsets: ['latin'] });

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = await createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('title, tldr_content')
    .eq('slug', params.slug)
    .single();

  if (!post) return { title: 'Post Not Found' };
  
  return {
    title: `${post.title} | InsightNote`,
    description: post.tldr_content,
  };
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();

  // 1. Fetch Post Data
  const { data: rawPost, error: postError } = await supabase
    .from('posts')
    .select(`
      id,
      slug,
      title,
      tldr_content,
      full_content,
      institutional_source,
      report_date,
      published_at,
      is_premium,
      tags,
      butterfly_nodes(*)
    `)
    .eq('slug', params.slug)
    .single();

  // Handle 404
  if (postError || !rawPost) {
    console.error('Post not found or DB error:', postError);
    notFound(); 
  }
  
  // Cast to Post type (DB columns match Post interface)
  // We include butterfly_nodes in the fetch but Post type might not have it unless we extend it
  const post = rawPost as unknown as (Post & { butterfly_nodes?: ButterflyNode[] });

  // 2. Fetch User & Profile
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = null;
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id) // Assuming profile id matches user id
      .single();
    profile = profileData;
  }

  // 3. Access Control Logic
  const canAccess = canAccessContent(profile as Profile | null, post);

  return (
    <div className="min-h-screen bg-white pb-20">
      
      {/* Sticky Navigation Bar */}
      <nav className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className={`font-serif font-bold text-lg text-brand-900 truncate max-w-[50%] ${playfair.className} hover:text-brand-gold transition-colors`}>
            ← Back to Intelligence
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-brand-900 uppercase text-xs font-bold tracking-wider">
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-brand-900 uppercase text-xs font-bold tracking-wider">
              <Download className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Main Content Column (70%) */}
        <main className="lg:col-span-8">
          
          {/* Header Section */}
          <header className="mb-10 text-center lg:text-left">
            <div className="flex flex-wrap items-center gap-2 mb-6 justify-center lg:justify-start">
              {post.tags?.map(tag => (
                <Badge key={tag} variant="outline" className="border-brand-gold/30 text-brand-gold/80 bg-brand-gold/5 uppercase text-[10px] tracking-widest px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <h1 className={`${playfair.className} text-3xl md:text-5xl font-bold leading-tight text-brand-900 mb-6`}>
              {post.title}
            </h1>
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-3 gap-4 py-6 border-y border-slate-100 mb-8">
              <div className="text-center lg:text-left border-r border-slate-100 last:border-0 px-4 first:pl-0">
                <div className="flex items-center justify-center lg:justify-start gap-2 text-[10px] font-bold uppercase text-slate-400 mb-1">
                  <Building2 className="w-3 h-3" /> Source
                </div>
                <div className="text-sm font-bold text-slate-900">{post.institutional_source}</div>
              </div>
              <div className="text-center lg:text-left border-r border-slate-100 last:border-0 px-4">
                <div className="flex items-center justify-center lg:justify-start gap-2 text-[10px] font-bold uppercase text-slate-400 mb-1">
                  <Calendar className="w-3 h-3" /> Report Date
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {new Date(post.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div className="text-center lg:text-left px-4">
                <div className="flex items-center justify-center lg:justify-start gap-2 text-[10px] font-bold uppercase text-slate-400 mb-1">
                  <UserIcon className="w-3 h-3" /> Analyst
                </div>
                <div className="text-sm font-bold text-slate-900">InsightNote Team</div>
              </div>
            </div>
          </header>

          {/* TL;DR Section */}
          <div className="relative mb-12 p-8 bg-[#FFF9E6] border border-[#FFD700] rounded-lg">
            <div className="absolute -top-3 left-6 bg-brand-900 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest shadow-sm">
              TL;DR
            </div>
            <p className="font-sans text-base leading-relaxed text-slate-800">
              {post.tldr_content}
            </p>
          </div>

          {/* Main Content Area */}
          <div className={`relative min-h-[400px] ${!canAccess ? 'relative overflow-hidden max-h-[500px]' : ''}`}>
            {!canAccess && (
              <div className="absolute inset-0 z-10" style={{ 
                maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' 
              }} />
            )}
            
            {canAccess ? (
               <MarkdownContent content={post.full_content || ''} />
            ) : (
              <>
                <MarkdownContent content={(post.full_content || '').substring(0, 1000)} />
                
                <div className="absolute bottom-0 left-0 right-0 flex justify-center py-12 bg-linear-to-t from-white via-white/95 to-transparent z-20">
                  <div className="bg-white p-8 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] text-center border border-slate-100 max-w-md mx-4">
                    <h3 className={`${playfair.className} text-2xl font-bold text-brand-900 mb-2`}>Unlock Full Analysis</h3>
                    <p className="text-slate-500 mb-6 text-sm">Subscribe to InsightNote Pro to access our complete library of deep-dive financial research and proprietary models.</p>
                    <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-900 font-bold px-8 py-6 w-full text-base">
                      Upgrade to Pro
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

        </main>

        {/* Sidebar Column (30%) */}
        <aside className="lg:col-span-4 space-y-8">
          
          {/* Table of Contents (Static for now) */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg sticky top-24">
             <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-200 pb-2">Table of Contents</h3>
             <ul className="space-y-3 text-sm text-slate-600">
               <li className="hover:text-brand-900 cursor-pointer flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-brand-gold rounded-full"></span>
                 Investment Thesis
               </li>
               <li className="hover:text-brand-900 cursor-pointer pl-4">Key Catalysts</li>
               <li className="hover:text-brand-900 cursor-pointer pl-4">Valuation Model</li>
               <li className="hover:text-brand-900 cursor-pointer flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                 Risk Factors
               </li>
               <li className="hover:text-brand-900 cursor-pointer flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                 Conclusion
               </li>
             </ul>
          </div>

          {/* Related Graph Placeholder */}
          <div className="p-6 bg-brand-900 rounded-lg text-white">
             <h3 className={`${playfair.className} text-xl font-bold mb-2`}>Related Insights</h3>
             <p className="text-xs text-slate-400 mb-4">Explore connected market events.</p>
             <Link href="/tools/butterfly">
               <div className="h-40 bg-white/5 rounded border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer group">
                  <span className="text-[10px] uppercase tracking-widest text-white/50 group-hover:text-brand-gold transition-colors">Graph Visualization</span>
               </div>
             </Link>
          </div>
        </aside>
        
      </div>
    </div>
  );
}
