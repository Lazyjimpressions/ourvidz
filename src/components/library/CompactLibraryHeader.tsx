import React from 'react';
import { Input } from '@/components/ui/input';
import { PillButton } from '@/components/ui/pill-button';
import { Badge } from '@/components/ui/badge';
import { Grid2X2, List, Search, X } from 'lucide-react';

interface CompactLibraryHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  totalAssets: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export const CompactLibraryHeader = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  totalAssets,
  filteredCount,
  hasActiveFilters,
  onClearFilters
}: CompactLibraryHeaderProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-semibold">Library</h1>
          <Badge variant="secondary" className="text-xs">
            {filteredCount} of {totalAssets}
          </Badge>
          {hasActiveFilters && (
            <PillButton
              onClick={onClearFilters}
              variant="ghost"
              size="xs"
              className="gap-1"
              aria-label="Clear filters"
            >
              <X className="h-3 w-3" />
              Clear
            </PillButton>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <PillButton
            onClick={() => onViewModeChange('grid')}
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="xs"
            aria-label="Grid view"
            className="h-8"
          >
            <Grid2X2 className="h-3 w-3" />
          </PillButton>
          <PillButton
            onClick={() => onViewModeChange('list')}
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="xs"
            aria-label="List view"
            className="h-8"
          >
            <List className="h-3 w-3" />
          </PillButton>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10 text-sm"
          aria-label="Search assets"
        />
        {searchTerm && (
          <PillButton
            onClick={() => onSearchChange('')}
            variant="ghost"
            size="xs"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </PillButton>
        )}
      </div>
    </div>
  );
};