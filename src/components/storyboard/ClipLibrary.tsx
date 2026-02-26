/**
 * ClipLibrary Component
 *
 * Sidebar with draggable reference sources:
 * - Character canonical poses
 * - Previous clip extracted frames
 * - Motion presets
 */

import React, { useState } from 'react';
import { Character } from '@/types/roleplay';
import { CharacterCanon } from '@/types/character-hub-v2';
import { StoryboardClip, MotionPreset } from '@/types/storyboard';
import { useClipOrchestration } from '@/hooks/useClipOrchestration';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  User,
  Image,
  Film,
  ChevronDown,
  ChevronRight,
  Sparkles,
  GripVertical,
  Play,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipLibraryProps {
  character?: Character;
  characterCanons?: CharacterCanon[];
  clips?: StoryboardClip[];
  onSelectReference: (imageUrl: string, source: 'character_portrait' | 'extracted_frame' | 'library') => void;
  onSelectMotionPreset: (preset: MotionPreset) => void;
  className?: string;
}

// Draggable image card
const DraggableImage: React.FC<{
  imageUrl: string;
  label: string;
  sublabel?: string;
  onDragStart: (imageUrl: string) => void;
  onClick?: () => void;
}> = ({ imageUrl, label, sublabel, onDragStart, onClick }) => {
  return (
    <button
      className="group relative rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600
                 transition-all cursor-grab active:cursor-grabbing bg-gray-900/50"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/uri-list', imageUrl);
        e.dataTransfer.setData('text/plain', imageUrl);
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart(imageUrl);
      }}
      onClick={onClick}
    >
      <div className="aspect-square bg-gray-950 relative">
        <img
          src={imageUrl}
          alt={label}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Drag handle indicator */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <GripVertical className="w-5 h-5 text-white/0 group-hover:text-white/80 transition-colors" />
        </div>
      </div>
      <div className="p-1.5">
        <p className="text-[10px] font-medium text-gray-300 truncate">{label}</p>
        {sublabel && (
          <p className="text-[9px] text-gray-500 truncate">{sublabel}</p>
        )}
      </div>
    </button>
  );
};

// Motion preset preview card
const MotionPresetCard: React.FC<{
  preset: MotionPreset;
  onSelect: () => void;
}> = ({ preset, onSelect }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleToggle = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <button
      className="group relative rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600
                 transition-all bg-gray-900/50"
      onClick={onSelect}
      onMouseLeave={() => {
        if (videoRef.current && isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }}
    >
      <div className="aspect-video bg-gray-950 relative">
        {preset.video_url ? (
          <>
            <video
              ref={videoRef}
              src={preset.video_url}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              poster={preset.thumbnail_url}
            />
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white/0 group-hover:text-white/80" />
              ) : (
                <Play className="w-5 h-5 text-white/0 group-hover:text-white/80" />
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </div>
      <div className="p-1.5">
        <p className="text-[10px] font-medium text-gray-300 truncate">{preset.name}</p>
      </div>
    </button>
  );
};

export const ClipLibrary: React.FC<ClipLibraryProps> = ({
  character,
  characterCanons = [],
  clips = [],
  onSelectReference,
  onSelectMotionPreset,
  className,
}) => {
  const { motionPresets, presetsLoading } = useClipOrchestration();

  const [characterOpen, setCharacterOpen] = useState(true);
  const [framesOpen, setFramesOpen] = useState(true);
  const [motionOpen, setMotionOpen] = useState(false);

  // Get clips with extracted frames
  const clipsWithFrames = clips.filter((c) => c.extracted_frame_url);

  // Get a subset of motion presets (first 6)
  const presetPreview = motionPresets.slice(0, 6);

  const handleDragStart = (_imageUrl: string) => {
    // Could add visual feedback here
  };

  return (
    <div className={cn('bg-gray-900/50 border-l border-gray-800 flex flex-col', className)}>
      <div className="px-3 py-2 border-b border-gray-800">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Library
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Character section */}
          <Collapsible open={characterOpen} onOpenChange={setCharacterOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-7 px-2 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Character</span>
                </div>
                {characterOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {character ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {/* Main portrait */}
                  {character.reference_image_url && (
                    <DraggableImage
                      imageUrl={character.reference_image_url}
                      label={character.name}
                      sublabel="Portrait"
                      onDragStart={handleDragStart}
                      onClick={() => onSelectReference(character.reference_image_url!, 'character_portrait')}
                    />
                  )}

                  {/* Canon outputs */}
                  {characterCanons
                    .filter((canon) => canon.output_type === 'image')
                    .map((canon) => (
                      <DraggableImage
                        key={canon.id}
                        imageUrl={canon.output_url}
                        label="Canon"
                        sublabel={canon.is_pinned ? 'Pinned' : undefined}
                        onDragStart={handleDragStart}
                        onClick={() => onSelectReference(canon.output_url, 'character_portrait')}
                      />
                    ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">
                  No character selected
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Extracted frames section */}
          <Collapsible open={framesOpen} onOpenChange={setFramesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-7 px-2 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-green-400" />
                  <span>Clip Frames</span>
                  {clipsWithFrames.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-gray-800">
                      {clipsWithFrames.length}
                    </Badge>
                  )}
                </div>
                {framesOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {clipsWithFrames.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {clipsWithFrames.map((clip, index) => (
                    <DraggableImage
                      key={clip.id}
                      imageUrl={clip.extracted_frame_url!}
                      label={`Clip ${clip.clip_order + 1}`}
                      sublabel={`@${(clip.extraction_percentage || 50).toFixed(0)}%`}
                      onDragStart={handleDragStart}
                      onClick={() => onSelectReference(clip.extracted_frame_url!, 'extracted_frame')}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">
                  No frames extracted yet
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Motion presets section */}
          <Collapsible open={motionOpen} onOpenChange={setMotionOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-7 px-2 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Motion Presets</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-gray-800">
                    {motionPresets.length}
                  </Badge>
                </div>
                {motionOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {presetsLoading ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  Loading...
                </p>
              ) : presetPreview.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {presetPreview.map((preset) => (
                      <MotionPresetCard
                        key={preset.id}
                        preset={preset}
                        onSelect={() => onSelectMotionPreset(preset)}
                      />
                    ))}
                  </div>
                  {motionPresets.length > 6 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-6 text-[10px] text-gray-500"
                    >
                      View all {motionPresets.length} presets
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">
                  No motion presets
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ClipLibrary;
