'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star } from 'lucide-react';

interface FavoriteButtonProps {
  postId: string;
  className?: string;
}

export function FavoriteButton({ postId, className = '' }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkFavorite = useCallback(async () => {
    try {
      const res = await fetch(`/api/favorites?type=favorites&limit=100`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.data)) {
          setIsFavorited(data.data.some((f: { post_id: string }) => f.post_id === postId));
        }
      }
    } catch {}
  }, [postId]);

  useEffect(() => {
    checkFavorite();
  }, [checkFavorite]);

  const toggleFavorite = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setIsFavorited(data.action === 'added');
        }
      }
    } catch {}
    setLoading(false);
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`p-2 rounded-lg transition-colors ${
        isFavorited 
          ? 'text-amber-400 hover:text-amber-300' 
          : 'text-text-tertiary hover:text-text-secondary'
      } ${className}`}
      title={isFavorited ? '取消收藏' : '添加收藏'}
    >
      <Star 
        className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} 
      />
    </button>
  );
}
