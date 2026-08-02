"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Layers, Pencil, Plus, X, Hash } from 'lucide-react';
import type { PortfolioItem, WipStage } from '@/lib/types';
import { updatePortfolioItem } from '@/lib/portfolio-service';

const ALL_TAG_SUGGESTIONS = [
  'Body Mechanics', 'Acting', 'Facial', 'Lip Sync', 'Creature', 
  'Walk Cycle', 'Run Cycle', 'Combat / Action', 'Physics & Weight', 'Biped', 'Quadruped',
  'Locomotion', 'Parkour', 'Stagger / Fall', 'Martial Arts', 'Sword Fight',
  'Push & Pull', 'Heavy Lifting', 'Monster', 'Dragon', 'Bird Flight',
  '2D Animation', '3D Animation', 'Stop Motion', 'Rigging', 'Modeling',
  'VFX', 'Lighting', 'LookDev', 'Concept Art', 'Character Design', 'Storyboard',
  'Stylized', 'Realistic', 'Game Animation', 'Cinematic', 'Keyframe'
];

const PRESET_SOFTWARE = [
  'Maya', 'Blender', 'Unreal Engine', 'ToonBoom', 'TVPaint', 'ZBrush', 'Cinema 4D', 'Houdini'
];

interface HashtagAutoLookupProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

