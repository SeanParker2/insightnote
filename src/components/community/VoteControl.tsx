'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoteControlProps {
  postId: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  className?: string;
}

export function VoteControl({ postId, initialUpvotes = 0, initialDownvotes = 0, className }: VoteControlProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    async function fetchVoteStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('post_votes').select('direction').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
          if (mounted && data) setUserVote(data.direction as 'up' | 'down');
        }
        const { count: upCount } = await supabase.from('post_votes').select('*', { count: 'exact', head: true }).eq('post_id', postId).eq('direction', 'up');
        const { count: downCount } = await supabase.from('post_votes').select('*', { count: 'exact', head: true }).eq('post_id', postId).eq('direction', 'down');
        if (mounted) { if (upCount !== null) setUpvotes(upCount); if (downCount !== null) setDownvotes(downCount); setLoading(false); }
      } catch (error) { console.error('Error fetching votes:', error); }
    }
    fetchVoteStatus();
    const channel = supabase.channel(`post_votes:${postId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'post_votes', filter: `post_id=eq.${postId}` }, () => fetchVoteStatus()).subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [postId, supabase]);

  const handleVote = async (direction: 'up' | 'down') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const previousVote = userVote; const previousUpvotes = upvotes; const previousDownvotes = downvotes;
    if (userVote === direction) { setUserVote(null); if (direction === 'up') setUpvotes(p => Math.max(0, p - 1)); else setDownvotes(p => Math.max(0, p - 1)); }
    else { setUserVote(direction); if (direction === 'up') { setUpvotes(p => p + 1); if (previousVote === 'down') setDownvotes(p => Math.max(0, p - 1)); } else { setDownvotes(p => p + 1); if (previousVote === 'up') setUpvotes(p => Math.max(0, p - 1)); } }
    try {
      if (userVote === direction) await supabase.from('post_votes').delete().eq('post_id', postId).eq('user_id', user.id);
      else await supabase.from('post_votes').upsert({ post_id: postId, user_id: user.id, direction }, { onConflict: 'post_id,user_id' });
    } catch (error) { setUserVote(previousVote); setUpvotes(previousUpvotes); setDownvotes(previousDownvotes); }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Button variant="outline" size="sm" className={cn("gap-2 transition-colors", userVote === 'up' && "bg-signal-down-bg text-signal-down border-signal-down/30")} onClick={() => handleVote('up')}>
        <ThumbsUp className={cn("w-4 h-4", userVote === 'up' && "fill-current")} />
        <span className="font-mono">{upvotes}</span>
      </Button>
      <Button variant="outline" size="sm" className={cn("gap-2 transition-colors", userVote === 'down' && "bg-signal-up-bg text-signal-up border-signal-up/30")} onClick={() => handleVote('down')}>
        <ThumbsDown className={cn("w-4 h-4", userVote === 'down' && "fill-current")} />
        <span className="font-mono">{downvotes}</span>
      </Button>
    </div>
  );
}
