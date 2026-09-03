'use client';

import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Film, Home, LayoutGrid, List, Rss, Shield, BookCopy, Camera, User, Box, ShoppingBag, CreditCard, MessageSquare, Paintbrush, Scissors } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/hooks/use-auth';
import { Suspense, useEffect, useState } from 'react';
import { UploadProvider } from '@/hooks/use-upload';
import { UploadProgressManager } from './UploadProgressManager';
import { LocalUploadRecovery } from './portfolio/LocalUploadRecovery';
import { cn } from '@/lib/utils';
import { GlassHeader } from '@/components/GlassHeader';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { SidebarLink } from '@/components/SidebarLink';
import { Button } from '@/components/ui/button';
import { doc, updateDoc } from 'firebase/firestore';
import { FeedbackModal } from '@/components/FeedbackModal';
import { UpdatesModal } from '@/components/UpdatesModal';
import { UserFeedbackPanel } from '@/components/UserFeedbackPanel';
import { MobileInstallBanner } from '@/components/reference/MobileInstallBanner';
import { isAppInstalled, isMobileInstallCandidate } from '@/lib/pwa';

import { WatchTrackerProvider } from '@/hooks/use-watch-tracker';

export function LayoutClient({ children }: { children: React.ReactNode }) {
    const { userProfile } = useUser();
    const { user } = useAuth();
    const { storage } = useFirebase();
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const pathname = usePathname();
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !storage) return;

        try {
            setUploading(true);
            const storageRef = ref(storage, `avatars/${user.uid}`);
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

    const isAdminPage = pathname.startsWith('/admin');
    const isComingSoon = pathname === '/';
    const isPaintPage = pathname.startsWith('/paint');
    const isSjsuPage = pathname.startsWith('/sjsu');

    if (isAdminPage || isComingSoon || isPaintPage || isSjsuPage) {
        return (
            <WatchTrackerProvider>
                <UploadProvider>
                    {children}
                    <UploadProgressManager />
                    <LocalUploadRecovery />
                </UploadProvider>
            </WatchTrackerProvider>
        );
    }

    const isAdmin = userProfile?.role === 'admin';

    const isMoodboardPage = pathname.startsWith('/moodboard');
    const isCategoriesPage = pathname.startsWith('/categories');
    const isProfilePage = pathname.startsWith('/profile') || pathname.startsWith('/u/');

    return (
        <WatchTrackerProvider>
            <UploadProvider>
            {isMoodboardPage && (
                <style dangerouslySetInnerHTML={{ __html: '/* Completely hide collapsed sidebar on moodboard workspace */ [data-state="collapsed"] { --sidebar-width-icon: 0px !important; width: 0px !important; border-right-width: 0px !important; overflow: hidden !important; }' }} />
            )}
            <SidebarProvider>
                <Sidebar>
                    <SidebarHeader>
                        <div className="px-6 pt-6">
                        </div>
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
                                    <SidebarLink href="/references" icon={Scissors} tooltip="Reference Clips">
                                        Reference Clips
                                    </SidebarLink>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarLink href="/shorts" icon={Film} tooltip="Short Films">
                                        Short Films
                                    </SidebarLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarLink href="/feed" icon={Rss} tooltip="Community">
                                        Community
                                    </SidebarLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarLink href="https://anim.works/" icon={ShoppingBag} tooltip="Marketplace (anim.works)">
                                        Marketplace
                                    </SidebarLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarLink href="/blog" icon={BookCopy} tooltip="Resources">
                                        Resources
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
                                    <SidebarLink href="/moodboard" icon={Box} tooltip="Boards">
                                        Boards
                                    </SidebarLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarLink href="/paint" icon={Paintbrush} tooltip="Paint (Beta)">
                                        Paint <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-fuchsia-300">Beta</span>
                                    </SidebarLink>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                        <SidebarGroup>
                            <SidebarGroupLabel>Feedback</SidebarGroupLabel>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <UserFeedbackPanel />
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
                                        <SidebarMenuItem>
                                            <SidebarLink href="/admin/feedback" icon={MessageSquare} tooltip="User Feedback">
                                                User Feedback
                                            </SidebarLink>
                                        </SidebarMenuItem>
                                    </SidebarMenu>

                                    <div className="px-4 py-2 mt-2">
                                        <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <CreditCard className="w-3 h-3" /> Simulate Tier
                                        </h4>
                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            <SimulateTierButton tier="tier1" label="$1" />
                                            <SimulateTierButton tier="tier2" label="$2" />
                                            <SimulateTierButton tier="tier5" label="$5" />
                                        </div>
                                        <SimulateTierButton tier="reset" label="Reset (Admin)" fullWidth />
                                    </div>
                                </SidebarGroup>
                            </>
                        )}
                    </SidebarContent>
                    <SidebarFooter className="p-4 border-t border-white/5 space-y-1">
                        <UpdatesModal />
                    </SidebarFooter>
                </Sidebar>
                <SidebarInset>
                    <div className="flex flex-col flex-1 min-h-screen relative">
                        <Suspense fallback={null}>
                            <GlassHeader />
                        </Suspense>
                        <main className={cn(
                            "flex-1 transition-all duration-300 ease-in-out",
                            (!isMoodboardPage && !isProfilePage && !isCategoriesPage) && "px-4 md:px-8 pb-8"
                        )}>
                            {children}
                        </main>
                            
                        {!isMoodboardPage && (
                            <footer className="mt-auto py-8 px-4 border-t border-white/5 flex flex-col items-center gap-4 text-center">
                                <div className="max-w-md space-y-2">
                                    <h3 className="text-sm font-semibold text-white/90">Have thoughts on the platform?</h3>
                                    <p className="text-xs text-white/50">Your feedback helps us build the best reference tool for animators.</p>
                                </div>
                                <div className="w-48">
                                    <FeedbackModal />
                                </div>
                                <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/40 mt-2">
                                    <Link href="/blog" className="hover:text-white/70 transition-colors">Blog</Link>
                                    <Link href="/resources/12-principles-of-animation-reference" className="hover:text-white/70 transition-colors">12 Principles of Animation</Link>
                                    <Link href="/resources/combat-animation-reference" className="hover:text-white/70 transition-colors">Combat Reference</Link>
                                    <Link href="/resources/locomotion-animation-reference" className="hover:text-white/70 transition-colors">Locomotion Reference</Link>
                                    <Link href="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
                                    <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
                                    <Link href="/dmca" className="hover:text-white/70 transition-colors">DMCA / Copyright</Link>
                                </nav>
                                <p className="text-[10px] text-white/20 mt-4">© 2026 Animation Reference. Built for the community.</p>
                            </footer>
                        )}
                    </div>
                    <UploadProgressManager />
                    <LocalUploadRecovery />
                    <MobileInstallAfterLogin />
                </SidebarInset>
            </SidebarProvider>
            </UploadProvider>
        </WatchTrackerProvider>
    )
}

