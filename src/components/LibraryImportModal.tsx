import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { X, Calendar, Image, Video, Check, Search, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UnifiedAsset {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  status: string;
  quality?: string;
  format?: string;
  createdAt: Date;
  url?: string;
  thumbnailUrl?: string;
  signedUrls?: string[];
  modelType?: string;
  isSDXL?: boolean;
  isSDXLImage?: boolean;
  sdxlIndex?: number;
  originalAssetId?: string;
  title?: string;
  metadata?: any;
}

interface LibraryImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (assets: UnifiedAsset[]) => void;
}

export const LibraryImportModal = ({ open, onClose, onImport }: LibraryImportModalProps) => {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [allAssets, setAllAssets] = useState<UnifiedAsset[]>([]);
  const [hasMore, setHasMore] = useState(true);
  
  const ASSETS_PER_PAGE = 20;
  

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Reset pagination when search changes
      setCurrentPage(0);
      setAllAssets([]);
      setHasMore(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Bucket inference from LibraryV2
  const inferBucketFromMetadata = useCallback((metadata: any, quality: string = 'fast'): string => {
    if (metadata?.bucket) {
      return metadata.bucket;
    }

    const modelVariant = metadata?.model_variant || '';
    const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
    const isEnhanced = metadata?.is_enhanced || modelVariant.includes('7b');

    if (isEnhanced) {
      return quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
    }

    if (isSDXL) {
      return quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
    }

    return quality === 'high' ? 'image_high' : 'image_fast';
  }, []);

  // Signed URL generation from LibraryV2
  const generateSignedUrls = useCallback(async (paths: string[], bucket: string): Promise<string[]> => {
    const results: string[] = [];
    
    await Promise.all(paths.map(async (path) => {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry
        
        if (data?.signedUrl) {
          results.push(data.signedUrl);
        } else {
          console.warn(`Failed to generate signed URL for ${path} in ${bucket}:`, error);
        }
      } catch (error) {
        console.error(`Error generating signed URL for ${path}:`, error);
      }
    }));
    
    return results;
  }, []);

  // Direct asset fetching with pagination (LibraryV2 approach)
  const { data: pageData, isLoading, error, refetch } = useQuery({
    queryKey: ['library-import-assets', debouncedSearchTerm, currentPage],
    queryFn: async () => {
      console.log('🔍 LibraryImportModal: Fetching page', currentPage, 'with search:', debouncedSearchTerm);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Direct query like LibraryV2
      const imageQuery = supabase
        .from('images')
        .select(`
          id, 
          prompt, 
          status, 
          quality, 
          format, 
          created_at, 
          image_url, 
          image_urls, 
          metadata,
          title
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .range(currentPage * ASSETS_PER_PAGE, (currentPage + 1) * ASSETS_PER_PAGE - 1);

      if (debouncedSearchTerm) {
        imageQuery.ilike('prompt', `%${debouncedSearchTerm}%`);
      }

      const { data: images, error } = await imageQuery;
      if (error) throw error;

      const processedAssets: UnifiedAsset[] = [];
      
      // Process like LibraryV2
      if (images) {
        for (const image of images) {
          const metadata = image.metadata as any;
          const bucket = inferBucketFromMetadata(metadata, image.quality);
          const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
          
          if (isSDXL && image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 1) {
            // Generate signed URLs for all SDXL images
            const imageUrlsArray = image.image_urls.filter((url): url is string => typeof url === 'string');
            const signedUrls = await generateSignedUrls(imageUrlsArray, bucket);
            
            // Create individual assets for each SDXL image
            signedUrls.forEach((url, index) => {
              processedAssets.push({
                id: `${image.id}_${index}`,
                type: 'image',
                prompt: `${image.prompt} (Image ${index + 1})`,
                status: image.status,
                quality: image.quality,
                format: image.format,
                createdAt: new Date(image.created_at),
                url: url,
                thumbnailUrl: url,
                modelType: 'SDXL',
                isSDXL: true,
                isSDXLImage: true,
                sdxlIndex: index,
                originalAssetId: image.id,
                title: image.title,
                metadata: image.metadata
              });
            });
          } else {
            // Single image
            let url: string | undefined;
            
            if (image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 0) {
              const firstUrl = image.image_urls[0];
              if (typeof firstUrl === 'string') {
                const signedUrls = await generateSignedUrls([firstUrl], bucket);
                url = signedUrls[0];
              }
            } else if (image.image_url && typeof image.image_url === 'string') {
              const signedUrls = await generateSignedUrls([image.image_url], bucket);
              url = signedUrls[0];
            }
            
            processedAssets.push({
              id: image.id,
              type: 'image',
              prompt: image.prompt,
              status: image.status,
              quality: image.quality,
              format: image.format,
              createdAt: new Date(image.created_at),
              url: url,
              thumbnailUrl: url,
              modelType: isSDXL ? 'SDXL' : 'WAN',
              isSDXL: isSDXL,
              title: image.title,
              metadata: image.metadata
            });
          }
        }
      }
      
      return {
        assets: processedAssets,
        hasMore: images ? images.length === ASSETS_PER_PAGE : false
      };
    },
    enabled: open,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Update allAssets when new page data arrives
  useEffect(() => {
    if (pageData) {
      if (currentPage === 0) {
        setAllAssets(pageData.assets);
      } else {
        setAllAssets(prev => [...prev, ...pageData.assets]);
      }
      setHasMore(pageData.hasMore);
    }
  }, [pageData, currentPage]);

  // Use processed assets from pagination
  const filteredAssets = allAssets;


  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedAssets(new Set(filteredAssets.map(asset => asset.id)));
  };

  const handleClearSelection = () => {
    setSelectedAssets(new Set());
  };

  const handleImport = async () => {
    if (selectedAssets.size === 0) {
      toast.error('Please select at least one asset to import');
      return;
    }
    
    const assetsToImport = filteredAssets.filter(asset => selectedAssets.has(asset.id));
    
    // Process SDXL images properly
    const processedAssets: UnifiedAsset[] = [];
    
    for (const asset of assetsToImport) {
      if (asset.isSDXLImage && asset.originalAssetId) {
        // For SDXL individual images, create a proper asset with all original data
        const originalAsset: UnifiedAsset = {
          id: asset.originalAssetId,
          type: asset.type,
          prompt: asset.prompt.replace(/ \(Image \d+\)$/, ''), // Remove image number suffix
          status: asset.status,
          quality: asset.quality,
          format: asset.format,
          createdAt: asset.createdAt,
          url: asset.url,
          thumbnailUrl: asset.thumbnailUrl,
          modelType: asset.modelType,
          isSDXL: asset.isSDXL,
          title: asset.title,
          metadata: asset.metadata
        };
        processedAssets.push(originalAsset);
      } else {
        processedAssets.push(asset);
      }
    }
    
    console.log('🚀 Importing assets to workspace:', {
      selected: selectedAssets.size,
      processed: processedAssets.length,
      types: processedAssets.reduce((acc, a) => { 
        acc[a.type] = (acc[a.type] || 0) + 1; 
        return acc; 
      }, {} as Record<string, number>)
    });
    
    onImport(processedAssets);
    setSelectedAssets(new Set());
    onClose();
    toast.success(`Imported ${processedAssets.length} asset${processedAssets.length !== 1 ? 's' : ''} to workspace`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getAssetDisplayUrl = (asset: UnifiedAsset): string | null => {
    // Direct URL is now pre-generated during fetch
    return asset.url || asset.thumbnailUrl || null;
  };

  const getAssetCount = (asset: UnifiedAsset): number => {
    return 1; // Each displayed asset is now individual
  };

  const loadMoreAssets = () => {
    if (!isLoading && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] bg-gray-900 border-gray-800 flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-white">Import from Library</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 text-xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Library</h3>
              <p className="text-gray-400 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] bg-gray-900 border-gray-800 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white">Import from Library</DialogTitle>
        </DialogHeader>
        
        {/* Search and Controls */}
        <div className="flex-shrink-0 space-y-4 p-4 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search your assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Select All ({filteredAssets.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Clear
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              {selectedAssets.size} of {filteredAssets.length} assets selected
            </span>
            <span>
              {isLoading ? 'Loading...' : `${filteredAssets.length} assets found`}
            </span>
          </div>
        </div>
        
        {/* Asset Grid */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400">Loading your library...</p>
              </div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Image className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400">
                {debouncedSearchTerm ? 'No assets match your search' : 'No assets in your library yet'}
              </p>
              {debouncedSearchTerm && (
                <Button
                  variant="ghost"
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-blue-400 hover:text-blue-300"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                {filteredAssets.map((asset) => {
                  const displayUrl = getAssetDisplayUrl(asset);
                  const assetCount = getAssetCount(asset);
                  const isSelected = selectedAssets.has(asset.id);
                  
                  return (
                    <div
                      key={asset.id}
                      className={cn(
                        "relative cursor-pointer rounded-lg overflow-hidden aspect-square transition-all duration-200",
                        "hover:bg-primary/10",
                        isSelected 
                          ? "ring-4 ring-primary scale-95 shadow-lg bg-primary/20" 
                          : "hover:scale-105 hover:shadow-md"
                      )}
                      onClick={() => handleAssetToggle(asset.id)}
                    >
                      {/* Asset Content */}
                      {asset.type === 'image' ? (
                        displayUrl ? (
                          <div className="relative w-full h-full">
                            <img
                              src={displayUrl}
                              alt={asset.prompt}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.log('❌ Image failed to load:', displayUrl, 'Asset ID:', asset.id);
                                // Show placeholder instead of hiding
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K';
                                e.currentTarget.className = "w-full h-full object-cover opacity-50";
                              }}
                            />
                            
                            {/* SDXL set indicator */}
                            {assetCount > 1 && (
                              <div className="absolute top-2 left-2">
                                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">
                                  {assetCount} images
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <div className="text-center text-gray-400">
                              <Image className="w-8 h-8 mx-auto mb-2" />
                              <p className="text-xs">Image unavailable</p>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="relative w-full h-full bg-gray-800">
                          {displayUrl ? (
                            <img
                              src={displayUrl}
                              alt="Video thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-8 h-8 text-gray-600" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/70 rounded-full p-2">
                              <Video className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}

                      {/* Model Type Badge */}
                      {asset.type === 'image' && asset.modelType && (
                        <div className="absolute top-2 right-2 mr-8">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs border",
                              asset.modelType === 'SDXL' 
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/40" 
                                : asset.modelType === 'Enhanced-7B'
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            )}
                          >
                            {asset.modelType}
                          </Badge>
                        </div>
                      )}

                      {/* Asset Info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="secondary" className="text-xs px-1 py-0.5">
                            {asset.type === 'image' ? (
                              <Image className="h-2 w-2 mr-1" />
                            ) : (
                              <Video className="h-2 w-2 mr-1" />
                            )}
                            {asset.type}
                          </Badge>
                          <div className="flex items-center text-gray-300">
                            <Calendar className="h-2 w-2 mr-1" />
                            {formatDate(asset.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
               </div>
               
               {/* Load More Button */}
               {hasMore && !isLoading && (
                 <div className="p-4 text-center">
                   <Button
                     onClick={loadMoreAssets}
                     variant="outline"
                     className="border-gray-600 text-gray-300 hover:bg-gray-800"
                   >
                     <ChevronDown className="w-4 h-4 mr-2" />
                     Load More Assets
                   </Button>
                 </div>
               )}
               
               {isLoading && currentPage > 0 && (
                 <div className="p-4 text-center">
                   <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                   <p className="text-gray-400 text-sm mt-2">Loading more assets...</p>
                 </div>
               )}
             </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-4 flex-shrink-0">
          <div className="text-sm text-gray-400">
            <p>{selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected</p>
            <p>Page {currentPage + 1} • {filteredAssets.length} assets loaded{hasMore ? ' • More available' : ''}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={selectedAssets.size === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Import Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};