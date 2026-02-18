import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Wand2,
  Loader2,
  Image as ImageIcon,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageModelOption } from '@/hooks/useImageModels';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface CharacterStudioPromptBarProps {
  onGenerate: (prompt: string, referenceImageUrl?: string, modelId?: string) => void;
  isGenerating: boolean;
  isDisabled: boolean;
  placeholder?: string;
  selectedImageModel: string;
  onImageModelChange: (modelId: string) => void;
  imageModelOptions: ImageModelOption[];
  onOpenImagePicker: () => void;

  /** Controlled reference image URL (recommended so sidebar + prompt bar stay in sync) */
  referenceImageUrl?: string | null;
  onReferenceImageChange?: (url: string | null) => void;

  /** Generation progress state */
  generationProgress?: {
    percent: number;
    estimatedTimeRemaining: number;
    stage: 'queued' | 'processing' | 'finalizing';
  } | null;

  /** Controlled prompt text (optional - for pose presets integration) */
  value?: string;
  onValueChange?: (value: string) => void;

  /** Optional enhancement callback */
  onEnhancePrompt?: (prompt: string, modelId: string) => Promise<string | null>;

  /** Character data for auto-fill */
  characterData?: { name: string; gender: string; traits: string; appearance_tags: string[] };
}

export function CharacterStudioPromptBar({
  onGenerate,
  isGenerating,
  isDisabled,
  placeholder = 'Describe the portrait you want to generate...',
  selectedImageModel,
  onImageModelChange,
  imageModelOptions,
  onOpenImagePicker,
  referenceImageUrl,
  onReferenceImageChange,
  generationProgress,
  value,
  onValueChange,
  onEnhancePrompt,
  characterData,
}: CharacterStudioPromptBarProps) {
  const { toast } = useToast();
  const [internalPrompt, setInternalPrompt] = React.useState('');
  const [isEnhancing, setIsEnhancing] = React.useState(false);

  // Use controlled value if provided, otherwise use internal state
  const prompt = value !== undefined ? value : internalPrompt;
  const setPrompt = onValueChange || setInternalPrompt;

  const selectedModelData = imageModelOptions.find((m) => m.value === selectedImageModel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating || isDisabled) return;

    onGenerate(prompt.trim(), referenceImageUrl || undefined, selectedImageModel);
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleSubmit(e as any);
    }
  };


  const handleEnhance = async () => {
    if (isEnhancing) return;

    // Stage 1: If prompt is empty, auto-fill from character data (no LLM call)
    if (!prompt.trim() && characterData) {
      const parts: string[] = [];
      if (characterData.name) parts.push(`Portrait of ${characterData.name}`);
      if (characterData.gender && characterData.gender !== 'unspecified') parts.push(characterData.gender);
      if (characterData.traits) parts.push(characterData.traits);
      if (characterData.appearance_tags?.length > 0) parts.push(characterData.appearance_tags.join(', '));
      const assembled = parts.filter(Boolean).join(', ');
      if (assembled) {
        setPrompt(assembled);
        toast({ title: 'Prompt filled', description: 'Click ✨ again to enhance for selected model.' });
      }
      return;
    }

    // Stage 2: If prompt has text, enhance via LLM
    if (!onEnhancePrompt || !prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const result = await onEnhancePrompt(prompt.trim(), selectedImageModel);
      if (result) setPrompt(result);
    } finally {
      setIsEnhancing(false);
    }
  };

  const sparkleTitle = !prompt.trim() && characterData
    ? 'Auto-fill from character traits'
    : 'Enhance prompt for selected model';

  return (
    <div className={cn('border-t border-border bg-card/95 backdrop-blur', 'p-3 pb-4')}>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-2">
        {/* Row 1: Full-width textarea */}
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled || isGenerating}
          className={cn('min-h-[44px] max-h-[100px] resize-none text-sm w-full')}
          rows={1}
        />

        {/* Row 2: Compact button row */}
        <div className="flex items-center gap-2">
          {/* Reference Image indicator */}
          {referenceImageUrl ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  disabled={isDisabled}
                  className="h-9 w-9 flex-shrink-0"
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="z-[100] bg-popover border border-border">
                <div className="px-2 py-1.5 flex items-center gap-2">
                  <div className="w-8 h-8 rounded overflow-hidden border border-border flex-shrink-0">
                    <img src={referenceImageUrl} alt="Ref" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-muted-foreground">Style Locked</span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onReferenceImageChange?.(null)} className="text-destructive">
                  <X className="w-4 h-4 mr-2" />
                  Remove Reference
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* Model Selector - compact */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1 px-2 max-w-[100px]"
                disabled={isDisabled}
              >
                <span className="truncate text-xs">{selectedModelData?.label.split(' ')[0] || 'Model'}</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[260px] z-[100] bg-popover border border-border">
              {imageModelOptions.map((model) => (
                <DropdownMenuItem
                  key={model.value}
                  onSelect={() => onImageModelChange(model.value)}
                  disabled={!model.isAvailable}
                  className={cn('flex items-center gap-2', selectedImageModel === model.value && 'bg-accent')}
                >
                  {model.type === 'local' && (
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        model.isAvailable ? 'bg-green-500' : 'bg-red-500'
                      )}
                    />
                  )}
                  <span className="flex-1 truncate text-sm">{model.label}</span>
                  {model.capabilities?.supports_i2i && (
                    <span className="text-[10px] px-1 py-0.5 bg-muted rounded text-muted-foreground">Ref</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Enhance Button - context-aware */}
          {(onEnhancePrompt || characterData) && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleEnhance}
              disabled={(!prompt.trim() && !characterData) || isEnhancing || isGenerating || isDisabled}
              className="h-9 w-9 flex-shrink-0"
              title={sparkleTitle}
            >
              {isEnhancing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Generate Button - compact with inline progress */}
          <Button
            type="submit"
            disabled={!prompt.trim() || isGenerating || isDisabled}
            size="sm"
            className="h-9 gap-1.5 px-3"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
{generationProgress != null && (
                  <span className="text-xs ml-1">{generationProgress.percent}%</span>
                )}
              </>
            ) : (
              <>
                <Wand2 className="w-3 h-3" />
                <span className="hidden sm:inline ml-1">Generate</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