const INSTALL_PROMPT_DISMISSED_AT = 'animref:pwa-install-prompt-dismissed-at';
const INSTALL_PROMPT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

function MobileInstallAfterLogin() {
    const pathname = usePathname();
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
                // The install instructions remain available if registration fails.
            });
        }

        if (!isMobileInstallCandidate() || isAppInstalled()) return;

        let requestedAfterLogin = false;
        let recentlyDismissed = false;
        try {
            requestedAfterLogin = sessionStorage.getItem('showMobileInstallPrompt') === '1';
            if (requestedAfterLogin) sessionStorage.removeItem('showMobileInstallPrompt');

            const dismissedAt = Number(localStorage.getItem(INSTALL_PROMPT_DISMISSED_AT) || 0);
            recentlyDismissed = dismissedAt > 0 && Date.now() - dismissedAt < INSTALL_PROMPT_COOLDOWN_MS;
        } catch {
            // Some privacy modes block browser storage. The prompt can still work.
        }

        // Previously only /references could ever show this, which is most of why
        // it seemed never to appear. Now it can surface anywhere except the
        // full-screen tools (where a bar dropping over the canvas is disruptive)
        // and the auth/extension hand-off screens, which are mid-flow.
        const suppressedPaths = ['/paint', '/moodboard', '/board', '/login', '/extension', '/clip'];
        const onSuppressedPath = suppressedPaths.some((path) => pathname.startsWith(path));

        const shouldPrompt = requestedAfterLogin || (!onSuppressedPath && !recentlyDismissed);
        if (!shouldPrompt) return;

        const timer = window.setTimeout(() => setShowPrompt(true), 700);
        return () => window.clearTimeout(timer);
    }, [pathname]);

    const handleOpenChange = (open: boolean) => {
        setShowPrompt(open);
        if (!open) {
            try {
                localStorage.setItem(INSTALL_PROMPT_DISMISSED_AT, String(Date.now()));
            } catch {
                // Closing the dialog should always work, even when storage is blocked.
            }
        }
    };

    return showPrompt ? <MobileInstallBanner onDismiss={() => handleOpenChange(false)} /> : null;
}

function SimulateTierButton({ tier, label, fullWidth }: { tier: string, label: string, fullWidth?: boolean }) {
    const { user } = useAuth();
    const { db } = useFirebase();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleSetTier = async () => {
        if (!user || !db) return;
        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                tier: tier === 'reset' ? null : tier,
                isPremium: tier !== 'reset'
            });
            toast({
                title: tier === 'reset' ? "Restored Admin Privileges" : `Tier set to ${label}`,
                description: tier === 'reset' ? "You now have unlimited access." : "Limits updated."
            });
            window.location.reload();
        } catch (error) {
            console.error("Error setting tier:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update tier." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleSetTier}
            disabled={loading}
            className={cn(
                "h-7 text-xs bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400",
                fullWidth && "w-full"
            )}
        >
            {loading ? "..." : label}
        </Button>
    )
}
