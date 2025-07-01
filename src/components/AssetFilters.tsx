
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Grid2X2, 
  List, 
  SortDesc,
  Image as ImageIcon,
  Video as VideoIcon,
  Folder
} from "lucide-react";
import { UnifiedAsset } from "@/lib/services/AssetService";

export type AssetType = 'all' | 'image' | 'video';
export type QualityFilter = 'all' | 'fast' | 'high';
export type StatusFilter = 'all' | 'completed' | 'processing' | 'failed';
export type SortOption = 'newest' | 'oldest' | 'name';
export type ViewMode = 'grid' | 'list';

interface AssetFiltersProps {
  assets: UnifiedAsset[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  typeFilter: AssetType;
  onTypeFilterChange: (type: AssetType) => void;
  qualityFilter: QualityFilter;
  onQualityFilterChange: (quality: QualityFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
}

export const AssetFilters = ({
  assets,
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  qualityFilter,
  onQualityFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  selectedCount,
  onClearSelection,
  onSelectAll,
  selectionMode,
  onToggleSelectionMode
}: AssetFiltersProps) => {
  const imageCount = assets.filter(a => a.type === 'image').length;
  const videoCount = assets.filter(a => a.type === 'video').length;
  const completedCount = assets.filter(a => a.status === 'completed').length;
  const processingCount = assets.filter(a => a.status === 'processing' || a.status === 'queued').length;
  const failedCount = assets.filter(a => a.status === 'failed' || a.status === 'error').length;

  return (
    <div className="space-y-4">
      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Selection Mode Toggle */}
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleSelectionMode}
            className="border-gray-600"
          >
            <Filter className="h-4 w-4 mr-1" />
            Select
          </Button>

          {/* View Mode Toggle */}
          <div className="flex gap-1 border border-gray-600 rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("grid")}
              className="h-8 w-8 p-0"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("list")}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selection Summary */}
      {selectionMode && selectedCount > 0 && (
        <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
              {selectedCount} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="text-blue-400 hover:text-blue-300"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-gray-400 hover:text-gray-300"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="space-y-3">
        {/* Asset Type Filter */}
        <div>
          <Tabs value={typeFilter} onValueChange={(value) => onTypeFilterChange(value as AssetType)}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"
              >
                <Folder className="h-4 w-4 mr-1" />
                All ({assets.length})
              </TabsTrigger>
              <TabsTrigger 
                value="image"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                Images ({imageCount})
              </TabsTrigger>
              <TabsTrigger 
                value="video"
                className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"
              >
                <VideoIcon className="h-4 w-4 mr-1" />
                Videos ({videoCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Quality Filter */}
          <div className="flex gap-1">
            <Button
              variant={qualityFilter === 'all' ? "default" : "outline"}
              size="sm"
              onClick={() => onQualityFilterChange('all')}
              className="border-gray-600 text-xs"
            >
              All Quality
            </Button>
            <Button
              variant={qualityFilter === 'fast' ? "default" : "outline"}
              size="sm"
              onClick={() => onQualityFilterChange('fast')}
              className="border-gray-600 text-xs"
            >
              Fast
            </Button>
            <Button
              variant={qualityFilter === 'high' ? "default" : "outline"}
              size="sm"
              onClick={() => onQualityFilterChange('high')}
              className="border-gray-600 text-xs"
            >
              High Quality
            </Button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-1">
            <Button
              variant={statusFilter === 'all' ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusFilterChange('all')}
              className="border-gray-600 text-xs"
            >
              All Status
            </Button>
            <Button
              variant={statusFilter === 'completed' ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusFilterChange('completed')}
              className="border-gray-600 text-xs"
            >
              Completed ({completedCount})
            </Button>
            <Button
              variant={statusFilter === 'processing' ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusFilterChange('processing')}
              className="border-gray-600 text-xs"
            >
              Processing ({processingCount})
            </Button>
            {failedCount > 0 && (
              <Button
                variant={statusFilter === 'failed' ? "default" : "outline"}
                size="sm"
                onClick={() => onStatusFilterChange('failed')}
                className="border-gray-600 text-xs"
              >
                Failed ({failedCount})
              </Button>
            )}
          </div>

          {/* Sort Options */}
          <div className="flex gap-1">
            <Button
              variant={sortBy === 'newest' ? "default" : "outline"}
              size="sm"
              onClick={() => onSortChange('newest')}
              className="border-gray-600 text-xs"
            >
              <SortDesc className="h-3 w-3 mr-1" />
              Newest
            </Button>
            <Button
              variant={sortBy === 'oldest' ? "default" : "outline"}
              size="sm"
              onClick={() => onSortChange('oldest')}
              className="border-gray-600 text-xs"
            >
              Oldest
            </Button>
            <Button
              variant={sortBy === 'name' ? "default" : "outline"}
              size="sm"
              onClick={() => onSortChange('name')}
              className="border-gray-600 text-xs"
            >
              Name
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
