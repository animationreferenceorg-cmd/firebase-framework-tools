
"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { VideoCard } from '@/components/VideoCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MOCK_VIDEOS, MOCK_CATEGORIES } from '@/lib/data';
import { CreditCard, LogOut, Heart, Clapperboard, Star, Edit, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CategoryCard } from '@/components/CategoryCard';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useMemo, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { userProfile, loading: userProfileLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const likedVideos = useMemo(() => {
    if (!userProfile) return [];
    return MOCK_VIDEOS.filter(video => userProfile.likedVideoIds?.includes(video.id));
  }, [userProfile]);

  const likedCategories = useMemo(() => {
    if (!userProfile) return [];
    return MOCK_CATEGORIES.filter(category => userProfile.likedCategoryTitles?.includes(category.title));
  }, [userProfile]);

  const savedShorts = useMemo(() => {
    if (!userProfile) return [];
    return MOCK_VIDEOS.filter(video => video.isShort && userProfile.savedShortIds?.includes(video.id));
  }, [userProfile]);


  useEffect(() => {
    if(authUser?.displayName) {
        setDisplayName(authUser.displayName);
    }
  }, [authUser]);


  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/');
  }

  const handleProfileUpdate = async () => {
    if (!authUser) return;
    setIsSaving(true);
    try {
      await updateProfile(authUser, { displayName });
      toast({ title: 'Success', description: 'Your profile has been updated.' });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const loading = authLoading || userProfileLoading;

  if (loading) {
    return (
        <main className="container mx-auto px-4 md:px-6 pt-6 pb-16">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
                <Skeleton className="h-32 w-32 rounded-full border-4 border-primary" />
                <div className="flex-1 text-center md:text-left space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-6 w-80" />
                </div>
            </div>
            <Card className="mb-12">
                <CardHeader>
                    <CardTitle>Subscription</CardTitle>
                    <CardDescription>Manage your billing and subscription details.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
            <Skeleton className="h-10 w-full" />
        </main>
    );
  }

  if (!authUser && isFirebaseConfigured()) {
    router.push('/login');
    return null;
  }
  
  const guestUser = {
    displayName: 'Guest User',
    email: 'guest@example.com',
    photoURL: `https://placehold.co/100x100.png`
  };
  
  const currentUser = authUser || guestUser;


  return (
      <main className="container mx-auto px-4 md:px-6 pt-6 pb-16">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
          <Avatar className="h-32 w-32 border-4 border-primary">
            <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || ''} data-ai-hint="user avatar" />
            <AvatarFallback>{currentUser.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-4 justify-center md:justify-start">
                <h1 className="text-3xl md:text-4xl font-bold text-white">{currentUser.displayName}</h1>
                {userProfile?.role === 'admin' && (
                  <Badge variant="default" className="text-base bg-primary/80">
                    <ShieldCheck className="h-5 w-5 mr-2"/>
                    Admin
                  </Badge>
                )}
            </div>
            <p className="text-muted-foreground">{currentUser.email}</p>
          </div>
          {authUser && (
            <div className="flex gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Edit profile</DialogTitle>
                      <DialogDescription>
                        Make changes to your profile here. Click save when you're done.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleProfileUpdate} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save changes'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                </Button>
            </div>
          )}
        </div>

        <Card className="mb-12">
            <CardHeader>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>Manage your billing and subscription details.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div>
                        <p className="font-semibold text-white">Current Plan: <span className="text-primary">Premium</span></p>
                        <p className="text-muted-foreground text-sm">Renews on: December 31, 2024</p>
                    </div>
                    <Button variant="secondary">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Manage Subscription
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Tabs defaultValue="liked-videos" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
            <TabsTrigger value="liked-videos"><Heart className="mr-2 h-4 w-4" />Liked Videos</TabsTrigger>
            <TabsTrigger value="liked-categories"><Star className="mr-2 h-4 w-4" />Liked Categories</TabsTrigger>
            <TabsTrigger value="saved-shorts"><Clapperboard className="mr-2 h-4 w-4" />Saved Shorts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="liked-videos">
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {likedVideos.map(video => (
                    <div key={`liked-${video.id}`}>
                        <VideoCard video={video} />
                    </div>
                ))}
            </div>
             {likedVideos.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <p>You haven't liked any videos yet.</p>
                </div>
            )}
          </TabsContent>

          <TabsContent value="liked-categories">
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {likedCategories.map(category => (
                    <CategoryCard key={`liked-cat-${category.title}`} {...category} />
                ))}
            </div>
            {likedCategories.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <p>You haven't liked any categories yet.</p>
                </div>
            )}
          </TabsContent>
          
          <TabsContent value="saved-shorts">
             <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {savedShorts.map(video => (
                    <div key={`shared-${video.id}`}>
                        <VideoCard video={video} poster />
                    </div>
                ))}
            </div>
             {savedShorts.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p>You haven&apos;t saved any shorts yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
  );
}
