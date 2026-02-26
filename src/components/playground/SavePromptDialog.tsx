import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PillButton } from '@/components/ui/pill-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BASE_TAGS = ['anatomy', 'lighting', 'spatial', 'color', 'texture', 'multi-subject', 'portrait', 'landscape', 'action'];

const FAMILY_TAGS: Record<string, string[]> = {
  seedream: ['structured', 'keyword-dense'],
  flux: ['natural-language', 'hex-color'],
  wan: ['motion', 'cinematic'],
  ltx: ['motion', 'fast'],
};

interface SavePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptText: string;
  taskType: string;
  modelFamily?: string | null;
  onSave: (name: string, tags: string[], modelFamily: string | null) => Promise<void>;
}

export const SavePromptDialog: React.FC<SavePromptDialogProps> = ({
  open, onOpenChange, promptText, taskType, modelFamily: detectedFamily, onSave,
}) => {
  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [familyOverride, setFamilyOverride] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset family override when dialog opens with new detected family
  const effectiveFamily = familyOverride !== null ? (familyOverride || null) : (detectedFamily || null);

  const suggestedTags = useMemo(() => {
    const familySpecific = effectiveFamily ? (FAMILY_TAGS[effectiveFamily.toLowerCase()] || []) : [];
    return [...new Set([...familySpecific, ...BASE_TAGS])];
  }, [effectiveFamily]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave(name.trim(), selectedTags, effectiveFamily);
      setName('');
      setSelectedTags([]);
      setFamilyOverride(null);
      onOpenChange(false);
    } catch (err) {
      console.error('❌ Failed to save prompt:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Save Prompt</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Portrait lighting test"
              className="h-8 text-xs mt-1"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Prompt</Label>
            <p className="text-xs mt-1 text-foreground/70 line-clamp-3 bg-muted/30 rounded p-2">
              {promptText}
            </p>
          </div>

          {/* Model family badge + override */}
          <div>
            <Label className="text-xs text-muted-foreground">Model Family</Label>
            <div className="flex items-center gap-2 mt-1">
              {detectedFamily && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {detectedFamily}
                </span>
              )}
              <Select
                value={familyOverride ?? '__auto__'}
                onValueChange={(v) => setFamilyOverride(v === '__auto__' ? null : v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="h-7 text-xs w-[140px]">
                  <SelectValue placeholder="Auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__" className="text-xs">Auto-detect</SelectItem>
                  <SelectItem value="__none__" className="text-xs text-muted-foreground">Generic (none)</SelectItem>
                  <SelectItem value="seedream" className="text-xs">Seedream</SelectItem>
                  <SelectItem value="flux" className="text-xs">Flux</SelectItem>
                  <SelectItem value="wan" className="text-xs">WAN</SelectItem>
                  <SelectItem value="ltx" className="text-xs">LTX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {suggestedTags.map(tag => (
                <PillButton
                  key={tag}
                  size="xs"
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </PillButton>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Task: {taskType} • Family: {effectiveFamily || 'generic'}</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || isSaving} className="text-xs">
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
