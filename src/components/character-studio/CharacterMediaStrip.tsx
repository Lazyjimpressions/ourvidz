import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Crown, ImageIcon, History, Download, Trash2, Pin, Star, User, Shirt, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnchorSlotType } from '@/components/character-studio/AnchorReferencePanel';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { CharacterPortrait } from '@/hooks/usePortraitVersions';

export type MediaStripTab = 'canon' | 'album' | 'scenes';

// Scene item from character_scenes table
export interface SceneItem {
  id: string;
  image_url: string | null;
  scene_prompt?: string;
  prompt?: string;
  created_at?: string;
}

// Album item from user_library table
export interface AlbumItem {
  id: string;
  storage_path: string;
  thumbnail_path?: string | null;
  original_prompt?: string | null;
  created_at?: string;
}

interface CharacterMediaStripProps {
  characterId?: string;
  // Canon tab data (from usePortraitVersions)
  portraits: CharacterPortrait[];
  isLoadingPortraits: boolean;
  onSetPrimaryPortrait?: (portraitId: string) => void;
  onDeletePortrait?: (portraitId: string) => void;
  // Album tab data
  albumImages: AlbumItem[];
  isLoadingAlbum: boolean;
  onDeleteFromAlbum?: (libraryId: string) => void;
  // Scenes tab data (from useCharacterStudioV2)
  history: SceneItem[];
  isLoadingHistory: boolean;
  onPinToCanon?: (scene: SceneItem) => void;
  onSaveToAlbum?: (scene: SceneItem) => void;
  /** Save scene as a reusable reference (not character-specific) */
  onSaveAsReference?: (scene: SceneItem, anchorType: AnchorSlotType) => void;
  onUseAsMain?: (scene: SceneItem) => void;
  onDeleteScene?: (sceneId: string) => void;
  // Reference actions - use image as anchor reference in Column C
  onUseAsReference?: (imageUrl: string, signedUrl: string, slot: AnchorSlotType, sourceName?: string) => void;
}

// Helper to sign storage URLs
async function getSignedUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const knownBuckets = ['workspace-temp', 'user-library', 'characters', 'reference_images'];
  const parts = url.split('/');
  let bucket = 'user-library';
  let path = url;

  if (knownBuckets.includes(parts[0])) {
    bucket = parts[0];
    path = parts.slice(1).join('/');
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (error) {
      console.error('Failed to sign URL:', error);
      return url;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('Error signing URL:', err);
    return url;
  }
}

