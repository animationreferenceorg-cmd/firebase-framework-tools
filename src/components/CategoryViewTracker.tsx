'use client';
import { useEffect } from 'react';
import { trackCategoryView } from '@/lib/recent-categories';

export function CategoryViewTracker({ categoryId }: { categoryId: string }) {
  useEffect(() => {
    trackCategoryView(categoryId);
  }, [categoryId]);
  return null;
}
