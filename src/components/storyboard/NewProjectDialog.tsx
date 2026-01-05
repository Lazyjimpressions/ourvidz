/**
 * NewProjectDialog Component
 *
 * Compact dialog for creating new storyboard projects.
 * Max-width 480px as per UI/UX guidelines.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import {
  AspectRatio,
  QualityPreset,
  ContentTier,
  AIAssistanceLevel,
  CreateProjectInput,
} from '@/types/storyboard';

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateProjectInput) => Promise<void>;
  isLoading?: boolean;
}

const DURATION_PRESETS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
];

export const NewProjectDialog: React.FC<NewProjectDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDuration, setTargetDuration] = useState(30);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('high');
  const [contentTier, setContentTier] = useState<ContentTier>('nsfw');
  const [aiAssistance, setAiAssistance] = useState<AIAssistanceLevel>('full');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      target_duration_seconds: targetDuration,
      aspect_ratio: aspectRatio,
      quality_preset: qualityPreset,
      content_tier: contentTier,
      ai_assistance_level: aiAssistance,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setTargetDuration(30);
    setAspectRatio('16:9');
    setQualityPreset('high');
    setContentTier('nsfw');
    setAiAssistance('full');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs text-gray-400">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Storyboard"
              className="h-9 text-sm bg-gray-900 border-gray-800"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs text-gray-400">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your project..."
              className="h-16 text-sm bg-gray-900 border-gray-800 resize-none"
            />
          </div>

          {/* Duration and Aspect Ratio row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Duration</Label>
              <ToggleGroup
                type="single"
                value={String(targetDuration)}
                onValueChange={(v) => v && setTargetDuration(Number(v))}
                className="justify-start"
              >
                {DURATION_PRESETS.map((preset) => (
                  <ToggleGroupItem
                    key={preset.value}
                    value={String(preset.value)}
                    className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {preset.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Aspect Ratio</Label>
              <ToggleGroup
                type="single"
                value={aspectRatio}
                onValueChange={(v) => v && setAspectRatio(v as AspectRatio)}
                className="justify-start"
              >
                <ToggleGroupItem
                  value="16:9"
                  className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  16:9
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="9:16"
                  className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  9:16
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="1:1"
                  className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  1:1
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Quality and Content tier row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Quality Preset */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Quality</Label>
              <Select
                value={qualityPreset}
                onValueChange={(v) => setQualityPreset(v as QualityPreset)}
              >
                <SelectTrigger className="h-8 text-xs bg-gray-900 border-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast (Lower quality)</SelectItem>
                  <SelectItem value="high">High (Recommended)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content Tier */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Content</Label>
              <ToggleGroup
                type="single"
                value={contentTier}
                onValueChange={(v) => v && setContentTier(v as ContentTier)}
                className="justify-start"
              >
                <ToggleGroupItem
                  value="sfw"
                  className="h-8 px-3 text-xs data-[state=on]:bg-gray-700 data-[state=on]:text-white"
                >
                  SFW
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="nsfw"
                  className="h-8 px-3 text-xs data-[state=on]:bg-pink-600 data-[state=on]:text-white"
                >
                  NSFW
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* AI Assistance */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Assistance
            </Label>
            <Select
              value={aiAssistance}
              onValueChange={(v) => setAiAssistance(v as AIAssistanceLevel)}
            >
              <SelectTrigger className="h-8 text-xs bg-gray-900 border-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None - Manual only</SelectItem>
                <SelectItem value="suggestions">Suggestions - AI hints</SelectItem>
                <SelectItem value="full">Full - AI generates story beats</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-8 text-xs"
              disabled={!title.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
