/**
 * ClipWorkspace Component
 *
 * Main workspace for generating and managing video clips within a storyboard scene.
 * Handles prompt input, model selection, frame chaining, and clip generation.
 */

import React, { useState, useMemo } from 'react';
import { StoryboardScene, StoryboardClip } from '@/types/storyboard';
import { Character } from '@/types/roleplay';
import { useClipGeneration } from '@/hooks/useClipGeneration';
import { FrameExtractionService } from '@/lib/services/FrameExtractionService';
import { generateClipPrompt, PromptContext } from '@/lib/utils/storyboardPrompts';
import { ClipCard } from './ClipCard';
import { FrameSelector } from './FrameSelector';
import { ChainIndicator, ChainBadge } from './ChainIndicator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Wand2,
  Loader2,
  Play,
  ImageIcon,
  Link,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipWorkspaceProps {
  scene: StoryboardScene;
  clips: StoryboardClip[];
  character?: Character;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  onClipsChange?: () => void;
}

export const ClipWorkspace: React.FC<ClipWorkspaceProps> = ({
  scene,
  clips,
  character,
  aspectRatio = '16:9',
  onClipsChange,
}) => {
  const {
    videoModels,
    defaultModel,
    modelsLoading,
    generateClip,
    isGenerating,
    deleteClip,
    updateClip,
    isClipGenerating,
  } = useClipGeneration();

  // UI State
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [frameExtractClip, setFrameExtractClip] = useState<StoryboardClip | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Selected clip
  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId),
    [clips, selectedClipId]
  );

  // Previous clip (for chaining)
  const previousClip = useMemo(() => {
    if (clips.length === 0) return null;
    return clips[clips.length - 1];
  }, [clips]);

  // Check if we can chain from previous clip
  const canChain = previousClip?.extracted_frame_url != null;
  const isFirstClip = clips.length === 0;

  // Set default model when loaded
  React.useEffect(() => {
    if (defaultModel && !selectedModelId) {
      setSelectedModelId(defaultModel.id);
    }
  }, [defaultModel, selectedModelId]);

  // Generate AI prompt suggestion
  const handleGeneratePrompt = () => {
    const context: PromptContext = {
      scene,
      character,
      clipIndex: clips.length,
      previousClip: previousClip || undefined,
      isFirstClip,
    };

    const suggestion = generateClipPrompt(context);
    setPrompt(suggestion.prompt);
  };

  // Handle clip generation
  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModelId) return;

    try {
      await generateClip({
        sceneId: scene.id,
        prompt: prompt.trim(),
        referenceImageUrl: canChain ? previousClip?.extracted_frame_url : undefined,
        referenceImageSource: canChain ? 'extracted_frame' : undefined,
        modelId: selectedModelId,
        aspectRatio,
        duration: 5, // Default 5 seconds per clip
      });

      setPrompt('');
      onClipsChange?.();
    } catch (err) {
      console.error('Generation failed:', err);
    }
  };

  // Handle frame extraction
  const handleExtractFrame = (clip: StoryboardClip) => {
    setFrameExtractClip(clip);
    setShowFrameSelector(true);
  };

  // Handle frame selected
  const handleFrameSelected = async (
    frameUrl: string,
    percentage: number,
    timestampMs: number
  ) => {
    if (!frameExtractClip) return;

    setIsExtracting(true);
    try {
      await updateClip({
        clipId: frameExtractClip.id,
        updates: {
          extracted_frame_url: frameUrl,
          extraction_percentage: percentage,
          extraction_timestamp_ms: timestampMs,
        },
      });

      setShowFrameSelector(false);
      setFrameExtractClip(null);
      onClipsChange?.();
    } catch (err) {
      console.error('Failed to save frame:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle delete clip
  const handleDeleteClip = async (clipId: string) => {
    try {
      await deleteClip(clipId);
      if (selectedClipId === clipId) {
        setSelectedClipId(null);
      }
      onClipsChange?.();
    } catch (err) {
      console.error('Failed to delete clip:', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Clip Grid */}
      <div className="flex-1 overflow-auto p-4">
        {clips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
              <Play className="w-5 h-5 text-gray-500" />
            </div>
            <h4 className="text-sm font-medium text-gray-300 mb-1">No clips yet</h4>
            <p className="text-xs text-gray-500 max-w-xs">
              Generate your first clip using the prompt input below.
              {character && ' AI will suggest prompts based on your character.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Clips with chain indicators */}
            <div className="flex flex-wrap gap-3">
              {clips.map((clip, index) => (
                <div key={clip.id} className="flex items-start gap-2">
                  <div className="w-36">
                    <ClipCard
                      clip={clip}
                      isSelected={selectedClipId === clip.id}
                      showChainIndicator={!!clip.reference_image_url}
                      hasChainFrame={!!clip.extracted_frame_url}
                      onClick={() => setSelectedClipId(clip.id)}
                      onRetry={() => handleGenerate()}
                      onDelete={() => handleDeleteClip(clip.id)}
                      onExtractFrame={
                        clip.status === 'completed' && clip.video_url
                          ? () => handleExtractFrame(clip)
                          : undefined
                      }
                    />
                    {/* Chain badge */}
                    <ChainBadge
                      hasExtractedFrame={!!clip.extracted_frame_url}
                      hasReferenceImage={!!clip.reference_image_url}
                      className="mt-1"
                    />
                  </div>

                  {/* Chain indicator between clips */}
                  {index < clips.length - 1 && (
                    <div className="pt-8">
                      <ChainIndicator
                        sourceClip={clip}
                        targetClip={clips[index + 1]}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Add clip placeholder */}
              <div
                className={cn(
                  'w-36 aspect-video rounded-lg border-2 border-dashed',
                  'flex flex-col items-center justify-center gap-1 cursor-pointer',
                  'transition-colors hover:border-gray-600 hover:bg-gray-900/30',
                  canChain
                    ? 'border-green-500/30 hover:border-green-500/50'
                    : 'border-gray-700'
                )}
                onClick={() => document.getElementById('prompt-input')?.focus()}
              >
                <Plus className="w-5 h-5 text-gray-500" />
                <span className="text-[10px] text-gray-500">Add Clip</span>
                {canChain && (
                  <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                    <Link className="w-2.5 h-2.5" />
                    Chain ready
                  </span>
                )}
              </div>
            </div>

            {/* Reference preview (if chaining) */}
            {canChain && previousClip?.extracted_frame_url && (
              <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                <img
                  src={previousClip.extracted_frame_url}
                  alt="Chain reference"
                  className="w-16 h-10 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">
                    Next clip will chain from this frame
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    Extracted at {previousClip.extraction_percentage}%
                  </p>
                </div>
                <ImageIcon className="w-4 h-4 text-green-400" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generation Controls */}
      <div className="border-t border-gray-800 p-4 space-y-3 bg-gray-950">
        {/* Prompt input */}
        <div className="relative">
          <Textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              isFirstClip
                ? 'Describe the scene: character, setting, mood, action...'
                : 'Describe the motion/continuation from previous frame...'
            }
            className="min-h-[60px] pr-24 text-xs bg-gray-900 border-gray-800 resize-none"
          />
          {/* AI suggest button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 px-2 text-[10px] text-blue-400 hover:text-blue-300"
            onClick={handleGeneratePrompt}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            AI Suggest
          </Button>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Model selector */}
          <Select
            value={selectedModelId}
            onValueChange={setSelectedModelId}
            disabled={modelsLoading}
          >
            <SelectTrigger className="w-48 h-8 text-xs bg-gray-900 border-gray-800">
              <SelectValue placeholder="Select model..." />
            </SelectTrigger>
            <SelectContent>
              {videoModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Chain status */}
          {canChain && (
            <div className="flex items-center gap-1 text-[10px] text-green-400">
              <Link className="w-3 h-3" />
              Will chain
            </div>
          )}

          {/* Generate button */}
          <Button
            className="h-8 text-xs gap-1.5 ml-auto"
            onClick={handleGenerate}
            disabled={!prompt.trim() || !selectedModelId || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-3 h-3" />
                Generate Clip
              </>
            )}
          </Button>
        </div>

        {/* Help text */}
        <p className="text-[10px] text-gray-600">
          {isFirstClip
            ? 'First clip: Include full character description, pose, environment, lighting, and mood.'
            : 'Chained clip: Focus on motion intent. Character identity comes from the reference frame.'}
        </p>
      </div>

      {/* Frame Selector Dialog */}
      <Dialog open={showFrameSelector} onOpenChange={setShowFrameSelector}>
        <DialogContent className="max-w-md bg-gray-950 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-sm">Extract Chain Frame</DialogTitle>
          </DialogHeader>
          {frameExtractClip && (
            <FrameSelector
              clip={frameExtractClip}
              onFrameSelected={handleFrameSelected}
              onCancel={() => {
                setShowFrameSelector(false);
                setFrameExtractClip(null);
              }}
              isLoading={isExtracting}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClipWorkspace;
