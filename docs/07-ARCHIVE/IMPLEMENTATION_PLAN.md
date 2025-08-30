# OurVidz Workspace Implementation Plan

**Date:** August 5, 2025  
**Status:** 🚀 **READY TO IMPLEMENT**  
**Priority:** High - Production Optimization & Feature Enhancement

## 🎯 **PHASE 1: ASSET SERVICE OPTIMIZATION (Week 1-2)**

### **Task 1.1: URL Generation Consolidation**

#### **Objective**
Consolidate multiple URL generation approaches into a unified service for better performance and consistency.

#### **Current Issues**
- Multiple URL generation approaches (`AssetService`, `OptimizedAssetService`, `useLazyAssetsV2`)
- Inconsistent bucket detection logic
- Redundant fallback mechanisms

#### **Implementation Steps**

**Step 1: Create UnifiedUrlService**
```typescript
// File: src/lib/services/UnifiedUrlService.ts
export class UnifiedUrlService {
  private static cache = new Map<string, { url: string; expires: number }>();
  
  static async generateAssetUrls(asset: UnifiedAsset): Promise<UnifiedAsset> {
    // Single source of truth for URL generation
    const bucket = this.determineBucket(asset);
    const urls = await this.generateSignedUrls(asset, bucket);
    return { ...asset, ...urls };
  }
  
  static async generateBatchUrls(assets: UnifiedAsset[]): Promise<UnifiedAsset[]> {
    // Batch URL generation for performance
    const promises = assets.map(asset => this.generateAssetUrls(asset));
    return Promise.all(promises);
  }
  
  private static determineBucket(asset: UnifiedAsset): string {
    // Standardized bucket detection logic
    const metadata = asset.metadata as any;
    const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
    const isEnhanced = metadata?.enhanced || asset.modelType?.includes('7b');
    
    if (isSDXL) {
      return asset.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
    } else if (isEnhanced) {
      return asset.quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
    } else {
      return asset.quality === 'high' ? 'image_high' : 'image_fast';
    }
  }
}
```

**Step 2: Update AssetService**
```typescript
// File: src/lib/services/AssetService.ts
// Replace existing URL generation methods with UnifiedUrlService calls
import { UnifiedUrlService } from './UnifiedUrlService';

export class AssetService {
  static async getUserAssets(sessionOnly: boolean = false): Promise<UnifiedAsset[]> {
    // ... existing query logic ...
    
    // Use unified URL generation
    const assetsWithUrls = await UnifiedUrlService.generateBatchUrls(imageAssets);
    return assetsWithUrls;
  }
}
```

**Step 3: Update Hooks**
```typescript
// File: src/hooks/useLazyAssetsV2.ts
// Replace OptimizedAssetService with UnifiedUrlService
import { UnifiedUrlService } from '@/lib/services/UnifiedUrlService';

const loadAssetUrls = useCallback(async (assetId: string) => {
  // ... existing logic ...
  
  const loadingPromise = UnifiedUrlService.generateAssetUrls(asset)
    .then(updatedAsset => {
      // ... update state ...
    });
});
```

#### **Success Criteria**
- [ ] Single URL generation approach across all components
- [ ] 50% reduction in URL generation time
- [ ] Consistent error handling and logging
- [ ] Improved cache hit rates

---

### **Task 1.2: Performance Optimization**

#### **Objective**
Improve asset loading performance and user experience with virtual scrolling and progressive loading.

#### **Implementation Steps**

