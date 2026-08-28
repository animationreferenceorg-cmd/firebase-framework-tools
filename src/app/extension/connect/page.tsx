'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Chrome, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';

export default function ExtensionConnectPage() {
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const extensionId = params.get('extension_id') || '';

  const attemptConnect = async () => {
    if (!user || !extensionId) return;
    setStatus('connecting');
    setErrorMessage('');
    try {
      const tokenResult = await user.getIdTokenResult(true);
      const token = tokenResult.token;
      const runtime = (window as any).chrome?.runtime;
      if (!runtime?.sendMessage) {
        throw new Error('Chrome runtime messaging is not available. Make sure the extension is reloaded.');
      }

      await new Promise<void>((resolve, reject) => {
        runtime.sendMessage(extensionId, {
          type: 'AR_CONNECT',
          token,
          refreshToken: user.refreshToken,
          tokenExpiresAt: new Date(tokenResult.expirationTime).getTime(),
          firebaseApiKey: auth.app.options.apiKey,
        }, (response: { ok?: boolean }) => {
          const lastError = runtime.lastError;
          if (lastError || !response?.ok) {
            reject(new Error(lastError?.message || 'The extension did not respond. Please reload the extension at chrome://extensions.'));
          } else {
            resolve();
          }
        });
      });

      setStatus('connected');
    } catch (err: any) {
      console.error('Extension connect error:', err);
      setErrorMessage(err.message || 'Connection failed.');
      setStatus('error');
    }
  };

  useEffect(() => {
    if (user && extensionId && status === 'idle') {
      attemptConnect();
    }
  }, [user, extensionId, status]);

  useEffect(() => {
    if (!loading && !user && extensionId) {
      const returnTo = `/extension/connect?extension_id=${encodeURIComponent(extensionId)}`;
      window.location.replace(`/login?redirect=${encodeURIComponent(returnTo)}`);
    }
  }, [loading, user, extensionId]);

  if (loading) {
    return (
      <ConnectShell>
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </ConnectShell>
    );
  }

  if (!user) {
    return (
      <ConnectShell>
        <Chrome className="h-10 w-10 text-purple-300 animate-pulse" />
        <h1 className="text-3xl font-black">Taking you to sign in</h1>
        <p className="max-w-md text-zinc-400">You’ll return here automatically to open Clip & Save.</p>
      </ConnectShell>
    );
  }

  if (status === 'connected') {
    return (
      <ConnectShell>
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        <h1 className="text-3xl font-black">Extension Connected!</h1>
        <p className="max-w-md text-zinc-400">
          Your browser extension is connected. Taking you to Reference Clips now.
        </p>
        <Button onClick={() => window.location.assign('/references')} className="bg-purple-600 hover:bg-purple-500">
          Open Reference Clips
        </Button>
      </ConnectShell>
    );
  }

  return (
    <ConnectShell>
      {status === 'error' ? (
        <ShieldCheck className="h-11 w-11 text-amber-400" />
      ) : (
        <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
      )}
      <h1 className="text-3xl font-black">
        {status === 'error' ? 'Connection Needs a Quick Retry' : 'Connecting Securely…'}
      </h1>
      <p className="max-w-md text-zinc-400 text-sm">
        {status === 'error'
          ? errorMessage || 'Reopen chrome://extensions and click Reload on Animation Reference.'
          : 'Sharing a secure sign-in token with your installed Chrome extension.'}
      </p>
      <Button onClick={attemptConnect} className="bg-purple-600 hover:bg-purple-500 mt-2">
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry Connecting Now
      </Button>
    </ConnectShell>
  );
}

function ConnectShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[75vh] grid place-items-center px-6">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950/80 p-10 text-center flex flex-col items-center gap-5 shadow-2xl">
        {children}
      </div>
    </main>
  );
}
