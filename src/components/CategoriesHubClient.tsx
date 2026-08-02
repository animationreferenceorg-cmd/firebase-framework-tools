'use client';

import dynamic from 'next/dynamic';

export const CategoriesHubClient = dynamic(
  () => import('@/components/CategoriesHub').then((mod) => mod.CategoriesHub),
  { ssr: false }
);
