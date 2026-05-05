'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  displayName?: string;
  role?: string;
  isPremium?: boolean;
  tier?: string;
  subscriptionStatus?: string;
  updatedAt?: string;
  createdAt?: string;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        
        // Sort by email
        usersList.sort((a, b) => {
          if (!a.email) return 1;
          if (!b.email) return -1;
          return a.email.localeCompare(b.email);
        });
        
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUsers();
  }, []);

  const handleSyncUser = async (userId: string, email: string) => {
    if (!userId || !email) return;
    setSyncingId(userId);
    try {
      const response = await fetch('/api/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Synced', description: `User ${email} synced: ${data.tier}` });
        // Update local state
        setUsers(users.map(u => u.id === userId ? { ...u, isPremium: true, tier: data.tier } : u));
      } else {
        toast({ title: 'Status', description: data.message });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: 'Failed to sync user.', variant: 'destructive' });
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Users & Subscriptions</CardTitle>
            <CardDescription>Manage user accounts and view subscription status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Users & Subscriptions</CardTitle>
          <CardDescription>Manage user accounts and view subscription status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-border hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium text-foreground">{user.displayName || 'No Name'}</div>
                      <div className="text-sm text-muted-foreground">{user.email || 'No Email'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role || 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.isPremium ? (
                          <Badge className="bg-green-600 hover:bg-green-700 text-white">Premium</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Free</Badge>
                        )}
                        {user.subscriptionStatus && (
                          <span className="text-xs text-muted-foreground capitalize">
                            ({user.subscriptionStatus})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.tier ? (
                        <span className="capitalize text-foreground font-medium">
                          {user.tier === 'tier1' ? '$1 Supporter' : user.tier === 'tier2' ? '$2 Super Fan' : user.tier === 'tier5' ? '$5 Pro' : user.tier}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={syncingId === user.id}
                        onClick={() => handleSyncUser(user.id, user.email)}
                        className="h-8 border border-white/5"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncingId === user.id ? 'animate-spin' : ''}`} />
                        Sync Stripe
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
