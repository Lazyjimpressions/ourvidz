/**
 * ClipLibrary Component
 *
 * Sidebar with reference sources:
 * - Character canonical poses (with signed URLs)
 * - Previous clip extracted frames
 * - User library images (with signed URLs)
 * - Motion presets
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Character } from '@/types/roleplay';
import { CharacterCanon } from '@/types/character-hub-v2';
import { StoryboardClip, MotionPreset } from '@/types/storyboard';
import { useClipOrchestration } from '@/hooks/useClipOrchestration';
import { useLibraryAssets } from '@/hooks/useLibraryAssets';
import { WorkspaceAssetService, type UnifiedWorkspaceAsset } from '@/lib/services/WorkspaceAssetService';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
  Library,
  ImageOff,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipLibraryProps {
  character?: Character;
  characterCanons?: CharacterCanon[];
  clips?: StoryboardClip[];
  onSelectReference: (imageUrl: string, source: 'character_portrait' | 'extracted_frame' | 'library' | 'workspace') => void;
  onSelectMotionPreset: (preset: MotionPreset) => void;
  className?: string;
}

/**
 * Hook to sign a single URL — handles bare storage paths, already-signed, and public URLs.
 */
function useSignedImageUrl(rawUrl: string | null | undefined): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rawUrl) { setUrl(null); return; }
    // Already a full signed or public URL
    if (rawUrl.startsWith('http') && (rawUrl.includes('?token=') || rawUrl.includes('/public/'))) {
      setUrl(rawUrl);
      return;
    }
    // Full URL without token — use as-is (public bucket like avatars)
    if (rawUrl.startsWith('http') && !rawUrl.includes('user-library') && !rawUrl.includes('workspace-temp')) {
      setUrl(rawUrl);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Determine bucket and clean path
    let bucket = 'user-library';
    let path = rawUrl;
    if (rawUrl.includes('workspace-temp/')) {
      bucket = 'workspace-temp';
    }
    // Strip bucket prefix
    const prefixes = ['user-library/', 'workspace-temp/'];
    for (const p of prefixes) {
      if (path.startsWith(p)) path = path.substring(p.length);
    }
    // Strip URL prefix to get storage path
    if (path.startsWith('http')) {
      const match = path.match(/\/storage\/v1\/object\/(?:sign|public)\/(user-library|workspace-temp)\/([^?]+)/);
      if (match) {
        bucket = match[1];
        path = match[2];
      }
    }
    // Remove leading slashes
    path = path.replace(/^\/+/, '');

    supabase.storage.from(bucket).createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (!cancelled) {
          setUrl(error ? rawUrl : data?.signedUrl || rawUrl);
        }
      })
      .catch(() => { if (!cancelled) setUrl(rawUrl); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [rawUrl]);

  return { url, loading };
}

/**
 * Batch-sign multiple storage paths. Returns a map of originalPath → signedUrl.
 */
function useBatchSignedUrls(paths: { id: string; path: string | null }[], bucket: string, enabled: boolean) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const pathsKey = paths.map(p => p.id).join(',');

  useEffect(() => {
    if (!enabled || paths.length === 0) {
      setUrls({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    setUrls({});

    const signAll = async () => {
      const BATCH = 8;
      for (let i = 0; i < paths.length; i += BATCH) {
        if (cancelled) break;
        const batch = paths.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(async (item) => {
            if (!item.path) return { id: item.id, url: null };
            // Already a full URL
            if (item.path.startsWith('http') && !item.path.includes('user-library/') && !item.path.includes('workspace-temp/')) {
              return { id: item.id, url: item.path };
            }
            let cleanPath = item.path;
            const prefixes = ['user-library/', 'workspace-temp/'];
            for (const p of prefixes) {
              if (cleanPath.startsWith(p)) cleanPath = cleanPath.substring(p.length);
            }
            cleanPath = cleanPath.replace(/^\/+/, '');
            const { data, error } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, 3600);
            return { id: item.id, url: error ? null : data?.signedUrl || null };
          })
        );
        if (cancelled) break;
        const batchUrls: Record<string, string> = {};
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.url) {
            batchUrls[r.value.id] = r.value.url;
          }
        }
        setUrls(prev => ({ ...prev, ...batchUrls }));
      }
      if (!cancelled) setLoading(false);
    };

    signAll();
    return () => { cancelled = true; };
  }, [pathsKey, bucket, enabled]);

  return { urls, loading };
}

