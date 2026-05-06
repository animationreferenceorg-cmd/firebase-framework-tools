
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, CheckCircle2, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: any;
  status: 'new' | 'reviewed' | 'resolved';
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Feedback));
      setFeedback(list);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch feedback.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'feedback', id), { status });
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: status as any } : f));
      toast({ title: 'Status Updated', description: `Feedback marked as ${status}.` });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update status.' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'feedback', id));
      setFeedback(prev => prev.filter(f => f.id !== id));
      toast({ title: 'Feedback Deleted' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete feedback.' });
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Feedback</h1>
          <p className="text-muted-foreground">Manage and respond to user-submitted feedback.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
          <CardDescription>A list of all feedback messages sent by users.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="w-[40%]">Feedback</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading feedback...</TableCell></TableRow>
              ) : feedback.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">No feedback found.</TableCell></TableRow>
              ) : (
                feedback.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.createdAt?.toDate ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{item.userEmail}</span>
                        <span className="text-[10px] text-muted-foreground">{item.userId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm line-clamp-2 hover:line-clamp-none transition-all cursor-default">
                        {item.content}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'new' ? 'default' : item.status === 'resolved' ? 'secondary' : 'outline'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Manage Status</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleStatusUpdate(item.id, 'reviewed')}>
                            <Clock className="mr-2 h-4 w-4" /> Mark as Reviewed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusUpdate(item.id, 'resolved')}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Resolved
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
