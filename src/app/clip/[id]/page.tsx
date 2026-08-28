import { ClipDetailClient } from '@/components/reference/ClipDetailClient';
export default async function ClipPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ClipDetailClient clipId={id} />; }
