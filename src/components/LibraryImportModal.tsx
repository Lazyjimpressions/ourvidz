
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Image, Video, Calendar, Filter, Plus } from "lucide-react";
import { useLazyAssets } from '@/hooks/useLazyAssets';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { toast } from 'sonner';

interface LibraryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (assets: UnifiedAsset[]) => void;
}

export const LibraryImportModal = ({ isOpen, onClose, onImport }: LibraryImportModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  
  const { assets, isLoading, hasMore, loadMore } = useLazyAssets({
    searchQuery,
    typeFilter: typeFilter === 'all' ? undefined : typeFilter
  });

  // Filter and search assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = !searchQuery || 
        asset.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || asset.type === typeFilter;
      return matchesSearch && matchesType && asset.status === 'completed' && asset.url;
    });
  }, [assets, searchQuery, typeFilter]);

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(assetId)) {
        newSelected.delete(assetId);
      } else {
        newSelected.add(assetId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(asset => asset.id)));
    }
  };

  const handleImport = () => {
    const assetsToImport = filteredAssets.filter(asset => selectedAssets.has(asset.id));
    if (assetsToImport.length === 0) {
      toast.error('Please select assets to import');
      return;
    }
    
    onImport(assetsToImport);
    setSelectedAssets(new Set());
    toast.success(`Imported ${assetsToImport.length} asset${assetsToImport.length !== 1 ? 's' : ''} to workspace`);
  };

  const handleClose = () => {
    setSelectedAssets(new Set());
    setSearchQuery('');
    setTypeFilter('all');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import from Library</DialogTitle>
        </DialogHeader>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 pb-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('all')}
            >
              All
            </Button>
            <Button
              variant={typeFilter === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('image')}
            >
              <Image className="w-4 h-4 mr-1" />
              Images
            </Button>
            <Button
              variant={typeFilter === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('video')}
            >
              <Video className="w-4 h-4 mr-1" />
              Videos
            </Button>
          </div>
        </div>

        {/* Selection Controls */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedAssets.size} of {filteredAssets.length} selected
            </span>
          </div>
          
          <Button
            onClick={handleImport}
            disabled={selectedAssets.size === 0}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Import Selected ({selectedAssets.size})
          </Button>
        </div>

        {/* Assets Grid */}
        <ScrollArea className="flex-1">
          {isLoading && filteredAssets.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No assets found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                    selectedAssets.has(asset.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSelectAsset(asset.id)}
                >
                  {asset.type === 'image' ? (
                    <img
                      src={asset.url}
                      alt={asset.prompt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      src={asset.url}
                      poster={asset.thumbnailUrl}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                  
                  {/* Selection Overlay */}
                  <div className="absolute inset-0 bg-black/20 flex items-start justify-between p-2">
                    <Checkbox
                      checked={selectedAssets.has(asset.id)}
                      onCheckedChange={() => handleSelectAsset(asset.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Badge variant="secondary" className="text-xs">
                      {asset.type}
                    </Badge>
                  </div>
                  
                  {/* Asset Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs line-clamp-2 mb-1">
                      {asset.prompt}
                    </p>
                    <div className="flex items-center gap-1 text-white/70 text-xs">
                      <Calendar className="w-3 h-3" />
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {hasMore && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