**Step 1: Create VirtualizedAssetGrid**
```typescript
// File: src/components/VirtualizedAssetGrid.tsx
import { FixedSizeGrid as Grid } from 'react-window';

interface VirtualizedAssetGridProps {
  assets: UnifiedAsset[];
  itemHeight: number;
  itemWidth: number;
  containerHeight: number;
  containerWidth: number;
  onItemClick: (asset: UnifiedAsset) => void;
}

export const VirtualizedAssetGrid: React.FC<VirtualizedAssetGridProps> = ({
  assets,
  itemHeight,
  itemWidth,
  containerHeight,
  containerWidth,
  onItemClick
}) => {
  const columnCount = Math.floor(containerWidth / itemWidth);
  const rowCount = Math.ceil(assets.length / columnCount);
  
  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const assetIndex = rowIndex * columnCount + columnIndex;
    const asset = assets[assetIndex];
    
    if (!asset) return null;
    
    return (
      <div style={style}>
        <AssetCard
          asset={asset}
          onClick={() => onItemClick(asset)}
          compact={true}
        />
      </div>
    );
  };
  
  return (
    <Grid
      columnCount={columnCount}
      columnWidth={itemWidth}
      height={containerHeight}
      rowCount={rowCount}
      rowHeight={itemHeight}
      width={containerWidth}
    >
      {Cell}
    </Grid>
  );
};
```

**Step 2: Create ProgressiveImageLoader**
```typescript
// File: src/components/ProgressiveImageLoader.tsx
interface ProgressiveImageLoaderProps {
  asset: UnifiedAsset;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const ProgressiveImageLoader: React.FC<ProgressiveImageLoaderProps> = ({
  asset,
  priority = false,
  onLoad,
  onError
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const loadImage = async () => {
      try {
        // Load low-res thumbnail first
        const thumbnailUrl = await UnifiedUrlService.getThumbnailUrl(asset);
        setCurrentUrl(thumbnailUrl);
        
        // Load high-res image in background
        if (priority) {
          const highResUrl = await UnifiedUrlService.getHighResUrl(asset);
          setCurrentUrl(highResUrl);
        }
        
        setImageState('loaded');
        onLoad?.();
      } catch (error) {
        setImageState('error');
        onError?.(error as Error);
      }
    };
    
    loadImage();
  }, [asset.id]);
  
  return (
    <div className="progressive-image-loader">
      {imageState === 'loading' && <LoadingSpinner />}
      {imageState === 'loaded' && currentUrl && (
        <img
          src={currentUrl}
          alt={asset.prompt}
          className="progressive-image"
          loading={priority ? 'eager' : 'lazy'}
        />
      )}
      {imageState === 'error' && <ImageErrorFallback />}
    </div>
  );
};
```

**Step 3: Update WorkspaceGrid**
```typescript
// File: src/components/workspace/WorkspaceGrid.tsx
// Integrate virtual scrolling and progressive loading
import { VirtualizedAssetGrid } from '@/components/VirtualizedAssetGrid';
import { ProgressiveImageLoader } from '@/components/ProgressiveImageLoader';

export const WorkspaceGrid: React.FC<WorkspaceGridProps> = ({ assets, onItemClick }) => {
  const [gridDimensions, setGridDimensions] = useState({
    width: 0,
    height: 0,
    itemWidth: 200,
    itemHeight: 200
  });
  
  // Use virtual scrolling for large collections
  if (assets.length > 100) {
    return (
      <VirtualizedAssetGrid
        assets={assets}
        itemHeight={gridDimensions.itemHeight}
        itemWidth={gridDimensions.itemWidth}
        containerHeight={gridDimensions.height}
        containerWidth={gridDimensions.width}
        onItemClick={onItemClick}
      />
    );
  }
  
  // Regular grid for smaller collections
  return (
    <div className="workspace-grid">
      {assets.map(asset => (
        <ProgressiveImageLoader
          key={asset.id}
          asset={asset}
          priority={false}
          onLoad={() => console.log('Asset loaded:', asset.id)}
        />
      ))}
    </div>
  );
};
```

#### **Success Criteria**
- [ ] 70% improvement in initial load time
- [ ] Smooth scrolling with 1000+ assets
- [ ] Reduced memory usage
- [ ] Better perceived performance

---

## 🎯 **PHASE 2: ENHANCED WORKSPACE FEATURES (Week 3-4)**

### **Task 2.1: Advanced Search and Filtering**

#### **Objective**
Add powerful search and filtering capabilities to workspace.

#### **Implementation Steps**