// Draggable image card with URL signing built-in
const SignedDraggableImage: React.FC<{
  signedUrl: string | null;
  loading?: boolean;
  label: string;
  sublabel?: string;
  onClick?: () => void;
}> = ({ signedUrl, loading, label, sublabel, onClick }) => {
  if (loading) {
    return <Skeleton className="aspect-square rounded-lg" />;
  }
  if (!signedUrl) {
    return (
      <div className="aspect-square rounded-lg bg-muted/50 border border-border flex items-center justify-center">
        <ImageOff className="w-4 h-4 text-muted-foreground/40" />
      </div>
    );
  }
  return (
    <button
      className="group relative rounded-lg overflow-hidden border border-border hover:border-muted-foreground/40
                 transition-all cursor-grab active:cursor-grabbing bg-muted/50"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/uri-list', signedUrl);
        e.dataTransfer.setData('text/plain', signedUrl);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={onClick}
    >
      <div className="aspect-square bg-background relative">
        <img
          src={signedUrl}
          alt={label}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <GripVertical className="w-5 h-5 text-white/0 group-hover:text-white/80 transition-colors" />
        </div>
      </div>
      <div className="p-1.5">
        <p className="text-[10px] font-medium text-foreground/80 truncate">{label}</p>
        {sublabel && (
          <p className="text-[9px] text-muted-foreground truncate">{sublabel}</p>
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
      className="group relative rounded-lg overflow-hidden border border-border hover:border-muted-foreground/40
                 transition-all bg-muted/50"
      onClick={onSelect}
      onMouseLeave={() => {
        if (videoRef.current && isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }}
    >
      <div className="aspect-video bg-background relative">
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
            <Film className="w-5 h-5 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="p-1.5">
        <p className="text-[10px] font-medium text-foreground/80 truncate">{preset.name}</p>
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
  const { data: paginatedData, isLoading: libraryLoading } = useLibraryAssets();

  const [characterOpen, setCharacterOpen] = useState(true);
  const [framesOpen, setFramesOpen] = useState(true);
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [motionOpen, setMotionOpen] = useState(false);

  // Get clips with extracted frames
  const clipsWithFrames = clips.filter((c) => c.extracted_frame_url);

  // Get a subset of motion presets (first 6)
  const presetPreview = motionPresets.slice(0, 6);

  // --- Character portrait signing ---
  const { url: signedCharacterPortrait, loading: portraitLoading } = useSignedImageUrl(
    character?.reference_image_url || null
  );

  // Canon images that need signing
  const canonImages = useMemo(() =>
    characterCanons.filter(c => c.output_type === 'image').map(c => ({
      id: c.id,
      path: c.output_url,
    })),
    [characterCanons]
  );
  const { urls: canonSignedUrls, loading: canonLoading } = useBatchSignedUrls(
    canonImages, 'user-library', canonImages.length > 0
  );

  // --- Workspace images ---
  const [workspaceAssets, setWorkspaceAssets] = useState<UnifiedWorkspaceAsset[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  useEffect(() => {
    setWorkspaceLoading(true);
    WorkspaceAssetService.getUserWorkspaceAssets()
      .then(assets => {
        setWorkspaceAssets(assets.filter(a => a.assetType === 'image').slice(0, 20));
      })
      .catch(err => {
        console.error('❌ Failed to load workspace assets:', err);
        setWorkspaceAssets([]);
      })
      .finally(() => setWorkspaceLoading(false));
  }, []);

  const workspacePaths = useMemo(() =>
    workspaceAssets.map(a => ({ id: a.id, path: a.tempStoragePath || '' })),
    [workspaceAssets]
  );
  const { urls: workspaceSignedUrls, loading: workspaceSigning } = useBatchSignedUrls(
    workspacePaths, 'workspace-temp', workspacePaths.length > 0
  );

  // --- Library images ---
  const libraryImages = useMemo(() => {
    if (!paginatedData?.pages) return [];
    return paginatedData.pages
      .flatMap(page => page.assets)
      .filter(a => a.status === 'completed' && a.type === 'image')
      .slice(0, 20); // Show first 20
  }, [paginatedData]);

  const libraryPaths = useMemo(() =>
    libraryImages.map(a => ({ id: a.id, path: (a as any).storagePath || '' })),
    [libraryImages]
  );
  const { urls: librarySignedUrls, loading: librarySigning } = useBatchSignedUrls(
    libraryPaths, 'user-library', libraryPaths.length > 0
  );

  return (
    <div className={cn('bg-muted/50 border-l border-border flex flex-col', className)}>
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                  {/* Main portrait - signed */}
                  {character.reference_image_url && (
                    <SignedDraggableImage
                      signedUrl={signedCharacterPortrait}
                      loading={portraitLoading}
                      label={character.name}
                      sublabel="Portrait"
                      onClick={() => {
                        const url = signedCharacterPortrait || character.reference_image_url!;
                        onSelectReference(url, 'character_portrait');
                      }}
                    />
                  )}

                  {/* Canon outputs - signed */}
                  {characterCanons
                    .filter((canon) => canon.output_type === 'image')
                    .map((canon) => (
                      <SignedDraggableImage
                        key={canon.id}
                        signedUrl={canonSignedUrls[canon.id] || null}
                        loading={canonLoading && !canonSignedUrls[canon.id]}
                        label="Canon"
                        sublabel={canon.is_pinned ? 'Pinned' : undefined}
                        onClick={() => {
                          const url = canonSignedUrls[canon.id] || canon.output_url;
                          onSelectReference(url, 'character_portrait');
                        }}
                      />
                    ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
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
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-muted">
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
                  {clipsWithFrames.map((clip) => (
                    <SignedDraggableImage
                      key={clip.id}
                      signedUrl={clip.extracted_frame_url!}
                      label={`Clip ${clip.clip_order + 1}`}
                      sublabel={`@${(clip.extraction_percentage || 50).toFixed(0)}%`}
                      onClick={() => onSelectReference(clip.extracted_frame_url!, 'extracted_frame')}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No frames extracted yet
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Workspace section */}
          <Collapsible open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-7 px-2 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Workspace</span>
                  {workspaceAssets.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-muted">
                      {workspaceAssets.length}
                    </Badge>
                  )}
                </div>
                {workspaceOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {workspaceLoading ? (
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded" />
                  ))}
                </div>
              ) : workspaceAssets.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {workspaceAssets.map((asset) => (
                    <SignedDraggableImage
                      key={asset.id}
                      signedUrl={workspaceSignedUrls[asset.id] || null}
                      loading={workspaceSigning && !workspaceSignedUrls[asset.id]}
                      label={asset.originalPrompt?.substring(0, 20) || 'Image'}
                      onClick={() => {
                        const url = workspaceSignedUrls[asset.id];
                        if (url) onSelectReference(url, 'workspace');
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No workspace images
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-7 px-2 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <Library className="w-3.5 h-3.5 text-amber-400" />
                  <span>My Images</span>
                  {libraryImages.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-muted">
                      {libraryImages.length}
                    </Badge>
                  )}
                </div>
                {libraryOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {libraryLoading ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : libraryImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {libraryImages.map((asset) => (
                    <SignedDraggableImage
                      key={asset.id}
                      signedUrl={librarySignedUrls[asset.id] || null}
                      loading={librarySigning && !librarySignedUrls[asset.id]}
                      label={asset.customTitle || 'Image'}
                      sublabel={asset.modelType || undefined}
                      onClick={() => {
                        const url = librarySignedUrls[asset.id];
                        if (url) onSelectReference(url, 'library');
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No images in your library yet
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
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-muted">
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
                <p className="text-xs text-muted-foreground text-center py-4">
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
                      className="w-full h-6 text-[10px] text-muted-foreground"
                    >
                      View all {motionPresets.length} presets
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
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
