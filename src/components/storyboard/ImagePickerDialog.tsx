/**
 * ImagePickerDialog Component
 *
 * A dialog that allows users to browse and select images from their library.
 * Used in storyboard for selecting reference images for video clip generation.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Image as ImageIcon, Library, Loader2, Check } from 'lucide-react';
import { useLibraryAssets } from '@/hooks/useLibraryAssets';
import { LibraryAssetService, UnifiedLibraryAsset } from '@/lib/services/LibraryAssetService';
import { cn } from '@/lib/utils';

interface ImagePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string, source: 'library' | 'workspace') => void;
  title?: string;
}

export const ImagePickerDialog: React.FC<ImagePickerDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Reference Image',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<UnifiedLibraryAsset | null>(null);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());

  const { data: paginatedData, isLoading } = useLibraryAssets();

  // Flatten paginated data and filter to only show images (not videos)
  const libraryAssets = useMemo(() => {
    if (!paginatedData?.pages) return [];
    return paginatedData.pages.flatMap(page => page.assets);
  }, [paginatedData]);

  const imageAssets = libraryAssets.filter(
    (asset) => asset.type === 'image' && asset.status === 'completed'
  );

  // Filter by search query
  const filteredAssets = imageAssets.filter((asset) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      asset.prompt?.toLowerCase().includes(query) ||
      asset.customTitle?.toLowerCase().includes(query) ||
      asset.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Sign URLs for visible assets
  useEffect(() => {
    const signUrls = async () => {
      const assetsToSign = filteredAssets.filter(
        (asset) => asset.storagePath && !signedUrls.has(asset.id) && !loadingUrls.has(asset.id)
      );

      if (assetsToSign.length === 0) return;

      // Mark as loading
      setLoadingUrls((prev) => {
        const next = new Set(prev);
        assetsToSign.forEach((asset) => next.add(asset.id));
        return next;
      });

      // Sign URLs in parallel (limit to 6 at a time)
      const batchSize = 6;
      for (let i = 0; i < assetsToSign.length; i += batchSize) {
        const batch = assetsToSign.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (asset) => {
            const rawAsset = {
              id: asset.id,
              storage_path: asset.storagePath,
              asset_type: asset.type,
            };
            const signedUrl = await LibraryAssetService.generateSignedUrl(rawAsset as any);
            return { id: asset.id, url: signedUrl };
          })
        );

        setSignedUrls((prev) => {
          const next = new Map(prev);
          results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value.url) {
              next.set(result.value.id, result.value.url);
            }
          });
          return next;
        });

        setLoadingUrls((prev) => {
          const next = new Set(prev);
          batch.forEach((asset) => next.delete(asset.id));
          return next;
        });
      }
    };

    if (isOpen) {
      signUrls();
    }
  }, [filteredAssets, isOpen, signedUrls, loadingUrls]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAsset(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = () => {
    if (!selectedAsset) return;

    const signedUrl = signedUrls.get(selectedAsset.id);
    if (signedUrl) {
      onSelect(signedUrl, 'library');
      onClose();
    }
  };

  const handleAssetClick = (asset: UnifiedLibraryAsset) => {
    setSelectedAsset(asset.id === selectedAsset?.id ? null : asset);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Library className="w-4 h-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            ) : filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="w-10 h-10 text-gray-600 mb-3" />
                <p className="text-sm text-gray-400">
                  {searchQuery ? 'No images match your search' : 'No images in your library'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Generate images in the Workspace to use them here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {filteredAssets.map((asset) => {
                  const signedUrl = signedUrls.get(asset.id);
                  const isSelected = selectedAsset?.id === asset.id;
                  const isLoadingUrl = loadingUrls.has(asset.id);

                  return (
                    <button
                      key={asset.id}
                      onClick={() => handleAssetClick(asset)}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden',
                        'border-2 transition-all duration-150',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500',
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-transparent hover:border-gray-600'
                      )}
                    >
                      {isLoadingUrl || !signedUrl ? (
                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                        </div>
                      ) : (
                        <img
                          src={signedUrl}
                          alt={asset.customTitle || asset.prompt || 'Library image'}
                          className="w-full h-full object-cover"
                          loading="lazy"
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-[10px] text-white/80 line-clamp-2">
                            {asset.customTitle || asset.prompt || 'Untitled'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              {filteredAssets.length} image{filteredAssets.length !== 1 ? 's' : ''} available
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSelect}
                disabled={!selectedAsset || !signedUrls.has(selectedAsset.id)}
              >
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