**Step 1: Create Search Hook**
```typescript
// File: src/hooks/useWorkspaceSearch.ts
import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface WorkspaceSearch {
  query: string;
  filters: {
    dateRange: { start: Date | null; end: Date | null };
    contentType: 'all' | 'image' | 'video';
    quality: 'all' | 'fast' | 'high';
    modelType: 'all' | 'SDXL' | 'WAN' | 'Enhanced';
    status: 'all' | 'completed' | 'generating' | 'failed';
  };
  sortBy: 'date' | 'prompt' | 'quality' | 'model';
  sortOrder: 'asc' | 'desc';
}

export const useWorkspaceSearch = (assets: UnifiedAsset[]) => {
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
  
  const debouncedSearch = useDebounce(searchState, 300);
  
  const filteredAssets = useMemo(() => {
    return filterAssets(assets, debouncedSearch);
  }, [assets, debouncedSearch]);
  
  return {
    searchState,
    setSearchState,
    filteredAssets,
    totalResults: filteredAssets.length
  };
};

const filterAssets = (assets: UnifiedAsset[], search: WorkspaceSearch): UnifiedAsset[] => {
  return assets.filter(asset => {
    // Text search
    if (search.query && !asset.prompt.toLowerCase().includes(search.query.toLowerCase())) {
      return false;
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
    if (search.filters.modelType !== 'all' && asset.modelType !== search.filters.modelType) {
      return false;
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
        return a.quality.localeCompare(b.quality) * order;
      case 'model':
        return (a.modelType || '').localeCompare(b.modelType || '') * order;
      default:
        return 0;
    }
  });
};
```

**Step 2: Create Search Components**
```typescript
// File: src/components/workspace/WorkspaceSearchBar.tsx
interface WorkspaceSearchBarProps {
  searchState: WorkspaceSearch;
  onSearchChange: (search: WorkspaceSearch) => void;
  totalResults: number;
}

export const WorkspaceSearchBar: React.FC<WorkspaceSearchBarProps> = ({
  searchState,
  onSearchChange,
  totalResults
}) => {
  return (
    <div className="workspace-search-bar">
      <div className="search-input-group">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Search prompts, models, quality..."
          value={searchState.query}
          onChange={(e) => onSearchChange({
            ...searchState,
            query: e.target.value
          })}
          className="search-input"
        />
        {searchState.query && (
          <button
            onClick={() => onSearchChange({ ...searchState, query: '' })}
            className="clear-search"
          >
            <X className="clear-icon" />
          </button>
        )}
      </div>
      
      <div className="search-filters">
        <FilterDropdown
          label="Type"
          value={searchState.filters.contentType}
          options={[
            { value: 'all', label: 'All' },
            { value: 'image', label: 'Images' },
            { value: 'video', label: 'Videos' }
          ]}
          onChange={(value) => onSearchChange({
            ...searchState,
            filters: { ...searchState.filters, contentType: value }
          })}
        />
        
        <FilterDropdown
          label="Quality"
          value={searchState.filters.quality}
          options={[
            { value: 'all', label: 'All' },
            { value: 'fast', label: 'Fast' },
            { value: 'high', label: 'High' }
          ]}
          onChange={(value) => onSearchChange({
            ...searchState,
            filters: { ...searchState.filters, quality: value }
          })}
        />
        
        <DateRangePicker
          startDate={searchState.filters.dateRange.start}
          endDate={searchState.filters.dateRange.end}
          onChange={(start, end) => onSearchChange({
            ...searchState,
            filters: { ...searchState.filters, dateRange: { start, end } }
          })}
        />
      </div>
      
      <div className="search-results">
        {totalResults} results
      </div>
    </div>
  );
};
```

