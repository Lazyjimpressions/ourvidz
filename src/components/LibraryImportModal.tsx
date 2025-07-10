import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Calendar, Image, Video, Check } from 'lucide-react';
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
  const [libraryAssets, setLibraryAssets] = useState<UnifiedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());

  // Fetch all library assets using OptimizedAssetService
  useEffect(() => {
    if (!open) return;

    const fetchLibraryAssets = async () => {
      setIsLoading(true);
      try {
        console.log('🔍 LibraryImportModal: Fetching library assets');
        
        // Get all user assets (no session filtering for library)
        const result = await OptimizedAssetService.getUserAssets(
          { status: 'completed' }, // Only show completed assets
          { limit: 200, offset: 0 } // Get more assets for library view
        );
        
        console.log('📚 Library assets fetched:', {
          count: result.assets.length,
          hasUrls: result.assets.filter(a => a.url).length,
          types: result.assets.reduce((acc, a) => { 
            acc[a.type] = (acc[a.type] || 0) + 1; 
            return acc; 
          }, {} as Record<string, number>)
        });
        
        setLibraryAssets(result.assets);
      } catch (error) {
        console.error('❌ Failed to fetch library assets:', error);
        toast.error('Failed to load library assets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLibraryAssets();
  }, [open]);

  const handleAssetToggle = (assetId: string, event?: React.MouseEvent) => {
    console.log('🎯 Asset toggle clicked:', assetId, 'Event:', event?.type);
    console.log('🔍 Event target:', event?.target, 'Current target:', event?.currentTarget);
    
    // Prevent event bubbling issues
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setSelectedAssets(prev => {
      const next = new Set(prev);
      const wasSelected = next.has(assetId);
      
      if (wasSelected) {
        next.delete(assetId);
        console.log('❌ Deselected asset:', assetId);
      } else {
        next.add(assetId);
        console.log('✅ Selected asset:', assetId);
      }
      
      console.log('📊 Selected assets after toggle:', Array.from(next));
      return next;
    });
  };

  // Enhanced URL generation with session caching
  const generateAssetUrls = async (asset: UnifiedAsset) => {
    if (asset.url || loadingUrls.has(asset.id)) return;
    
    setLoadingUrls(prev => new Set([...prev, asset.id]));
    
    try {
      const assetWithUrls = await OptimizedAssetService.generateAssetUrls(asset);
      
      // Update the asset in the library list
      setLibraryAssets(prev => prev.map(a => 
        a.id === asset.id ? assetWithUrls : a
      ));
      
      console.log('✅ Generated URLs for library asset:', asset.id);
    } catch (error) {
      console.error('❌ Failed to generate URLs for asset:', asset.id, error);
    } finally {
      setLoadingUrls(prev => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
  };

  const handleImport = async () => {
    console.log('🚀 LibraryImportModal - Import triggered with selection:', Array.from(selectedAssets));
    console.log('📋 Available library assets:', libraryAssets.length);
    
    // Validate selection before proceeding
    if (selectedAssets.size === 0) {
      console.error('⚠️ No assets selected for import');
      toast.error('Please select at least one asset to import');
      return;
    }
    
    const assetsToImport = libraryAssets.filter(asset => selectedAssets.has(asset.id));
    console.log('📦 Assets to import:', assetsToImport.map(a => ({ 
      id: a.id, 
      type: a.type, 
      status: a.status, 
      hasUrl: !!a.url, 
      hasSignedUrls: !!(a.signedUrls && a.signedUrls.length > 0),
      prompt: a.prompt.slice(0, 50),
      modelType: a.modelType
    })));
    
    // Double-check that we have assets to import
    if (assetsToImport.length === 0) {
      console.error('⚠️ No assets to import despite selection!');
      toast.error('Selected assets not found. Please refresh and try again.');
      return;
    }
    
    // Generate URLs for assets that don't have them yet
    const assetsWithUrls = await Promise.all(
      assetsToImport.map(async (asset) => {
        if (!asset.url && !asset.signedUrls) {
          try {
            const assetWithUrls = await OptimizedAssetService.generateAssetUrls(asset);
            console.log('🔗 Generated URLs for import:', asset.id, { 
              hasUrl: !!assetWithUrls.url, 
              hasSignedUrls: !!(assetWithUrls.signedUrls && assetWithUrls.signedUrls.length > 0)
            });
            return assetWithUrls;
          } catch (error) {
            console.error('❌ Failed to generate URLs for import asset:', asset.id, error);
            return asset; // Return original asset even if URL generation fails
          }
        }
        return asset;
      })
    );
    
    console.log('🔄 Calling onImport with', assetsWithUrls.length, 'assets');
    console.log('📊 Import summary:', {
      totalAssets: assetsWithUrls.length,
      withUrls: assetsWithUrls.filter(a => a.url || (a.signedUrls && a.signedUrls.length > 0)).length,
      images: assetsWithUrls.filter(a => a.type === 'image').length,
      videos: assetsWithUrls.filter(a => a.type === 'video').length,
      sdxlAssets: assetsWithUrls.filter(a => a.isSDXL || (a.signedUrls && a.signedUrls.length > 0)).length
    });
    
    onImport(assetsWithUrls);
    setSelectedAssets(new Set());
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-gray-900 border-gray-800 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white">Import from Library</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin text-2xl">⏳</div>
            </div>
          ) : libraryAssets.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Image className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400">No assets in your library yet</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {libraryAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={cn(
                      "relative cursor-pointer rounded-lg overflow-hidden aspect-square transition-all duration-200",
                      "hover:bg-primary/10", // Add hover feedback
                      selectedAssets.has(asset.id) 
                        ? "ring-4 ring-primary scale-95 shadow-lg bg-primary/20" 
                        : "hover:scale-105 hover:shadow-md"
                    )}
                    onClick={(e) => handleAssetToggle(asset.id, e)}
                    onMouseEnter={() => {
                      // Generate URLs on hover for better UX
                      if (!asset.url && !asset.signedUrls) {
                        generateAssetUrls(asset);
                      }
                    }}
                    style={{ pointerEvents: 'auto' }} // Ensure clickable
                  >
                    {/* Asset Content */}
                    {asset.type === 'image' ? (
                      // Handle both single images and SDXL arrays
                      asset.signedUrls && asset.signedUrls.length > 0 ? (
                        // SDXL image set - show first image with count indicator
                        <div className="relative w-full h-full">
                          <img
                            src={asset.signedUrls[0]}
                            alt="SDXL image set"
                            className="w-full h-full object-cover"
                            style={{ pointerEvents: 'none' }}
                            onError={(e) => {
                              console.log('❌ SDXL image failed to load:', asset.signedUrls?.[0], 'Asset ID:', asset.id);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          {/* SDXL set indicator */}
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">
                              {asset.signedUrls.length} images
                            </Badge>
                          </div>
                        </div>
                      ) : asset.url || asset.thumbnailUrl ? (
                        // Single image
                        <img
                          src={asset.url || asset.thumbnailUrl}
                          alt="Library asset"
                          className="w-full h-full object-cover"
                          style={{ pointerEvents: 'none' }}
                          onError={(e) => {
                            console.log('❌ Image failed to load:', asset.url || asset.thumbnailUrl, 'Asset ID:', asset.id);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        // Loading state for images without URLs
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            {loadingUrls.has(asset.id) ? (
                              <div className="animate-spin text-lg mb-2">⏳</div>
                            ) : (
                              <Image className="w-8 h-8 mx-auto mb-2" />
                            )}
                            <p className="text-xs">
                              {loadingUrls.has(asset.id) ? 'Loading...' : 'Click to load'}
                            </p>
                          </div>
                        </div>
                      )
                    ) : (
                      // Video content
                      <div className="relative w-full h-full bg-gray-800">
                        {asset.thumbnailUrl || asset.url ? (
                          <img
                            src={asset.thumbnailUrl || asset.url}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {loadingUrls.has(asset.id) ? (
                              <div className="animate-spin text-lg">⏳</div>
                            ) : (
                              <Video className="w-8 h-8 text-gray-600" />
                            )}
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
                    {selectedAssets.has(asset.id) && (
                      <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}

                    {/* Model Type Badge for Images */}
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
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

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