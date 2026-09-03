'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShieldCheck, Loader2, Sparkles, Box, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function PluginsConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    }>
      <PluginsConnectContent />
    </Suspense>
  );
}

function PluginsConnectContent() {
  const searchParams = useSearchParams();
  const port = searchParams.get('port') || '9876';
  const appName = searchParams.get('app') || 'Autodesk Maya';
  const { user, loading } = useAuth();

  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleAuthorize = useCallback(async () => {
    if (!user) return;
    setStatus('authorizing');
    setErrorMessage('');

    try {
      const idToken = await user.getIdToken(true);
      const candidatePorts = Array.from(new Set([port, '9880', '9881', '9876', '9877', '9878']));
      let success = false;
      let lastErr: any = null;

      for (const p of candidatePorts) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          const res = await fetch(`http://127.0.0.1:${p}/auth-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              token: idToken,
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'Animator',
            }),
          });

          clearTimeout(timeoutId);
          if (res.ok) {
            success = true;
            break;
          }
        } catch (e) {
          lastErr = e;
        }
      }

      if (success) {
        setStatus('success');
      } else {
        throw lastErr || new Error('No responding Maya bridge port found');
      }
    } catch (err: any) {
      console.warn('Plugin auth notice:', err?.message || err);
      setStatus('error');
      setErrorMessage(
        `Local connection to ${appName} is not responding. Please make sure the player is open in Maya or use the 1-Click Connection Key below!`
      );
    }
  }, [user, port, appName]);

  const handleCopyCode = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken(true);
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify({
        token: idToken,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Animator',
      }))));
      await navigator.clipboard.writeText(payload);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 4000);
    } catch (err) {
      console.warn('Copy code notice:', err);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden text-center">
        {/* Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Box className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Connect to {appName}</h1>
            <p className="text-xs text-zinc-400">
              Sync your Saved References, Liked Clips, and custom playlists directly into your 3D viewport.
            </p>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : !user ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-left text-xs text-purple-200">
                Please sign into your Animation Reference account first to link with {appName}.
              </div>
              <Link href={`/login?redirect=/plugins/connect?port=${port}&app=${encodeURIComponent(appName)}`}>
                <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl">
                  Sign In to Continue
                </Button>
              </Link>
            </div>
          ) : status === 'success' ? (
            <div className="space-y-4 py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Successfully Connected!</h3>
                <p className="text-xs text-zinc-400">
                  Your saved references are now synchronized with {appName}. You can close this tab and return to your animation.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 text-left">
                <div className="h-9 w-9 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-sm shrink-0">
                  {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{user.displayName || 'Animator'}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                </div>
                <div className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-semibold">
                  Active
                </div>
              </div>

              {status === 'error' && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-left text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                onClick={handleAuthorize}
                disabled={status === 'authorizing'}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl h-11 shadow-lg shadow-purple-900/30 gap-2"
              >
                {status === 'authorizing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting to {appName}...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Authorize {appName} Connection
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Secure local connection on port {port}</span>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-2">
                <p className="text-[11px] text-zinc-400">Or link manually using your connection key:</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="w-full border-white/10 hover:bg-white/5 text-zinc-300 text-xs rounded-xl h-9 gap-2"
                >
                  {copiedCode ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Copied Connection Key!
                    </>
                  ) : (
                    <>
                      📋 Copy Connection Key to Clipboard
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-zinc-500">
                  Then in Maya, click <span className="text-purple-300 font-medium">Paste Key</span> to sign in immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