**Step 3: Integrate Search into Workspace**
```typescript
// File: src/pages/SimplifiedWorkspace.tsx
// Add search functionality to workspace
import { useWorkspaceSearch } from '@/hooks/useWorkspaceSearch';
import { WorkspaceSearchBar } from '@/components/workspace/WorkspaceSearchBar';

export const SimplifiedWorkspace: React.FC = () => {
  const state = useLibraryFirstWorkspace();
  const { workspaceAssets } = state;
  
  const {
    searchState,
    setSearchState,
    filteredAssets,
    totalResults
  } = useWorkspaceSearch(workspaceAssets);
  
  return (
    <div className="simplified-workspace">
      <WorkspaceHeader />
      
      <WorkspaceSearchBar
        searchState={searchState}
        onSearchChange={setSearchState}
        totalResults={totalResults}
      />
      
      <WorkspaceGrid
        assets={filteredAssets}
        onItemClick={handleItemClick}
      />
      
      <SimplePromptInput {...state} />
    </div>
  );
};
```

#### **Success Criteria**
- [ ] Sub-second search response time
- [ ] Intuitive filter interface
- [ ] Persistent search state
- [ ] Keyboard shortcuts support

---

### **Task 2.2: Batch Operations**

#### **Objective**
Enable efficient bulk operations on workspace assets.

#### **Implementation Steps**

**Step 1: Create Batch Selection Hook**
```typescript
// File: src/hooks/useBatchOperations.ts
interface BatchSelection {
  selectedIds: Set<string>;
  selectedJobs: Set<string>;
  mode: 'individual' | 'job' | 'mixed';
}

export const useBatchOperations = (assets: UnifiedAsset[]) => {
  const [selection, setSelection] = useState<BatchSelection>({
    selectedIds: new Set(),
    selectedJobs: new Set(),
    mode: 'individual'
  });
  
  const selectAsset = (assetId: string) => {
    setSelection(prev => ({
      ...prev,
      selectedIds: new Set([...prev.selectedIds, assetId])
    }));
  };
  
  const selectJob = (jobId: string) => {
    const jobAssets = assets.filter(asset => asset.metadata?.job_id === jobId);
    const assetIds = jobAssets.map(asset => asset.id);
    
    setSelection(prev => ({
      selectedIds: new Set([...prev.selectedIds, ...assetIds]),
      selectedJobs: new Set([...prev.selectedJobs, jobId]),
      mode: 'job'
    }));
  };
  
  const clearSelection = () => {
    setSelection({
      selectedIds: new Set(),
      selectedJobs: new Set(),
      mode: 'individual'
    });
  };
  
  const selectedAssets = assets.filter(asset => selection.selectedIds.has(asset.id));
  
  return {
    selection,
    selectedAssets,
    selectAsset,
    selectJob,
    clearSelection
  };
};
```

**Step 2: Create Batch Operations Service**
```typescript
// File: src/lib/services/BatchOperationsService.ts
export class BatchOperationsService {
  static async dismissAssets(assetIds: string[]): Promise<void> {
    const updates = assetIds.map(id => ({
      id,
      metadata: { workspace_dismissed: true }
    }));
    
    await supabase
      .from('images')
      .upsert(updates, { onConflict: 'id' });
      
    await supabase
      .from('videos')
      .upsert(updates, { onConflict: 'id' });
  }
  
  static async deleteAssets(assetIds: string[]): Promise<void> {
    // Delete from storage and database
    const deletePromises = assetIds.map(async (id) => {
      const asset = await AssetService.getAssetById(id);
      if (asset) {
        await AssetService.deleteAsset(id, asset.type);
      }
    });
    
    await Promise.all(deletePromises);
  }
  
  static async downloadAssets(assetIds: string[]): Promise<void> {
    const assets = await AssetService.getAssetsByIds(assetIds);
    
    for (const asset of assets) {
      if (asset.url) {
        const link = document.createElement('a');
        link.href = asset.url;
        link.download = `${asset.id}.${asset.type === 'image' ? 'png' : 'mp4'}`;
        link.click();
      }
    }
  }
}
```

