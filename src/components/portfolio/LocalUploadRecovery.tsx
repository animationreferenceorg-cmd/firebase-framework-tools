'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { syncLocalItemsForUser } from '@/lib/portfolio-service';
import { useToast } from '@/hooks/use-toast';

/**
 * Rescues browser-only portfolio uploads when someone signs in.
 *
 * Uploads made before server persistence worked were written to this browser's
 * localStorage/IndexedDB and nowhere else, so they never reached the community
 * feed and nobody but their author can recover them. Migration already happened
 * inside getUserPortfolioItems, but only for users who went to their profile —
 * anyone who did not simply never got their work back, and would have had to
 * notice and re-upload.
 *
 * Running it on sign-in instead means it happens once, everywhere, without the
 * user knowing anything was wrong.
 */
export function LocalUploadRecovery() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  // One attempt per uid per page load; the effect re-runs on token refresh.
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user?.uid) return;
    if (attemptedRef.current === user.uid) return;
    attemptedRef.current = user.uid;

    let cancelled = false;
    (async () => {
      try {
        const migrated = await syncLocalItemsForUser(user.uid);
        if (!cancelled && migrated > 0) {
          toast({
            title: migrated === 1 ? 'Restored 1 upload' : `Restored ${migrated} uploads`,
            description: 'Work saved only in this browser is now on your profile and in the community feed.',
          });
        }
      } catch (error) {
        // Never surface this as an error — the user did not ask for it, and a
        // failed migration leaves the local copy untouched to retry next time.
        console.warn('[portfolio] Local upload recovery skipped:', error);
        if (!cancelled) attemptedRef.current = null; // allow a retry later
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, loading, toast]);

  return null;
}
