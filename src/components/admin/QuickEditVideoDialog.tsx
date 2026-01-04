import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Video, Category } from "@/lib/types";
import { CategoryPicker } from "./CategoryPicker";
import { TagPicker } from "./TagPicker";
import { VideoPlayer } from "@/components/VideoPlayer";
import { doc, updateDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface QuickEditVideoDialogProps {
    video: Video | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
    allCategories: Category[];
    allTags: string[];
}

export function QuickEditVideoDialog({
    video,
    open,
    onOpenChange,
    onSave,
    allCategories,
    allTags,
}: QuickEditVideoDialogProps) {
    const { toast } = useToast();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [categoryIds, setCategoryIds] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'thumbnail'>('details');

    useEffect(() => {
        if (video) {
            setTitle(video.title);
            setDescription(video.description || "");
            setCategoryIds(video.categoryIds || []);
            setTags(video.tags || []);
            setThumbnailUrl(video.thumbnailUrl || "");
        }
    }, [video]);

    const handleSave = async () => {
        if (!video || !db) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, "videos", video.id), {
                title,
                description,
                categoryIds,
                tags,
                thumbnailUrl,
            });
            toast({ title: "Video Updated", description: "Changes saved successfully." });
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error("Error updating video:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update video." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCapture = async (dataUrl: string) => {
        if (!video || !storage) return;

        // Path: thumbnails/{videoId}_{timestamp}.jpg
        const timestamp = Date.now();
        const storageRef = ref(storage, `thumbnails/${video.id}_${timestamp}.jpg`);

        try {
            await uploadString(storageRef, dataUrl, 'data_url');
            const url = await getDownloadURL(storageRef);
            setThumbnailUrl(url);
            toast({ title: "Thumbnail Captured", description: "Thumbnail uploaded and ready to save." });
        } catch (error: any) {
            console.error("Error uploading thumbnail:", error);
            // Fallback error message handling
            const msg = error.code === 'storage/unauthorized'
                ? "Permission denied. Please ensure firebase storage rules are deployed."
                : "Could not upload captured frame.";
            toast({ variant: "destructive", title: "Upload Failed", description: msg });
        }
    }

    if (!video) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Quick Edit: {video.title}</DialogTitle>
                    <DialogDescription>
                        Modify details or capture a new thumbnail.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 mb-4">
                    <Button variant={activeTab === 'details' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('details')}>Details</Button>
                    <Button variant={activeTab === 'thumbnail' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('thumbnail')}>Thumbnail</Button>
                </div>

                <div className="space-y-4 py-2">
                    {activeTab === 'details' && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Categories</Label>
                                <CategoryPicker
                                    selectedIds={categoryIds}
                                    onChange={setCategoryIds}
                                    allCategories={allCategories}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Tags</Label>
                                <TagPicker
                                    selectedTags={tags}
                                    onChange={setTags}
                                    allTags={allTags}
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'thumbnail' && (
                        <div className="space-y-4">
                            <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                                {/* Using the actual video URL for player to capture from */}
                                <VideoPlayer
                                    video={{ ...video, videoUrl: video.videoUrl }}
                                    showCaptureButton={true}
                                    onCapture={handleCapture}
                                    startsPaused
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="shrink-0">
                                    <Label>Current Thumbnail</Label>
                                    <div className="mt-2 w-32 aspect-video bg-muted rounded-md overflow-hidden border">
                                        {thumbnailUrl ? (
                                            <img src={thumbnailUrl} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No Image</div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground flex-1">
                                    <p>Play the video to the desired frame and click <strong>"Capture Frame"</strong> (camera icon) in the player controls.</p>
                                    <p className="mt-1 text-xs">This will upload the image immediately. Click Save to apply changes to the video.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
