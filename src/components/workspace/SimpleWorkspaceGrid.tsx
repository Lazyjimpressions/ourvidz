
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Download, X, Play, Pause, Loader2 } from "lucide-react";
import { MediaTile } from "@/types/workspace";
import useSignedImageUrls from '@/hooks/useSignedImageUrls';

interface SimpleWorkspaceGridProps {
  mediaTiles: MediaTile[];
  onRemoveTile?: (id: string) => void;
}

export const SimpleWorkspaceGrid = ({ mediaTiles, onRemoveTile }: SimpleWorkspaceGridProps) => {
  const [selectedTile, setSelectedTile] = useState<MediaTile | null>(null);
  const [tilesWithUrls, setTilesWithUrls] = useState<MediaTile[]>([]);
  const { getSignedUrl } = useSignedImageUrls();

  // Load signed URLs for tiles that need them
  useEffect(() => {
    const loadUrls = async () => {
      const updatedTiles = await Promise.all(
        mediaTiles.map(async (tile) => {
          if (tile.url || tile.isUrlLoaded) {
            return tile;
          }

          try {
            // For new generated assets, construct the expected storage path
            let storagePath = '';
            if (tile.originalAssetId) {
              // Check if it's already a full path or just an ID
              if (tile.originalAssetId.includes('/')) {
                storagePath = tile.originalAssetId;
              } else {
                // Construct path based on asset type and quality
                const bucket = tile.type === 'image' 
                  ? (tile.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast')
                  : (tile.quality === 'high' ? 'video_high' : 'video_fast');
                storagePath = tile.originalAssetId;
              }

              const signedUrl = await getSignedUrl(storagePath, 
                tile.type === 'image' 
                  ? (tile.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast')
                  : (tile.quality === 'high' ? 'video_high' : 'video_fast')
              );

              if (signedUrl) {
                return {
                  ...tile,
                  url: signedUrl,
                  isUrlLoaded: true
                };
              }
            }

            return {
              ...tile,
              isUrlLoaded: true // Mark as loaded even if failed to prevent infinite loading
            };
          } catch (error) {
            console.error('Failed to load signed URL for tile:', tile.id, error);
            return {
              ...tile,
              isUrlLoaded: true
            };
          }
        })
      );

      setTilesWithUrls(updatedTiles);
    };

    if (mediaTiles.length > 0) {
      loadUrls();
    } else {
      setTilesWithUrls([]);
    }
  }, [mediaTiles, getSignedUrl]);

  const handleDownload = async (tile: MediaTile) => {
    if (!tile.url) return;
    
    try {
      const response = await fetch(tile.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${tile.type}_${tile.id}.${tile.type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (tilesWithUrls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <div className="w-8 h-8 border-2 border-gray-600 rounded"></div>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No generations yet</h3>
        <p className="text-gray-400 max-w-md">
          Enter a prompt above and click generate to create your first image or video.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tilesWithUrls.map((tile) => (
          <div key={tile.id} className="group relative bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
            <Dialog>
              <DialogTrigger asChild>
                <div className="aspect-square cursor-pointer">
                  {!tile.url || !tile.isUrlLoaded ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  ) : tile.type === 'image' ? (
                    <img
                      src={tile.url}
                      alt={tile.prompt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        console.error('Image failed to load:', tile.url);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={tile.url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        onError={(e) => {
                          console.error('Video failed to load:', tile.url);
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play className="w-12 h-12 text-white opacity-80" />
                      </div>
                    </div>
                  )}
                </div>
              </DialogTrigger>
              
              <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                <div className="relative">
                  {tile.url && tile.type === 'image' ? (
                    <img
                      src={tile.url}
                      alt={tile.prompt}
                      className="w-full h-auto max-h-[80vh] object-contain"
                    />
                  ) : tile.url && tile.type === 'video' ? (
                    <video
                      src={tile.url}
                      controls
                      className="w-full h-auto max-h-[80vh]"
                      autoPlay
                    />
                  ) : (
                    <div className="w-full h-64 flex items-center justify-center bg-gray-800">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  )}
                  <div className="p-4 bg-gray-900">
                    <p className="text-sm text-gray-300 mb-2">{tile.prompt}</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDownload(tile)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!tile.url}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Overlay controls */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-1">
                <Button
                  onClick={() => handleDownload(tile)}
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70"
                  disabled={!tile.url}
                >
                  <Download className="w-3 h-3" />
                </Button>
                {onRemoveTile && (
                  <Button
                    onClick={() => onRemoveTile(tile.id)}
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0 bg-red-500/50 hover:bg-red-500/70"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-xs text-white/80 line-clamp-2">{tile.prompt}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400 capitalize">{tile.quality} • {tile.type}</span>
                <span className="text-xs text-gray-400">
                  {new Date(tile.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
