import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

interface MobileRoleplayFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  contentFilter: 'all' | 'nsfw' | 'sfw';
  onContentFilterChange: (filter: 'all' | 'nsfw' | 'sfw') => void;
  selectedFilter: string;
  onSelectedFilterChange: (filter: string) => void;
}

const categoryFilters = ['all', 'fantasy', 'anime', 'realistic', 'sci-fi'];

export const MobileRoleplayFilterSheet: React.FC<MobileRoleplayFilterSheetProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  contentFilter,
  onContentFilterChange,
  selectedFilter,
  onSelectedFilterChange
}) => {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-center justify-between pb-2">
          <DrawerTitle>Filter Characters</DrawerTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-5">
          {/* Search Input */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search characters..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-10"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Content Filter - Segmented Control */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Content Rating</Label>
            <SegmentedControl
              options={[
                { value: 'all', label: 'All' },
                { value: 'sfw', label: 'SFW' },
                { value: 'nsfw', label: 'NSFW' }
              ]}
              value={contentFilter}
              onChange={(value) => onContentFilterChange(value as 'all' | 'nsfw' | 'sfw')}
              size="sm"
            />
          </div>

          {/* Category Filter - Chips */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <div className="flex flex-wrap gap-2">
              {categoryFilters.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onSelectedFilterChange(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors",
                    selectedFilter === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || contentFilter !== 'all' || selectedFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSearchChange('');
                onContentFilterChange('all');
                onSelectedFilterChange('all');
              }}
              className="w-full"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
