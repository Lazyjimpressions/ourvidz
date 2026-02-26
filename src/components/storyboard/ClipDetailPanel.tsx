/**
 * ClipDetailPanel Component
 *
 * Bottom panel for editing selected clip properties:
 * - Video preview with playback controls
 * - Clip type selector with AI recommendations
 * - Prompt input with AI suggestions
 * - Reference source selector
 * - Generate/Delete actions
 */

import React, { useState, useRef, useEffect } from 'react';
import { StoryboardClip, ClipType, MotionPreset, ReferenceImageSource } from '@/types/storyboard';
import { ClipTypeSelector } from './ClipTypeSelector';
import { MotionLibrary } from './MotionLibrary';
import { FrameSelector } from './FrameSelector';
import { useStoryboardAI } from '@/hooks/useStoryboardAI';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  Wand2,
  Loader2,
  Trash2,
  Copy,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Film,
  Scissors,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipDetailPanelProps {
  clip: StoryboardClip;
  previousClip?: StoryboardClip;
  contentMode: 'sfw' | 'nsfw';
  isGenerating?: boolean;
  recommendedClipType?: ClipType;
  onUpdateClip: (updates: Partial<StoryboardClip>) => void;
  onGenerate: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onSelectMotionPreset: (preset: MotionPreset) => void;
  onFrameExtracted?: (frameUrl: string, percentage: number, timestampMs: number) => Promise<void>;
  className?: string;
}

interface PromptSuggestionChip {
  prompt: string;
  intensity: 'subtle' | 'medium' | 'dynamic';
}

