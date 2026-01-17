import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Wand2, 
  Loader2,
  Image as ImageIcon,
  Upload,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterStudioPromptBarProps {
  onGenerate: (prompt: string, referenceImageUrl?: string) => void;
  isGenerating: boolean;
  isDisabled: boolean;
  placeholder?: string;
}

export function CharacterStudioPromptBar({
  onGenerate,
  isGenerating,
  isDisabled,
  placeholder = "Describe the portrait you want to generate..."
}: CharacterStudioPromptBarProps) {
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating || isDisabled) return;
    
    onGenerate(prompt.trim(), referenceImage || undefined);
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for preview (in production, upload to storage)
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn(
      'border-t border-border bg-card/95 backdrop-blur',
      'p-4'
    )}>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        {/* Reference Image Preview */}
        {referenceImage && (
          <div className="mb-3 flex items-center gap-2">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
              <img 
                src={referenceImage} 
                alt="Reference" 
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setReferenceImage(null)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              Reference image attached (I2I mode)
            </span>
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Reference Image Upload */}
          <div className="flex-shrink-0">
            <label className={cn(
              'w-10 h-10 rounded-lg border border-border',
              'flex items-center justify-center cursor-pointer',
              'text-muted-foreground hover:text-foreground hover:border-primary/50',
              'transition-colors duration-200',
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isDisabled}
              />
              {referenceImage ? (
                <ImageIcon className="w-4 h-4 text-primary" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </label>
          </div>

          {/* Prompt Input */}
          <div className="flex-1">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isDisabled || isGenerating}
              className={cn(
                'min-h-[44px] max-h-[120px] resize-none',
                'text-sm'
              )}
              rows={1}
            />
          </div>

          {/* Generate Button */}
          <Button
            type="submit"
            disabled={!prompt.trim() || isGenerating || isDisabled}
            className="gap-2 h-10"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate
              </>
            )}
          </Button>
        </div>

        {isDisabled && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Save your character first to generate portraits
          </p>
        )}
      </form>
    </div>
  );
}
