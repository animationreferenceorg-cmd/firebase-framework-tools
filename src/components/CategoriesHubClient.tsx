'use client';

import React from 'react';
import { CategoriesHub } from '@/components/CategoriesHub';
import type { Video, Category } from '@/lib/types';

interface CategoriesHubClientProps {
  initialCategories: Category[];
  initialVideos: Video[];
  heroVideo: Video | null;
}

export function CategoriesHubClient({ initialCategories, initialVideos, heroVideo }: CategoriesHubClientProps) {
  return (
    <CategoriesHub
      initialCategories={initialCategories}
      initialVideos={initialVideos}
      heroVideo={heroVideo}
    />
  );
}
