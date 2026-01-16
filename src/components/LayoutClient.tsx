
'use client';

import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarTrigger, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Clapperboard, Film, Home, LayoutGrid, List, Rss, Shield, BookCopy, Star, Camera, User, Box, ShoppingBag } from 'lucide-react';
import AuthHeader from '@/components/AuthHeader';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from './ui/skeleton';
import { useEffect, useState } from 'react';
import { UploadProvider } from '@/hooks/use-upload';
import { UploadProgressManager } from './UploadProgressManager';
import { cn } from '@/lib/utils';
import { GlassHeader } from '@/components/GlassHeader';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { SidebarLink } from '@/components/SidebarLink';

export function LayoutClient({ children }: { children: React.ReactNode }) {
    const { userProfile, loading: userProfileLoading } = useUser();
    const { user, loading: authLoading } = useAuth();
    const { storage } = useFirebase();
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !storage) return;

        try {
            setUploading(true);
            const storageRef = ref(storage, `avatars/${user.uid}`);
            // Force content type to avoid potential download issues, usually auto-detected
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await updateProfile(user, { photoURL: url });
            toast({ title: "Success", description: "Profile picture updated!" });
            window.location.reload();
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to upload image." });
        } finally {
            setUploading(false);
        }
    };

    const loading = authLoading || userProfileLoading;

    const isAdminPage = pathname.startsWith('/admin');
    // Home Page uses 'Coming Soon' / Landing style (no sidebar)
    const isComingSoon = pathname === '/';

    if (isAdminPage || isComingSoon) {
        return (
            <UploadProvider>
                {children}
                <UploadProgressManager />
            </UploadProvider>
        );
    }

    // This prevents hydration errors by ensuring the server and client render the same initial skeleton.
    if (!isClient) {
    }

    const isAdmin = userProfile?.role === 'admin';

    const isFeedPage = pathname === '/feed';
    const isMoodboardPage = pathname.startsWith('/moodboard');

    return (
        <UploadProvider>
            <SidebarProvider>
                <Sidebar>
                    {/* ... sidebar content ... */}
                    <SidebarHeader>
                        {/* ... header content ... */}
                        <div className="flex items-center justify-center w-full py-6">
                            <div className={cn(
                                "relative h-24 w-24 overflow-hidden group cursor-pointer rounded-full border-2 border-white/10 hover:border-primary transition-colors bg-black/20",
                                uploading && "opacity-50 pointer-events-none"
                            )}>
                                <label htmlFor="sidebar-avatar-upload" className="cursor-pointer block w-full h-full relative">
                                    {user?.photoURL ? (
                                        <Image
                                            src={user.photoURL}
                                            alt="Profile"
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                                            <User className="h-10 w-10 text-white/50" />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                        <div className="flex flex-col items-center">
                                            <Camera className="h-6 w-6 text-white mb-1" />
                                            <span className="text-[10px] text-white font-medium">Upload</span>
                                        </div>
                                    </div>
                                </label>
                                <input
                                    type="file"
                                    id="sidebar-avatar-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    disabled={uploading}
                                />
                            </div>
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarGroupLabel>Discover</SidebarGroupLabel>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarLink href="/home" icon={Home} tooltip="Home">
                                        Home
                                    </SidebarLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarLink href="/categories" icon={LayoutGrid} tooltip="Categories">
                                        Categories
                                    </SidebarLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarLink href="/shorts" icon={Film} tooltip="Short Films">
                                        Short Films
                                    </SidebarLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarLink href="/feed" icon={Rss} tooltip="Feed">
                                        Feed
                                    </SidebarLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarLink href="/marketplace" icon={ShoppingBag} tooltip="Marketplace">
                                        Marketplace
                                    </SidebarLink>
                                </SidebarMenuItem>

                            </SidebarMenu>
                        </SidebarGroup>
                        <SidebarGroup>
                            <SidebarGroupLabel>My Library</SidebarGroupLabel>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarLink href="/list" icon={List} tooltip="My List">
                                        My List
                                    </SidebarLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarLink href="/moodboard" icon={Box} tooltip="Moodboards">
                                        Moodboards
                                    </SidebarLink>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                        {isAdmin && (
                            <>
                                <SidebarSeparator />
                                <SidebarGroup>
                                    <SidebarGroupLabel>Admin</SidebarGroupLabel>
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarLink href="/admin" icon={Shield} tooltip="Admin Dashboard">
                                                Admin Panel
                                            </SidebarLink>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarGroup>
                            </>
                        )}
                    </SidebarContent>
                </Sidebar>
                <SidebarInset>
                    <div className="flex flex-col flex-1 min-h-screen relative">
                        <GlassHeader />
                        <main className={cn(
                            "flex-1 transition-all duration-300 ease-in-out",
                            !isMoodboardPage && "px-4 md:px-8 pb-8"
                        )}>
                            {children}
                        </main>
                    </div>
                    <UploadProgressManager />
                </SidebarInset>
            </SidebarProvider>
        </UploadProvider>
    )
}
