

'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, doc, writeBatch, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState, useCallback, KeyboardEvent, useMemo } from "react";
import type { Category, Video } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Film, Image as ImageIcon, Camera, PlusCircle, Search, X, GripVertical, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { VideoPlayer } from "@/components/VideoPlayer"
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"
import { createDraftCategory, deleteTag, updateCategoryTags, updateTagGroups } from "@/lib/firestore"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useUpload } from "@/hooks/use-upload";
import { downloadSocialVideo } from "@/app/actions/downloader";
import { Loader2 } from "lucide-react";

import { DndContext, closestCenter, type DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core';



import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"

const formSchema = (isShort: boolean, isReference: boolean) => z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),

  videoSourceType: z.enum(['url', 'upload', 'import']).default('url'),
  videoUrl: z.string().optional(),
  videoFile: z.any().optional(),

  thumbnailSourceType: z.enum(['url', 'upload', 'capture']).default('url'),
  thumbnailUrl: z.string().optional(),
  thumbnailFile: z.any().optional(),

  tags: z.array(z.string()).min(isReference ? 0 : 1, "Please add at least one tag."),
  categoryIds: z.array(z.string()).min(isReference ? 0 : 1, "Please select at least one category."),
}).superRefine((data, ctx) => {
  if (data.videoSourceType === 'url' && (!data.videoUrl || data.videoUrl.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Video URL is required.", path: ['videoUrl'] });
  }
  if (data.videoSourceType === 'social' && (!data.videoUrl || data.videoUrl.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Social URL is required.", path: ['videoUrl'] });
  }
  if (data.thumbnailSourceType === 'url' && (!data.thumbnailUrl || data.thumbnailUrl.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Thumbnail URL is required.", path: ['thumbnailUrl'] });
  }
});

type FormValues = z.infer<ReturnType<typeof formSchema>>;

function UploadPlaceholder({ text, icon: Icon }: { text: string, icon: React.ElementType }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-center p-2 rounded-lg">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-xs text-muted-foreground">{text}</p>
    </div>
  )
}

function ImageCaptureDialog({ videoSrc, onCapture, triggerText, title, description, disabled }: { videoSrc: string, onCapture: (dataUrl: string) => void, triggerText: string, title: string, description: string, disabled: boolean }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCapture = (dataUrl: string) => {
    onCapture(dataUrl);
    setIsDialogOpen(false);
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <Camera className="mr-2 h-4 w-4" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 border-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <VideoPlayer
            video={{ id: 'capture', videoUrl: videoSrc, title: 'Capture Preview', thumbnailUrl: '' } as any}
            onCapture={handleCapture}
            showCaptureButton
            startsPaused
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

const TAG_SECTION_ORDER = ['Action & Combat', 'Effects & Technical', 'Character & Movement', 'Subject & Genre', 'Uncategorized'];
const TAG_GROUP_MAP: { [key: string]: (tag: string) => boolean } = {
  'Action & Combat': tag => ['action', 'fight', 'combat', 'impact', 'explosion', 'sakuga'].some(keyword => tag.includes(keyword)),
  'Effects & Technical': tag => ['fx', 'elemental', 'water', 'fire', 'smoke', 'camera', 'layout', 'cinematography'].some(keyword => tag.includes(keyword)),
  'Character & Movement': tag => ['character', 'acting', 'emotion', 'walk', 'run', 'cycle', 'locomotion', 'fundamentals'].some(keyword => tag.includes(keyword)),
  'Subject & Genre': tag => ['creature', 'monster', 'animal', 'mecha', 'robot', 'sci-fi', 'storytelling', 'abstract'].some(keyword => tag.includes(keyword)),
};

function DroppableTagGroup({ id, title, tags, mode, selectedTags, onTagToggle }: { id: string, title: string, tags: string[], mode: 'select' | 'edit', selectedTags: string[], onTagToggle: (tag: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: mode !== 'edit' });

  return (
    <div ref={setNodeRef} className={cn("p-4 rounded-lg border-2 border-dashed", (mode === 'edit' && isOver) ? "border-primary" : "border-border")}>
      <h4 className="font-bold mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2 min-h-10">
        {tags.map(tag => (
          mode === 'edit' ? (
            <DraggableTagBadge key={tag} tag={tag} />
          ) : (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? 'default' : 'outline'}
              onClick={() => onTagToggle(tag)}
              className="cursor-pointer"
            >
              {tag}
            </Badge>
          )
        ))}
        {tags.length === 0 && mode === 'edit' && <div className="text-sm text-muted-foreground w-full text-center py-2">Drag tags here</div>}
      </div>
    </div>
  );
}

function DraggableTagBadge({ tag }: { tag: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: tag, data: { tag } });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn("relative", isDragging && "z-10")}>
      <Badge variant="outline" className="cursor-grab active:cursor-grabbing flex items-center gap-1">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
        {tag}
      </Badge>
    </div>
  );
}

