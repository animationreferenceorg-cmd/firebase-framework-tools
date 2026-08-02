'use client';

import React, { useEffect, useState } from 'react';
import { CategoriesHub } from '@/components/CategoriesHub';

export function CategoriesHubClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-transparent" />;
  }

  return <CategoriesHub />;
}
