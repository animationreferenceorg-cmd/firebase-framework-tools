import { getFirestore } from '@/lib/firebase-admin';
import { ShotBreakdownPage } from '@/components/reference/ShotBreakdownPage';

export default async function PublicBreakdownRoute({ params }: { params: Promise<{ username: string; breakdownSlug: string }> }) {
  const { username, breakdownSlug } = await params;
  const users = await getFirestore().collection('users').where('username', '==', username.toLowerCase()).limit(1).get();
  const ownerId = users.empty ? username : users.docs[0].id;
  return <ShotBreakdownPage ownerId={ownerId} slug={breakdownSlug} />;
}
