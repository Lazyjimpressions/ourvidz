
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Video, Upload, X, Image } from 'lucide-react';
import { toast } from 'sonner';

export interface MobileSimplePromptInputProps {
  onGenerate: (prompt: string, options?: any) => void;
  isGenerating: boolean;
  currentMode: 'image' | 'video';
  onModeToggle: (mode: 'image' | 'video') => void;
  onReferenceImageSet?: (file: File, type: 'single' | 'start' | 'end') => void;
}

export const MobileSimplePromptInput: React.FC<MobileSimplePromptInputProps> = ({
  onGenerate,
  isGenerating,
  currentMode = 'image',
  onModeToggle,
  onReferenceImageSet
}) => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<string>('sdxl_fast');
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  const [referenceImages, setReferenceImages] = useState<{
    single?: File;
    start?: File;
    end?: File;
  }>({});
  
  const singleFileRef = useRef<HTMLInputElement>(null);
  const startFileRef = useRef<HTMLInputElement>(null);
  const endFileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (type: 'single' | 'start' | 'end') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setReferenceImages(prev => ({ ...prev, [type]: file }));
        onReferenceImageSet?.(file, type);
        toast.success(`${type} reference image selected`);
      }
    };
    input.click();
  };

  const removeReferenceImage = (type: 'single' | 'start' | 'end') => {
    setReferenceImages(prev => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    // Determine format based on mode, model, and quality
    let format = '';
    if (currentMode === 'image') {
      format = model === 'replicate' ? `rv51_${quality}` : `sdxl_image_${quality}`;
    } else {
      format = `video_${quality}`;
    }

    onGenerate(prompt.trim(), { 
      mode: currentMode,
      format,
      model,
      quality,
      referenceImages 
    });
    setPrompt('');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="p-4 space-y-3">
        {/* Mode Selection */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={currentMode === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeToggle('image')}
            className="flex items-center gap-1 flex-1"
          >
            <Camera className="h-4 w-4" />
            Image
          </Button>
          <Button
            type="button"
            variant={currentMode === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeToggle('video')}
            className="flex items-center gap-1 flex-1"
          >
            <Video className="h-4 w-4" />
            Video
          </Button>
        </div>

        {/* Model & Quality Selection for Images */}
        {currentMode === 'image' && (
          <div className="flex items-center gap-2">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sdxl_fast">SDXL</SelectItem>
                <SelectItem value="replicate">Replicate</SelectItem>
              </SelectContent>
            </Select>
            <Select value={quality} onValueChange={(value: 'fast' | 'high') => setQuality(value)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quality Selection for Videos */}
        {currentMode === 'video' && (
          <Select value={quality} onValueChange={(value: 'fast' | 'high') => setQuality(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fast">Fast</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Reference Image Upload */}
        <div className="space-y-2">
          {currentMode === 'image' ? (
            // Single reference for images
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFileSelect('single')}
                className="flex items-center gap-1 flex-1"
              >
                <Upload className="h-4 w-4" />
                Reference Image
              </Button>
              {referenceImages.single && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeReferenceImage('single')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            // Start/End references for videos
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileSelect('start')}
                  className="flex items-center gap-1 flex-1"
                >
                  <Image className="h-4 w-4" />
                  Start Frame
                </Button>
                {referenceImages.start && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReferenceImage('start')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileSelect('end')}
                  className="flex items-center gap-1 flex-1"
                >
                  <Image className="h-4 w-4" />
                  End Frame
                </Button>
                {referenceImages.end && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReferenceImage('end')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            type="text"
            placeholder={`Enter prompt for ${currentMode}`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
          <Button type="submit" disabled={isGenerating} className="w-full">
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </form>
      </div>
    </div>
  );
};