**Step 3: Create Batch Operations UI**
```typescript
// File: src/components/workspace/BatchOperationBar.tsx
interface BatchOperationBarProps {
  selection: BatchSelection;
  selectedAssets: UnifiedAsset[];
  onDismiss: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onClearSelection: () => void;
}

export const BatchOperationBar: React.FC<BatchOperationBarProps> = ({
  selection,
  selectedAssets,
  onDismiss,
  onDelete,
  onDownload,
  onClearSelection
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  if (selectedAssets.length === 0) return null;
  
  return (
    <div className="batch-operation-bar">
      <div className="selection-info">
        <span className="selected-count">
          {selectedAssets.length} selected
        </span>
        <button
          onClick={onClearSelection}
          className="clear-selection"
        >
          Clear
        </button>
      </div>
      
      <div className="operation-buttons">
        <button
          onClick={onDismiss}
          disabled={isProcessing}
          className="operation-btn dismiss-btn"
        >
          <EyeOff className="btn-icon" />
          Dismiss
        </button>
        
        <button
          onClick={onDownload}
          disabled={isProcessing}
          className="operation-btn download-btn"
        >
          <Download className="btn-icon" />
          Download
        </button>
        
        <button
          onClick={onDelete}
          disabled={isProcessing}
          className="operation-btn delete-btn"
        >
          <Trash2 className="btn-icon" />
          Delete
        </button>
      </div>
      
      {isProcessing && (
        <div className="processing-indicator">
          <Loader2 className="spinner" />
          Processing...
        </div>
      )}
    </div>
  );
};
```

#### **Success Criteria**
- [ ] Intuitive multi-selection interface
- [ ] Efficient bulk operations
- [ ] Progress feedback for large operations
- [ ] Undo/redo support for batch operations

---

## 🎯 **PHASE 3: ADVANCED FEATURES (Week 5-6)**

### **Task 3.1: AI-Powered Workspace Management**

#### **Objective**
Add intelligent features to improve workspace productivity.

#### **Implementation Steps**

**Step 1: Create Smart Organization Service**
```typescript
// File: src/lib/services/SmartOrganizationService.ts
export class SmartOrganizationService {
  static autoGroupByPrompt(assets: UnifiedAsset[]): UnifiedAsset[][] {
    const groups = new Map<string, UnifiedAsset[]>();
    
    assets.forEach(asset => {
      const key = this.extractPromptKey(asset.prompt);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(asset);
    });
    
    return Array.from(groups.values());
  }
  
  static suggestTags(asset: UnifiedAsset): string[] {
    // AI-powered tag suggestion based on prompt and image analysis
    const tags = [];
    
    // Extract common themes from prompt
    const promptWords = asset.prompt.toLowerCase().split(' ');
    const commonThemes = ['portrait', 'landscape', 'product', 'artistic', 'commercial'];
    
    commonThemes.forEach(theme => {
      if (promptWords.some(word => word.includes(theme))) {
        tags.push(theme);
      }
    });
    
    // Add quality and model tags
    tags.push(asset.quality);
    tags.push(asset.modelType || 'unknown');
    
    return tags;
  }
  
  static detectDuplicates(assets: UnifiedAsset[]): UnifiedAsset[][] {
    // Simple duplicate detection based on prompt similarity
    const duplicates = [];
    const processed = new Set<string>();
    
    assets.forEach(asset => {
      if (processed.has(asset.id)) return;
      
      const similar = assets.filter(other => 
        other.id !== asset.id &&
        this.calculateSimilarity(asset.prompt, other.prompt) > 0.8
      );
      
      if (similar.length > 0) {
        duplicates.push([asset, ...similar]);
        similar.forEach(s => processed.add(s.id));
      }
      
      processed.add(asset.id);
    });
    
    return duplicates;
  }
  
  private static extractPromptKey(prompt: string): string {
    // Extract key elements from prompt for grouping
    return prompt.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .slice(0, 5)
      .join(' ');
  }
  
  private static calculateSimilarity(prompt1: string, prompt2: string): number {
    // Simple similarity calculation
    const words1 = new Set(prompt1.toLowerCase().split(' '));
    const words2 = new Set(prompt2.toLowerCase().split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}
```

