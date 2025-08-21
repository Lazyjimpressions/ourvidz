
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Video } from 'lucide-react';

export interface SimplePromptInputProps {
  onGenerate: (prompt: string, options?: any) => void;
  isGenerating: boolean;
  currentMode?: 'image' | 'video';
  onModeToggle: (mode: 'image' | 'video') => void;
}

export const SimplePromptInput: React.FC<SimplePromptInputProps> = ({
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
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder={`Enter prompt for ${currentMode}...`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={currentMode === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onModeToggle('image')}
                className="flex items-center gap-1"
              >
                <Camera className="h-4 w-4" />
                Image
              </Button>
              <Button
                type="button"
                variant={currentMode === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onModeToggle('video')}
                className="flex items-center gap-1"
              >
                <Video className="h-4 w-4" />
                Video
              </Button>
            </div>

            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
