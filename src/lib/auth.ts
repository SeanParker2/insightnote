import { Profile } from '@/types';
import { Post } from '@/lib/types';

/**
 * Check if a user has access to a specific post content.
 * Logic:
 * 1. If post is not premium, everyone can access.
 * 2. If user is PRO, they can access everything.
 * 3. If post is older than 30 days, it becomes free (Time-wall).
 */
export function canAccessContent(user: Profile | null | undefined, post: Post): boolean {
  if (!post.is_premium) return true;
  
  if (user?.subscription_status === 'pro') return true;

  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  const timeSincePublished = Date.now() - new Date(post.published_at).getTime();
  
  if (timeSincePublished > thirtyDaysInMs) return true;

  return false;
}
