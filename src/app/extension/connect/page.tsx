'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Chrome, Copy, Check, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { trackPluginAccountLinked, type PluginKind } from '@/lib/plugin-analytics';

export default function ExtensionConnectPage() {
  return (
    <Suspense fallback={<ConnectShell><Loader2 className="h-8 w-8 animate-spin text-purple-400" /></ConnectShell>}>
      <ExtensionConnectContent />
    </Suspense>
  );
}

function ExtensionConnectContent() {
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [tokenPayload, setTokenPayload] = useState<string>('');
  const [rawToken, setRawToken] = useState<{ token: string; refreshToken: string; expiresAt: number; apiKey: string } | null>(null);
  const extensionId = params.get('extension_id') || '';
  const clientType =
    params.get('client') ||
    (extensionId === 'animo_maya' ? 'maya' : extensionId === 'animref_blender' ? 'blender' : '');
  const callbackPort = params.get('port') || '';
  const callbackState = params.get('state') || '';

  const attemptConnect = useCallback(async () => {
    if (!user) return;
    setStatus('connecting');
    setErrorMessage('');
    try {
      const tokenResult = await user.getIdTokenResult(true);
      const token = tokenResult.token;
      const apiKey = auth.app.options.apiKey || 'AIzaSyAnbGJpTKPNBzLMb81bU7e8AY5k0x6E5Kg';
      const expiresAt = new Date(tokenResult.expirationTime).getTime();

      const raw = {
        token,
        refreshToken: user.refreshToken,
        expiresAt,
        apiKey,
      };
      setRawToken(raw);

      // Encode base64 token payload for 1-click manual paste fallback
      const payloadObj = {
        token,
        idToken: token,
        refreshToken: user.refreshToken,
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        tokenExpiresAt: expiresAt,
        firebaseApiKey: apiKey,
        state: callbackState,
        origin: window.location.origin,
      };
      let encodedPayload = '';
      try {
        encodedPayload = btoa(JSON.stringify(payloadObj))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        setTokenPayload(encodedPayload);
      } catch {}

      // Method 0: Automatic localhost loopback callback for Desktop Plugins (Autodesk Maya / Blender)
      const portNum = parseInt(callbackPort, 10);
      if (portNum >= 1024 && portNum <= 65535) {
        let delivered = false;
        try {
          const cbRes = await fetch(`http://127.0.0.1:${portNum}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadObj),
            mode: 'cors',
          });
          delivered = cbRes.ok;
        } catch {
          delivered = false;
        }
        // If browser blocked HTTPS->localhost fetch (Private Network Access / Mixed Content),
        // top-level navigation to http://127.0.0.1 is ALWAYS allowed and auto-syncs the plugin!
        if (!delivered && encodedPayload) {
          const pluginKind: PluginKind = clientType === 'maya' ? 'maya' : clientType === 'blender' ? 'blender' : 'extension';
          trackPluginAccountLinked(pluginKind, token, 'extension_connect');
          const cbUrl = `http://127.0.0.1:${portNum}/callback?payload=${encodeURIComponent(encodedPayload)}&state=${encodeURIComponent(callbackState)}`;
          setStatus('connected');
          window.location.assign(cbUrl);
          return;
        }
      }

      // Record plugin account link in Firebase & Analytics
      const pluginKind: PluginKind = clientType === 'maya' ? 'maya' : clientType === 'blender' ? 'blender' : 'extension';
      trackPluginAccountLinked(pluginKind, token, 'extension_connect');

      // Method 1: Bridge via window.postMessage
      window.postMessage({
        type: 'AR_CONNECT_POST_MESSAGE',
        ...payloadObj,
      }, '*');

      // Method 2: Direct chrome.runtime.sendMessage if extensionId is available
      const runtime = (window as any).chrome?.runtime;
      if (runtime?.sendMessage && extensionId && extensionId !== 'animo_maya') {
        runtime.sendMessage(extensionId, {
          type: 'AR_CONNECT',
          ...payloadObj,
        }, () => {});
      }

      setStatus('connected');
    } catch (err: any) {
      console.error('Extension connect error:', err);
      setErrorMessage(err.message || 'Connection failed.');
      setStatus('error');
    }
  }, [extensionId, callbackPort, callbackState, user]);

  useEffect(() => {
    if (user && status === 'idle') {
      attemptConnect();
    }
  }, [user, status, attemptConnect]);

  useEffect(() => {
    if (!loading && !user) {
      const qs = params.toString();
      const returnTo = qs ? `/extension/connect?${qs}` : '/extension/connect';
      window.location.replace(`/login?redirect=${encodeURIComponent(returnTo)}`);
    }
  }, [loading, user, params]);

  const handleCopyCode = () => {
    if (!tokenPayload) return;
    navigator.clipboard.writeText(tokenPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

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

  return (
    <ConnectShell>
      {/* Hidden DOM bridge element for instant script inspection */}
      {rawToken && (
        <div
          id="animref-extension-auth-bridge"
          style={{ display: 'none' }}
          data-token={rawToken.token}
          data-refresh-token={rawToken.refreshToken}
          data-expires-at={rawToken.expiresAt}
          data-api-key={rawToken.apiKey}
          data-origin={typeof window !== 'undefined' ? window.location.origin : ''}
          data-status="ready"
        />
      )}

      {status === 'connected' ? (
        <>
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <h1 className="text-3xl font-black">
            {clientType === 'maya'
              ? 'Maya Plugin Connected!'
              : clientType === 'blender'
                ? 'Blender Add-on Connected!'
                : 'Extension Connected!'}
          </h1>
          <p className="max-w-md text-zinc-400">
            {clientType === 'maya'
              ? 'Your Autodesk Maya AnimRef plugin is linked and syncing automatically. You can return to Maya now.'
              : clientType === 'blender'
                ? 'Your Blender AnimRef add-on is linked and syncing automatically. You can return to Blender now.'
                : 'Your Animation Reference extension is linked to your account. You can now save references from any page.'}
          </p>

          {tokenPayload && (
            <div className="w-full max-w-md p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
              <span className="text-xs text-zinc-400">
                {clientType === 'maya' ? 'Click below and Maya will auto-detect the code from your clipboard:' : 'Extension still asking to sign in?'}
              </span>
              <Button
                onClick={handleCopyCode}
                variant="outline"
                className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                {copied ? <Check className="mr-2 h-4 w-4 text-emerald-400" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied
                  ? (clientType === 'maya' ? 'Code Copied! Maya is signing you in automatically…' : 'Code Copied! Paste into Extension')
                  : 'Copy 1-Click Connect Code'}
              </Button>
            </div>
          )}

          <Button onClick={() => window.location.assign('/references')} className="bg-purple-600 hover:bg-purple-500 mt-2">
            Open Reference Clips
          </Button>
        </>
      ) : (
        <>
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
              : 'Sharing your secure sign-in token with your installed Chrome extension.'}
          </p>
          <Button onClick={attemptConnect} className="bg-purple-600 hover:bg-purple-500 mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connecting Now
          </Button>
        </>
      )}
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
