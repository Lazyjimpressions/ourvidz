/**
 * ImagePickerDialog Component
 *
 * A dialog that allows users to browse and select images from their library or workspace.
 * Uses the shared useSignedAssets hook for cached, deduplicated URL signing.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Image as ImageIcon, Library, Loader2, Check, FolderOpen, ImageOff } from 'lucide-react';
import { useLibraryAssets } from '@/hooks/useLibraryAssets';
import { toSharedFromLibrary, toSharedFromWorkspace } from '@/lib/services/AssetMappers';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';
import { useSignedAssets, SignedAsset } from '@/lib/hooks/useSignedAssets';
import { cn } from '@/lib/utils';
import type { SharedAsset } from '@/lib/services/AssetMappers';

interface ImagePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string, source: 'library' | 'workspace') => void;
  title?: string;
  source?: 'workspace' | 'library';
}

export const ImagePickerDialog: React.FC<ImagePickerDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Reference Image',
  source = 'library',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [activeSource, setActiveSource] = useState<'workspace' | 'library'>(source);

  // Sync activeSource when prop changes
  useEffect(() => {
    setActiveSource(source);
  }, [source]);

  // Library data
  const { data: paginatedData, isLoading: libraryLoading } = useLibraryAssets();

  // Workspace data
  const [workspaceAssets, setWorkspaceAssets] = useState<any[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  useEffect(() => {
    if (activeSource === 'workspace' && isOpen) {
      setWorkspaceLoading(true);
      WorkspaceAssetService.getUserWorkspaceAssets()
        .then(assets => {
          setWorkspaceAssets(assets.filter(a => a.assetType === 'image'));
        })
        .catch(err => {
          console.error('❌ Failed to load workspace assets:', err);
          setWorkspaceAssets([]);
        })
        .finally(() => setWorkspaceLoading(false));
    }
  }, [activeSource, isOpen]);

  // Flatten paginated library data and filter to only images
  const libraryImageAssets = useMemo(() => {
    if (!paginatedData?.pages) return [];
    return paginatedData.pages
      .flatMap(page => page.assets)
      .filter(asset => asset.type === 'image' && asset.status === 'completed');
  }, [paginatedData]);

  // Choose data source based on active tab
  const isLoading = activeSource === 'library' ? libraryLoading : workspaceLoading;

  // Filter by search query
  const filteredAssets = useMemo(() => {
    const rawAssets = activeSource === 'library' ? libraryImageAssets : workspaceAssets;
    return rawAssets.filter((asset: any) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const prompt = asset.prompt || asset.originalPrompt || '';
      const title = asset.customTitle || asset.title || '';
      const tags = asset.tags || [];
      return (
        prompt.toLowerCase().includes(query) ||
        title.toLowerCase().includes(query) ||
        tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    });
  }, [activeSource, libraryImageAssets, workspaceAssets, searchQuery]);

  // Convert to SharedAsset format for the signing hook
  const sharedAssets: SharedAsset[] = useMemo(() => {
    if (activeSource === 'library') {
      return filteredAssets.map(toSharedFromLibrary);
    }
    return filteredAssets.map(toSharedFromWorkspace);
  }, [filteredAssets, activeSource]);

  const bucket = activeSource === 'workspace' ? 'workspace-temp' : 'user-library';

  // Use the shared signing hook — cached, deduplicated, concurrency-limited
  const { signedAssets, isSigning } = useSignedAssets(sharedAssets, bucket, {
    enabled: isOpen,
  });

  const handleSelect = async () => {
    if (!selectedAssetId) return;
    const signed = signedAssets.find(a => a.id === selectedAssetId);
    if (!signed) return;

    setIsSelecting(true);
    try {
      const fullUrl = await signed.signOriginal();
      onSelect(fullUrl, activeSource);
      onClose();
    } catch (e) {
      console.error('❌ Failed to sign original for selection:', e);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleAssetClick = (id: string) => {
    setSelectedAssetId(prev => prev === id ? null : id);
  };

  // Reset on close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedAssetId(null);
      setSearchQuery('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            {activeSource === 'workspace' ? <FolderOpen className="w-4 h-4" /> : <Library className="w-4 h-4" />}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source Toggle */}
          <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => { setActiveSource('workspace'); setSelectedAssetId(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeSource === 'workspace'
                  ? 'bg-gray-800 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Workspace
            </button>
            <button
              onClick={() => { setActiveSource('library'); setSelectedAssetId(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeSource === 'library'
                  ? 'bg-gray-800 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Library className="w-3.5 h-3.5" />
              Library
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by prompt, title, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-900 border-gray-800 text-sm"
            />
          </div>

          {/* Image Grid */}
          <div className="overflow-y-auto max-h-[400px] pr-1">
            {isLoading ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : signedAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="w-10 h-10 text-gray-600 mb-3" />
                <p className="text-sm text-gray-400">
                  {searchQuery
                    ? 'No images match your search'
                    : activeSource === 'workspace'
                      ? 'No recent images in your workspace'
                      : 'No images in your library'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Generate images in the Workspace to use them here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {signedAssets.map((asset) => {
                  const isSelected = selectedAssetId === asset.id;
                  const isFailed = asset.thumbUrl === 'SIGNING_FAILED';
                  const isStillLoading = !asset.thumbUrl;

                  return (
                    <button
                      key={asset.id}
                      onClick={() => handleAssetClick(asset.id)}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden',
                        'border-2 transition-all duration-150',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500',
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-transparent hover:border-gray-600'
                      )}
                    >
                      {isFailed ? (
                        <div className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center gap-1">
                          <ImageOff className="w-5 h-5 text-gray-500" />
                          <span className="text-[9px] text-gray-500">Failed</span>
                        </div>
                      ) : isStillLoading ? (
                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                        </div>
                      ) : (
                        <img
                          src={asset.thumbUrl!}
                          alt={asset.title || asset.prompt || 'Image'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // Replace broken image with fallback
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.img-fallback')) {
                              const fallback = document.createElement('div');
                              fallback.className = 'img-fallback absolute inset-0 bg-gray-800 flex flex-col items-center justify-center gap-1';
                              fallback.innerHTML = '<span class="text-[9px] text-gray-500">Load error</span>';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      )}

                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Hover overlay with prompt preview */}
                      {!isFailed && !isStillLoading && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-[10px] text-white/80 line-clamp-2">
                              {asset.title || asset.prompt || 'Untitled'}
                            </p>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              {signedAssets.length} image{signedAssets.length !== 1 ? 's' : ''} available
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSelect}
                disabled={!selectedAssetId || isSelecting}
              >
                {isSelecting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Use Selected
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePickerDialog;
