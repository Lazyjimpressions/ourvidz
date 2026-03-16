/**
 * ClipDetailPanel Component
 *
 * Bottom panel for editing selected clip properties.
 * Mobile-responsive: prompt + generate button are immediately visible.
 * Includes approve button for completed clips and reference image picker.
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
  CheckCircle,
  ImagePlus,
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
  onApprove?: () => void;
  onSelectMotionPreset: (preset: MotionPreset) => void;
  onFrameExtracted?: (frameUrl: string, percentage: number, timestampMs: number) => Promise<void>;
  onPickReference?: () => void;
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
  onApprove,
  onSelectMotionPreset,
  onFrameExtracted,
  onPickReference,
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
  const hasPrompt = !!clip.prompt?.trim();
  const hasReference = !!clip.reference_image_url;
  const canGenerate = hasPrompt; // Reference recommended but not required
  const canApprove = clip.status === 'completed' && onApprove;
  const isClipGenerating = clip.status === 'generating' || isGenerating;

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
      case 'character_portrait': return 'Character';
      case 'extracted_frame': return 'Prev Frame';
      case 'uploaded': return 'Uploaded';
      case 'library': return 'Library';
      default: return clip.reference_image_source;
    }
  };

  return (
    <div className={cn('bg-muted/50 border-t border-border', className)}>
      {/* Header with toggle */}
      <button
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground/80">
            Clip {clip.clip_order + 1}
          </span>
          <Badge
            variant="secondary"
            className={cn(
              'h-5 px-1.5 text-[10px]',
              clip.status === 'completed' && 'bg-green-500/20 text-green-400',
              clip.status === 'approved' && 'bg-emerald-500/20 text-emerald-400',
              clip.status === 'generating' && 'bg-blue-500/20 text-blue-400',
              clip.status === 'failed' && 'bg-red-500/20 text-red-400'
            )}
          >
            {clip.status}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <>
          <div className="px-3 md:px-4 pb-2 md:pb-4 flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 max-h-[55vh] md:max-h-none overflow-y-auto">
            {/* ========== MOBILE LAYOUT ========== */}
            <div className="md:hidden space-y-2.5">
              {/* Prompt + Generate: the core workflow */}
              <div className="space-y-2">
                <Textarea
                  value={clip.prompt || ''}
                  onChange={(e) => onUpdateClip({ prompt: e.target.value })}
                  placeholder="Describe the motion… e.g. 'slow pan across the room, camera tilts up'"
                  className="min-h-[56px] text-sm bg-background border-border resize-none"
                  disabled={isClipGenerating}
                />

                {/* Inline action row: ref thumbnail + enhance + GENERATE */}
                <div className="flex items-center gap-2">
                  {/* Tappable reference thumbnail */}
                  <button
                    onClick={onPickReference}
                    className={cn(
                      'w-11 h-11 rounded-md overflow-hidden flex-shrink-0 border-2 transition-colors',
                      hasReference ? 'border-primary/40' : 'border-dashed border-muted-foreground/30 hover:border-primary/50'
                    )}
                  >
                    {hasReference ? (
                      <img src={clip.reference_image_url} alt="Ref" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <ImagePlus className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </button>

                  {/* Enhance */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEnhancePrompt}
                    disabled={!hasPrompt || isEnhancingPrompt}
                    className="h-9 px-2 text-xs text-purple-400 hover:text-purple-300"
                  >
                    {isEnhancingPrompt ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5" />
                    )}
                  </Button>

                  <div className="flex-1" />

                  {/* PRIMARY Generate button */}
                  <Button
                    onClick={onGenerate}
                    disabled={!canGenerate || isClipGenerating}
                    size="sm"
                    className="h-9 px-4 text-xs font-medium"
                  >
                    {isClipGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Generating
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

                {/* Contextual hints */}
                {!hasPrompt && (
                  <p className="text-[10px] text-muted-foreground/60 pl-0.5">
                    Write a prompt to enable generation.{!hasReference ? ' Adding a reference image improves quality.' : ''}
                  </p>
                )}
                {hasPrompt && !hasReference && (
                  <p className="text-[10px] text-amber-400/70 pl-0.5">
                    💡 Tap the image slot to add a reference — improves consistency.
                  </p>
                )}
              </div>

              {/* AI Suggestions */}
              {promptSuggestions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">Try:</span>
                  {promptSuggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleUseSuggestion(suggestion)}
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] transition-colors',
                        'border hover:bg-muted',
                        suggestion.intensity === 'subtle' && 'border-border text-muted-foreground',
                        suggestion.intensity === 'medium' && 'border-blue-800 text-blue-400',
                        suggestion.intensity === 'dynamic' && 'border-purple-800 text-purple-400'
                      )}
                    >
                      {suggestion.prompt.length > 25 ? suggestion.prompt.slice(0, 25) + '…' : suggestion.prompt}
                    </button>
                  ))}
                  {isSuggestingPrompts && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />}
                </div>
              )}

              {/* Clip type + secondary actions row */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ClipTypeSelector
                    value={clip.clip_type || 'quick'}
                    onChange={handleClipTypeChange}
                    recommended={recommendedClipType}
                    disabled={isClipGenerating}
                    compact
                  />
                </div>
                {canApprove && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onApprove}
                    className="h-7 px-2 text-[10px] border-green-700 text-green-400 hover:bg-green-500/10"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                )}
                {onDuplicate && (
                  <Button variant="ghost" size="sm" onClick={onDuplicate} disabled={isClipGenerating} className="h-7 px-2">
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onDelete} disabled={isClipGenerating} className="h-7 px-2">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>

              {/* Video preview - only when clip has video */}
              {hasVideo && (
                <div className="aspect-video bg-background rounded-lg overflow-hidden relative">
                  <video
                    ref={videoRef}
                    src={clip.video_url}
                    className="w-full h-full object-cover"
                    muted loop playsInline
                    poster={clip.thumbnail_url}
                    onEnded={() => setIsPlaying(false)}
                  />
                  <button
                    onClick={handlePlayToggle}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-8 h-8 text-white/80" /> : <Play className="w-8 h-8 text-white/80" />}
                  </button>
                  {isClipGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ========== DESKTOP: Video preview (left) ========== */}
            <div className="hidden md:block md:col-span-4">
              <div className="aspect-video bg-background rounded-lg overflow-hidden relative">
                {hasVideo ? (
                  <>
                    <video
                      ref={videoRef}
                      src={clip.video_url}
                      className="w-full h-full object-cover"
                      muted loop playsInline
                      poster={clip.thumbnail_url}
                      onEnded={() => setIsPlaying(false)}
                    />
                    <button
                      onClick={handlePlayToggle}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-10 h-10 text-white/80" /> : <Play className="w-10 h-10 text-white/80" />}
                    </button>
                  </>
                ) : clip.reference_image_url ? (
                  <img src={clip.reference_image_url} alt="Reference" className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    {onPickReference && (
                      <Button variant="outline" size="sm" onClick={onPickReference} className="h-7 text-[11px] border-dashed border-muted-foreground/40">
                        <ImagePlus className="w-3.5 h-3.5 mr-1" />
                        Pick Reference Image
                      </Button>
                    )}
                  </div>
                )}
                {isClipGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Ref: {getReferenceLabel()}</span>
                <div className="flex items-center gap-1.5">
                  {onPickReference && clip.reference_image_url && (
                    <Button variant="ghost" size="sm" onClick={onPickReference} className="h-6 px-2 text-[10px]">
                      <ImagePlus className="w-3 h-3 mr-1" />
                      Change
                    </Button>
                  )}
                  {clip.duration_seconds && <span>{clip.duration_seconds.toFixed(1)}s</span>}
                </div>
              </div>
              {canExtractFrame && !showFrameSelector && (
                <div className="mt-2">
                  {hasExtractedFrame ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-green-400">
                        <Check className="w-3.5 h-3.5" />
                        Frame extracted
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setShowFrameSelector(true)} className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground">
                        Re-extract
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowFrameSelector(true)} className="w-full h-7 text-xs border-border hover:border-primary">
                      <Scissors className="w-3.5 h-3.5 mr-1.5" />
                      Extract Chain Frame
                    </Button>
                  )}
                </div>
              )}
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

            {/* ========== DESKTOP: Controls (right) ========== */}
            <div className="hidden md:block md:col-span-8 space-y-3">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Clip Type</Label>
                  <ClipTypeSelector
                    value={clip.clip_type || 'quick'}
                    onChange={handleClipTypeChange}
                    recommended={recommendedClipType}
                    disabled={isClipGenerating}
                    compact
                  />
                </div>
                {(clip.clip_type === 'controlled' || clip.motion_preset_id) && (
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Motion Preset</Label>
                    <Button variant="outline" size="sm" onClick={() => setShowMotionLibrary(true)} className="w-full justify-start h-8 text-xs border-border">
                      <Sparkles className="w-3.5 h-3.5 mr-2 text-purple-400" />
                      {clip.motion_preset_id ? 'Change Preset' : 'Select Preset'}
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs text-muted-foreground">Motion Prompt</Label>
                  <Button variant="ghost" size="sm" onClick={handleEnhancePrompt} disabled={!hasPrompt || isEnhancingPrompt} className="h-6 px-2 text-[10px] text-purple-400 hover:text-purple-300">
                    {isEnhancingPrompt ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                    Enhance
                  </Button>
                </div>
                <Textarea
                  value={clip.prompt || ''}
                  onChange={(e) => onUpdateClip({ prompt: e.target.value })}
                  placeholder="Describe the motion you want..."
                  className="min-h-[60px] text-sm bg-muted border-border resize-none"
                  disabled={isClipGenerating}
                />
              </div>
              {promptSuggestions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">AI:</span>
                  {promptSuggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleUseSuggestion(suggestion)}
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] transition-colors',
                        'border hover:bg-muted',
                        suggestion.intensity === 'subtle' && 'border-border text-muted-foreground',
                        suggestion.intensity === 'medium' && 'border-blue-800 text-blue-400',
                        suggestion.intensity === 'dynamic' && 'border-purple-800 text-purple-400'
                      )}
                    >
                      {suggestion.prompt.length > 30 ? suggestion.prompt.slice(0, 30) + '...' : suggestion.prompt}
                    </button>
                  ))}
                  {isSuggestingPrompts && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />}
                </div>
              )}
            </div>
          </div>

          {/* Desktop-only sticky action bar */}
          <div className="hidden md:flex items-center justify-between px-4 py-2 border-t border-border bg-muted/70 backdrop-blur-sm gap-2">
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={onDelete} disabled={isClipGenerating} className="h-8 text-xs">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </Button>
              {onDuplicate && (
                <Button variant="outline" size="sm" onClick={onDuplicate} disabled={isClipGenerating} className="h-8 text-xs border-border">
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Duplicate
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canApprove && (
                <Button variant="outline" size="sm" onClick={onApprove} className="h-8 text-xs border-green-700 text-green-400 hover:bg-green-500/10">
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  Approve
                </Button>
              )}
              <Button onClick={onGenerate} disabled={!canGenerate || isClipGenerating} className="h-8 text-xs">
                {isClipGenerating ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating...</>
                ) : clip.video_url ? (
                  <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Regenerate</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate</>
                )}
              </Button>
            </div>
          </div>
        </>
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
