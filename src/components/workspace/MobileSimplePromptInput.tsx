
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Video } from 'lucide-react';

export interface MobileSimplePromptInputProps {
  onGenerate: (prompt: string, options?: any) => void;
  isGenerating: boolean;
  currentMode: 'image' | 'video';
  onModeToggle: (mode: 'image' | 'video') => void;
}

export const MobileSimplePromptInput: React.FC<MobileSimplePromptInputProps> = ({
  onGenerate,
  isGenerating,
  currentMode = 'image',
  onModeToggle
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    onGenerate(prompt.trim(), { mode: currentMode });
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
