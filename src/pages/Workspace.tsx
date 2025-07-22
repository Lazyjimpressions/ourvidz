import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Upload, RefreshCw } from 'lucide-react';

import { MediaTile } from '@/types/workspace';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUpload } from '@/hooks/useUpload';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkspaceContentModal } from '@/components/WorkspaceContentModal';
import { MediaTileComponent } from '@/components/MediaTile';
import { UploadButton } from '@/components/UploadButton';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from "@/components/ui/aspect-ratio"

export default function Workspace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTiles, setSelectedTiles] = useState<MediaTile[]>([]);
  const [currentTileIndex, setCurrentTileIndex] = useState(-1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch workspace tiles
  const { 
    data: tiles, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['workspaceTiles', searchQuery],
    queryFn: () => useWorkspace().getWorkspaceTiles(searchQuery),
  });

  // Upload mutation
  const { 
    startUpload, 
    isUploading 
  } = useUpload();

  // Delete mutation
  const { 
    mutate: deleteAsset, 
    isLoading: isDeleting 
  } = useMutation({
    mutationFn: useWorkspace().deleteAsset,
    onSuccess: () => {
      toast({
        title: "Deletion Successful",
        description: "Asset deleted from library.",
      });
      queryClient.invalidateQueries({ queryKey: ['workspaceTiles'] });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete asset.",
        variant: "destructive",
      });
    },
  });

  // Remove from workspace mutation
  const { 
    mutate: removeFromWorkspace, 
    isLoading: isRemoving 
  } = useMutation({
    mutationFn: useWorkspace().removeFromWorkspace,
    onSuccess: () => {
      toast({
        title: "Asset Removed",
        description: "Asset removed from workspace.",
      });
      queryClient.invalidateQueries({ queryKey: ['workspaceTiles'] });
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove asset.",
        variant: "destructive",
      });
    },
  });

  const handleTileClick = (tile: MediaTile) => {
    setSelectedTiles(tiles || []);
    const index = tiles?.findIndex((t) => t.id === tile.id) ?? -1;
    setCurrentTileIndex(index);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleUpload = async (file: File) => {
    try {
      await startUpload(file);
      // Invalidate the query to refresh the workspace tiles
      queryClient.invalidateQueries({ queryKey: ['workspaceTiles'] });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload asset.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromWorkspace = (tileId: string) => {
    removeFromWorkspace(tileId);
  };

  const handleDeleteFromLibrary = (originalAssetId: string) => {
    deleteAsset(originalAssetId);
  };

  const handleRefreshWorkspace = useCallback(() => {
    console.log('🔄 Refreshing workspace after generation...');
    refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container flex items-center h-16 space-x-4 sm:space-x-0">
          <Input
            type="search"
            placeholder="Search workspace..."
            className="max-w-sm flex-1"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <UploadButton onUpload={handleUpload} isUploading={isUploading} />
          <Button variant="ghost" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      <div className="container py-4">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {isLoading ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-full aspect-square rounded-md" />
              ))}
            </>
          ) : error ? (
            <div className="text-red-500">Error: {error.message}</div>
          ) : tiles && tiles.length > 0 ? (
            tiles.map((tile) => (
              <MediaTileComponent
                key={tile.id}
                tile={tile}
                onClick={() => handleTileClick(tile)}
              />
            ))
          ) : (
            <div className="text-muted-foreground">No assets found. Upload or generate some content to get started.</div>
          )}
        </div>
      </div>

      {selectedTiles.length > 0 && currentTileIndex !== -1 && (
        <WorkspaceContentModal
          tiles={selectedTiles}
          currentIndex={currentTileIndex}
          onClose={() => {
            setSelectedTiles([]);
            setCurrentTileIndex(-1);
          }}
          onIndexChange={setCurrentTileIndex}
          onRemoveFromWorkspace={handleRemoveFromWorkspace}
          onDeleteFromLibrary={handleDeleteFromLibrary}
          onRefreshWorkspace={handleRefreshWorkspace}
        />
      )}
    </div>
  );
}
