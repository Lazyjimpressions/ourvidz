import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Calendar, Image, Video, Check } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { cn } from '@/lib/utils';

interface LibraryImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (assets: UnifiedAsset[]) => void;
}

export const LibraryImportModal = ({ open, onClose, onImport }: LibraryImportModalProps) => {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  
  // Fetch all assets (not session-only)
  const { data: libraryAssets = [], isLoading } = useAssets(false);

  const handleAssetToggle = (assetId: string) => {
    console.log('🎯 Asset toggle clicked:', assetId);
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

  const handleImport = () => {
    console.log('🚀 Import triggered with selection:', Array.from(selectedAssets));
    console.log('📋 Available library assets:', libraryAssets.length);
    
    const assetsToImport = libraryAssets.filter(asset => selectedAssets.has(asset.id));
    console.log('📦 Assets to import:', assetsToImport.map(a => ({ id: a.id, type: a.type, prompt: a.prompt.slice(0, 50) })));
    console.log('🎯 Import count - Expected:', selectedAssets.size, 'Actual:', assetsToImport.length);
    
    if (assetsToImport.length === 0) {
      console.error('⚠️ No assets to import despite selection!');
      return;
    }
    
    onImport(assetsToImport);
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
                      selectedAssets.has(asset.id) 
                        ? "ring-4 ring-primary scale-95 shadow-lg" 
                        : "hover:scale-105 hover:shadow-md"
                    )}
                    onClick={() => handleAssetToggle(asset.id)}
                  >
                    {/* Asset Content */}
                    {asset.type === 'image' ? (
                      <img
                        src={asset.url || asset.thumbnailUrl}
                        alt="Library asset"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="relative w-full h-full bg-gray-800">
                        {asset.thumbnailUrl ? (
                          <img
                            src={asset.thumbnailUrl}
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
                    {selectedAssets.has(asset.id) && (
                      <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                        <Check className="w-3 h-3 text-primary-foreground" />
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