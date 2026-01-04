import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Category } from "@/lib/types";
import { createDraftCategory } from "@/lib/firestore";
import { Label } from "@/components/ui/label";

interface BulkVideoEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onSave: (addCategories: string[], addTags: string[]) => Promise<void>;
    allCategories: Category[];
    allTags: string[];
}

export function BulkVideoEditor({
    open,
    onOpenChange,
    selectedCount,
    onSave,
    allCategories,
    allTags,
}: BulkVideoEditorProps) {
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [categoryInput, setCategoryInput] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(selectedCategoryIds, selectedTags);
            onOpenChange(false);
            // Reset form
            setSelectedCategoryIds([]);
            setSelectedTags([]);
        } catch (error) {
            console.error("Failed to save bulk edits", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateCategory = async (title: string) => {
        try {
            const newCat = await createDraftCategory(title);
            // Note: We rely on the parent to update allCategories, 
            // but for now we can just add the ID if we had it. 
            // Since createDraftCategory returns the object, we can use it.
            if (newCat) {
                // Ideally passing back the new category to parent or optimistically adding it
                setSelectedCategoryIds(prev => [...prev, newCat.id]);
                setCategoryInput("");
            }
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Bulk Edit Videos</DialogTitle>
                    <DialogDescription>
                        Applying changes to <span className="font-semibold text-foreground">{selectedCount}</span> selected videos.
                        Note: Tags and Categories will be <strong>added</strong> to the existing ones.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">

                    {/* Categories */}
                    <div className="space-y-2">
                        <Label>Add Categories</Label>
                        <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem]">
                            {selectedCategoryIds.map(id => {
                                const cat = allCategories.find(c => c.id === id);
                                if (!cat) return null;
                                return (
                                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                                        {cat.title}
                                        <button onClick={() => setSelectedCategoryIds(prev => prev.filter(c => c !== id))} className="hover:text-destructive">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )
                            })}
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                >
                                    {categoryInput || "Select or type category..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                    <CommandInput
                                        placeholder="Search categories..."
                                        value={categoryInput}
                                        onValueChange={setCategoryInput}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && categoryInput.trim()) {
                                                e.preventDefault();
                                                // Optional: support direct creation on Enter if not found, 
                                                // but usually button click is safer for "Create New"
                                            }
                                        }}
                                    />
                                    <CommandList>
                                        <CommandEmpty>
                                            <button
                                                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                                onClick={() => handleCreateCategory(categoryInput)}
                                            >
                                                Create "{categoryInput}"
                                            </button>
                                        </CommandEmpty>
                                        <CommandGroup heading="Suggestions" className="max-h-60 overflow-y-auto">
                                            {allCategories.map((category) => (
                                                <CommandItem
                                                    key={category.id}
                                                    value={category.title}
                                                    onSelect={() => {
                                                        if (!selectedCategoryIds.includes(category.id)) {
                                                            setSelectedCategoryIds(prev => [...prev, category.id]);
                                                        }
                                                        setCategoryInput("");
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedCategoryIds.includes(category.id) ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {category.title}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label>Add Tags</Label>
                        <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem]">
                            {selectedTags.map(tag => (
                                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                                    {tag}
                                    <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))} className="hover:text-destructive">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                >
                                    {tagInput || "Select or type tag..."}
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
                                            if (e.key === 'Enter' && tagInput.trim()) {
                                                e.preventDefault();
                                                if (!selectedTags.includes(tagInput.trim())) {
                                                    setSelectedTags(prev => [...prev, tagInput.trim()]);
                                                }
                                                setTagInput("");
                                            }
                                        }}
                                    />
                                    <CommandList>
                                        <CommandEmpty>
                                            <button
                                                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                                onClick={() => {
                                                    if (!selectedTags.includes(tagInput.trim())) {
                                                        setSelectedTags(prev => [...prev, tagInput.trim()]);
                                                    }
                                                    setTagInput("");
                                                }}
                                            >
                                                Create "{tagInput}"
                                            </button>
                                        </CommandEmpty>
                                        <CommandGroup heading="Suggestions" className="max-h-60 overflow-y-auto">
                                            {allTags.map((tag) => (
                                                <CommandItem
                                                    key={tag}
                                                    value={tag}
                                                    onSelect={() => {
                                                        if (!selectedTags.includes(tag)) {
                                                            setSelectedTags(prev => [...prev, tag]);
                                                        }
                                                        setTagInput("");
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedTags.includes(tag) ? "opacity-100" : "opacity-0"
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
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Apply Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
