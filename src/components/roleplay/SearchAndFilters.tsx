import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface SearchAndFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedFilter: string;
  setSelectedFilter: (filter: string) => void;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  selectedFilter,
  setSelectedFilter
}) => {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search characters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border text-white placeholder:text-gray-400"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="sm:w-48">
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="bg-card border-border text-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all" className="text-white hover:bg-gray-700">
                All Characters
              </SelectItem>
              <SelectItem value="sfw" className="text-white hover:bg-gray-700">
                SFW Only
              </SelectItem>
              <SelectItem value="nsfw" className="text-white hover:bg-gray-700">
                NSFW Only
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || selectedFilter !== 'all') && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedFilter('all');
            }}
            className="text-white border-gray-600 hover:bg-gray-800"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {(searchQuery || selectedFilter !== 'all') && (
        <div className="mt-3 flex flex-wrap gap-2">
          {searchQuery && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-600 text-white">
              Search: "{searchQuery}"
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 hover:bg-blue-700 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </span>
          )}
          {selectedFilter !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-600 text-white">
              Filter: {selectedFilter.toUpperCase()}
              <button
                onClick={() => setSelectedFilter('all')}
                className="ml-1 hover:bg-green-700 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
