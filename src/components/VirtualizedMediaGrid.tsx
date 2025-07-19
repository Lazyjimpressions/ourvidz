
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Button } from "@/components/ui/button";
import { Trash2, Download, MoreHorizontal, Copy, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaTile } from "@/types/workspace";
import { toast } from 'sonner';

interface VirtualizedMediaGridProps {
  tiles: MediaTile[];
  isLoading?: boolean;
  onDeleteTile?: (tile: MediaTile) => void;
  onClearWorkspace?: () => void;
}

export const VirtualizedMediaGrid = ({ 
  tiles, 
  isLoading = false, 
  onDeleteTile,
  onClearWorkspace 
}: VirtualizedMediaGridProps) => {
  const [selectedTile, setSelectedTile] = useState<MediaTile | null>(null);
  const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate grid layout
  const { columnCount, rowCount, columnWidth, rowHeight } = useMemo(() => {
    const containerWidth = gridDimensions.width || 1200;
    const itemWidth = 280;
    const itemHeight = 320;
    const gap = 16;
    
    const cols = Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
    const rows = Math.ceil(tiles.length / cols);
    const actualColumnWidth = (containerWidth - (cols - 1) * gap) / cols;
    
    return {
      columnCount: cols,
      rowCount: rows,
      columnWidth: actualColumnWidth,
      rowHeight: itemHeight + gap
    };
  }, [gridDimensions.width, tiles.length]);

  // Resize observer
  React.useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setGridDimensions({ width, height });
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleDownload = useCallback(async (tile: MediaTile) => {
    if (!tile.url) return;
    
    try {
      const response = await fetch(tile.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tile.type}-${tile.id}.${tile.type === 'image' ? 'webp' : 'mp4'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${tile.type === 'image' ? 'Image' : 'Video'} downloaded`);
    } catch (error) {
      toast.error('Failed to download');
    }
  }, []);

  const handleCopyPrompt = useCallback((prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied to clipboard');
  }, []);

  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    const tile = tiles[index];
    
    if (!tile) return null;

    return (
      <div style={style} className="p-2">
        <div className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-border">
          {/* Media Display */}
          <div className="aspect-square bg-muted relative group cursor-pointer" onClick={() => setSelectedTile(tile)}>
            {tile.type === 'image' ? (
              <img 
                src={tile.url} 
                alt={tile.prompt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <video 
                src={tile.url}
                poster={tile.thumbnailUrl}
                className="w-full h-full object-cover"
                muted
                loop
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => e.currentTarget.pause()}
              />
            )}
            
            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(tile);
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
                {onDeleteTile && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTile(tile);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tile Info */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {tile.quality} • {tile.modelType || 'Standard'}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyPrompt(tile.prompt)}
                className="h-6 px-2"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-foreground line-clamp-2">
              {tile.prompt}
            </p>
            <div className="text-xs text-muted-foreground">
              {new Date(tile.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    );
  }, [tiles, columnCount, handleDownload, handleCopyPrompt, onDeleteTile]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No assets in workspace</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Generate images or videos, or import from your library to get started with your workspace.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Workspace ({tiles.length} {tiles.length === 1 ? 'item' : 'items'})
        </h2>
        {onClearWorkspace && tiles.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearWorkspace}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Workspace
          </Button>
        )}
      </div>

      <div ref={containerRef} className="flex-1 min-h-0">
        {gridDimensions.width > 0 && (
          <Grid
            columnCount={columnCount}
            rowCount={rowCount}
            columnWidth={columnWidth}
            rowHeight={rowHeight}
            height={gridDimensions.height}
            width={gridDimensions.width}
          >
            {Cell}
          </Grid>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedTile} onOpenChange={() => setSelectedTile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          {selectedTile && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {selectedTile.type === 'image' ? (
                  <img 
                    src={selectedTile.url} 
                    alt={selectedTile.prompt}
                    className="w-full rounded-lg"
                  />
                ) : (
                  <video 
                    src={selectedTile.url}
                    controls
                    className="w-full rounded-lg"
                  />
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Prompt</label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedTile.prompt}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Quality</label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTile.quality}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Model</label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTile.modelType || 'Standard'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedTile.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDownload(selectedTile)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCopyPrompt(selectedTile.prompt)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Prompt
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
