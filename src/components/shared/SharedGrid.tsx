import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Eye, Download, Save, Trash2, Image, Shuffle, ArrowRight, Copy, ExternalLink, XCircle, Video, Loader2, ImagePlus } from 'lucide-react';
import type { SharedAsset } from '@/lib/services/AssetMappers';
import type { SignedAsset } from '@/lib/hooks/useSignedAssets';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { urlSigningService } from '@/lib/services/UrlSigningService';
import { AssetTile } from '@/components/shared/AssetTile';
import { QuickRating } from '@/components/QuickRating';
import { usePromptScoringConfig } from '@/hooks/usePromptScoringConfig';

// Global concurrency control for original image loading
class OriginalImageLoader {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private readonly maxConcurrency = 3;

  async load(loadFn: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          await loadFn();
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      };

      if (this.running < this.maxConcurrency) {
        this.running++;
        task();
      } else {
        this.queue.push(() => {
          this.running++;
          return task();
        });
      }
    });
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.maxConcurrency) {
      const task = this.queue.shift()!;
      task();
    }
  }
}

const originalImageLoader = new OriginalImageLoader();

export type SharedGridProps = {
  assets: SignedAsset[];
  onPreview: (asset: SharedAsset) => void;
  selection?: {
    enabled: boolean;
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
  };
  actions?: {
    // For Workspace
    onSaveToLibrary?: (asset: SharedAsset) => void;
    onClear?: (asset: SharedAsset) => void;
    onDiscard?: (asset: SharedAsset) => void;
    onSendToRef?: (asset: SharedAsset) => void;
    // For Library
    onDelete?: (asset: SharedAsset) => void;
    onDownload?: (asset: SharedAsset) => void;
    onUseAsReference?: (asset: SharedAsset) => void;
    onAddToWorkspace?: (asset: SharedAsset) => void;
  };
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  registerAssetRef?: (element: HTMLElement | null, assetId: string) => void;
};

export const SharedGrid: React.FC<SharedGridProps> = ({
  assets,
  onPreview,
  selection,
  actions,
  isLoading,
  emptyState,
  registerAssetRef
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const { showQuickRating } = usePromptScoringConfig();

  // Single shared IntersectionObserver for all cards
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIds(prev => {
          const next = new Set(prev);
          let changed = false;
          for (const entry of entries) {
            const id = entry.target.getAttribute('data-asset-id');
            if (!id) continue;
            if (entry.isIntersecting && !next.has(id)) {
              next.add(id);
              changed = true;
            } else if (!entry.isIntersecting && next.has(id)) {
              next.delete(id);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      { rootMargin: '200px' }
    );
    observerRef.current = observer;
    return () => observer.disconnect();
  }, []);

  const registerCardElement = useCallback((element: HTMLElement | null, assetId: string) => {
    const observer = observerRef.current;
    if (!observer) return;

    const prev = cardElementsRef.current.get(assetId);
    if (prev && prev !== element) {
      observer.unobserve(prev);
      cardElementsRef.current.delete(assetId);
    }

    if (element) {
      cardElementsRef.current.set(assetId, element);
      observer.observe(element);
    }

    registerAssetRef?.(element, assetId);
  }, [registerAssetRef]);

  // Loading state
  if (isLoading) {
    return (
      <div 
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
        ))}
      </div>
    );
  }

  // Empty state
  if (assets.length === 0) {
    return emptyState || (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No assets found</p>
      </div>
    );
  }

  return (
    <div 
      ref={gridRef}
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
    >
      {assets.map((asset) => (
        <SharedGridCard
          key={asset.id}
          asset={asset}
          onPreview={onPreview}
          selection={selection}
          actions={actions}
          isVisible={visibleIds.has(asset.id)}
          registerRef={registerCardElement}
          showQuickRating={showQuickRating}
        />
      ))}
    </div>
  );
};

