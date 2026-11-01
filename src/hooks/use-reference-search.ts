'use client';

import { useEffect, useRef, useState } from 'react';
import type { Video } from '@/lib/types';
import { scoreReferences } from '@/lib/reference-search';

/** Keep cold catalog classification (hundreds of ms) off the UI thread. */
export function useReferenceSearch(videos: Video[], query: string) {
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const workerRef = useRef<Worker | null>(null);
  const catalogRef = useRef<Video[] | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    try {
      const worker = new Worker(new URL('../lib/reference-search.worker.ts', import.meta.url));
      workerRef.current = worker;
      return () => { worker.terminate(); workerRef.current = null; };
    } catch {
      // Browsers that disallow workers retain functional local search.
    }
  }, []);

  useEffect(() => {
    const id = ++requestRef.current;
    if (!query.trim()) return;
    const worker = workerRef.current;
    const fallback = () => {
      if (requestRef.current === id) setScores(new Map(scoreReferences(videos, query)));
    };
    const timer = setTimeout(() => {
      if (!worker) { fallback(); return; }
      worker.onmessage = (event: MessageEvent<{ id: number; scores: Array<[string, number]> }>) => {
        if (event.data.id === requestRef.current) setScores(new Map(event.data.scores));
      };
      worker.onerror = () => {
        worker.terminate();
        workerRef.current = null;
        catalogRef.current = null;
        fallback();
      };
      try {
        worker.postMessage({ id, query, videos: catalogRef.current === videos ? undefined : videos });
        catalogRef.current = videos;
      } catch {
        fallback();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [videos, query]);

  return scores;
}
