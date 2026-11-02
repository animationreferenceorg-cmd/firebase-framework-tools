import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EmbedPlayer } from '@/components/embed/EmbedPlayer';

export const metadata: Metadata = { title: { absolute: 'Video player' }, robots: { index: false, follow: false } };

export default async function EmbedPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  return <Suspense fallback={<div className="fixed inset-0 bg-black" />}><EmbedPlayer kind={kind} id={id} /></Suspense>;
}
