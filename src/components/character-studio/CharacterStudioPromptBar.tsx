import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Wand2,
  Loader2,
  Image as ImageIcon,
  Upload,
  X,
  Library,
  ChevronDown,
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
}: CharacterStudioPromptBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [internalPrompt, setInternalPrompt] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      let processedFile: File = file;

      // Handle HEIC conversion for iPhone
      if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        const heic2any = (await import('heic2any')).default;
        const blob = await heic2any({ blob: file, toType: 'image/jpeg' });
        processedFile = new File([blob as Blob], file.name.replace(/\.heic$/i, '.jpg'), {
          type: 'image/jpeg',
        });
      }

      // Upload to reference_images bucket (same approach as CreateCharacter)
      const path = `${user.id}/ref_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('reference_images')
        .upload(path, processedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: signedData, error: signError } = await supabase.storage
        .from('reference_images')
        .createSignedUrl(path, 3600);

      if (signError) throw signError;

      if (signedData?.signedUrl) {
        onReferenceImageChange?.(signedData.signedUrl);
        toast({ title: 'Reference uploaded', description: 'Image Match Mode enabled.' });
      }
    } catch (error) {
      console.error('Reference upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Allow uploading the same file again by resetting the input
      e.target.value = '';
    }
  };

  const handleLibrarySelect = () => {
    onOpenImagePicker();
  };

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
          {/* Reference Image Options - enhanced for iteration workflow */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={referenceImageUrl ? "secondary" : "outline"}
                size="icon"
                disabled={isDisabled}
                className="h-9 w-9 flex-shrink-0"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[100] bg-popover border border-border">
              {!!referenceImageUrl && (
                <>
                  <DropdownMenuItem onSelect={() => onReferenceImageChange?.(null)} className="text-destructive">
                    <X className="w-4 h-4 mr-2" />
                    Remove Reference
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onSelect={() => document.getElementById('file-upload-input')?.click()}
                disabled={isUploading || !user}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload New'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleLibrarySelect}>
                <Library className="w-4 h-4 mr-2" />
                From Library
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file input */}
          <input
            id="file-upload-input"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isDisabled || isUploading}
          />

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

