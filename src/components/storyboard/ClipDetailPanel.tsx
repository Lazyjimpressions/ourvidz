/**
 * ClipDetailPanel Component
 *
 * Bottom panel for editing selected clip properties.
 * Mobile-responsive: prompt + generate button are immediately visible.
 * Includes approve button for completed clips and reference image picker.
 */

import React, { useState, useRef, useEffect } from 'react';
import { StoryboardClip, ClipType, MotionPreset, ReferenceImageSource, ReferenceSlot, ReferenceRole } from '@/types/storyboard';
import { supabase } from '@/integrations/supabase/client';
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
  User,
  Video,
  X,
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
  // Phase 8.2: Multi-conditioning reference slots
  references?: ReferenceSlot[];
  onUpdateReferences?: (references: ReferenceSlot[]) => void;
  onPickReferenceForSlot?: (role: ReferenceRole) => void;
  className?: string;
}

/**
 * Reference slot configuration for multi-conditioning UI
 */
const REFERENCE_SLOTS: Array<{
  role: ReferenceRole;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  required: boolean;
}> = [
  {
    role: 'identity',
    label: 'Identity',
    shortLabel: 'ID',
    color: 'blue',
    description: 'Character at frame 0',
    required: true,
  },
  {
    role: 'motion',
    label: 'Motion',
    shortLabel: 'MO',
    color: 'green',
    description: 'Video for style',
    required: false,
  },
  {
    role: 'endframe',
    label: 'End Frame',
    shortLabel: 'EN',
    color: 'purple',
    description: 'Target pose',
    required: false,
  },
];

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
  // Phase 8.2: Multi-conditioning
  references = [],
  onUpdateReferences,
  onPickReferenceForSlot,
  className,
}) => {
  const { suggestPrompts, isSuggestingPrompts, enhancePrompt, isEnhancingPrompt } = useStoryboardAI();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMotionLibrary, setShowMotionLibrary] = useState(false);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestionChip[]>([]);
  const [characterName, setCharacterName] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Local prompt state for responsive typing (debounced to parent)
  const [localPrompt, setLocalPrompt] = useState(clip.prompt || '');
  const promptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local prompt when clip changes
  useEffect(() => {
    setLocalPrompt(clip.prompt || '');
  }, [clip.id]);

  // Debounced update to parent
  const handlePromptChange = (value: string) => {
    setLocalPrompt(value);

    // Clear existing timeout
    if (promptTimeoutRef.current) {
      clearTimeout(promptTimeoutRef.current);
    }

    // Debounce update to parent (300ms)
    promptTimeoutRef.current = setTimeout(() => {
      onUpdateClip({ prompt: value });
    }, 300);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
      }
    };
  }, []);

  const hasVideo = (clip.status === 'completed' || clip.status === 'approved') && clip.video_url;
  const hasExtractedFrame = !!clip.extracted_frame_url;
  const canExtractFrame = hasVideo && onFrameExtracted;
  const hasPrompt = !!localPrompt.trim();
  const hasReference = !!clip.reference_image_url;
  const canGenerate = hasPrompt; // Reference recommended but not required
  const canApprove = clip.status === 'completed' && onApprove;
  const isClipGenerating = clip.status === 'generating' || isGenerating;

  useEffect(() => {
    loadSuggestions();
  }, [clip.id]);

  // Phase 8.1: Load character name for badge display
  useEffect(() => {
    const loadCharacter = async () => {
      if (!clip.scene_id) return;

      try {
        // First get characters from scene
        const { data: scene } = await supabase
          .from('storyboard_scenes')
          .select('characters, project_id')
          .eq('id', clip.scene_id)
          .single();

        if (!scene) {
          setCharacterName(null);
          return;
        }

        const sceneCharacters = scene.characters as string[] | null;
        let characterId: string | null = null;

        if (sceneCharacters && sceneCharacters.length > 0) {
          characterId = sceneCharacters[0];
        } else if (scene.project_id) {
          // Fallback to project primary character
          const { data: project } = await supabase
            .from('storyboard_projects')
            .select('primary_character_id')
            .eq('id', scene.project_id)
            .single();
          characterId = project?.primary_character_id || null;
        }

        if (characterId) {
          const { data: character } = await supabase
            .from('characters')
            .select('name')
            .eq('id', characterId)
            .single();
          setCharacterName(character?.name || null);
        } else {
          setCharacterName(null);
        }
      } catch (err) {
        console.error('Failed to load character for badge:', err);
        setCharacterName(null);
      }
    };

    loadCharacter();
  }, [clip.scene_id]);

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
    if (!localPrompt.trim()) return;
    const result = await enhancePrompt({
      prompt: localPrompt,
      clipType: clip.clip_type || 'quick',
      contentMode,
    });
    if (result.enhancedPrompt !== result.originalPrompt) {
      setLocalPrompt(result.enhancedPrompt);
      onUpdateClip({ prompt: result.enhancedPrompt, enhanced_prompt: result.enhancedPrompt });
    }
  };

  const handleUseSuggestion = (suggestion: PromptSuggestionChip) => {
    setLocalPrompt(suggestion.prompt);
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

  // Phase 8.2: Multi-reference helpers
  const getReferenceByRole = (role: ReferenceRole): ReferenceSlot | undefined => {
    return references.find(r => r.role === role);
  };

  const removeReferenceByRole = (role: ReferenceRole) => {
    if (!onUpdateReferences) return;
    const updated = references.filter(r => r.role !== role);
    onUpdateReferences(updated);
  };

  const getSlotColorClasses = (role: ReferenceRole, filled: boolean) => {
    const colors: Record<ReferenceRole, { border: string; bg: string; text: string }> = {
      identity: { border: 'border-blue-500/60', bg: 'bg-blue-500/20', text: 'text-blue-400' },
      motion: { border: 'border-green-500/60', bg: 'bg-green-500/20', text: 'text-green-400' },
      endframe: { border: 'border-purple-500/60', bg: 'bg-purple-500/20', text: 'text-purple-400' },
      scene: { border: 'border-amber-500/60', bg: 'bg-amber-500/20', text: 'text-amber-400' },
    };
    const c = colors[role];
    return filled
      ? `${c.border} ${c.bg}`
      : `border-dashed border-muted-foreground/30 hover:${c.border}`;
  };

  const hasMultiRefs = references.length > 0;
  const identityRef = getReferenceByRole('identity');
  const motionRef = getReferenceByRole('motion');
  const endframeRef = getReferenceByRole('endframe');

  // Phase 8.2: Drag and drop handlers for reference slots
  const handleSlotDragOver = (e: React.DragEvent, role: ReferenceRole) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if dragging valid data
    if (e.dataTransfer.types.includes('text/uri-list') || e.dataTransfer.types.includes('text/plain')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleSlotDrop = (e: React.DragEvent, role: ReferenceRole) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onUpdateReferences) return;

    // Get URL from drag data
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (!url || !url.startsWith('http')) return;

    // Check if this is a video URL (for motion slot) or image
    const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || e.dataTransfer.getData('application/x-video-url');

    // Motion slot expects videos, others expect images
    if (role === 'motion' && !isVideo) {
      console.log('🎬 Motion slot requires a video reference');
      // Still allow images for identity reference on motion slot drop
    }

    // Create new reference slot
    const newRef: ReferenceSlot = {
      url,
      role,
      strength: 1.0,
      source: 'library', // Default source for dropped items
    };

    // Update references - replace existing ref with same role
    const updated = references.filter(r => r.role !== role);
    updated.push(newRef);
    onUpdateReferences(updated);

    console.log(`🎯 Dropped ${isVideo ? 'video' : 'image'} into ${role} slot:`, url.substring(0, 60) + '...');
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
          {/* Phase 8.1: Character badge */}
          {characterName && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 border-purple-500/40 text-purple-400">
              <User className="w-3 h-3" />
              {characterName}
            </Badge>
          )}
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
                  value={localPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
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
              {/* Phase 8.2: Multi-Reference Slots */}
              {onPickReferenceForSlot && (
                <div className="mt-3 space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">References</Label>
                  <div className="flex gap-2">
                    {REFERENCE_SLOTS.map((slot) => {
                      const ref = getReferenceByRole(slot.role);
                      const isFilled = !!ref;
                      const isMotion = slot.role === 'motion';

                      return (
                        <div key={slot.role} className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => onPickReferenceForSlot(slot.role)}
                            onDragOver={(e) => handleSlotDragOver(e, slot.role)}
                            onDrop={(e) => handleSlotDrop(e, slot.role)}
                            disabled={isClipGenerating}
                            className={cn(
                              'relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all',
                              getSlotColorClasses(slot.role, isFilled),
                              isClipGenerating && 'opacity-50 cursor-not-allowed'
                            )}
                            title={`${slot.label}: ${slot.description} (drag & drop supported)`}
                          >
                            {isFilled ? (
                              <>
                                {isMotion ? (
                                  <div className="w-full h-full flex items-center justify-center bg-green-500/10">
                                    <Video className="w-5 h-5 text-green-400" />
                                  </div>
                                ) : (
                                  <img src={ref.url} alt={slot.label} className="w-full h-full object-cover" />
                                )}
                                {/* Remove button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeReferenceByRole(slot.role);
                                  }}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition-colors"
                                >
                                  <X className="w-2.5 h-2.5 text-white" />
                                </button>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 gap-0.5">
                                {isMotion ? (
                                  <Video className="w-4 h-4 text-muted-foreground/40" />
                                ) : (
                                  <ImagePlus className="w-4 h-4 text-muted-foreground/40" />
                                )}
                              </div>
                            )}
                            {/* Role badge */}
                            <div className={cn(
                              'absolute bottom-0 left-0 right-0 text-[8px] font-medium text-center py-0.5',
                              isFilled ? 'bg-black/60 text-white' : 'bg-muted/50 text-muted-foreground'
                            )}>
                              {slot.shortLabel}
                            </div>
                          </button>
                          <span className={cn(
                            'text-[9px]',
                            isFilled ? getSlotColorClasses(slot.role, true).split(' ').find(c => c.startsWith('text-')) : 'text-muted-foreground/60'
                          )}>
                            {slot.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {references.length > 1 && (
                    <p className="text-[9px] text-green-400/80">
                      Multi-conditioning enabled ({references.length} refs)
                    </p>
                  )}
                </div>
              )}

              {/* Legacy single reference display (fallback when multi-ref not enabled) */}
              {!onPickReferenceForSlot && (
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
              )}
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
                  value={localPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
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