type SharedGridCardProps = {
  asset: SignedAsset;
  onPreview: (asset: SharedAsset) => void;
  selection?: SharedGridProps['selection'];
  actions?: SharedGridProps['actions'];
  isVisible: boolean;
  registerRef?: (element: HTMLElement | null, assetId: string) => void;
  showQuickRating?: boolean;
};

const SharedGridCard: React.FC<SharedGridCardProps> = ({
  asset,
  onPreview,
  selection,
  actions,
  isVisible,
  registerRef,
  showQuickRating
}) => {
  const isSelected = selection?.selectedIds.has(asset.id) ?? false;
  const cardRef = useRef<HTMLDivElement>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [isLoadingFallback, setIsLoadingFallback] = useState(false);
  const [generatedVideoThumbnail, setGeneratedVideoThumbnail] = useState<string | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [hoverVideoUrl, setHoverVideoUrl] = useState<string | null>(null);
  const [isSigningVideo, setIsSigningVideo] = useState(false);
  
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  // Register with shared observer and set data attribute for observer identification
  useEffect(() => {
    const el = cardRef.current;
    if (el) {
      el.setAttribute('data-asset-id', asset.id);
    }
    registerRef?.(el, asset.id);
    return () => { registerRef?.(null, asset.id); };
  }, [registerRef, asset.id]);

  // Helper to safely get original URL with fallback to direct signing
  const signOriginalSafely = useCallback(async (asset: SignedAsset): Promise<string> => {
    if (typeof asset.signOriginal === 'function') {
      try {
        return await asset.signOriginal();
      } catch (err) {
        console.warn('🔄 asset.signOriginal failed, falling back to direct signing:', err);
      }
    }
    
    if (asset.originalPath) {
      const bucket = asset.metadata?.source === 'library' ? 'user-library' : 'workspace-temp';
      return await urlSigningService.getSignedUrl(asset.originalPath, bucket);
    }
    
    throw new Error('No original path available for signing');
  }, []);

  // Generate video thumbnail client-side
  const generateVideoThumbnail = useCallback(async (videoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        const seekTime = Math.min(video.duration * 0.1, 0.5);
        video.currentTime = seekTime;
      };
      
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDimension = isMobile ? 200 : 400;
          let width = video.videoWidth;
          let height = video.videoHeight;
          
          if (width > maxDimension || height > maxDimension) {
            const scale = maxDimension / Math.max(width, height);
            width = Math.floor(width * scale);
            height = Math.floor(height * scale);
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const quality = isMobile ? 0.7 : 0.85;
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Error generating video thumbnail:', error);
          resolve(null);
        }
      };
      
      video.onerror = () => resolve(null);
      video.src = videoUrl;
    });
  }, [isMobile]);

  // Load fallback URL for images when visible, no thumbUrl
  useEffect(() => {
    if (!asset.thumbUrl && asset.type === 'image' && !fallbackUrl && !isLoadingFallback && isVisible) {
      setIsLoadingFallback(true);
      
      const timeout = setTimeout(() => {
        if (!fallbackUrl) {
          setIsLoadingFallback(false);
        }
      }, 10000);
      
      originalImageLoader.load(async () => {
        try {
          const url = await signOriginalSafely(asset);
          setFallbackUrl(url);
        } catch (err) {
          console.warn('❌ Failed to load fallback image for asset', asset.id, err);
        }
      }).finally(() => {
        clearTimeout(timeout);
        setIsLoadingFallback(false);
      });
      
      return () => clearTimeout(timeout);
    }
  }, [asset.thumbUrl, asset.type, asset.id, fallbackUrl, isLoadingFallback, isVisible, signOriginalSafely]);

  // Generate video thumbnail when visible
  useEffect(() => {
    if (
      asset.type === 'video' && 
      !asset.thumbUrl && 
      !generatedVideoThumbnail && 
      !isGeneratingThumbnail && 
      isVisible &&
      asset.originalPath
    ) {
      setIsGeneratingThumbnail(true);
      
      const timeout = setTimeout(() => {
        if (!generatedVideoThumbnail) {
          setIsGeneratingThumbnail(false);
        }
      }, 15000);
      
      originalImageLoader.load(async () => {
        try {
          const videoUrl = await signOriginalSafely(asset);
          const thumbnail = await generateVideoThumbnail(videoUrl);
          if (thumbnail) setGeneratedVideoThumbnail(thumbnail);
        } catch (err) {
          console.warn('❌ Failed to generate video thumbnail for asset', asset.id, err);
        }
      }).finally(() => {
        clearTimeout(timeout);
        setIsGeneratingThumbnail(false);
      });
      
      return () => clearTimeout(timeout);
    }
  }, [asset.type, asset.thumbUrl, asset.id, asset.originalPath, generatedVideoThumbnail, isGeneratingThumbnail, isVisible, signOriginalSafely, generateVideoThumbnail]);

  // Sign video URL on hover for autoplay (desktop only, lazy)
  const handleCardMouseEnter = useCallback(() => {
    if (asset.type === 'video' && !hoverVideoUrl && !isSigningVideo && !isMobile && asset.originalPath) {
      setIsSigningVideo(true);
      signOriginalSafely(asset)
        .then(url => setHoverVideoUrl(url))
        .catch(err => console.warn('❌ Failed to sign video for hover playback', err))
        .finally(() => setIsSigningVideo(false));
    }
  }, [asset, hoverVideoUrl, isSigningVideo, isMobile, signOriginalSafely]);

  const handlePreview = useCallback(() => {
    onPreview(asset);
  }, [onPreview, asset]);

  const isWorkspace = asset.metadata?.source === 'workspace';
  const isLibrary = asset.metadata?.source === 'library';

  // Create a small canvas drag ghost (40×53) from the tile's image for ref-slot drops.
  // Use in-DOM img only when loaded; fallback to cached Image(displayUrl) when tile shows fallback UI.
  const handleDragStart = useCallback((e: React.DragEvent) => {
    const displayUrl = asset.thumbUrl || generatedVideoThumbnail || (asset.type === 'image' ? fallbackUrl : null);
    // Set custom MIME data for ref slot drops
    e.dataTransfer.setData('application/x-ref-image', JSON.stringify({
      url: displayUrl || '',
      assetId: asset.id,
      type: asset.type,
    }));
    e.dataTransfer.effectAllowed = 'copy';

    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 53;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setDragImageFromSource = (source: HTMLImageElement | HTMLVideoElement) => {
      try {
        ctx.drawImage(source, 0, 0, 40, 53);
        e.dataTransfer.setDragImage(canvas, 20, 26);
      } catch {
        // Tainted canvas or draw failed; skip custom drag image
      }
    };

    const img = cardRef.current?.querySelector('img') as HTMLImageElement | null;
    if (img && img.complete && img.naturalWidth > 0) {
      setDragImageFromSource(img);
      return;
    }

    if (displayUrl) {
      const cached = new globalThis.Image();
      cached.crossOrigin = 'anonymous';
      cached.src = displayUrl;
      if (cached.complete && cached.naturalWidth > 0) {
        setDragImageFromSource(cached);
      }
    }
  }, [asset, generatedVideoThumbnail, fallbackUrl]);

  const isDraggable = !!(actions?.onSendToRef);

  return (
    <AssetTile
      innerRef={cardRef}
      src={(() => {
        const displayUrl = asset.thumbUrl || generatedVideoThumbnail || (asset.type === 'image' ? fallbackUrl : null);
        return displayUrl || null;
      })()}
      alt={asset.title || 'Asset'}
      aspectRatio="3/4"
      onClick={handlePreview}
      className={isSelected ? 'ring-2 ring-primary' : ''}
      isVideo={asset.type === 'video'}
      videoSrc={hoverVideoUrl}
      onMouseEnter={handleCardMouseEnter}
      draggable={isDraggable}
      onDragStart={isDraggable ? handleDragStart : undefined}
      onDragEnd={isDraggable ? () => {} : undefined}
      fallbackIcon={
        (asset.type === 'image' && isLoadingFallback) || (asset.type === 'video' && isGeneratingThumbnail)
          ? <div className="flex flex-col items-center gap-2 animate-pulse">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <span className="text-xs font-medium text-muted-foreground">
                {asset.type === 'video' ? 'Rendering video…' : 'Generating…'}
              </span>
            </div>
          : asset.type === 'video'
            ? <div className="flex flex-col items-center gap-2"><Video className="w-8 h-8 text-muted-foreground/50" /><span className="text-xs text-muted-foreground/50">Video</span></div>
            : <Image className="w-6 h-6 text-muted-foreground/50" />
      }
    >
      {/* Video indicator badge */}
      {asset.type === 'video' && (
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1 pointer-events-none">
          <Video className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Quick Rating overlay - bottom left, appears on hover */}
      {/* Debug: */ console.log('🎯 QuickRating check:', { showQuickRating, hasJobId: !!asset.metadata?.job_id, jobId: asset.metadata?.job_id, assetId: asset.id })}
      {showQuickRating && asset.metadata?.job_id && (
        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
          <QuickRating jobId={asset.metadata.job_id} />
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
        {isWorkspace && actions?.onSendToRef && (
          <Button size="sm" variant="outline" className="h-6 w-6 p-0 bg-background/90 backdrop-blur-sm hover:bg-background" onClick={(e) => { e.stopPropagation(); actions.onSendToRef!(asset); }} title="Use as reference"><ImagePlus className="w-2.5 h-2.5" /></Button>
        )}
        {isWorkspace && actions?.onSaveToLibrary && (
          <Button size="sm" variant="outline" className="h-6 w-6 p-0 bg-background/90 backdrop-blur-sm hover:bg-background" onClick={(e) => { e.stopPropagation(); actions.onSaveToLibrary!(asset); }} title="Save to Library"><Save className="w-2.5 h-2.5" /></Button>
        )}
        {isWorkspace && actions?.onClear && (
          <Button size="sm" variant="outline" className="h-6 w-6 p-0 bg-background/90 backdrop-blur-sm hover:bg-background" onClick={(e) => { e.stopPropagation(); actions.onClear!(asset); }} title="Clear from workspace"><XCircle className="w-2.5 h-2.5" /></Button>
        )}
        {isWorkspace && actions?.onDiscard && (
          <Button size="sm" variant="outline" className="h-6 w-6 p-0 bg-background/90 backdrop-blur-sm hover:bg-background" onClick={(e) => { e.stopPropagation(); actions.onDiscard!(asset); }} title="Delete permanently"><Trash2 className="w-2.5 h-2.5" /></Button>
        )}
        {isLibrary && actions?.onDownload && (
          <Button size="sm" variant="outline" className="h-6 w-6 p-0 bg-background/90 backdrop-blur-sm hover:bg-background" onClick={(e) => { e.stopPropagation(); actions.onDownload!(asset); }} title="Download"><Download className="w-2.5 h-2.5" /></Button>
        )}
        {isLibrary && actions?.onUseAsReference && (
          <Button size="sm" variant="outline" className="h-6 w-6 p-0 bg-background/90 backdrop-blur-sm hover:bg-background" onClick={(e) => { e.stopPropagation(); actions.onUseAsReference!(asset); }} title="Exact Copy"><Copy className="w-2.5 h-2.5" /></Button>
        )}
        {isLibrary && actions?.onAddToWorkspace && (
          <Button size="sm" variant="outline" className="h-6 w-6 p-0 bg-background/90 backdrop-blur-sm hover:bg-background" onClick={(e) => { e.stopPropagation(); actions.onAddToWorkspace!(asset); }} title="Add to Workspace"><ArrowRight className="w-2.5 h-2.5" /></Button>
        )}
        {isLibrary && actions?.onDelete && (
          <Button size="sm" variant="outline" className="h-6 w-6 p-0 bg-background/90 backdrop-blur-sm hover:bg-background" onClick={(e) => { e.stopPropagation(); actions.onDelete!(asset); }} title="Delete"><Trash2 className="w-2.5 h-2.5" /></Button>
        )}
      </div>
    </AssetTile>
  );
};
