
'use client';

import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarTrigger, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clapperboard, Film, Home, LayoutGrid, List, Rss, Shield, BookCopy, Star } from 'lucide-react';
import AuthHeader from '@/components/AuthHeader';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from './ui/skeleton';
import { useEffect, useState } from 'react';
import { UploadProvider } from '@/hooks/use-upload';
import { UploadProgressManager } from './UploadProgressManager';
import { cn } from '@/lib/utils';

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const { userProfile, loading: userProfileLoading } = useUser();
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const loading = authLoading || userProfileLoading;
  
  const isAdminPage = pathname.startsWith('/admin');

  if (isAdminPage) {
    return (
        <UploadProvider>
            {children}
            <UploadProgressManager />
        </UploadProvider>
    );
  }

  // This prevents hydration errors by ensuring the server and client render the same initial skeleton.
  if (!isClient) {
    return <div className="flex h-screen w-full bg-background"><div className="w-[16rem] hidden md:block bg-sidebar h-full" /><main className="flex-1" /></div>;
  }
  
  const isAdmin = userProfile?.role === 'admin';

  return (
    <UploadProvider>
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
            <div className="flex items-center gap-2">
                <div className="bg-primary p-1.5 rounded-md">
                    <Clapperboard className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className={cn("text-xl font-bold text-sidebar-foreground tracking-wider", "group-data-[collapsible=icon]:hidden")}>
                    Animation Reference
                </h1>
            </div>
        </SidebarHeader>
        <SidebarContent>
             <SidebarGroup>
                <SidebarGroupLabel>Discover</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link href="/">
                            <SidebarMenuButton tooltip="Home">
                                <Home />
                                <span>Home</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <Link href="/browse">
                            <SidebarMenuButton tooltip="Categories">
                                <LayoutGrid />
                                <span>Categories</span>
                            </SidebarMenuButton>
                         </Link>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                         <Link href="/shorts">
                            <SidebarMenuButton tooltip="Short Films">
                                <Film />
                                <span>Short Films</span>
                            </SidebarMenuButton>
                         </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <Link href="/feed">
                            <SidebarMenuButton tooltip="Feed">
                                <Rss />
                                <span>Feed</span>
                            </SidebarMenuButton>
                         </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
             <SidebarGroup>
                <SidebarGroupLabel>My Library</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                         <Link href="/list">
                            <SidebarMenuButton tooltip="My List">
                                <List />
                                <span>My List</span>
                            </SidebarMenuButton>
                         </Link>
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
                            <Link href="/admin">
                                <SidebarMenuButton tooltip="Admin Dashboard">
                                    <Shield />
                                    <span>Admin Panel</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
               </>
            )}
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          {loading ? (
             <div className="flex flex-col gap-2 p-2">
                <div className="flex items-center gap-2 p-2 rounded-md">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex flex-col text-sm overflow-hidden gap-1 w-full">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                </div>
            </div>
          ) : user && (
            <div className="flex flex-col gap-2 p-2">
                <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-accent">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} data-ai-hint="user avatar" />
                      <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-sm overflow-hidden">
                        <p className="font-semibold text-sidebar-accent-foreground truncate">{user.displayName || 'Guest User'}</p>
                        <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
                    </div>
                </div>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b">
              <SidebarTrigger className="text-white" />
              <div className="flex-1" />
              <AuthHeader />
          </header>
          <div className="flex-1">
              {children}
          </div>
        </div>
        <UploadProgressManager />
      </SidebarInset>
    </SidebarProvider>
    </UploadProvider>
  )
}
