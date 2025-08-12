import { useState, useMemo, useCallback } from 'react';
import type { UnifiedAsset } from '@/lib/services/AssetService';

export interface WorkspaceSearch {
  query: string;
  filters: {
    dateRange: { start: Date | null; end: Date | null };
    contentType: 'all' | 'image' | 'video';
    quality: 'all' | 'fast' | 'high';
    modelType: 'all' | 'SDXL' | 'WAN' | 'Enhanced' | 'Standard';
    status: 'all' | 'completed' | 'generating' | 'failed';
  };
  sortBy: 'date' | 'prompt' | 'quality' | 'model';
  sortOrder: 'asc' | 'desc';
}

export interface SearchResult {
  searchState: WorkspaceSearch;
  setSearchState: (search: WorkspaceSearch) => void;
  filteredAssets: UnifiedAsset[];
  totalResults: number;
  updateQuery: (query: string) => void;
  updateFilters: (filters: Partial<WorkspaceSearch['filters']>) => void;
  updateSort: (sortBy: WorkspaceSearch['sortBy'], sortOrder: WorkspaceSearch['sortOrder']) => void;
  clearSearch: () => void;
  hasActiveFilters: boolean;
}

// Simple debounce helper bound to window for stable timer identity across re-renders
const debounce = (fn: (...args: any[]) => void, delay: number) => {
  let timer: number | undefined;
  return (...args: any[]) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
};

/**
 * Custom hook for workspace search and filtering
 * 
 * Provides comprehensive search functionality with:
 * - Text search across prompts and metadata
 * - Multiple filter types (date, content type, quality, model, status)
 * - Sorting capabilities
 * - Performance optimizations
 * - Debounced search updates
 */
export const useWorkspaceSearch = (assets: UnifiedAsset[]): SearchResult => {
  const [searchState, setSearchState] = useState<WorkspaceSearch>({
    query: '',
    filters: {
      dateRange: { start: null, end: null },
      contentType: 'all',
      quality: 'all',
      modelType: 'all',
      status: 'all'
    },
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Memoized filtered assets for performance
  const filteredAssets = useMemo(() => {
    return filterAssets(assets, searchState);
  }, [assets, searchState]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchState.query.trim() !== '' ||
      searchState.filters.dateRange.start !== null ||
      searchState.filters.dateRange.end !== null ||
      searchState.filters.contentType !== 'all' ||
      searchState.filters.quality !== 'all' ||
      searchState.filters.modelType !== 'all' ||
      searchState.filters.status !== 'all'
    );
  }, [searchState]);

  // Update query with debouncing
  const debouncedSetQuery = useMemo(
    () => debounce((query: string) => {
      setSearchState(prev => ({
        ...prev,
        query: query.trim()
      }));
    }, 200),
    []
  );

  const updateQuery = useCallback((query: string) => {
    debouncedSetQuery(query);
  }, [debouncedSetQuery]);

  // Update filters
  const updateFilters = useCallback((filters: Partial<WorkspaceSearch['filters']>) => {
    setSearchState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        ...filters
      }
    }));
  }, []);

  // Update sorting
  const updateSort = useCallback((sortBy: WorkspaceSearch['sortBy'], sortOrder: WorkspaceSearch['sortOrder']) => {
    setSearchState(prev => ({
      ...prev,
      sortBy,
      sortOrder
    }));
  }, []);

  // Clear all search and filters
  const clearSearch = useCallback(() => {
    setSearchState({
      query: '',
      filters: {
        dateRange: { start: null, end: null },
        contentType: 'all',
        quality: 'all',
        modelType: 'all',
        status: 'all'
      },
      sortBy: 'date',
      sortOrder: 'desc'
    });
  }, []);

  return {
    searchState,
    setSearchState,
    filteredAssets,
    totalResults: filteredAssets.length,
    updateQuery,
    updateFilters,
    updateSort,
    clearSearch,
    hasActiveFilters
  };
};

/**
 * Filter assets based on search criteria
 */
const filterAssets = (assets: UnifiedAsset[], search: WorkspaceSearch): UnifiedAsset[] => {
  return assets.filter(asset => {
    // Text search
    if (search.query) {
      const query = search.query.toLowerCase();
      const searchableText = [
        asset.prompt,
        asset.enhancedPrompt,
        asset.title,
        asset.modelType,
        asset.quality,
        // Search in metadata
        JSON.stringify(asset.metadata)
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }
    
    // Content type filter
    if (search.filters.contentType !== 'all' && asset.type !== search.filters.contentType) {
      return false;
    }
    
    // Quality filter
    if (search.filters.quality !== 'all' && asset.quality !== search.filters.quality) {
      return false;
    }
    
    // Model type filter
    if (search.filters.modelType !== 'all') {
      const assetModelType = asset.modelType || 'Standard';
      if (assetModelType !== search.filters.modelType) {
        return false;
      }
    }
    
    // Status filter
    if (search.filters.status !== 'all' && asset.status !== search.filters.status) {
      return false;
    }
    
    // Date range filter
    if (search.filters.dateRange.start && asset.createdAt < search.filters.dateRange.start) {
      return false;
    }
    if (search.filters.dateRange.end && asset.createdAt > search.filters.dateRange.end) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sorting logic
    const order = search.sortOrder === 'asc' ? 1 : -1;
    
    switch (search.sortBy) {
      case 'date':
        return (a.createdAt.getTime() - b.createdAt.getTime()) * order;
      case 'prompt':
        return a.prompt.localeCompare(b.prompt) * order;
      case 'quality':
        return (a.quality || '').localeCompare(b.quality || '') * order;
      case 'model':
        return (a.modelType || '').localeCompare(b.modelType || '') * order;
      default:
        return 0;
    }
  });
};

/**
 * Hook for managing search history
 */
export const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setSearchHistory(prev => {
      const filtered = prev.filter(q => q !== query);
      return [query, ...filtered.slice(0, 9)]; // Keep last 10 searches
    });
  }, []);
  
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);
  
  return {
    searchHistory,
    addToHistory,
    clearHistory
  };
};

/**
 * Hook for managing search suggestions
 */
export const useSearchSuggestions = (assets: UnifiedAsset[]) => {
  const suggestions = useMemo(() => {
    const commonTerms = new Map<string, number>();
    
    assets.forEach(asset => {
      // Extract words from prompt
      const words = asset.prompt.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !commonTerms.has(word));
      
      words.forEach(word => {
        commonTerms.set(word, (commonTerms.get(word) || 0) + 1);
      });
    });
    
    // Return top 10 most common terms
    return Array.from(commonTerms.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([term]) => term);
  }, [assets]);
  
  return suggestions;
}; 