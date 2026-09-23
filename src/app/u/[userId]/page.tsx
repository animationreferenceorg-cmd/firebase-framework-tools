'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserProfileByUsernameOrId } from '@/lib/firestore';

export default function UserProfileRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  useEffect(() => {
    if (!userId) return;
    async function redirect() {
      try {
        const profile = await getUserProfileByUsernameOrId(userId);
        if (profile?.username) {
          router.replace(`/${profile.username}`);
          return;
        }
      } catch (err) {
        console.error('Error resolving user redirect:', err);
      }
      router.replace(`/${userId}`);
    }
    redirect();
  }, [userId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500" />
    </div>
  );
}