const HashtagAutoLookup: React.FC<HashtagAutoLookupProps> = ({ selectedTags, onChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const query = inputValue.replace(/^#/, '').trim().toLowerCase();
  const suggestions = query
    ? ALL_TAG_SUGGESTIONS.filter(
        (t) =>
          t.toLowerCase().includes(query) &&
          !selectedTags.some((st) => st.toLowerCase() === t.toLowerCase())
      )
    : [];

  const addTag = (tagToAdd: string) => {
    const cleaned = tagToAdd.replace(/^#/, '').trim();
    if (!cleaned) return;
    if (!selectedTags.some((t) => t.toLowerCase() === cleaned.toLowerCase())) {
      onChange([...selectedTags, cleaned]);
    }
    setInputValue('');
    setIsOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(selectedTags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <div className="flex flex-wrap gap-1 min-h-[26px]">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-primary/20 text-primary border border-primary/40 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm"
          >
            <Hash className="h-2.5 w-2.5 opacity-70" />
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 hover:bg-primary/30 rounded-full p-0.5 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500">
          <Hash className="h-3.5 w-3.5" />
        </div>
        <Input
          type="text"
          placeholder="Type to search or add hashtag..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-8 bg-zinc-900 border-white/10 text-white text-xs h-8 focus:border-primary focus:ring-1 focus:ring-primary"
        />

        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/15 rounded-xl shadow-2xl z-50 max-h-44 overflow-y-auto divide-y divide-white/5">
            <div className="px-2.5 py-1 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/80">
              Matching Hashtags
            </div>
            {suggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => addTag(sug)}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-primary/20 hover:text-white flex items-center justify-between transition-colors group"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Hash className="h-3 w-3 text-primary group-hover:scale-110 transition-transform" />
                  {sug}
                </span>
                <span className="text-[10px] text-zinc-400 group-hover:text-white">+ Add</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface EditPortfolioItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PortfolioItem | null;
  currentUserId: string;
  onItemUpdated: (updatedItem: PortfolioItem) => void;
}

export const EditPortfolioItemModal: React.FC<EditPortfolioItemModalProps> = ({
  open,
  onOpenChange,
  item,
  currentUserId,
  onItemUpdated,
}) => {
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'portfolio' | 'wip'>('portfolio');
  const [isFeatured, setIsFeatured] = useState(true);
  const [wipStage, setWipStage] = useState<WipStage>('blocking');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>([]);
  const [customSoftwareInput, setCustomSoftwareInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setDescription(item.description || '');
      setType(item.type || 'portfolio');
      setIsFeatured(item.isFeatured ?? (item.type === 'portfolio'));
      setWipStage(item.wipStage || 'blocking');
      setSelectedTags(item.tags || []);
      setSelectedSoftware(item.software || []);
    }
  }, [item]);

  if (!item) return null;

  const handleToggleSoftware = (sw: string) => {
    if (selectedSoftware.includes(sw)) {
      setSelectedSoftware(selectedSoftware.filter((s) => s !== sw));
    } else {
      setSelectedSoftware([...selectedSoftware, sw]);
    }
  };

  const handleAddCustomSoftware = () => {
    const trimmed = customSoftwareInput.trim();
    if (trimmed && !selectedSoftware.includes(trimmed)) {
      setSelectedSoftware([...selectedSoftware, trimmed]);
      setCustomSoftwareInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: 'Title required', description: 'Please enter a title for your work.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: Partial<PortfolioItem> = {
        title: title.trim(),
        description: description.trim(),
        type,
        isFeatured,
        wipStage: type === 'wip' ? wipStage : 'completed',
        tags: selectedTags,
        software: selectedSoftware,
      };

      await updatePortfolioItem(item.id, currentUserId, updateData);

      const updatedItem: PortfolioItem = {
        ...item,
        ...updateData,
      };

      onItemUpdated(updatedItem);
      toast({ title: 'Post Updated!', description: 'Your changes have been saved.' });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message || 'Could not update post.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[94vw] max-h-[92vh] overflow-y-auto bg-zinc-950/90 backdrop-blur-2xl border border-white/15 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="pb-2 border-b border-white/10">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Post Details
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Update your title, description notes, profile placement, hashtags, and software tools.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Profile Placement Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-300 font-medium">Profile Destination & Placement</Label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setType('portfolio');
                  setIsFeatured(true);
                }}
                className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                  type === 'portfolio' && isFeatured
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold ring-1 ring-emerald-500/40'
                    : 'border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/20'
                }`}
              >
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">Main Portfolio</div>
                  <div className="text-[10px] opacity-75 leading-tight">Feature in top main showcase banner.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('wip');
                  setIsFeatured(false);
                }}
                className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                  type === 'wip' || !isFeatured
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-semibold ring-1 ring-amber-500/40'
                    : 'border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/20'
                }`}
              >
                <Layers className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">Works Grid Only</div>
                  <div className="text-[10px] opacity-75 leading-tight">Add to general works & WIP grid.</div>
                </div>
              </button>
            </div>
          </div>

          {/* WIP Stage Dropdown */}
          {type === 'wip' && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-wip-stage" className="text-xs text-zinc-300 font-medium">WIP Stage</Label>
              <Select value={wipStage} onValueChange={(val: WipStage) => setWipStage(val)}>
                <SelectTrigger id="edit-wip-stage" className="bg-zinc-900 border-white/10 text-white h-9 text-xs">
                  <SelectValue placeholder="Select Stage" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white text-xs">
                  <SelectItem value="concept">Concept / Design / Storyboard</SelectItem>
                  <SelectItem value="blocking">Rough Pass / Blocking / Clay Render</SelectItem>
                  <SelectItem value="splining">Splining / Pass 2 / Refinement</SelectItem>
                  <SelectItem value="polish">Polish / Texture / FX Pass</SelectItem>
                  <SelectItem value="cleanup">Cleanup / Lighting / Render Pass</SelectItem>
                  <SelectItem value="completed">Completed / Final Piece</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title" className="text-xs text-zinc-300 font-medium">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-zinc-900 border-white/10 text-white h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-description" className="text-xs text-zinc-300 font-medium">Notes & Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-zinc-900 border-white/10 text-white text-xs py-2"
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-300 font-medium flex items-center justify-between">
              <span>Hashtags</span>
              <span className="text-[10px] text-zinc-500 font-normal">Type-ahead auto-lookup</span>
            </Label>
            <HashtagAutoLookup selectedTags={selectedTags} onChange={setSelectedTags} />
          </div>

          {/* Software Tools */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs text-zinc-300 font-medium">Software & Tools Used</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_SOFTWARE.map((sw) => {
                const isSelected = selectedSoftware.includes(sw);
                return (
                  <Badge
                    key={sw}
                    variant="outline"
                    onClick={() => handleToggleSoftware(sw)}
                    className={`cursor-pointer text-xs py-0.5 px-2 rounded-full transition-colors ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-500 font-semibold'
                        : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {sw}
                  </Badge>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add custom tool..."
                value={customSoftwareInput}
                onChange={(e) => setCustomSoftwareInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSoftware();
                  }
                }}
                className="bg-zinc-900 border-white/10 text-white text-xs h-8"
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleAddCustomSoftware} className="h-8 px-3 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-white/15 text-zinc-300 hover:bg-zinc-900 h-9 text-xs px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-white font-semibold h-9 text-xs px-5 shadow-lg"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