**Step 2: Create Smart Suggestions Component**
```typescript
// File: src/components/workspace/SmartSuggestions.tsx
interface SmartSuggestionsProps {
  assets: UnifiedAsset[];
  onApplySuggestion: (suggestion: string, assets: UnifiedAsset[]) => void;
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  assets,
  onApplySuggestion
}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  useEffect(() => {
    const generateSuggestions = async () => {
      const groups = SmartOrganizationService.autoGroupByPrompt(assets);
      const duplicates = SmartOrganizationService.detectDuplicates(assets);
      
      const newSuggestions = [];
      
      // Group similar prompts
      if (groups.length > 1) {
        newSuggestions.push({
          type: 'group',
          title: 'Group similar prompts',
          description: `${groups.length} groups found`,
          action: () => onApplySuggestion('group', assets)
        });
      }
      
      // Remove duplicates
      if (duplicates.length > 0) {
        newSuggestions.push({
          type: 'duplicates',
          title: 'Remove duplicates',
          description: `${duplicates.length} duplicate sets found`,
          action: () => onApplySuggestion('remove_duplicates', assets)
        });
      }
      
      // Add tags
      if (assets.length > 0) {
        newSuggestions.push({
          type: 'tags',
          title: 'Add smart tags',
          description: 'AI-powered tag suggestions',
          action: () => onApplySuggestion('add_tags', assets)
        });
      }
      
      setSuggestions(newSuggestions);
    };
    
    generateSuggestions();
  }, [assets]);
  
  if (suggestions.length === 0) return null;
  
  return (
    <div className="smart-suggestions">
      <h3 className="suggestions-title">Smart Suggestions</h3>
      <div className="suggestions-list">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={suggestion.action}
            className="suggestion-item"
          >
            <div className="suggestion-icon">
              {suggestion.type === 'group' && <Folder className="icon" />}
              {suggestion.type === 'duplicates' && <Copy className="icon" />}
              {suggestion.type === 'tags' && <Tag className="icon" />}
            </div>
            <div className="suggestion-content">
              <div className="suggestion-title">{suggestion.title}</div>
              <div className="suggestion-description">{suggestion.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

#### **Success Criteria**
- [ ] Improved content discovery
- [ ] Reduced manual organization time
- [ ] Personalized workspace experience
- [ ] Learning from user behavior

---

## 🎯 **PHASE 4: PERFORMANCE & SCALABILITY (Week 7-8)**

### **Task 4.1: Database Optimization**

#### **Objective**
Optimize database queries and schema for better performance.

#### **Implementation Steps**

**Step 1: Create Database Migration**
```sql
-- File: supabase/migrations/20250108000003-performance-optimization.sql

-- Add performance indexes
CREATE INDEX CONCURRENTLY idx_images_user_created_dismissed 
ON images(user_id, created_at, (metadata->>'workspace_dismissed'));

CREATE INDEX CONCURRENTLY idx_videos_user_created_dismissed 
ON videos(user_id, created_at, (metadata->>'workspace_dismissed'));

CREATE INDEX CONCURRENTLY idx_images_job_id 
ON images((metadata->>'job_id'));

CREATE INDEX CONCURRENTLY idx_videos_job_id 
ON videos((metadata->>'job_id'));

