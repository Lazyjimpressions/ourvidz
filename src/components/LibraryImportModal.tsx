import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { X, Calendar, Image, Video, Check, Search, Loader2 } from 'lucide-react';
import { OptimizedAssetService, UnifiedAsset } from '@/lib/services/OptimizedAssetService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LibraryImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (assets: UnifiedAsset[]) => void;
}

export const LibraryImportModal = ({ open, onClose, onImport }: LibraryImportModalProps) => {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // React Query for efficient asset fetching with caching - only when modal is open
  const { data: libraryAssets = [], isLoading, error } = useQuery({
    queryKey: ['library-import-assets', debouncedSearchTerm],
    queryFn: async () => {
      console.log('🔍 LibraryImportModal: Fetching assets with search:', debouncedSearchTerm);
      
      const filters: any = { status: 'completed' };
      if (debouncedSearchTerm) {
        // Note: OptimizedAssetService doesn't support search yet, so we'll filter client-side
      }
      
      const result = await OptimizedAssetService.getUserAssets(
        filters,
        { limit: 100, offset: 0 } // Reduced limit for better performance
      );
      
      console.log('📚 Library assets fetched:', {
        count: result.assets.length,
        hasUrls: result.assets.filter(a => a.url || (a.signedUrls && a.signedUrls.length > 0)).length,
        types: result.assets.reduce((acc, a) => { 
          acc[a.type] = (acc[a.type] || 0) + 1; 
          return acc; 
        }, {} as Record<string, number>)
      });
      
      return result.assets;
    },
    enabled: open, // Only fetch when modal is open
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Filter and transform assets for display
  const filteredAssets = useMemo(() => {
    let filtered = libraryAssets;
    
    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(asset => 
        asset.prompt.toLowerCase().includes(searchLower) ||
        asset.title?.toLowerCase().includes(searchLower) ||
        asset.modelType?.toLowerCase().includes(searchLower)
      );
    }
    
    // Transform SDXL assets to show individual images
    const transformed: UnifiedAsset[] = [];
    
    filtered.forEach(asset => {
      if (asset.type === 'image' && asset.signedUrls && asset.signedUrls.length > 1) {
        // SDXL job with multiple images - create individual assets
        asset.signedUrls.forEach((url, index) => {
          transformed.push({
            ...asset,
            id: `${asset.id}_${index}`, // Unique ID for each image
            url: url,
            thumbnailUrl: url,
            prompt: `${asset.prompt} (Image ${index + 1})`,
            isSDXLImage: true,
            sdxlIndex: index,
            originalAssetId: asset.id,
          });
        });
      } else {
        // Single image or video
        transformed.push(asset);
      }
    });
    
    return transformed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [libraryAssets, debouncedSearchTerm]);


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
    
    // For SDXL images, we need to get the original asset data
    const processedAssets: UnifiedAsset[] = [];
    
    for (const asset of assetsToImport) {
      if (asset.isSDXLImage && asset.originalAssetId) {
        // Find the original SDXL asset
        const originalAsset = libraryAssets.find(a => a.id === asset.originalAssetId);
        if (originalAsset) {
          processedAssets.push(originalAsset);
        }
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
    // For SDXL images, use the individual image URL
    if (asset.isSDXLImage && asset.url) {
      return asset.url;
    }
    
    // For regular assets, use signedUrls first, then url, then thumbnailUrl
    if (asset.signedUrls && asset.signedUrls.length > 0) {
      return asset.signedUrls[0];
    }
    
    return asset.url || asset.thumbnailUrl || null;
  };

  const getAssetCount = (asset: UnifiedAsset): number => {
    if (asset.isSDXLImage) {
      return 1; // Individual SDXL image
    }
    
    if (asset.signedUrls && asset.signedUrls.length > 1) {
      return asset.signedUrls.length; // SDXL set
    }
    
    return 1; // Single asset
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
                                e.currentTarget.style.display = 'none';
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
                              <p className="text-xs">No preview</p>
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
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-4 flex-shrink-0">
          <p className="text-sm text-gray-400">
            {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={selectedAssets.size === 0}
            >
              Import {selectedAssets.size > 0 && `(${selectedAssets.size})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};