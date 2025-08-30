import React from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange
}) => {
  const { isMobile } = useMobileDetection();

  const filterOptions = [
    { value: 'all', label: 'All Characters' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'sci-fi', label: 'Sci-Fi' },
    { value: 'mystery', label: 'Mystery' },
    { value: 'romance', label: 'Romance' }
  ];

  const clearSearch = () => {
    onSearchChange('');
  };

  const clearFilter = () => {
    onFilterChange('all');
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search characters..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 mr-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-sm">Filter:</span>
        </div>
        
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            variant={selectedFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(option.value)}
            className={`
              ${selectedFilter === option.value 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
              }
              ${isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'}
            `}
          >
            {option.label}
          </Button>
        ))}
        
        {selectedFilter !== 'all' && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilter}
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white text-xs px-2 py-1"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Summary */}
      {(searchQuery || selectedFilter !== 'all') && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
          <span>Active filters:</span>
          {searchQuery && (
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
              Search: "{searchQuery}"
            </span>
          )}
          {selectedFilter !== 'all' && (
            <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
              Category: {filterOptions.find(f => f.value === selectedFilter)?.label}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearSearch();
              clearFilter();
            }}
            className="text-blue-400 hover:text-blue-300 text-xs"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};