-- Add composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_images_user_status_created 
ON images(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_videos_user_status_created 
ON videos(user_id, status, created_at DESC);

-- Add partial indexes for workspace filtering
CREATE INDEX CONCURRENTLY idx_images_workspace_active 
ON images(user_id, created_at DESC) 
WHERE (metadata->>'workspace_dismissed')::boolean = false;

CREATE INDEX CONCURRENTLY idx_videos_workspace_active 
ON videos(user_id, created_at DESC) 
WHERE (metadata->>'workspace_dismissed')::boolean = false;
```

**Step 2: Optimize AssetService Queries**
```typescript
// File: src/lib/services/AssetService.ts
// Optimize getUserAssets method
static async getUserAssets(sessionOnly: boolean = false): Promise<UnifiedAsset[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');
  
  // Use optimized query with proper indexes
  const query = supabase
    .from('images')
    .select(`
      *,
      project:projects(title),
      jobs!jobs_image_id_fkey(quality, job_type, model_type, metadata)
    `)
    .eq('user_id', user.id);
  
  if (sessionOnly) {
    const startOfDay = new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate()
    ));
    
    query
      .gte('created_at', startOfDay.toISOString())
      .not('metadata->workspace_dismissed', 'eq', true);
  }
  
  const { data: images, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Process images with optimized URL generation
  return await UnifiedUrlService.generateBatchUrls(
    images.map(image => this.transformImageToAsset(image))
  );
}
```

#### **Success Criteria**
- [ ] 80% reduction in query time
- [ ] Improved database scalability
- [ ] Better resource utilization
- [ ] Reduced storage costs

---

## 📅 **IMPLEMENTATION TIMELINE**

### **Week 1: Asset Service Foundation**
- [ ] Create UnifiedUrlService
- [ ] Update AssetService to use unified service
- [ ] Update hooks and components
- [ ] Test URL generation performance

### **Week 2: Performance Optimization**
- [ ] Implement VirtualizedAssetGrid
- [ ] Create ProgressiveImageLoader
- [ ] Update WorkspaceGrid integration
- [ ] Performance testing and optimization

### **Week 3: Search and Filtering**
- [ ] Create useWorkspaceSearch hook
- [ ] Build WorkspaceSearchBar component
- [ ] Integrate search into workspace
- [ ] Test search performance

### **Week 4: Batch Operations**
- [ ] Create useBatchOperations hook
- [ ] Build BatchOperationsService
- [ ] Create BatchOperationBar component
- [ ] Test batch operations

### **Week 5: AI Features**
- [ ] Create SmartOrganizationService
- [ ] Build SmartSuggestions component
- [ ] Integrate AI features
- [ ] Test smart organization

### **Week 6: Advanced Controls**
- [ ] Create advanced style controls
- [ ] Build prompt engineering tools
- [ ] Add generation presets
- [ ] Test advanced features

### **Week 7: Database Optimization**
- [ ] Create database migrations
- [ ] Optimize AssetService queries
- [ ] Add connection pooling
- [ ] Performance testing

### **Week 8: Final Testing & Deployment**
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Production deployment

---

## 🎯 **SUCCESS METRICS**

### **Performance Targets**
- **Load Time**: < 2 seconds for initial workspace load
- **Asset Loading**: < 100ms for cached assets
- **Search Response**: < 500ms for search results
- **Cache Hit Rate**: > 90% for frequently accessed assets

### **User Experience Targets**
- **User Engagement**: 50% increase in workspace usage time
- **Feature Adoption**: 80% adoption rate for new features
- **Error Rate**: < 1% error rate for core functionality
- **Mobile Performance**: 90% of desktop performance on mobile

### **Technical Targets**
- **Database Performance**: 80% reduction in query time
- **Memory Usage**: 50% reduction in memory footprint
- **Network Efficiency**: 70% reduction in data transfer
- **Scalability**: Support for 10,000+ assets per user

---

## 🚀 **IMMEDIATE NEXT ACTIONS**

### **Today (Priority 1)**
1. **Start URL Generation Consolidation**
   - Create `src/lib/services/UnifiedUrlService.ts`
   - Update `src/lib/services/AssetService.ts`
   - Test URL generation performance

2. **Begin Performance Optimization**
   - Install `react-window` for virtual scrolling
   - Create `src/components/VirtualizedAssetGrid.tsx`
   - Create `src/components/ProgressiveImageLoader.tsx`

3. **Set Up Development Environment**
   - Create feature branches for each phase
   - Set up testing environment
   - Configure performance monitoring

### **This Week (Priority 2)**
1. **Complete Asset Service Optimization**
   - Finish URL generation consolidation
   - Implement caching strategy
   - Performance testing and optimization

2. **Begin Search Implementation**
   - Create `src/hooks/useWorkspaceSearch.ts`
   - Build search UI components
   - Integrate into workspace

3. **Database Optimization**
   - Create performance migration
   - Optimize queries
   - Add monitoring

This implementation plan provides a clear, actionable roadmap for the next 8 weeks of development, with specific code examples, file structures, and success criteria for each phase. 