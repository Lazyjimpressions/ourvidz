import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Trash2, 
  Eye, 
  Image, 
  Video, 
  Play,
  Clock,
  Calendar,
  Copy,
  Plus
} from "lucide-react";
import { WorkspaceContentModal } from "@/components/WorkspaceContentModal";
import { LibraryImportModal } from "@/components/LibraryImportModal";
import { UnifiedAsset } from '@/lib/services/AssetService';
import { useMediaGridWorkspace } from '@/hooks/useMediaGridWorkspace';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MediaTile {
  id: string;
  originalAssetId: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
  modelType?: string;
  duration?: number;
  thumbnailUrl?: string;
}

interface MediaGridProps {
  onRegenerateItem?: (itemId: string) => void;
  onGenerateMoreLike?: (tile: MediaTile) => void;
  onClearWorkspace?: boolean;
  onImport?: (importHandler: (assets: UnifiedAsset[]) => void) => void;
}

export const MediaGrid = ({ onRegenerateItem, onGenerateMoreLike, onClearWorkspace, onImport }: MediaGridProps) => {
  const [selectedTile, setSelectedTile] = useState<MediaTile | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  // Use the isolated media grid workspace hook
  const { tiles, isLoading, deletingTiles, importToWorkspace, clearWorkspace, deleteTile } = useMediaGridWorkspace();

  const handleDownload = async (tile: MediaTile, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(tile.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${tile.type}-${tile.id}.${tile.type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // Handle workspace clearing from parent
  useEffect(() => {
    if (onClearWorkspace) {
      clearWorkspace();
    }
  }, [onClearWorkspace, clearWorkspace]);

  // Register import handler with parent component
  useEffect(() => {
    if (onImport) {
      onImport(importToWorkspace);
    }
  }, [onImport, importToWorkspace]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-2">⏳</div>
          <p className="text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (tiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            Your workspace is empty
          </h3>
          <p className="text-gray-600 mb-4">
            Generate new content or import from your library
          </p>
          <Button
            variant="outline"
            onClick={() => setShowLibraryModal(true)}
            className="gap-2 border-gray-700 hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            Import from Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Dynamic Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className={cn(
              "group relative cursor-pointer bg-gray-900 rounded-lg overflow-hidden aspect-square transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
              deletingTiles.has(tile.id) && "opacity-50 pointer-events-none"
            )}
            onClick={() => {
              const index = tiles.findIndex(t => t.id === tile.id);
              setSelectedIndex(index);
              setSelectedTile(tile);
            }}
          >
            {/* Media Content */}
            {tile.type === 'image' ? (
              <img
                src={tile.url}
                alt="Generated content"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  console.error('❌ Image failed to load:', tile.url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="relative w-full h-full">
                {tile.thumbnailUrl ? (
                  <img
                    src={tile.thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={tile.url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                )}
                {/* Play button overlay for videos */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="bg-black/70 rounded-full p-3">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Content Type Icon */}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-black/70 text-white border-gray-600 text-xs">
                {tile.type === 'image' ? (
                  <Image className="h-3 w-3 mr-1" />
                ) : (
                  <Video className="h-3 w-3 mr-1" />
                )}
                {tile.type}
              </Badge>
            </div>

            {/* Model Type Badge (for images) */}
            {tile.type === 'image' && tile.modelType && (
              <div className="absolute top-2 right-2">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs border",
                    tile.modelType === 'SDXL'
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40" 
                      : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                  )}
                >
                  {tile.modelType}
                </Badge>
              </div>
            )}

            {/* Duration for videos */}
            {tile.type === 'video' && tile.duration && (
              <div className="absolute bottom-2 right-2">
                <Badge variant="secondary" className="bg-black/70 text-white text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {tile.duration}s
                </Badge>
              </div>
            )}

            {/* Hover Actions */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const index = tiles.findIndex(t => t.id === tile.id);
                  setSelectedIndex(index);
                  setSelectedTile(tile);
                }}
                className="h-6 w-6 p-0 bg-gray-700/80 hover:bg-gray-600 backdrop-blur-sm"
              >
                <Eye className="h-3 w-3" />
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => handleDownload(tile, e)}
                className="h-6 w-6 p-0 bg-gray-700/80 hover:bg-gray-600 backdrop-blur-sm"
              >
                <Download className="h-3 w-3" />
              </Button>
              
              {/* More Like This Button - Only for images */}
              {tile.type === 'image' && onGenerateMoreLike && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateMoreLike(tile);
                  }}
                  className="h-6 w-6 p-0 bg-blue-600/80 hover:bg-blue-700 backdrop-blur-sm"
                  title="Generate 3 more like this"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
              
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTile(tile);
                }}
                className="h-6 w-6 p-0 bg-red-600/80 hover:bg-red-700 backdrop-blur-sm"
                disabled={deletingTiles.has(tile.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Hover overlay for videos only */}
            {tile.type === 'video' && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 opacity-0 group-hover:opacity-100 pointer-events-none" />
            )}

            {/* Tile Info Footer */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex items-center justify-between text-xs text-white">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-1 py-0.5 bg-black/50 border-white/20 text-white">
                    {tile.quality === 'high' ? 'HD' : 'Fast'}
                  </Badge>
                </div>
                <div className="flex items-center text-xs text-gray-300">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(tile.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Full Resolution */}
      {selectedTile && (
        <WorkspaceContentModal
          tiles={tiles}
          currentIndex={selectedIndex}
          onClose={() => setSelectedTile(null)}
          onIndexChange={(newIndex) => {
            setSelectedIndex(newIndex);
            setSelectedTile(tiles[newIndex]);
          }}
        />
      )}

      {/* Library Import Modal */}
      <LibraryImportModal
        isOpen={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        onImport={importToWorkspace}
      />
    </>
  );
};