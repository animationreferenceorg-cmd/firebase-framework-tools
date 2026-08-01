'use client';
import { useEffect } from 'react';
import { trackTagView } from '@/lib/recent-tags';

export function TagViewTracker({ tag }: { tag: string }) {
  useEffect(() => {
    trackTagView(tag);
  }, [tag]);
  return null;
}
