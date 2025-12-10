
'use client';

import { useUpload } from '@/hooks/use-upload';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { UploadCloud, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function UploadProgressManager() {
  const { uploads, clearUpload } = useUpload();

  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-full max-w-sm space-y-2">
      {uploads.map((upload) => (
        <Card key={upload.id} className="shadow-2xl bg-background/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between p-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {upload.status === 'uploading' && <UploadCloud className="h-5 w-5 animate-pulse" />}
              {upload.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {upload.status === 'error' && <AlertTriangle className="h-5 w-5 text-destructive" />}
              <span className="truncate max-w-[200px]">{upload.fileName}</span>
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => clearUpload(upload.id)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Progress value={upload.progress} className={cn(
                upload.status === 'error' && '[&>div]:bg-destructive'
            )} />
            <div className="text-xs text-muted-foreground mt-1 text-right">
                {upload.status === 'uploading' && `${Math.round(upload.progress)}%`}
                {upload.status === 'success' && 'Upload complete!'}
                {upload.status === 'error' && 'Upload failed.'}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
