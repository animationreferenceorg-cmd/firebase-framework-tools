
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Video, LayoutGrid } from 'lucide-react';

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-foreground">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">Welcome to the Animation Reference content management system. Here you can manage videos and categories.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video />
              Manage Videos
            </CardTitle>
            <CardDescription>Add, edit, or remove videos and short films from the library.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
                <Link href="/admin/videos">Go to Videos</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <LayoutGrid />
                Manage Categories
            </CardTitle>
            <CardDescription>Organize, create, and update the content categories for browsing.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button asChild>
                <Link href="/admin/categories">Go to Categories</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
