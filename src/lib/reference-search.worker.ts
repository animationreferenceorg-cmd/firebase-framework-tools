import type { Video } from './types';
import { scoreReferences } from './reference-search';

let videos: Video[] = [];
self.onmessage = (event: MessageEvent<{ videos?: Video[]; id: number; query: string }>) => {
  if (event.data.videos) videos = event.data.videos;
  const { id, query } = event.data;
  self.postMessage({ id, scores: query.trim() ? scoreReferences(videos, query) : [] });
};
