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
import { Category } from "@/lib/types";
import { createDraftCategory } from "@/lib/firestore";

interface CategoryPickerProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    allCategories: Category[];
}

export function CategoryPicker({ selectedIds, onChange, allCategories }: CategoryPickerProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    const handleSelect = (id: string) => {
        if (!selectedIds.includes(id)) {
            onChange([...selectedIds, id]);
        }
        setInputValue("");
        setOpen(false);
    };

    const handleRemove = (id: string) => {
        onChange(selectedIds.filter((i) => i !== id));
    };

    const handleCreate = async () => {
        if (!inputValue.trim()) return;
        try {
            const newCat = await createDraftCategory(inputValue.trim());
            if (newCat) {
                // Ideally we'd need a way to bubble up the new category to the parent so it's in allCategories
                // For now, let's assume the parent might need to handle this or we rely on optimistic updates if refetching isn't fast enough
                // But standard pattern: call a prop or just select it if we can
                // Since we can't easily add to allCategories here without a callback, 
                // we will just select the ID and hope the parent refetches or we emit an event.
                // Actually, best to return the new ID.
                onChange([...selectedIds, newCat.id]);
                setInputValue("");
                setOpen(false);
            }
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem]">
                {selectedIds.map((id) => {
                    const category = allCategories.find((c) => c.id === id);
                    if (!category) return null;
                    return (
                        <Badge key={id} variant="secondary" className="gap-1 pr-1">
                            {category.title}
                            <button
                                type="button"
                                onClick={() => handleRemove(id)}
                                className="hover:text-destructive focus:outline-none"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    );
                })}
            </div>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {inputValue || "Select or type category..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Search categories..."
                            value={inputValue}
                            onValueChange={setInputValue}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    // Only create if not found? Or just simple enter to create
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
                                {allCategories.map((category) => (
                                    <CommandItem
                                        key={category.id}
                                        value={category.title}
                                        onSelect={() => handleSelect(category.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedIds.includes(category.id) ? "opacity-100" : "opacity-0"
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
    );
}
