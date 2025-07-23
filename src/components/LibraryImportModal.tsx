import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState('generated');
  
  const ASSETS_PER_PAGE = 50;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(0);
      setAllAssets([]);
      setHasMore(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(0);
    setAllAssets([]);
    setHasMore(true);
    setSelectedAssets(new Set());
    setSearchTerm('');
  }, [activeTab]);

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

  const generateSignedUrls = useCallback(async (paths: string[], bucket: string): Promise<string[]> => {
    const results: string[] = [];
    
    await Promise.all(paths.map(async (path) => {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600);
        
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

  const fetchReferenceImages = useCallback(async (): Promise<{ assets: UnifiedAsset[], hasMore: boolean }> => {
    console.log('🔍 Fetching reference images from storage...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: files, error } = await supabase.storage
      .from('reference_images')
      .list(user.id, {
        limit: ASSETS_PER_PAGE,
        offset: currentPage * ASSETS_PER_PAGE,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) throw error;

    if (!files || files.length === 0) {
      return { assets: [], hasMore: false };
    }

    const filePaths = files.map(file => `${user.id}/${file.name}`);
    const signedUrls = await generateSignedUrls(filePaths, 'reference_images');

    const assets: UnifiedAsset[] = files.map((file, index) => ({
      id: `ref_${file.id || file.name}`,
      type: 'image' as const,
      prompt: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      status: 'completed',
      quality: 'reference',
      format: file.name.split('.').pop() || 'jpg',
      createdAt: new Date(file.created_at || Date.now()),
      url: signedUrls[index],
      thumbnailUrl: signedUrls[index],
      modelType: 'Reference',
      title: file.name,
      metadata: {
        bucket: 'reference_images',
        size: file.metadata?.size,
        originalName: file.name,
        isReferenceImage: true
      }
    }));

    const filteredAssets = debouncedSearchTerm 
      ? assets.filter(asset => 
          asset.prompt.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          asset.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
      : assets;

    return {
      assets: filteredAssets,
      hasMore: files.length === ASSETS_PER_PAGE
    };
  }, [currentPage, debouncedSearchTerm, generateSignedUrls]);

  const { data: generatedPageData, isLoading: isLoadingGenerated, error: generatedError } = useQuery({
    queryKey: ['library-import-generated-assets', debouncedSearchTerm, currentPage],
    queryFn: async () => {
      console.log('🔍 LibraryImportModal: Fetching generated assets page', currentPage, 'with search:', debouncedSearchTerm);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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
      
      if (images) {
        const urlBatches: { urls: string[], bucket: string, imageData: any }[] = [];
        
        for (const image of images) {
          const metadata = image.metadata as any;
          const bucket = inferBucketFromMetadata(metadata, image.quality);
          const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
          
          if (isSDXL && image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 1) {
            const imageUrlsArray = image.image_urls.filter((url): url is string => typeof url === 'string');
            urlBatches.push({ urls: imageUrlsArray, bucket, imageData: { ...image, isSDXL: true } });
          } else {
            let urlToProcess: string | undefined;
            if (image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 0) {
              const firstUrl = image.image_urls[0];
              if (typeof firstUrl === 'string') {
                urlToProcess = firstUrl;
              }
            } else if (image.image_url && typeof image.image_url === 'string') {
              urlToProcess = image.image_url;
            }
            
            if (urlToProcess) {
              urlBatches.push({ urls: [urlToProcess], bucket, imageData: { ...image, isSDXL } });
            }
          }
        }
        
        const urlResults = await Promise.allSettled(
          urlBatches.map(async ({ urls, bucket, imageData }) => {
            try {
              const signedUrls = await generateSignedUrls(urls, bucket);
              return { signedUrls, imageData, success: true };
            } catch (error) {
              console.warn(`Failed to generate signed URLs for image ${imageData.id}:`, error);
              return { signedUrls: [], imageData, success: false };
            }
          })
        );
        
        urlResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            const { signedUrls, imageData } = result.value;
            const isSDXL = imageData.isSDXL;
            
            if (isSDXL && signedUrls.length > 1) {
              signedUrls.forEach((url, index) => {
                processedAssets.push({
                  id: `${imageData.id}_${index}`,
                  type: 'image',
                  prompt: `${imageData.prompt} (Image ${index + 1})`,
                  status: imageData.status,
                  quality: imageData.quality,
                  format: imageData.format,
                  createdAt: new Date(imageData.created_at),
                  url: url,
                  thumbnailUrl: url,
                  modelType: 'SDXL',
                  isSDXL: true,
                  isSDXLImage: true,
                  sdxlIndex: index,
                  originalAssetId: imageData.id,
                  title: imageData.title,
                  metadata: imageData.metadata
                });
              });
            } else if (signedUrls.length > 0) {
              processedAssets.push({
                id: imageData.id,
                type: 'image',
                prompt: imageData.prompt,
                status: imageData.status,
                quality: imageData.quality,
                format: imageData.format,
                createdAt: new Date(imageData.created_at),
                url: signedUrls[0],
                thumbnailUrl: signedUrls[0],
                modelType: isSDXL ? 'SDXL' : 'WAN',
                isSDXL: isSDXL,
                title: imageData.title,
                metadata: imageData.metadata
              });
            }
          }
        });
      }
      
      console.log(`✅ Successfully processed ${processedAssets.length} generated assets from ${images?.length || 0} database records`);
      
      return {
        assets: processedAssets,
        hasMore: images ? images.length === ASSETS_PER_PAGE : false
      };
    },
    enabled: open && activeTab === 'generated',
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: referencePageData, isLoading: isLoadingReference, error: referenceError } = useQuery({
    queryKey: ['library-import-reference-images', debouncedSearchTerm, currentPage],
    queryFn: fetchReferenceImages,
    enabled: open && activeTab === 'reference',
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const pageData = activeTab === 'generated' ? generatedPageData : referencePageData;
    if (pageData) {
      if (currentPage === 0) {
        setAllAssets(pageData.assets);
      } else {
        setAllAssets(prev => [...prev, ...pageData.assets]);
      }
      setHasMore(pageData.hasMore);
    }
  }, [generatedPageData, referencePageData, currentPage, activeTab]);

  const filteredAssets = allAssets;
  const isLoading = activeTab === 'generated' ? isLoadingGenerated : isLoadingReference;
  const error = activeTab === 'generated' ? generatedError : referenceError;

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
    
    const processedAssets: UnifiedAsset[] = [];
    
    for (const asset of assetsToImport) {
      if (asset.isSDXLImage && asset.originalAssetId) {
        const originalAsset: UnifiedAsset = {
          id: asset.originalAssetId,
          type: asset.type,
          prompt: asset.prompt.replace(/ \(Image \d+\)$/, ''),
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
      }, {} as Record<string, number>),
      tab: activeTab
    });
    
    onImport(processedAssets);
    setSelectedAssets(new Set());
    onClose();
    const assetType = activeTab === 'reference' ? 'reference image' : 'asset';
    toast.success(`Imported ${processedAssets.length} ${assetType}${processedAssets.length !== 1 ? 's' : ''} to workspace`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getAssetDisplayUrl = (asset: UnifiedAsset): string | null => {
    return asset.url || asset.thumbnailUrl || null;
  };

  const getAssetCount = (asset: UnifiedAsset): number => {
    return 1;
  };

  const loadMoreAssets = () => {
    if (!isLoading && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[85vh] bg-gray-900 border-gray-800 flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle className="text-white">Import from Library</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 text-xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Library</h3>
              <p className="text-gray-400 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
              <Button 
                onClick={() => window.location.reload()}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
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
      <DialogContent className="max-w-6xl h-[90vh] bg-gray-900 border-gray-800 flex flex-col p-2">
        <DialogHeader className="flex-shrink-0 pb-1">
          <DialogTitle className="text-white text-base">Import from Library</DialogTitle>
        </DialogHeader>
        
        <div className="flex-shrink-0 px-1 pb-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-gray-800 h-8">
              <TabsTrigger value="generated" className="text-white text-xs data-[state=active]:bg-blue-600">
                Generated Assets
              </TabsTrigger>
              <TabsTrigger value="reference" className="text-white text-xs data-[state=active]:bg-blue-600">
                Reference Images
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex-shrink-0 space-y-1 px-1 pb-1 border-b border-gray-800">
          <div className="flex items-center gap-1">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <Input
                placeholder={activeTab === 'reference' ? "Search reference images..." : "Search your assets..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-7 bg-gray-800 border-gray-700 text-white placeholder-gray-400 text-xs"
              />
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSelectAll}
                className="h-7 px-2 text-xs bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
              >
                All ({filteredAssets.length})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearSelection}
                className="h-7 px-2 text-xs bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
              >
                Clear
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              {selectedAssets.size} selected
            </span>
            <span>
              {isLoading ? 'Loading...' : `${filteredAssets.length} ${activeTab === 'reference' ? 'reference images' : 'assets'}`}
            </span>
          </div>
        </div>
        
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                <p className="text-gray-300 text-sm">Loading your {activeTab === 'reference' ? 'reference images' : 'library'}...</p>
              </div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Image className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-gray-300 text-sm">
                {debouncedSearchTerm 
                  ? `No ${activeTab === 'reference' ? 'reference images' : 'assets'} match your search` 
                  : `No ${activeTab === 'reference' ? 'reference images' : 'assets'} found`
                }
              </p>
              {activeTab === 'reference' && !debouncedSearchTerm && (
                <p className="text-gray-500 text-xs mt-1">
                  Upload reference images in the workspace to see them here
                </p>
              )}
              {debouncedSearchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-blue-400 hover:text-blue-300 text-xs"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-1">
                {filteredAssets.map((asset) => {
                  const displayUrl = getAssetDisplayUrl(asset);
                  const assetCount = getAssetCount(asset);
                  const isSelected = selectedAssets.has(asset.id);
                  
                  return (
                    <div
                      key={asset.id}
                      className={cn(
                        "relative cursor-pointer rounded-md overflow-hidden aspect-square transition-all duration-200",
                        "hover:bg-primary/10",
                        isSelected 
                          ? "ring-2 ring-primary scale-95 shadow-lg bg-primary/20" 
                          : "hover:scale-105 hover:shadow-md"
                      )}
                      onClick={() => handleAssetToggle(asset.id)}
                    >
                      {displayUrl ? (
                        <div className="relative w-full h-full">
                          <img
                            src={displayUrl}
                            alt={asset.prompt}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.log('❌ Image failed to load:', displayUrl, 'Asset ID:', asset.id);
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K';
                              e.currentTarget.className = "w-full h-full object-cover opacity-50";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <Image className="w-4 h-4 mx-auto mb-1" />
                            <p className="text-xs">Unavailable</p>
                          </div>
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-0.5 right-0.5 bg-primary rounded-full p-0.5">
                          <Check className="w-2 h-2 text-primary-foreground" />
                        </div>
                      )}

                      {asset.modelType && !isSelected && (
                        <div className="absolute top-0.5 right-0.5">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs px-1 py-0 border h-4 text-xs",
                              asset.modelType === 'Reference' 
                                ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                                : asset.modelType === 'SDXL' 
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

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                            <Image className="h-2 w-2 mr-0.5" />
                            {activeTab === 'reference' ? 'ref' : asset.type}
                          </Badge>
                          <div className="flex items-center text-gray-300">
                            <Calendar className="h-2 w-2 mr-0.5" />
                            <span className="text-xs">{formatDate(asset.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
               </div>
               
               {hasMore && !isLoading && (
                 <div className="p-1 text-center">
                   <Button
                     onClick={loadMoreAssets}
                     variant="secondary"
                     size="sm"
                     className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600 h-7 text-xs"
                   >
                     <ChevronDown className="w-3 h-3 mr-1" />
                     Load More
                   </Button>
                 </div>
               )}
               
               {isLoading && currentPage > 0 && (
                 <div className="p-1 text-center">
                   <Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" />
                   <p className="text-gray-300 text-xs mt-1">Loading more...</p>
                 </div>
               )}
             </ScrollArea>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-800 pt-1 px-1 flex-shrink-0">
          <div className="text-xs text-gray-400">
            <p>{selectedAssets.size} selected • Page {currentPage + 1} • {activeTab === 'reference' ? 'Reference Images' : 'Generated Assets'}</p>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={onClose}
              className="h-7 px-2 text-xs bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={selectedAssets.size === 0}
              size="sm"
              className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              Import ({selectedAssets.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
