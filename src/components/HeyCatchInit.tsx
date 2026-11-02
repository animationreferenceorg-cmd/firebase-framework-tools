'use client';

import { useEffect } from 'react';
import { initializeSiteAnalytics } from '@/lib/analytics-init';

export function HeyCatchInit() {
  useEffect(initializeSiteAnalytics, []);
  return null;
}
