import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PillButton } from '@/components/ui/pill-button';

const SUGGESTED_TAGS = ['anatomy', 'lighting', 'spatial', 'color', 'texture', 'multi-subject', 'portrait', 'landscape', 'action'];

interface SavePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptText: string;
  taskType: string;
  onSave: (name: string, tags: string[]) => Promise<void>;
}

export const SavePromptDialog: React.FC<SavePromptDialogProps> = ({
  open, onOpenChange, promptText, taskType, onSave,
}) => {
  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave(name.trim(), selectedTags);
      setName('');
      setSelectedTags([]);
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
          <div>
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {SUGGESTED_TAGS.map(tag => (
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
          <p className="text-[10px] text-muted-foreground">Task type: {taskType}</p>
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