function BrowseTagsDialog({ onTagsSelected, currentSelectedTags, allTags, loading, isShort, onRefresh }: { onTagsSelected: (tags: string[]) => void, currentSelectedTags: string[], allTags: string[], loading: boolean, isShort: boolean, onRefresh: () => void }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mode, setMode] = useState<'select' | 'edit'>('select');
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));
  const { toast } = useToast();

  const [groupedTags, setGroupedTags] = useState<{ [key: string]: string[] }>({
    'Action & Combat': [], 'Effects & Technical': [], 'Character & Movement': [], 'Subject & Genre': [], 'Uncategorized': []
  });

  const organizeTagsIntoGroups = useCallback((tags: string[]) => {
    const groups: { [key: string]: string[] } = {
      'Action & Combat': [], 'Effects & Technical': [], 'Character & Movement': [], 'Subject & Genre': [], 'Uncategorized': []
    };

    tags.forEach(tag => {
      let groupFound = false;
      for (const groupName in TAG_GROUP_MAP) {
        if (TAG_GROUP_MAP[groupName](tag)) {
          groups[groupName].push(tag);
          groupFound = true;
          break;
        }
      }
      if (!groupFound) {
        groups['Uncategorized'].push(tag);
      }
    });
    return groups;
  }, []);

  useEffect(() => {
    if (isDialogOpen) {
      setSelectedTags(currentSelectedTags);
      setGroupedTags(organizeTagsIntoGroups(allTags));
      setMode('select');
    }
  }, [isDialogOpen, currentSelectedTags, allTags, organizeTagsIntoGroups]);

  const handleDragStart = (event: any) => setActiveId(event.active.id);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over || !active) return;

    const activeTag = active.id as string;
    const overContainer = over.id as string;

    const activeContainer = Object.keys(groupedTags).find(key => groupedTags[key]?.includes(activeTag));
    if (!activeContainer || activeContainer === overContainer) return;

    // Optimistic UI update
    setGroupedTags(prev => {
      const newGroups = { ...prev };
      newGroups[activeContainer] = newGroups[activeContainer]?.filter(t => t !== activeTag) ?? [];
      if (!newGroups[overContainer]) newGroups[overContainer] = [];
      newGroups[overContainer].push(activeTag);
      return newGroups;
    });

    // Update in Firestore
    try {
      await updateTagGroups(activeTag, overContainer, isShort);
      toast({ title: "Tag Group Updated", description: `Moved "${activeTag}" to ${overContainer}.` });
      onRefresh();
    } catch (e) {
      console.error("Failed to move tag", e);
      toast({ variant: 'destructive', title: "Move Failed", description: "Could not update tag group." });
      onRefresh(); // Revert on failure
    }
  };

  const handleTagToggle = (tag: string) => {
    if (mode === 'edit') return;
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  const handleApplyTags = () => {
    onTagsSelected(selectedTags);
    setIsDialogOpen(false);
  }

  const handleDeleteTag = async (tag: string) => {
    try {
      await deleteTag(tag, isShort);
      toast({ title: 'Tag Deleted', description: `The tag "${tag}" has been removed.` });
      onTagsSelected(selectedTags.filter(t => t !== tag));
      onRefresh();
    } catch (e) {
      console.error('Failed to delete tag', e);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the tag.' });
    }
  }

  const activeTag = activeId ? allTags.find(t => t === activeId) : null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          Browse Existing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle>Browse &amp; Organize Tags</DialogTitle>
              <DialogDescription>
                {mode === 'select' ? 'Click on tags to add them.' : 'Drag and drop tags to organize them into groups.'}
              </DialogDescription>
            </div>
            <Button variant={mode === 'edit' ? 'default' : 'outline'} onClick={() => setMode(prev => prev === 'select' ? 'edit' : 'select')}>
              <Edit className="mr-2 h-4 w-4" />
              {mode === 'select' ? 'Organize' : 'Done'}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="space-y-4">
              {TAG_SECTION_ORDER.map(section => (
                (groupedTags[section] && groupedTags[section].length > 0) || mode === 'edit' ? (
                  <DroppableTagGroup
                    key={section}
                    id={section}
                    title={section}
                    tags={groupedTags[section] || []}
                    mode={mode}
                    selectedTags={selectedTags}
                    onTagToggle={handleTagToggle}
                  />
                ) : null
              ))}
            </div>
            <DragOverlay>
              {activeTag && mode === 'edit' ? <Badge variant="default" className="cursor-grabbing">{activeTag}</Badge> : null}
            </DragOverlay>
          </DndContext>
        </div>

        <DialogFooter>
          <Button onClick={() => setIsDialogOpen(false)} variant="ghost">Cancel</Button>
          <Button onClick={handleApplyTags} type="button">Apply Tags</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SECTION_ORDER = ['Studio', 'Medium', 'Action', 'Other'];

function DroppableCategoryGroup({ id, title, categories, mode, selectedCategoryIds, onCategoryToggle }: { id: string, title: string, categories: Category[], mode: 'select' | 'edit', selectedCategoryIds: string[], onCategoryToggle: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: mode !== 'edit' });

  return (
    <div ref={setNodeRef} className={cn("p-4 rounded-lg border-2 border-dashed", (mode === 'edit' && isOver) ? "border-primary" : "border-border")}>
      <h4 className="font-bold mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2 min-h-10">
        {categories.map(cat => (
          mode === 'edit' ? (
            <DraggableCategoryBadge key={cat.id} category={cat} />
          ) : (
            <Badge
              key={cat.id}
              variant={selectedCategoryIds.includes(cat.id) ? 'default' : 'outline'}
              onClick={() => onCategoryToggle(cat.id)}
              className="cursor-pointer"
            >
              {cat.title}
            </Badge>
          )
        ))}
        {categories.length === 0 && mode === 'edit' && <div className="text-sm text-muted-foreground w-full text-center py-2">Drag categories here</div>}
      </div>
    </div>
  );
}


