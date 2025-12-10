
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, type User } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Clapperboard } from 'lucide-react';
import { createUserProfile } from '@/lib/firestore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sign-in');
  const router = useRouter();
  const { toast } = useToast();
  const { auth } = useFirebase();

  const handleAuthSuccess = async (user: User) => {
    await createUserProfile(user); // Ensure profile exists on every login/signup
    router.push('/');
  }

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
        toast({ title: "Account created!", description: "You've been successfully signed up." });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(userCredential.user);
        toast({ title: "Signed in!", description: "Welcome back." });
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast({
            variant: "destructive",
            title: "Email already exists",
            description: "An account with this email is already registered. Please sign in instead.",
        });
        setActiveTab('sign-in');
      } else {
        toast({
            variant: "destructive",
            title: "Authentication failed",
            description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4 overflow-y-auto">
      <div className="w-full max-w-md py-8">
        <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
                <div className="bg-primary p-2 rounded-lg">
                    <Clapperboard className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold text-sidebar-foreground tracking-wider">
                    Animation Reference
                </h1>
            </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">Sign In</TabsTrigger>
            <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="sign-in">
            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>Enter your credentials to access your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signin">Email</Label>
                  <Input id="email-signin" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signin">Password</Label>
                  <Input id="password-signin" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleAuthAction('signIn')} disabled={loading || !auth} className="w-full">
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="sign-up">
            <Card>
              <CardHeader>
                <CardTitle>Sign Up</CardTitle>
                <CardDescription>Create a new account to get started.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input id="email-signup" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleAuthAction('signUp')} disabled={loading || !auth} className="w-full">
                  {loading ? 'Signing Up...' : 'Sign Up'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
