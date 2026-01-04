import { useState } from "react";
import { Button } from "@/components/ui/button";
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

interface TagPickerProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
    allTags: string[];
}

export function TagPicker({ selectedTags, onChange, allTags }: TagPickerProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    const handleSelect = (tag: string) => {
        if (!selectedTags.includes(tag)) {
            onChange([...selectedTags, tag]);
        }
        setInputValue("");
        setOpen(false);
    };

    const handleRemove = (tag: string) => {
        onChange(selectedTags.filter((t) => t !== tag));
    };

    const handleCreate = () => {
        if (!inputValue.trim()) return;
        const newTag = inputValue.trim();
        if (!selectedTags.includes(newTag)) {
            onChange([...selectedTags, newTag]);
        }
        setInputValue("");
        setOpen(false);
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem]">
                {selectedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        {tag}
                        <button
                            type="button"
                            onClick={() => handleRemove(tag)}
                            className="hover:text-destructive focus:outline-none"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {inputValue || "Select or type tag..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Search tags..."
                            value={inputValue}
                            onValueChange={setInputValue}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreate();
                                }
                            }}
                        />
                        <CommandList>
                            <CommandEmpty>
                                <button
                                    className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                    onClick={handleCreate}
                                >
                                    Create "{inputValue}"
                                </button>
                            </CommandEmpty>
                            <CommandGroup heading="Suggestions" className="max-h-60 overflow-y-auto">
                                {allTags.map((tag) => (
                                    <CommandItem
                                        key={tag}
                                        value={tag}
                                        onSelect={() => handleSelect(tag)}
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
    );
}
