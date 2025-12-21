import type { SecurePost, SecurePostDetail } from '@/types';

export function isUnlocked(post: Pick<SecurePost, 'is_unlocked'> | Pick<SecurePostDetail, 'is_unlocked'>) {
  return post.is_unlocked;
}