export function CharacterMediaStrip({
  characterId,
  portraits,
  isLoadingPortraits,
  onSetPrimaryPortrait,
  onDeletePortrait,
  albumImages,
  isLoadingAlbum,
  onDeleteFromAlbum,
  history,
  isLoadingHistory,
  onPinToCanon,
  onSaveToAlbum,
  onSaveAsReference,
  onUseAsMain,
  onDeleteScene,
  onUseAsReference,
}: CharacterMediaStripProps) {
  const [activeTab, setActiveTab] = useState<MediaStripTab>('scenes');
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<{ url: string; prompt?: string } | null>(null);

  // Sign URLs when data changes
  useEffect(() => {
    const signUrls = async () => {
      const urlMap: Record<string, string> = {};

      // Sign portrait URLs
      for (const portrait of portraits) {
        if (portrait.image_url) {
          urlMap[`portrait-${portrait.id}`] = await getSignedUrl(portrait.image_url);
        }
      }

      // Sign album URLs
      for (const album of albumImages) {
        if (album.storage_path) {
          urlMap[`album-${album.id}`] = await getSignedUrl(album.storage_path);
        }
      }

      // Sign scene URLs
      for (const scene of history) {
        if (scene.image_url) {
          urlMap[`scene-${scene.id}`] = await getSignedUrl(scene.image_url);
        }
      }

      setSignedUrls(urlMap);
    };

    signUrls();
  }, [portraits, albumImages, history]);

  const renderCanonTab = () => {
    if (isLoadingPortraits) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (portraits.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <Crown className="w-6 h-6 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No canon portraits yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Pin images from Scenes to create canon</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-4 gap-2 p-2">
        {portraits.map((portrait) => (
          <ContextMenu key={portrait.id}>
            <ContextMenuTrigger>
              <div
                className={cn(
                  "relative aspect-[3/4] rounded-md overflow-hidden cursor-pointer border-2 transition-all hover:ring-2 hover:ring-primary/50",
                  portrait.is_primary ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                )}
                onClick={() => {
                  const url = signedUrls[`portrait-${portrait.id}`];
                  if (url) setSelectedImage({ url, prompt: portrait.prompt || undefined });
                }}
              >
                {signedUrls[`portrait-${portrait.id}`] ? (
                  <img
                    src={signedUrls[`portrait-${portrait.id}`]}
                    alt="Canon portrait"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/50" />
                  </div>
                )}
                {portrait.is_primary && (
                  <div className="absolute top-1 right-1 bg-primary text-white text-[8px] px-1 py-0.5 rounded">
                    Primary
                  </div>
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              {!portrait.is_primary && onSetPrimaryPortrait && (
                <ContextMenuItem onClick={() => onSetPrimaryPortrait(portrait.id)}>
                  <Star className="w-3 h-3 mr-2" />
                  Set as Primary
                </ContextMenuItem>
              )}
              {onUseAsReference && (
                <>
                  <ContextMenuItem onClick={() => {
                    const signed = signedUrls[`portrait-${portrait.id}`];
                    if (signed) onUseAsReference(portrait.image_url, signed, 'face', 'Canon');
                  }}>
                    <User className="w-3 h-3 mr-2" />
                    Use as Face Reference
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    const signed = signedUrls[`portrait-${portrait.id}`];
                    if (signed) onUseAsReference(portrait.image_url, signed, 'body', 'Canon');
                  }}>
                    <Shirt className="w-3 h-3 mr-2" />
                    Use as Body Reference
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    const signed = signedUrls[`portrait-${portrait.id}`];
                    if (signed) onUseAsReference(portrait.image_url, signed, 'style', 'Canon');
                  }}>
                    <Palette className="w-3 h-3 mr-2" />
                    Use as Style Reference
                  </ContextMenuItem>
                </>
              )}
              {onDeletePortrait && (
                <ContextMenuItem onClick={() => onDeletePortrait(portrait.id)} className="text-destructive">
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
    );
  };

  const renderAlbumTab = () => {
    if (isLoadingAlbum) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (albumImages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <ImageIcon className="w-6 h-6 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No album images yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Save images from Scenes to your album</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-4 gap-2 p-2">
        {albumImages.map((album) => (
          <ContextMenu key={album.id}>
            <ContextMenuTrigger>
              <div
                className="relative aspect-[3/4] rounded-md overflow-hidden cursor-pointer border border-transparent hover:border-primary/50 transition-all"
                onClick={() => {
                  const url = signedUrls[`album-${album.id}`];
                  if (url) setSelectedImage({ url, prompt: album.original_prompt || undefined });
                }}
              >
                {signedUrls[`album-${album.id}`] ? (
                  <img
                    src={signedUrls[`album-${album.id}`]}
                    alt="Album image"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/50" />
                  </div>
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              {onUseAsReference && (
                <>
                  <ContextMenuItem onClick={() => {
                    const signed = signedUrls[`album-${album.id}`];
                    if (signed) onUseAsReference(album.storage_path, signed, 'face', 'Album');
                  }}>
                    <User className="w-3 h-3 mr-2" />
                    Use as Face Reference
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    const signed = signedUrls[`album-${album.id}`];
                    if (signed) onUseAsReference(album.storage_path, signed, 'body', 'Album');
                  }}>
                    <Shirt className="w-3 h-3 mr-2" />
                    Use as Body Reference
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    const signed = signedUrls[`album-${album.id}`];
                    if (signed) onUseAsReference(album.storage_path, signed, 'style', 'Album');
                  }}>
                    <Palette className="w-3 h-3 mr-2" />
                    Use as Style Reference
                  </ContextMenuItem>
                </>
              )}
              <ContextMenuItem onClick={() => {
                const url = signedUrls[`album-${album.id}`];
                if (url) window.open(url, '_blank');
              }}>
                <Download className="w-3 h-3 mr-2" />
                Download
              </ContextMenuItem>
              {onDeleteFromAlbum && (
                <ContextMenuItem onClick={() => onDeleteFromAlbum(album.id)} className="text-destructive">
                  <Trash2 className="w-3 h-3 mr-2" />
                  Remove from Album
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
    );
  };

  const renderScenesTab = () => {
    if (isLoadingHistory) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (history.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <History className="w-6 h-6 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No scenes generated yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Generate images to see them here</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-4 gap-2 p-2">
        {history.map((scene) => (
          <ContextMenu key={scene.id}>
            <ContextMenuTrigger>
              <div
                className="relative aspect-[3/4] rounded-md overflow-hidden cursor-pointer border border-transparent hover:border-primary/50 transition-all group"
                onClick={() => {
                  const url = signedUrls[`scene-${scene.id}`];
                  if (url) setSelectedImage({ url, prompt: scene.scene_prompt || scene.prompt });
                }}
              >
                {signedUrls[`scene-${scene.id}`] ? (
                  <img
                    src={signedUrls[`scene-${scene.id}`]}
                    alt="Scene"
                    className="w-full h-full object-cover"
                  />
                ) : scene.image_url === null ? (
                  <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/50" />
                  </div>
                )}
                {/* Hover overlay with quick actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  {onPinToCanon && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPinToCanon(scene);
                      }}
                      title="Pin to Canon"
                    >
                      <Crown className="w-3 h-3" />
                    </Button>
                  )}
                  {onSaveToAlbum && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveToAlbum(scene);
                      }}
                      title="Save to Album"
                    >
                      <ImageIcon className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              {onPinToCanon && (
                <ContextMenuItem onClick={() => onPinToCanon(scene)}>
                  <Crown className="w-3 h-3 mr-2" />
                  Pin to Canon
                </ContextMenuItem>
              )}
              {onSaveToAlbum && (
                <ContextMenuItem onClick={() => onSaveToAlbum(scene)}>
                  <ImageIcon className="w-3 h-3 mr-2" />
                  Save to Album
                </ContextMenuItem>
              )}
              {onUseAsReference && scene.image_url && (
                <>
                  <ContextMenuItem onClick={() => {
                    const signed = signedUrls[`scene-${scene.id}`];
                    if (signed && scene.image_url) onUseAsReference(scene.image_url, signed, 'face', 'Scene');
                  }}>
                    <User className="w-3 h-3 mr-2" />
                    Use as Face Reference
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    const signed = signedUrls[`scene-${scene.id}`];
                    if (signed && scene.image_url) onUseAsReference(scene.image_url, signed, 'body', 'Scene');
                  }}>
                    <Shirt className="w-3 h-3 mr-2" />
                    Use as Body Reference
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    const signed = signedUrls[`scene-${scene.id}`];
                    if (signed && scene.image_url) onUseAsReference(scene.image_url, signed, 'style', 'Scene');
                  }}>
                    <Palette className="w-3 h-3 mr-2" />
                    Use as Style Reference
                  </ContextMenuItem>
                </>
              )}
              {onSaveAsReference && scene.image_url && (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Pin className="w-3 h-3 mr-2" />
                    Save as Reference
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    <ContextMenuItem onClick={() => onSaveAsReference(scene, 'face')}>
                      <User className="w-3 h-3 mr-2" />
                      Face Reference
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onSaveAsReference(scene, 'body')}>
                      <Shirt className="w-3 h-3 mr-2" />
                      Body Reference
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onSaveAsReference(scene, 'style')}>
                      <Palette className="w-3 h-3 mr-2" />
                      Style Reference
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              )}
              {onUseAsMain && (
                <ContextMenuItem onClick={() => onUseAsMain(scene)}>
                  <Star className="w-3 h-3 mr-2" />
                  Set as Profile
                </ContextMenuItem>
              )}
              <ContextMenuItem onClick={() => {
                const url = signedUrls[`scene-${scene.id}`];
                if (url) window.open(url, '_blank');
              }}>
                <Download className="w-3 h-3 mr-2" />
                Download
              </ContextMenuItem>
              {onDeleteScene && (
                <ContextMenuItem onClick={() => onDeleteScene(scene.id)} className="text-destructive">
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex-none border-b border-border/50 px-2 py-1">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MediaStripTab)}>
          <TabsList className="grid w-full grid-cols-3 h-7 bg-muted/50 p-0.5">
            <TabsTrigger value="canon" className="text-[10px] h-6 data-[state=active]:bg-background gap-1">
              <Crown className="w-3 h-3" />
              Canon
              {portraits.length > 0 && (
                <span className="text-[8px] bg-primary/20 text-primary px-1 rounded">{portraits.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="album" className="text-[10px] h-6 data-[state=active]:bg-background gap-1">
              <ImageIcon className="w-3 h-3" />
              Album
              {albumImages.length > 0 && (
                <span className="text-[8px] bg-primary/20 text-primary px-1 rounded">{albumImages.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="scenes" className="text-[10px] h-6 data-[state=active]:bg-background gap-1">
              <History className="w-3 h-3" />
              Scenes
              {history.length > 0 && (
                <span className="text-[8px] bg-primary/20 text-primary px-1 rounded">{history.length}</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'canon' && renderCanonTab()}
        {activeTab === 'album' && renderAlbumTab()}
        {activeTab === 'scenes' && renderScenesTab()}
      </div>

      {/* Fullscreen Image Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-none">
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage.url}
                alt="Full size"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              {selectedImage.prompt && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-xs text-white/80 line-clamp-2">{selectedImage.prompt}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
