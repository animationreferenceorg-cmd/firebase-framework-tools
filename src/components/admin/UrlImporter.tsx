'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Loader2, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadSocialVideo } from '@/app/actions/downloader';
import { useRouter } from 'next/navigation';

export function UrlImporter({ onImported }: { onImported?: () => void }) {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleImport = async () => {
        if (!url.trim()) return;
        setLoading(true);
        try {
            const result = await downloadSocialVideo(url);

            if (result.success) {
                toast({
                    title: "Import Successful",
                    description: "Video has been downloaded and added to your library.",
                });
                setOpen(false);
                setUrl('');
                if (onImported) onImported();
                router.refresh();
            } else {
                console.error("Import error:", result.error);
                toast({
                    variant: "destructive",
                    title: "Import Failed",
                    description: result.error || "Could not download video. Make sure Python and yt-dlp are installed.",
                });
            }
        } catch (error: any) {
            console.error("Import exception:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                    <Download className="h-4 w-4" />
                    Import URL
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Import from URL</DialogTitle>
                    <DialogDescription>
                        Paste a link from Instagram, TikTok, YouTube, etc. to download and save it to your library.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Input
                            id="url"
                            placeholder="https://www.instagram.com/reel/..."
                            className="col-span-4"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    {loading && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Downloading and processing... this may take a moment.
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
                    <Button onClick={handleImport} disabled={loading || !url}>
                        {loading ? 'Importing...' : 'Import Video'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
