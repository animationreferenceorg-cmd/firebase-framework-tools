
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LayoutGrid,
  Shield,
  Video,
  Film,
  BookCopy,
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import AuthHeader from '@/components/AuthHeader';

function AdminNav() {
    const pathname = usePathname();
    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: Shield },
        { href: '/admin/videos', label: 'Videos', icon: Video },
        { href: '/admin/categories', label: 'Categories', icon: LayoutGrid },
        { href: '/admin/shorts', label: 'Short Films', icon: Film },
    ];
    
    return (
        <nav className="grid items-start gap-2 text-sm font-medium">
            {navItems.map(item => (
                 <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                        pathname.startsWith(item.href) && item.href !== '/admin' && 'bg-accent text-primary',
                        pathname === item.href && item.href === '/admin' && 'bg-accent text-primary'
                    )}
                >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                </Link>
            ))}
        </nav>
    );
}


export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!userProfile || userProfile.role !== 'admin') {
      router.push('/login');
    }
  }, [userProfile, loading, router]);

  if (loading) {
    return (
       <div className="admin-theme">
        <div className="flex h-screen w-full bg-background">
          <div className="hidden w-64 flex-col gap-4 border-r bg-muted p-4 md:flex">
              <Skeleton className="h-8 w-32" />
              <div className="flex flex-col gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
              </div>
          </div>
          <div className="flex-1 p-8">
              <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (userProfile?.role !== 'admin') {
    return null;
  }
  
  const getPageTitle = (path: string) => {
    if (path.includes('/admin/shorts/edit')) return 'Edit Short Film';
    if (path.includes('/admin/videos/edit')) return 'Edit Video';
    if (path.includes('/admin/categories/edit')) return 'Edit Category';
    if (path.includes('/admin/categories/')) return 'Category Details';
    if (path.includes('/admin/references/edit')) return 'Edit Reference';
    if (path === '/admin') return 'Dashboard';
    const segment = path.split('/')[2];
    if (!segment) return 'Dashboard';
    const pageName = segment.split('/')[0];
    return pageName.charAt(0).toUpperCase() + pageName.slice(1);
  }

  return (
    <div className="admin-theme">
      <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-background md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
                <Home className="h-6 w-6" />
                <span className="">Back to Site</span>
              </Link>
            </div>
            <div className="flex-1">
              <AdminNav />
            </div>
          </div>
        </div>
        <div className="flex flex-col relative overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
              <div className="w-full flex-1">
                  <h1 className="text-xl font-semibold text-foreground">
                      {getPageTitle(pathname)}
                  </h1>
              </div>
              <AuthHeader />
          </header>
          <main className="h-full overflow-y-auto p-4 lg:p-6 bg-muted">
              {children}
          </main>
        </div>
      </div>
    </div>
  );
}
