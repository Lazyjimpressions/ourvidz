import React, { useState, useMemo } from 'react';
import { ContentCard } from './ContentCard';
import { WorkspaceItem } from '@/hooks/useSimplifiedWorkspaceState';

interface WorkspaceGridProps {
  items: WorkspaceItem[];
  // LTX-Style Actions
  onIterate?: (item: WorkspaceItem) => void;
  onCreateVideo?: (item: WorkspaceItem) => void;
  onDownload: (item: WorkspaceItem) => void;
  onExpand?: (item: WorkspaceItem) => void;
  // Legacy Actions (for compatibility)
  onEdit: (item: WorkspaceItem) => void;
  onSave: (item: WorkspaceItem) => void;
  onDelete: (item: WorkspaceItem) => void;
  onDismiss?: (item: WorkspaceItem) => void;
  onView: (item: WorkspaceItem) => void;
  onUseAsReference: (item: WorkspaceItem) => void;
  onUseSeed: (item: WorkspaceItem) => void;
  // Job-level Actions
  onDeleteJob?: (jobId: string) => void;
  onDismissJob?: (jobId: string) => void;
  isDeleting: Set<string>;
  activeJobId?: string | null;
  onJobSelect?: (jobId: string | null) => void;
}

export const WorkspaceGrid: React.FC<WorkspaceGridProps> = ({
  items,
  // LTX-Style Actions
  onIterate,
  onCreateVideo,
  onDownload,
  onExpand,
  // Legacy Actions
  onEdit,
  onSave,
  onDelete,
  onDismiss,
  onView,
  onUseAsReference,
  onUseSeed,
  // Job-level Actions
  onDeleteJob,
  onDismissJob,
  isDeleting,
  activeJobId,
  onJobSelect
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredJob, setHoveredJob] = useState<string | null>(null);

  // Job-level grouping
  const sessionGroups = useMemo(() => {
    return items.reduce((acc, item) => {
      const jobId = item.jobId || 'unknown';
      if (!acc[jobId]) acc[jobId] = [];
      acc[jobId].push(item);
      return acc;
    }, {} as Record<string, WorkspaceItem[]>);
  }, [items]);

  // LTX-Style Grid Class - Larger images for desktop with clean spacing
  const getGridClass = (itemCount: number) => {
    // Desktop-first approach with larger images
    if (itemCount === 1) return 'grid-cols-1';
    if (itemCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (itemCount === 3) return 'grid-cols-1 md:grid-cols-3';
    if (itemCount === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    if (itemCount === 5) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
    if (itemCount === 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'; // Classic 2x3 grid
    // For larger sets, maintain elegant spacing
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
  };

  // Filter jobs based on active selection
  const displayJobs = activeJobId 
    ? { [activeJobId]: sessionGroups[activeJobId] || [] }
    : sessionGroups;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="max-w-md">
          <h3 className="text-2xl font-semibold text-white mb-4">
            Let's start with some image storming.
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Type your prompt, set your style, and generate your image. Your workspace will fill with creative content as you explore different ideas and variations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1">
        {/* Job Groups */}
        {Object.entries(displayJobs).map(([jobId, jobItems]) => (
          <div key={jobId} className="job-group mb-8">
            {/* Job header - Clean, minimal design like LTX */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex flex-col">
                <span className="text-sm text-gray-300 font-medium">
                  {jobItems[0]?.prompt?.substring(0, 60)}...
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  {jobItems.length} image{jobItems.length !== 1 ? 's' : ''} • {new Date(jobItems[0]?.timestamp || Date.now()).toLocaleTimeString()}
                </span>
              </div>
              {/* No delete job text button - use hover icons on thumbnails instead */}
            </div>
            
            {/* LTX-Style Dynamic Grid - Larger images with clean spacing */}
            <div className={`grid gap-4 px-2 ${getGridClass(jobItems.length)}`}>
              {jobItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  // LTX-Style Actions (TODO: Update ContentCard to support these)
                  // onIterate={onIterate ? () => onIterate(item) : undefined}
                  // onCreateVideo={onCreateVideo ? () => onCreateVideo(item) : undefined}
                  // onDownload={() => onDownload(item)}
                  // onExpand={onExpand ? () => onExpand(item) : undefined}
                  // Legacy Actions (for compatibility)
                  onEdit={() => onEdit(item)}
                  onSave={() => onSave(item)}
                  onDelete={() => onDelete(item)}
                  onDismiss={() => onDismiss?.(item)}
                  onView={() => onView(item)}
                  onDownload={() => onDownload(item)}
                  onUseAsReference={() => onUseAsReference(item)}
                  onUseSeed={() => onUseSeed(item)}
                  isDeleting={isDeleting.has(item.id)}
                  size="lg" // Larger size for LTX-style
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* LTX-style Job Thumbnail Selector */}
      {onJobSelect && (
        <div className="w-20 border-l border-gray-700 bg-gray-800/50 p-2 space-y-2">
          {Object.entries(sessionGroups).map(([jobId, jobItems]) => {
            const thumbnailItem = jobItems[0];
            const isActive = activeJobId === jobId;
            
            return (
              <div 
                key={jobId}
                className={`relative group cursor-pointer transition-all duration-200 ${
                  isActive ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-gray-500'
                }`}
                onClick={() => onJobSelect(isActive ? null : jobId)}
                onMouseEnter={() => setHoveredJob(jobId)}
                onMouseLeave={() => setHoveredJob(null)}
              >
                {/* Thumbnail Image */}
                <div className="w-16 h-16 rounded overflow-hidden bg-gray-700">
                  {thumbnailItem?.url ? (
                    <img 
                      src={thumbnailItem.url} 
                      alt="Job thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-4 h-4 animate-spin rounded-full border-b-2 border-gray-400" />
                    </div>
                  )}
                </div>

                {/* Hover Delete/Dismiss Buttons - Small, clean like LTX */}
                {hoveredJob === jobId && (onDeleteJob || onDismissJob) && (
                  <div className="absolute -top-1 -right-1 flex gap-1">
                    {onDismissJob && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissJob(jobId);
                        }}
                        className="w-5 h-5 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                        disabled={isDeleting.has(jobId)}
                        title="Dismiss job (hide from workspace)"
                      >
                        {isDeleting.has(jobId) ? '...' : '×'}
                      </button>
                    )}
                    {onDeleteJob && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteJob(jobId);
                        }}
                        className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                        disabled={isDeleting.has(jobId)}
                        title="Delete job permanently"
                      >
                        {isDeleting.has(jobId) ? '...' : '🗑'}
                      </button>
                    )}
                  </div>
                )}

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}; 