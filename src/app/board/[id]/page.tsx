import { BoardDetailClient } from '@/components/reference/BoardDetailClient';
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <BoardDetailClient boardId={id} />; }
