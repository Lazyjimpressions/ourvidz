import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Wand2, 
  Loader2,
  Image as ImageIcon,
  Upload,
  X,
  Library,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelSelector } from './ModelSelector';
import { ImageModelOption } from '@/hooks/useImageModels';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CharacterStudioPromptBarProps {
  onGenerate: (prompt: string, referenceImageUrl?: string, modelId?: string) => void;
  isGenerating: boolean;
  isDisabled: boolean;
  placeholder?: string;
  selectedImageModel: string;
  onImageModelChange: (modelId: string) => void;
  imageModelOptions: ImageModelOption[];
  onOpenImagePicker: () => void;
}

export function CharacterStudioPromptBar({
  onGenerate,
  isGenerating,
  isDisabled,
  placeholder = "Describe the portrait you want to generate...",
  selectedImageModel,
  onImageModelChange,
  imageModelOptions,
  onOpenImagePicker
}: CharacterStudioPromptBarProps) {
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const selectedModelData = imageModelOptions.find(m => m.value === selectedImageModel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating || isDisabled) return;
    
    onGenerate(prompt.trim(), referenceImage || undefined, selectedImageModel);
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

  const handleLibrarySelect = () => {
    onOpenImagePicker();
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
          {/* Reference Image Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                type="button"
                disabled={isDisabled}
                className={cn(
                  'w-10 h-10 rounded-lg border border-border',
                  'flex items-center justify-center cursor-pointer',
                  'text-muted-foreground hover:text-foreground hover:border-primary/50',
                  'transition-colors duration-200',
                  isDisabled && 'opacity-50 cursor-not-allowed',
                  referenceImage && 'border-primary text-primary'
                )}
              >
                {referenceImage ? (
                  <ImageIcon className="w-4 h-4" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[100] bg-popover border border-border">
              <DropdownMenuItem onSelect={() => document.getElementById('file-upload-input')?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleLibrarySelect}>
                <Library className="w-4 h-4 mr-2" />
                Select from Library
              </DropdownMenuItem>
              {referenceImage && (
                <DropdownMenuItem onSelect={() => setReferenceImage(null)} className="text-destructive">
                  <X className="w-4 h-4 mr-2" />
                  Remove Reference
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Hidden file input */}
          <input
            id="file-upload-input"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isDisabled}
          />

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

          {/* Model Selector Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 gap-1 px-2 min-w-[100px] max-w-[140px]"
                disabled={isDisabled}
              >
                <span className="truncate text-xs">
                  {selectedModelData?.label.split(' ')[0] || 'Model'}
                </span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px] z-[100] bg-popover border border-border">
              {imageModelOptions.map((model) => (
                <DropdownMenuItem 
                  key={model.value}
                  onSelect={() => onImageModelChange(model.value)}
                  disabled={!model.isAvailable}
                  className={cn(
                    'flex items-center gap-2',
                    selectedImageModel === model.value && 'bg-accent'
                  )}
                >
                  {model.type === 'local' && (
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full flex-shrink-0',
                      model.isAvailable ? 'bg-green-500' : 'bg-red-500'
                    )} />
                  )}
                  <span className="flex-1 truncate">{model.label}</span>
                  {model.capabilities?.supports_i2i && (
                    <span className="text-[10px] px-1 py-0.5 bg-muted rounded text-muted-foreground">
                      I2I
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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