export const ClipDetailPanel: React.FC<ClipDetailPanelProps> = ({
  clip,
  previousClip,
  contentMode,
  isGenerating = false,
  recommendedClipType,
  onUpdateClip,
  onGenerate,
  onDelete,
  onDuplicate,
  onSelectMotionPreset,
  onFrameExtracted,
  className,
}) => {
  const { suggestPrompts, isSuggestingPrompts, enhancePrompt, isEnhancingPrompt } = useStoryboardAI();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMotionLibrary, setShowMotionLibrary] = useState(false);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestionChip[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = (clip.status === 'completed' || clip.status === 'approved') && clip.video_url;
  const hasExtractedFrame = !!clip.extracted_frame_url;
  const canExtractFrame = hasVideo && onFrameExtracted;
  const canGenerate = clip.prompt?.trim() && clip.reference_image_url;
  const isClipGenerating = clip.status === 'generating' || isGenerating;

  // Load suggestions on mount
  useEffect(() => {
    loadSuggestions();
  }, [clip.id]);

  const loadSuggestions = async () => {
    const result = await suggestPrompts({
      sceneId: clip.scene_id,
      previousClipPrompt: previousClip?.prompt,
      clipType: clip.clip_type || 'quick',
      contentMode,
    });

    setPromptSuggestions(
      result.map((s) => ({
        prompt: s.prompt,
        intensity: s.intensity,
      }))
    );
  };

  const handlePlayToggle = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!clip.prompt?.trim()) return;

    const result = await enhancePrompt({
      prompt: clip.prompt,
      clipType: clip.clip_type || 'quick',
      contentMode,
    });

    if (result.enhancedPrompt !== result.originalPrompt) {
      onUpdateClip({ prompt: result.enhancedPrompt, enhanced_prompt: result.enhancedPrompt });
    }
  };

  const handleUseSuggestion = (suggestion: PromptSuggestionChip) => {
    onUpdateClip({ prompt: suggestion.prompt });
  };

  const handleClipTypeChange = (type: ClipType) => {
    onUpdateClip({ clip_type: type });
  };

  const handleMotionPresetSelect = (preset: MotionPreset) => {
    onSelectMotionPreset(preset);
    setShowMotionLibrary(false);
  };

  const handleFrameSelected = async (frameUrl: string, percentage: number, timestampMs: number) => {
    if (!onFrameExtracted) return;
    setIsExtractingFrame(true);
    try {
      await onFrameExtracted(frameUrl, percentage, timestampMs);
      setShowFrameSelector(false);
    } finally {
      setIsExtractingFrame(false);
    }
  };

  const getReferenceLabel = () => {
    if (!clip.reference_image_source) return 'None';
    switch (clip.reference_image_source) {
      case 'character_portrait':
        return 'Character Portrait';
      case 'extracted_frame':
        return 'Previous Frame';
      case 'uploaded':
        return 'Uploaded';
      case 'library':
        return 'Library';
      default:
        return clip.reference_image_source;
    }
  };

  return (
    <div className={cn('bg-gray-900/50 border-t border-gray-800', className)}>
      {/* Header with toggle */}
      <button
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            Clip {clip.clip_order + 1}
          </span>
          <Badge
            variant="secondary"
            className={cn(
              'h-5 px-1.5 text-[10px]',
              clip.status === 'completed' && 'bg-green-500/20 text-green-400',
              clip.status === 'generating' && 'bg-blue-500/20 text-blue-400',
              clip.status === 'failed' && 'bg-red-500/20 text-red-400'
            )}
          >
            {clip.status}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 grid grid-cols-12 gap-4">
          {/* Left: Video preview */}
          <div className="col-span-4">
            <div className="aspect-video bg-gray-950 rounded-lg overflow-hidden relative">
              {hasVideo ? (
                <>
                  <video
                    ref={videoRef}
                    src={clip.video_url}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    poster={clip.thumbnail_url}
                    onEnded={() => setIsPlaying(false)}
                  />
                  <button
                    onClick={handlePlayToggle}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10 text-white/80" />
                    ) : (
                      <Play className="w-10 h-10 text-white/80" />
                    )}
                  </button>
                </>
              ) : clip.reference_image_url ? (
                <img
                  src={clip.reference_image_url}
                  alt="Reference"
                  className="w-full h-full object-cover opacity-60"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-700" />
                </div>
              )}

              {isClipGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Reference info */}
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>Reference: {getReferenceLabel()}</span>
              {clip.duration_seconds && (
                <span>{clip.duration_seconds.toFixed(1)}s</span>
              )}
            </div>

            {/* Frame extraction section */}
            {canExtractFrame && !showFrameSelector && (
              <div className="mt-2">
                {hasExtractedFrame ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-green-400">
                      <Check className="w-3.5 h-3.5" />
                      Frame extracted
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFrameSelector(true)}
                      className="h-6 px-2 text-[10px] text-gray-400 hover:text-gray-200"
                    >
                      Re-extract
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFrameSelector(true)}
                    className="w-full h-7 text-xs border-gray-700 hover:border-blue-600"
                  >
                    <Scissors className="w-3.5 h-3.5 mr-1.5" />
                    Extract Chain Frame
                  </Button>
                )}
              </div>
            )}

            {/* Frame selector */}
            {showFrameSelector && hasVideo && (
              <div className="mt-2">
                <FrameSelector
                  clip={clip}
                  onFrameSelected={handleFrameSelected}
                  onCancel={() => setShowFrameSelector(false)}
                  isLoading={isExtractingFrame}
                />
              </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="col-span-8 space-y-3">
            {/* Type selector row */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <Label className="text-xs text-gray-400 mb-1.5 block">Clip Type</Label>
                <ClipTypeSelector
                  value={clip.clip_type || 'quick'}
                  onChange={handleClipTypeChange}
                  recommended={recommendedClipType}
                  disabled={isClipGenerating}
                  compact
                />
              </div>

              {/* Motion preset (for controlled type) */}
              {(clip.clip_type === 'controlled' || clip.motion_preset_id) && (
                <div className="flex-1">
                  <Label className="text-xs text-gray-400 mb-1.5 block">Motion Preset</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMotionLibrary(true)}
                    className="w-full justify-start h-8 text-xs border-gray-700"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-2 text-purple-400" />
                    {clip.motion_preset_id ? 'Change Preset' : 'Select Preset'}
                  </Button>
                </div>
              )}
            </div>

            {/* Prompt input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-gray-400">Motion Prompt</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEnhancePrompt}
                  disabled={!clip.prompt?.trim() || isEnhancingPrompt}
                  className="h-6 px-2 text-[10px] text-purple-400 hover:text-purple-300"
                >
                  {isEnhancingPrompt ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-1" />
                  )}
                  Enhance
                </Button>
              </div>
              <Textarea
                value={clip.prompt || ''}
                onChange={(e) => onUpdateClip({ prompt: e.target.value })}
                placeholder="Describe the motion you want..."
                className="min-h-[60px] text-sm bg-gray-900 border-gray-700 resize-none"
                disabled={isClipGenerating}
              />
            </div>

            {/* AI Suggestions */}
            {promptSuggestions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-gray-500">AI:</span>
                {promptSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleUseSuggestion(suggestion)}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] transition-colors',
                      'border hover:bg-gray-800',
                      suggestion.intensity === 'subtle' && 'border-gray-700 text-gray-400',
                      suggestion.intensity === 'medium' && 'border-blue-800 text-blue-400',
                      suggestion.intensity === 'dynamic' && 'border-purple-800 text-purple-400'
                    )}
                  >
                    {suggestion.prompt.length > 30
                      ? suggestion.prompt.slice(0, 30) + '...'
                      : suggestion.prompt}
                  </button>
                ))}
                {isSuggestingPrompts && (
                  <Loader2 className="w-3 h-3 text-gray-500 animate-spin" />
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  disabled={isClipGenerating}
                  className="h-8 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
                {onDuplicate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDuplicate}
                    disabled={isClipGenerating}
                    className="h-8 text-xs border-gray-700"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Duplicate
                  </Button>
                )}
              </div>

              <Button
                onClick={onGenerate}
                disabled={!canGenerate || isClipGenerating}
                className="h-8 text-xs"
              >
                {isClipGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : clip.video_url ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Motion Library Dialog */}
      <MotionLibrary
        open={showMotionLibrary}
        onOpenChange={setShowMotionLibrary}
        selectedPresetId={clip.motion_preset_id}
        onSelectPreset={handleMotionPresetSelect}
      />
    </div>
  );
};

export default ClipDetailPanel;