function DraggableCategoryBadge({ category }: { category: Category }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: category.id, data: { category } });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn("relative", isDragging && "z-10")}>
      <Badge variant="outline" className="cursor-grab active:cursor-grabbing flex items-center gap-1">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
        {category.title}
      </Badge>
    </div>
  );
}


function BrowseCategoriesDialog({ onCategoriesSelected, onCategoryCreated, allCategories, currentSelectedIds, onRefresh, loading, isShort }: { onCategoriesSelected: (cats: Category[]) => void, onCategoryCreated: (cat: Category) => void, allCategories: Category[], currentSelectedIds: string[], onRefresh: () => void, loading: boolean, isShort: boolean }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));
  const { toast } = useToast();
  const [mode, setMode] = useState<'select' | 'edit'>('select');

  const [groupedCategories, setGroupedCategories] = useState<{ [key: string]: Category[] }>({
    'Studio': [], 'Medium': [], 'Action': [], 'Other': []
  });

  const organizeCategoriesIntoGroups = useCallback((categories: Category[]) => {
    const groups: { [key: string]: Category[] } = {
      'Studio': [], 'Medium': [], 'Action': [], 'Other': []
    };

    categories.forEach(category => {
      let groupFound = false;
      if (category.tags?.includes('Studio')) {
        groups['Studio'].push(category);
        groupFound = true;
      }
      if (category.tags?.includes('Medium')) {
        groups['Medium'].push(category);
        groupFound = true;
      }
      if (category.tags?.includes('Action')) {
        groups['Action'].push(category);
        groupFound = true;
      }
      if (!groupFound) {
        groups['Other'].push(category);
      }
    });
    return groups;
  }, []);

  useEffect(() => {
    if (isDialogOpen) {
      setSelectedCategoryIds(currentSelectedIds);
      setGroupedCategories(organizeCategoriesIntoGroups(allCategories));
      setMode('select'); // Reset to select mode on open
    }
  }, [isDialogOpen, currentSelectedIds, allCategories, organizeCategoriesIntoGroups]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const activeCategory = allCategories.find(c => c.id === active.id);
    if (!activeCategory) return;

    const activeContainer = Object.keys(groupedCategories).find(key => groupedCategories[key]?.some(c => c.id === active.id));
    const overContainer = over.id as string;

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    // Optimistically update UI
    setGroupedCategories(prev => {
      const newGroups = { ...prev };
      if (newGroups[activeContainer]) {
        newGroups[activeContainer] = newGroups[activeContainer].filter(c => c.id !== active.id);
      }
      if (!newGroups[overContainer]) {
        newGroups[overContainer] = [];
      }
      newGroups[overContainer].push(activeCategory);
      return newGroups;
    });

    // Update tags in Firestore
    try {
      const newTags = (activeCategory.tags || []).filter(t => !['Studio', 'Medium', 'Action'].includes(t));
      if (overContainer !== 'Other') {
        newTags.push(overContainer);
      }
      await updateCategoryTags(activeCategory.id, newTags);
      toast({ title: "Category Moved", description: `Moved "${activeCategory.title}" to ${overContainer}.` });
      onRefresh(); // Refresh data from Firestore to confirm change
    } catch (e) {
      console.error("Failed to move category", e);
      toast({ variant: 'destructive', title: "Move Failed", description: "Could not update category group." });
      onRefresh(); // Revert UI on failure
    }
  };

  const activeCategory = useMemo(() => allCategories.find(c => c.id === activeId), [activeId, allCategories]);

  const handleCategoryToggle = (catId: string) => {
    if (mode === 'edit') return;
    setSelectedCategoryIds(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleApply = () => {
    const selected = allCategories.filter(cat => selectedCategoryIds.includes(cat.id));
    onCategoriesSelected(selected);
    setIsDialogOpen(false);
  }

  const handleCreateSuccess = (newCategory: Category) => {
    onRefresh();
    onCategoryCreated(newCategory);
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          Browse Existing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle>Browse &amp; Organize Categories</DialogTitle>
              <DialogDescription>
                {mode === 'select' ? 'Click on categories to add them to this video.' : 'Drag and drop categories to re-organize them into groups.'}
              </DialogDescription>
            </div>
            <Button variant={mode === 'edit' ? 'default' : 'outline'} onClick={() => setMode(prev => prev === 'select' ? 'edit' : 'select')}>
              <Edit className="mr-2 h-4 w-4" />
              {mode === 'select' ? 'Organize' : 'Done'}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="space-y-4">
              {SECTION_ORDER.map(section => (
                (groupedCategories[section] && groupedCategories[section].length > 0) || mode === 'edit' ? (
                  <DroppableCategoryGroup
                    key={section}
                    id={section}
                    title={section}
                    categories={groupedCategories[section] || []}
                    mode={mode}
                    selectedCategoryIds={selectedCategoryIds}
                    onCategoryToggle={handleCategoryToggle}
                  />
                ) : null
              ))}
            </div>
            <DragOverlay>
              {activeCategory && mode === 'edit' ? <Badge variant="default" className="cursor-grabbing">{activeCategory.title}</Badge> : null}
            </DragOverlay>
          </DndContext>
        </div>

        <DialogFooter>
          <Button onClick={() => setIsDialogOpen(false)} variant="ghost">Cancel</Button>
          <Button onClick={handleApply} type="button">Apply Categories</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface VideoFormProps {
  video?: Video;
  isShort: boolean;
  isReference?: boolean;
  defaultFolderId?: string | null;
}

export default function VideoForm({ video, isShort, isReference = false, defaultFolderId }: VideoFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { startUpload, finishUpload } = useUpload();
  const [tagInput, setTagInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');

  const [allTags, setAllTags] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const fetchTags = useCallback(async () => {
    const collectionName = isShort ? 'shortFilmTags' : 'tags';
    const tagsCollection = collection(db, collectionName);
    const tagsSnapshot = await getDocs(tagsCollection);
    return tagsSnapshot.docs.map(doc => doc.id);
  }, [isShort]);

  const fetchCategories = useCallback(async () => {
    const collectionName = isShort ? 'shortFilmCategories' : 'categories';
    const catCollection = collection(db, collectionName);
    const catSnapshot = await getDocs(catCollection);
    // For shorts, categories are just strings, not full objects
    if (isShort) {
      return catSnapshot.docs.map(doc => ({ id: doc.id, title: doc.id, description: '', href: '', status: 'published', tags: [], imageUrl: '' }));
    }
    return catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  }, [isShort]);

  const loadData = useCallback(async () => {
    if (isReference) {
      setLoadingTaxonomy(false);
      return;
    }
    setLoadingTaxonomy(true);
    try {
      const [tags, cats] = await Promise.all([fetchTags(), fetchCategories()]);
      setAllTags(tags.sort());
      setAllCategories(cats.sort((a, b) => a.title.localeCompare(b.title)) as Category[]);
    } catch (e) {
      console.error("Error loading taxonomy", e);
      toast({ variant: 'destructive', title: "Error", description: "Could not load tags and categories." });
    } finally {
      setLoadingTaxonomy(false);
    }
  }, [fetchTags, fetchCategories, toast, isReference]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentFormSchema = useMemo(() => formSchema(isShort, isReference), [isShort, isReference]);

  const form = useForm<FormValues>({
    resolver: zodResolver(currentFormSchema),
    defaultValues: {
      title: video?.title || "",
      description: video?.description || "",
      videoUrl: video?.videoUrl || "",
      videoFile: undefined,
      thumbnailUrl: video?.thumbnailUrl || "",
      thumbnailFile: undefined,
      tags: video?.tags || [],

      categoryIds: video?.categoryIds || (isShort && video?.categories ? allCategories.filter(c => video.categories!.includes(c.title)).map(c => c.id) : []) || [],
      videoSourceType: video?.videoUrl ? 'url' : 'upload',
      thumbnailSourceType: video?.thumbnailUrl ? 'url' : 'upload',
    },
  })

  const { watch, setValue, getValues, control } = form;
  const watchedValues = watch();
  const watchedTitle = watch('title');
  const watchedCategoryIds = watch('categoryIds');

  useEffect(() => {
    const currentDescription = getValues('description');
    if (watchedTitle && (!currentDescription || currentDescription === '')) {
      setValue('description', `${watchedTitle} animation reference`);
    } else if (currentDescription.endsWith(' animation reference')) {
      const titleFromDesc = currentDescription.replace(' animation reference', '');
      if (titleFromDesc !== watchedTitle) {
        setValue('description', `${watchedTitle} animation reference`);
      }
    }
  }, [watchedTitle, getValues, setValue]);

  useEffect(() => {
    if (loadingTaxonomy || isShort) return;

    const selectedCats = allCategories.filter(c => watchedCategoryIds.includes(c.id));
    const newTags = selectedCats.map(c => c.title.toLowerCase().replace(/\s+/g, '-'));

    const currentTags = getValues('tags');
    const tagsToAdd = newTags.filter(t => !currentTags.includes(t));

    if (tagsToAdd.length > 0) {
      const finalTags = [...currentTags, ...tagsToAdd];
      setValue('tags', finalTags, { shouldValidate: true });

      // Also add to master list of tags if they don't exist
      const allSystemTags = new Set(allTags);
      tagsToAdd.forEach(t => allSystemTags.add(t));
      setAllTags(Array.from(allSystemTags).sort());
    }

  }, [watchedCategoryIds, allCategories, getValues, setValue, loadingTaxonomy, isShort, allTags]);

  // Previews
  const [videoPreview, setVideoPreview] = useState<string | null>(video?.videoUrl || null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  useEffect(() => {
    setThumbnailPreview(video?.thumbnailUrl || null)
  }, [video])


  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'videoUrl' || name === 'videoFile' || name === 'videoSourceType') {
        const file = value.videoFile?.[0];
        if (value.videoSourceType === 'upload' && file) {
          setVideoPreview(URL.createObjectURL(file));
        } else {
          setVideoPreview(value.videoUrl || null);
        }
      }
      if (name === 'thumbnailUrl' || name === 'thumbnailFile' || name === 'thumbnailSourceType') {
        const file = value.thumbnailFile?.[0];
        if (value.thumbnailSourceType === 'upload' && file) {
          setThumbnailPreview(URL.createObjectURL(file));
        } else if (value.thumbnailSourceType === 'url') {
          setThumbnailPreview(value.thumbnailUrl || null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);


  const fetchVideoData = useCallback(async (url: string) => {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts?|watch)\/?(?:\?v=)?|v\/|e\/|watch\?v=)|youtu\.be\/)([^"&?\/ ]{11})/;
    const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;

    const youtubeMatch = url.match(youtubeRegex);
    const vimeoMatch = url.match(vimeoRegex);

    let videoId: string | null = null;
    let provider: 'youtube' | 'vimeo' | null = null;

    if (youtubeMatch?.[1]) {
      videoId = youtubeMatch[1];
      provider = 'youtube';
    } else if (vimeoMatch?.[1]) {
      videoId = vimeoMatch[1];
      provider = 'vimeo';
    }

    if (!provider || !videoId) {
      return;
    }

    const canonicalUrl = provider === 'youtube'
      ? `https://www.youtube.com/watch?v=${videoId}`
      : `https://vimeo.com/${videoId}`;

    const oEmbedUrl = `https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`;

    try {
      const response = await fetch(oEmbedUrl);
      const data = await response.json();

      if (data.error) {
        if (data.error !== "no matching providers found") {
          console.error('Error fetching video oEmbed data:', data.error);
          toast({ variant: 'destructive', title: "Metadata Fetch Error", description: "An error occurred while fetching video metadata." });
        }
        return;
      }

      const newTitle = data.title || '';
      const newDescription = data.author_name ? `A film by ${data.author_name}.` : (newTitle ? `${newTitle} animation reference` : '');


      if (newTitle && getValues('title').trim() === '') {
        setValue('title', newTitle, { shouldValidate: true });
      }

      if (newDescription && getValues('description').trim() === '') {
        setValue('description', newDescription, { shouldValidate: true });
      }

      if (data.thumbnail_url) {
        const highResThumbnail = (provider === 'youtube')
          ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
          : data.thumbnail_url;

        setValue('thumbnailUrl', highResThumbnail, { shouldValidate: true });
        setValue('thumbnailSourceType', 'url');
        setThumbnailPreview(highResThumbnail);

      }

      toast({ title: "Metadata Fetched!", description: "Title, description, and images have been auto-filled." });

    } catch (error) {
      console.error('Error in fetchVideoData function:', error);
    }
  }, [getValues, setValue, toast]);


  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name === 'videoUrl' && type === 'change' && value.videoSourceType === 'url' && value.videoUrl) {
        fetchVideoData(value.videoUrl);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, fetchVideoData]);


  const handleCaptureThumbnail = (dataUrl: string) => {
    setValue('thumbnailSourceType', 'capture', { shouldValidate: true });

    setValue('thumbnailUrl', dataUrl, { shouldValidate: true });
    setThumbnailPreview(dataUrl); // Force update preview
    setValue('thumbnailFile', undefined);
  }



  // --- Taxonomy Handlers ---
  const handleAddTag = (tag: string) => {
    const cleanedTag = tag.trim().toLowerCase();
    if (cleanedTag) {
      // Add to the form state if it's not already there
      if (!getValues('tags').includes(cleanedTag)) {
        setValue('tags', [...getValues('tags'), cleanedTag], { shouldValidate: true });
      }
      // Add to the allTags state if it's not already there
      if (!allTags.includes(cleanedTag)) {
        setAllTags(prev => [...prev, cleanedTag].sort());
      }
    }
  };

  const handleTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
      setTagInput('');
    }
  };

  const handleCategoryInputKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newCatTitle = categoryInput.trim();
      if (!newCatTitle) return;

      // Check if category already exists (case-insensitive)
      const existingCategory = allCategories.find(c => c.title.toLowerCase() === newCatTitle.toLowerCase());

      let categoryId;
      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        // Create new draft category if it doesn't exist
        try {
          const newCategory = await createDraftCategory(newCatTitle);
          if (newCategory) {
            setAllCategories(prev => [...prev, newCategory].sort((a, b) => a.title.localeCompare(b.title)));
            categoryId = newCategory.id;
            toast({
              title: "Draft Category Created",
              description: `"${newCatTitle}" has been added to the Categories CMS.`,
            });
          }
        } catch (error) {
          console.error("Error creating draft category:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not create the new category.",
          });
          return;
        }
      }

      if (categoryId && !getValues('categoryIds').includes(categoryId)) {
        setValue('categoryIds', [...getValues('categoryIds'), categoryId], { shouldValidate: true });
      }

      setCategoryInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', getValues('tags').filter(tag => tag !== tagToRemove), { shouldValidate: true });
  };

  const handleTagsSelectedFromDialog = (tags: string[]) => {
    setValue('tags', tags, { shouldValidate: true });
  };

  const handleRemoveCategory = (categoryIdToRemove: string) => {
    setValue('categoryIds', getValues('categoryIds').filter(id => id !== categoryIdToRemove), { shouldValidate: true });
  };

  const handleCategoriesSelectedFromDialog = (cats: Category[]) => {
    const currentIds = getValues('categoryIds');
    const newIds = [...new Set([...currentIds, ...cats.map(c => c.id)])];
    setValue('categoryIds', newIds, { shouldValidate: true });
  };

  const handleCategoryCreated = (cat: Category) => {
    const currentIds = getValues('categoryIds');
    if (!currentIds.includes(cat.id)) {
      setValue('categoryIds', [...currentIds, cat.id], { shouldValidate: true });
    }
  };

  async function uploadFile(file: File, folder: string): Promise<string> {
    const uploadId = startUpload(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error("Upload API response error:", errorBody);
        throw new Error(`Upload failed: ${res.statusText} `);
      }

      const data = await res.json();
      finishUpload(uploadId, 'success');
      return data.url;

    } catch (error) {
      console.error(error);
      finishUpload(uploadId, 'error');
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: `The file ${file.name} could not be uploaded.`,
      });
      throw error;
    }
  }

  async function saveVideo(values: FormValues, statusOverride?: 'published' | 'draft') {
    try {
      let videoUrl = values.videoUrl;
      if (values.videoSourceType === 'upload' && values.videoFile?.[0]) {
        const folder = isReference ? 'Admin Videos/References' : (isShort ? 'shorts' : 'videos');
        videoUrl = await uploadFile(values.videoFile[0], folder);
      }

      let thumbnailUrl = values.thumbnailUrl;
      if (values.thumbnailSourceType === 'upload' && values.thumbnailFile?.[0]) {
        thumbnailUrl = await uploadFile(values.thumbnailFile[0], 'thumbnails');
      }

      const dataToSave: Partial<Video> = {
        title: values.title,
        description: values.description,
        videoUrl: videoUrl || '',
        thumbnailUrl: thumbnailUrl || 'https://placehold.co/1280x720.png',
        tags: values.tags,
        isShort: isShort,
        posterUrl: isShort ? (thumbnailUrl || 'https://placehold.co/400x600.png') : (video?.posterUrl || 'https://placehold.co/400x600.png'),
        status: statusOverride || video?.status || 'published', // Default to published if unknown
        createdAt: video?.createdAt || serverTimestamp(),
      };

      if (isReference) {
        delete (dataToSave as any).tags;
        delete (dataToSave as any).isShort;
      } else if (isShort) {
        const categoryTitles = values.categoryIds
          .map(id => allCategories.find(c => c.id === id)?.title)
          .filter((t): t is string => !!t);
        dataToSave.categories = categoryTitles;
      } else {
        dataToSave.categoryIds = values.categoryIds;
      }

      const batch = writeBatch(db);

      const collectionName = isReference ? 'animationreference' : 'videos';

      if (video) {
        const videoRef = doc(db, collectionName, video.id);
        batch.update(videoRef, dataToSave);
      } else {
        const videoRef = doc(collection(db, collectionName));
        batch.set(videoRef, dataToSave);
      }

      if (!isReference) {
        const tagsCollectionName = isShort ? 'shortFilmTags' : 'tags';
        values.tags.forEach(tag => {
          const tagRef = doc(db, tagsCollectionName, tag);
          batch.set(tagRef, { name: tag });
        });

        if (isShort) {
          const catsCollectionName = 'shortFilmCategories';
          const categoryTitles = values.categoryIds
            .map(id => allCategories.find(c => c.id === id)?.title)
            .filter((t): t is string => !!t);

          categoryTitles.forEach(catTitle => {
            const catRef = doc(db, catsCollectionName, catTitle);
            batch.set(catRef, { name: catTitle });
          });
        }
      }

      await batch.commit();

      toast({
        title: statusOverride === 'published' ? "Published!" : (video ? "Item Updated!" : "Item Added!"),
        description: `The ${isReference ? 'reference' : isShort ? 'short film' : 'video'} has been saved.`,
      });

      if (isReference) {
        router.push("/admin/references");
      } else if (isShort) {
        router.push("/admin/shorts");
      } else {
        router.push("/admin/videos");
      }

    } catch (error) {
      console.error("Error saving item: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Something went wrong while saving the ${isReference ? 'reference' : isShort ? 'short film' : 'video'}.`,
      });
    }
  }

  const onSubmit = (values: FormValues) => saveVideo(values);

  const handlePublish = form.handleSubmit((values) => saveVideo(values, 'published'));

  const currentTags = watch('tags');
  const currentCategoryIds = watch('categoryIds');
  const selectedCategories = allCategories.filter(c => currentCategoryIds.includes(c.id));


  const canCapture = videoPreview && !videoPreview.includes('youtube.com') && !videoPreview.includes('vimeo.com');

  const pageTitle = video
    ? `Edit ${isReference ? 'Reference' : isShort ? 'Short Film' : 'Video'} `
    : `Add New ${isReference ? 'Reference' : isShort ? 'Short Film' : 'Video'} `;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Video Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-dashed border-border mb-4 bg-muted">
                  {videoPreview ? (
                    <VideoPlayer
                      video={{
                        id: 'preview',
                        videoUrl: videoPreview,
                        title: 'Preview',
                        thumbnailUrl: '',
                        type: watchedValues.videoSourceType === 'upload' ? 'file' : watchedValues.videoSourceType
                      } as any}
                      startsPaused
                    />
                  ) : (
                    <UploadPlaceholder text="Video Preview (16:9)" icon={Film} />
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <FormField
                    control={control}
                    name="videoSourceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video Source</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? 'url'}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="url">Embed URL (YouTube/Vimeo)</SelectItem>
                            <SelectItem value="upload">Upload File</SelectItem>
                            <SelectItem value="import">Import Social URL (Insta/TikTok)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="sm:col-span-1">
                    {watchedValues.videoSourceType === 'url' ? (
                      <FormField
                        control={control}
                        name="videoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Video URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://..."
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : watchedValues.videoSourceType === 'import' ? (
                      <div className="flex gap-2 items-end">
                        <FormField
                          control={control}
                          name="videoUrl"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Social URL</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://instagram.com/reel/..."
                                  {...field}
                                  value={field.value || ''}
                                  disabled={isImporting}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          onClick={async () => {
                            const url = getValues('videoUrl');
                            if (!url) {
                              toast({ variant: 'destructive', title: "Error", description: "Please enter a URL first." });
                              return;
                            }
                            setIsImporting(true);
                            try {
                              const result = await downloadSocialVideo(url);
                              if (result.success && result.videoId) {
                                toast({ title: "Success", description: "Video downloaded! Redirecting...", });
                                // Since downlodaer creates a new video, we redirect to edit valid
                                router.push(`/admin/videos/${result.videoId}`);
                              } else {
                                toast({ variant: 'destructive', title: "Import Failed", description: result.error || "Could not download video." });
                              }
                            } catch (e) {
                              console.error(e);
                              toast({ variant: 'destructive', title: "Error", description: "An unexpected error occurred." });
                            } finally {
                              setIsImporting(false);
                            }
                          }}
                          disabled={isImporting}
                        >
                          {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
                        </Button>
                      </div>
                    ) : (
                      <FormField
                        control={control}
                        name="videoFile"
                        render={({ field: { value, onChange, ...fieldProps } }) => (
                          <FormItem>
                            <FormLabel>Video File</FormLabel>
                            <FormControl><Input type="file" accept="video/*" onChange={e => onChange(e.target.files)} {...fieldProps} value="" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-8">
            <Card>
              <CardHeader><CardTitle>Thumbnail</CardTitle></CardHeader>
              <CardContent>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-dashed border-border mb-4">
                  {thumbnailPreview ? <Image src={thumbnailPreview} alt="Thumbnail preview" fill className="object-cover" /> : <UploadPlaceholder text="Thumbnail (16:9)" icon={ImageIcon} />}
                </div>
                <div className="flex justify-center mb-4">
                  <ImageCaptureDialog
                    videoSrc={videoPreview || ''}
                    onCapture={handleCaptureThumbnail}
                    triggerText="Capture from Video"
                    title="Capture Thumbnail"
                    description='Use the player to find the perfect frame, then click "Capture Frame" to set it as your thumbnail. You can use the comma (,) and period (.) keys to step frame-by-frame.'
                    disabled={!canCapture}
                  />
                </div>
                <FormField
                  control={control}
                  name="thumbnailSourceType"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? 'url'}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="upload">Upload</SelectItem>
                          <SelectItem value="capture" disabled>Captured</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchedValues.thumbnailSourceType === 'url' ? (
                  <FormField control={control} name="thumbnailUrl" render={({ field }) => (<FormItem><FormLabel>URL</FormLabel><FormControl><Input placeholder="https://..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                ) : watchedValues.thumbnailSourceType === 'upload' ? (
                  <FormField control={control} name="thumbnailFile" render={({ field: { value, onChange, ...fieldProps } }) => (<FormItem><FormLabel>File</FormLabel><FormControl><Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...fieldProps} value="" /></FormControl><FormMessage /></FormItem>)} />
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Video Details</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cosmic Drift" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A breathtaking journey through..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {!isReference && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Add Categories</CardTitle>
                  <CardDescription>
                    Assign this {isShort ? 'short film' : 'video'} to one or more categories.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <FormField
                        control={control}
                        name="categoryIds"
                        render={() => (
                          <FormItem className="flex-1">
                            <FormLabel className="sr-only">Categories</FormLabel>
                            <FormControl>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                  >
                                    {categoryInput ? categoryInput : "Select or type category..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                  <Command>
                                    <CommandInput
                                      placeholder="Search categories..."
                                      value={categoryInput}
                                      onValueChange={setCategoryInput}
                                      onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                          // Create logic if not found
                                          e.preventDefault();
                                          // Handled mostly by CommandEmpty usually, but let's keep direct keydown for safety
                                          await handleCategoryInputKeyDown(e as any);
                                        }
                                      }}
                                    />
                                    <CommandList>
                                      <CommandEmpty>
                                        <button
                                          className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                          onClick={async () => {
                                            // Simulate event for compatibility or call internal function
                                            if (categoryInput.trim()) {
                                              // Reuse the create logic or call it directly
                                              // We can't easily construct a KeyboardEvent, so let's refactor creation logic or trigger it manually
                                              const newCatTitle = categoryInput.trim();
                                              if (!newCatTitle) return;
                                              try {
                                                const newCategory = await createDraftCategory(newCatTitle);
                                                if (newCategory) {
                                                  setAllCategories(prev => [...prev, newCategory].sort((a, b) => a.title.localeCompare(b.title)));
                                                  setCategoryInput('');
                                                }
                                              } catch (e) {
                                                console.error(e);
                                              }
                                            }
                                          }}
                                        >
                                          Create "{categoryInput}"
                                        </button>
                                      </CommandEmpty>
                                      <CommandGroup heading="Suggestions">
                                        {allCategories.map((category) => (
                                          <CommandItem
                                            key={category.id}
                                            value={category.title}
                                            onSelect={() => {
                                              const current = getValues('categoryIds') || [];
                                              if (!current.includes(category.id)) {
                                                setValue('categoryIds', [...current, category.id], { shouldValidate: true });
                                              }
                                              setCategoryInput('');
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                currentCategoryIds.includes(category.id) ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {category.title}
                                          </CommandItem>
                                        ))}
                                        {/* Show filtered by input mostly handled by Command internally if value matches */}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </FormControl>
                            <FormMessage className="mt-2" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <BrowseCategoriesDialog
                      onCategoriesSelected={handleCategoriesSelectedFromDialog}
                      onCategoryCreated={handleCategoryCreated}
                      allCategories={allCategories}
                      currentSelectedIds={currentCategoryIds}
                      onRefresh={loadData}
                      loading={loadingTaxonomy}
                      isShort={isShort}
                    />
                  </div>

                  <FormField
                    control={control}
                    name="categoryIds"
                    render={() => (<FormItem><FormMessage className="mt-2" /></FormItem>)}
                  />
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedCategories.length > 0 ? selectedCategories.map(cat => (
                      <Badge key={cat.id} variant="secondary" className="pr-1">
                        {cat.title}
                        <button type="button" onClick={() => handleRemoveCategory(cat.id)} className="ml-1 rounded-full hover:bg-background/50 p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )) : (
                      <p className="text-sm text-muted-foreground">No categories selected.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Add Tags</CardTitle>
                  <CardDescription>
                    Add tags to help categorize this content. Type a tag and press Enter.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <FormField
                      control={control}
                      name="tags"
                      render={() => (
                        <FormItem className="flex-1">
                          <FormLabel className="sr-only">Tags</FormLabel>
                          <FormControl>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between"
                                >
                                  {tagInput ? tagInput : "Select or type tag..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                  <CommandInput
                                    placeholder="Search tags..."
                                    value={tagInput}
                                    onValueChange={setTagInput}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag(tagInput);
                                        setTagInput('');
                                      }
                                    }}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      <button
                                        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                        onClick={() => {
                                          handleAddTag(tagInput);
                                          setTagInput('');
                                        }}
                                      >
                                        Create "{tagInput}"
                                      </button>
                                    </CommandEmpty>
                                    <CommandGroup heading="Suggestions">
                                      {allTags.map((tag) => (
                                        <CommandItem
                                          key={tag}
                                          value={tag}
                                          onSelect={() => {
                                            const current = getValues('tags') || [];
                                            if (!current.includes(tag)) {
                                              setValue('tags', [...current, tag], { shouldValidate: true });
                                            }
                                            setTagInput('');
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              currentTags.includes(tag) ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {tag}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </FormControl>
                          <FormMessage className="mt-2" />
                        </FormItem>
                      )}
                    />
                    <BrowseTagsDialog
                      onTagsSelected={handleTagsSelectedFromDialog}
                      currentSelectedTags={currentTags}
                      allTags={allTags}
                      loading={loadingTaxonomy}
                      isShort={isShort}
                      onRefresh={loadData}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {currentTags.length > 0 ? currentTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="pr-1">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 rounded-full hover:bg-background/50 p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )) : (
                      <p className="text-sm text-muted-foreground">No tags added.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : video ? "Save Changes" : `Add ${isReference ? 'Reference' : isShort ? 'Short' : 'Video'} `}
            </Button>
            {/* Publish Button */}
            {!isReference && video?.status !== 'published' && (
              <Button
                type="button"
                variant="secondary"
                disabled={form.formState.isSubmitting}
                onClick={handlePublish}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Publish Video
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  )
}



