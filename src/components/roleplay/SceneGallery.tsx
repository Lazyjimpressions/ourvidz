import React, { useState, useCallback } from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';
import { useSceneGallery } from '@/hooks/useSceneGallery';
import { SceneTemplateCard } from './SceneTemplateCard';
import { SceneTemplate, SceneTemplateFilter } from '@/types/roleplay';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SceneGalleryProps {
  onSceneSelect: (scene: SceneTemplate) => void;
  className?: string;
}

const FILTER_OPTIONS: { value: SceneTemplateFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sfw', label: 'SFW' },
  { value: 'nsfw', label: 'NSFW' },
  { value: 'popular', label: 'Popular' }
];

export const SceneGallery: React.FC<SceneGalleryProps> = ({
  onSceneSelect,
  className
}) => {
  const [activeFilter, setActiveFilter] = useState<SceneTemplateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { scenes, isLoading, error, loadScenes, searchScenes } = useSceneGallery(activeFilter);

  const handleFilterChange = useCallback((filter: SceneTemplateFilter) => {
    setActiveFilter(filter);
    setSearchQuery('');
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      await searchScenes(query);
      setIsSearching(false);
    } else {
      loadScenes(activeFilter);
    }
  }, [activeFilter, loadScenes, searchScenes]);

  // Debounced search
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [handleSearch]);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search scenes..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 bg-background/50"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={activeFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange(option.value)}
              className={cn(
                "rounded-full px-4 whitespace-nowrap text-sm",
                activeFilter === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/50 hover:bg-background/80"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && !isSearching && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-8">
          <p className="text-destructive text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadScenes(activeFilter)}
            className="mt-2"
          >
            Try again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && scenes.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">
            {searchQuery ? 'No scenes match your search' : 'No scenes available'}
          </p>
        </div>
      )}

      {/* Scene grid */}
      {!isLoading && !error && scenes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {scenes.map((scene) => (
            <SceneTemplateCard
              key={scene.id}
              scene={scene}
              onClick={onSceneSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
