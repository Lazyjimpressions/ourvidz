
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Grid2X2, List } from "lucide-react";
import { StorageUsageIndicator } from "./StorageUsageIndicator";

interface LibraryHeaderProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  totalAssets: number;
  isLoading?: boolean;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  totalPages: number;
}

export const LibraryHeader = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  totalAssets,
  isLoading,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages
}: LibraryHeaderProps) => {
  return (
    <div className="space-y-4">
      {/* Title and Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">My Library</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="bg-gray-800 text-gray-300">
              {totalAssets} assets
            </Badge>
            {totalPages > 1 && (
              <Badge variant="outline" className="border-blue-500/20 text-blue-400">
                Page {currentPage} of {totalPages}
              </Badge>
            )}
            {isLoading && (
              <Badge variant="outline" className="border-yellow-500/20 text-yellow-400">
                Loading...
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Storage Usage Indicator */}
          <StorageUsageIndicator />
          
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Show:</span>
            <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="w-20 h-8 bg-gray-800 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
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

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search your assets..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
