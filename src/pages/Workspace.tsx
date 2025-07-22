import { useState, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';

import { MediaTile } from '@/types/workspace';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkspaceContentModal } from '@/components/WorkspaceContentModal';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';

// Simple MediaTile component for this page
const MediaTileComponent = ({ tile, onClick }: { tile: MediaTile; onClick: () => void }) => {
  return (
    <div className="group relative cursor-pointer" onClick={onClick}>
      <AspectRatio ratio={1}>
        <div className="relative w-full h-full overflow-hidden rounded-lg border border-border">
          {tile.type === 'image' ? (
            <img
              src={tile.url}
              alt={tile.prompt}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <video
              src={tile.url}
              poster={tile.thumbnailUrl}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              muted
            />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
      </AspectRatio>
    </div>
  );
};

export default function Workspace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTiles, setSelectedTiles] = useState<MediaTile[]>([]);
  const [currentTileIndex, setCurrentTileIndex] = useState(-1);
  const { toast } = useToast();

  const { tiles, isLoading, deletingTiles, clearWorkspace, deleteTile } = useWorkspace();

  // Filter tiles based on search query
  const filteredTiles = useMemo(() => {
    if (!searchQuery.trim()) return tiles;
    
    const query = searchQuery.toLowerCase();
    return tiles.filter(tile => 
      tile.prompt.toLowerCase().includes(query) ||
      tile.type.toLowerCase().includes(query)
    );
  }, [tiles, searchQuery]);

  const handleTileClick = (tile: MediaTile) => {
    setSelectedTiles(filteredTiles);
    const index = filteredTiles.findIndex((t) => t.id === tile.id);
    setCurrentTileIndex(index);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleDeleteFromLibrary = async (tileId: string) => {
    const tile = filteredTiles.find(t => t.id === tileId);
    if (tile) {
      try {
        await deleteTile(tile);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleRefreshWorkspace = useCallback(() => {
    console.log('🔄 Refreshing workspace...');
    // The useWorkspace hook handles automatic refreshing
  }, []);

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
          <Button variant="ghost" onClick={() => window.location.reload()} disabled={isLoading}>
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
          ) : filteredTiles && filteredTiles.length > 0 ? (
            filteredTiles.map((tile) => (
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
          onDeleteFromLibrary={handleDeleteFromLibrary}
          onRefreshWorkspace={handleRefreshWorkspace}
        />
      )}
    </div>
  );
}