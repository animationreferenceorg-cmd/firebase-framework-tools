"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  type User 
} from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Clapperboard, Sparkles, ArrowRight, ShieldCheck, Mail, Lock as LockIcon, CheckCircle2 } from 'lucide-react';
import { createUserProfile } from '@/lib/firestore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sign-in');

  // Mouse Movement Glow Position State
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const containerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const { toast } = useToast();
  const { auth } = useFirebase();

  // Track Mouse Cursor for Radial Glow Spotlight
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'sign-up') {
      setActiveTab('sign-up');
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleAuthSuccess = async (user: User) => {
    await createUserProfile(user); // Ensure profile exists on every login/signup
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isMobile && !isInstalled) sessionStorage.setItem('showMobileInstallPrompt', '1');
    const requested = new URLSearchParams(window.location.search).get('redirect');
    router.push(requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/home');
  };

  const handleAuthAction = async (action: 'signIn' | 'signUp') => {
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Authentication service not available",
        description: "Firebase auth is not configured correctly.",
      });
      return;
    }
    setLoading(true);
    try {
      if (action === 'signUp') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(userCredential.user);
        toast({ title: "Account created!", description: "Welcome to Animation Reference." });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(userCredential.user);
        toast({ title: "Signed in!", description: "Welcome back." });
      }
    } catch (error: any) {
      console.warn("Authentication notice:", error?.code || error?.message);
      if (error?.code === 'auth/email-already-in-use') {
        toast({
          variant: "destructive",
          title: "Email already exists",
          description: "An account with this email is already registered. Please sign in instead.",
        });
        setActiveTab('sign-in');
      } else if (
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/user-not-found'
      ) {
        toast({
          variant: "destructive",
          title: "Invalid email or password",
          description: "The email or password you entered is incorrect. Please check your credentials or create an account.",
        });
      } else if (error?.code === 'auth/weak-password') {
        toast({
          variant: "destructive",
          title: "Weak password",
          description: "Password should be at least 6 characters.",
        });
      } else if (error?.code === 'auth/invalid-email') {
        toast({
          variant: "destructive",
          title: "Invalid email",
          description: "Please enter a valid email address.",
        });
      } else if (error?.code === 'auth/too-many-requests') {
        toast({
          variant: "destructive",
          title: "Too many attempts",
          description: "Access temporarily blocked due to many failed attempts. Please try again in a few minutes.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: error?.message || "Failed to authenticate.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await handleAuthSuccess(userCredential.user);
      toast({ title: "Signed in with Google!", description: "Welcome to Animation Reference." });
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.warn("Google sign-in notice:", error?.code || error?.message);
      toast({
        variant: "destructive",
        title: "Google Sign-In failed",
        description: error?.code === 'auth/account-exists-with-different-credential'
          ? "An account already exists with the same email using a different sign-in method."
          : error?.message || "Failed to sign in with Google.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-[#13111c] overflow-hidden select-none m-0 p-0 z-50"
    >
      {/* ──────────────── DYNAMIC MOUSE MOVEMENT GLOW SPOTLIGHT ──────────────── */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(139, 92, 246, 0.18), rgba(236, 72, 153, 0.08) 40%, transparent 80%)`,
        }}
      />

      {/* Interactive Dot Grid Pattern Highlighted by Mouse Position */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-25"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          maskImage: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)`,
          WebkitMaskImage: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)`,
        }}
      />

      {/* Ambient Radial Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/15 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-600/15 blur-[150px] rounded-full pointer-events-none" />

      {/* ──────────────── MAIN AUTH CARD ──────────────── */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        
        {/* Brand Header Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-3 p-2.5 px-5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-2xl backdrop-blur-xl">
            <div className="bg-gradient-to-tr from-purple-600 to-pink-500 p-2.5 rounded-xl shadow-lg shadow-purple-600/30">
              <Clapperboard className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-wider">
              Animation Reference
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-medium">Study movement, timing & acting for 2D/3D animators</p>
        </div>

        {/* Console Glassmorphism Card */}
        <div className="p-6 sm:p-8 rounded-[32px] bg-[#1a182e]/85 border border-purple-500/30 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] space-y-6 relative overflow-hidden">
          {/* Card Top Gloss Line */}
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-purple-400/40 to-transparent pointer-events-none" />

          {/* Auth Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10">
              <TabsTrigger 
                value="sign-in" 
                className="rounded-xl text-xs font-bold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="sign-up" 
                className="rounded-xl text-xs font-bold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* TAB: SIGN IN */}
            <TabsContent value="sign-in" className="space-y-4 m-0">
              <div className="space-y-1 text-left">
                <h3 className="text-xl font-black text-white">Welcome Back</h3>
                <p className="text-xs text-zinc-400">Enter your credentials to access your creator account.</p>
              </div>

              <div className="space-y-3 pt-2 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="email-signin" className="text-xs font-bold text-zinc-300">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input 
                      id="email-signin" 
                      type="email" 
                      placeholder="animator@studio.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="pl-10 h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password-signin" className="text-xs font-bold text-zinc-300">Password</Label>
                  <div className="relative">
                    <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input 
                      id="password-signin" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="pl-10 h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => handleAuthAction('signIn')} 
                disabled={loading || !auth} 
                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-sm shadow-xl shadow-purple-900/50 cursor-pointer gap-2 mt-2"
              >
                {loading ? 'Signing In...' : 'Sign In to Studio'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </TabsContent>

            {/* TAB: SIGN UP */}
            <TabsContent value="sign-up" className="space-y-4 m-0">
              <div className="space-y-1 text-left">
                <h3 className="text-xl font-black text-white">Create Account</h3>
                <p className="text-xs text-zinc-400">Join the community to study shots & host your portfolio.</p>
              </div>

              <div className="space-y-3 pt-2 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="email-signup" className="text-xs font-bold text-zinc-300">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input 
                      id="email-signup" 
                      type="email" 
                      placeholder="animator@studio.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="pl-10 h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password-signup" className="text-xs font-bold text-zinc-300">Password</Label>
                  <div className="relative">
                    <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input 
                      id="password-signup" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="pl-10 h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => handleAuthAction('signUp')} 
                disabled={loading || !auth} 
                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-sm shadow-xl shadow-purple-900/50 cursor-pointer gap-2 mt-2"
              >
                {loading ? 'Creating Account...' : 'Create Free Account'}
                <Sparkles className="h-4 w-4" />
              </Button>
            </TabsContent>
          </Tabs>

          {/* Social One-Click Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#1a182e] px-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider absolute">OR</span>
          </div>

          {/* One-Click Google Sign In */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading || !auth}
            className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 border-white/15 text-white font-bold text-xs gap-2 cursor-pointer transition-all"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </Button>

          {/* Guarantee Badges */}
          <div className="pt-2 flex items-center justify-center gap-4 text-[10px] font-semibold text-zinc-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Free Forever
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" /> Instant Access
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
