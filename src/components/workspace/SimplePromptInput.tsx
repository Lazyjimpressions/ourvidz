
import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Video } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import { useImageModels, useVideoModels } from '@/hooks/useApiModels';

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
  const [selectedImageModel, setSelectedImageModel] = useState<string>('');
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('');

  const { data: imageModels, isLoading: imageModelsLoading } = useImageModels();
  const { data: videoModels, isLoading: videoModelsLoading } = useVideoModels();

  // Set default models when data loads
  useEffect(() => {
    if (imageModels && imageModels.length > 0 && !selectedImageModel) {
      const defaultModel = imageModels.find(m => m.is_default) || imageModels[0];
      if (defaultModel) {
        setSelectedImageModel(defaultModel.id);
      }
    }
  }, [imageModels, selectedImageModel]);

  useEffect(() => {
    if (videoModels && videoModels.length > 0 && !selectedVideoModel) {
      const defaultModel = videoModels.find(m => m.is_default) || videoModels[0];
      if (defaultModel) {
        setSelectedVideoModel(defaultModel.id);
      }
    }
  }, [videoModels, selectedVideoModel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const selectedModelId = currentMode === 'image' ? selectedImageModel : selectedVideoModel;
    if (!selectedModelId) {
      toast.error('Please select a model');
      return;
    }

    onGenerate(prompt.trim(), {
      mode: currentMode,
      apiModelId: selectedModelId
    });
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
            <div className="flex items-center gap-4">
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

              {/* Model Selection Dropdown */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Model:</Label>
                {currentMode === 'image' && (
                  <Select
                    value={selectedImageModel}
                    onValueChange={setSelectedImageModel}
                    disabled={imageModelsLoading || !imageModels?.length}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {imageModels?.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <span>{model.display_name}</span>
                            {model.is_default && (
                              <span className="text-xs bg-green-100 text-green-700 px-1 rounded">
                                Default
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {currentMode === 'video' && (
                  <Select
                    value={selectedVideoModel}
                    onValueChange={setSelectedVideoModel}
                    disabled={videoModelsLoading || !videoModels?.length}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {videoModels?.length > 0 ? (
                        videoModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <span>{model.display_name}</span>
                              {model.is_default && (
                                <span className="text-xs bg-green-100 text-green-700 px-1 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No video models available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
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
