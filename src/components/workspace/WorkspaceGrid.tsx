import React, { useState, useMemo } from 'react';
import { ContentCard } from './ContentCard';
import { WorkspaceItem } from '@/hooks/useSimplifiedWorkspaceState';

interface WorkspaceGridProps {
  items: WorkspaceItem[];
  onEdit: (item: WorkspaceItem) => void;
  onSave: (item: WorkspaceItem) => void;
  onDelete: (item: WorkspaceItem) => void;
  onDismiss?: (item: WorkspaceItem) => void;
  onView: (item: WorkspaceItem) => void;
  onDownload: (item: WorkspaceItem) => void;
  onUseAsReference: (item: WorkspaceItem) => void;
  onUseSeed: (item: WorkspaceItem) => void;
  onDeleteJob?: (jobId: string) => void;
  onDismissJob?: (jobId: string) => void;
  isDeleting: Set<string>;
  activeJobId?: string | null;
  onJobSelect?: (jobId: string | null) => void;
}

export const WorkspaceGrid: React.FC<WorkspaceGridProps> = ({
  items,
  onEdit,
  onSave,
  onDelete,
  onDismiss,
  onView,
  onDownload,
  onUseAsReference,
  onUseSeed,
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

  // Get grid class based on number of items
  const getGridClass = (itemCount: number) => {
    if (itemCount === 1) return 'grid-cols-1';
    if (itemCount === 2) return 'grid-cols-2';
    if (itemCount === 3) return 'grid-cols-3';
    if (itemCount === 4) return 'grid-cols-2 md:grid-cols-4';
    if (itemCount === 5) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
    if (itemCount === 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8';
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
            {/* Job header with delete option */}
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-sm text-gray-400">
                {jobItems[0]?.prompt?.substring(0, 50)}...
              </span>
              {onDeleteJob && (
                <button 
                  onClick={() => onDeleteJob(jobId)}
                  className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded transition-colors"
                  disabled={isDeleting.has(jobId)}
                >
                  {isDeleting.has(jobId) ? 'Deleting...' : 'Delete Job'}
                </button>
              )}
            </div>
            
            {/* Dynamic grid: 1x3 for 3 images, 2x3 for 6 images */}
            <div className={`grid gap-2 px-2 ${getGridClass(jobItems.length)}`}>
              {jobItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onEdit={() => onEdit(item)}
                  onSave={() => onSave(item)}
                  onDelete={() => onDelete(item)}
                  onDismiss={() => onDismiss?.(item)}
                  onView={() => onView(item)}
                  onDownload={() => onDownload(item)}
                  onUseAsReference={() => onUseAsReference(item)}
                  onUseSeed={() => onUseSeed(item)}
                  isDeleting={isDeleting.has(item.id)}
                  size="md"
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

                {/* Hover Delete Button */}
                {hoveredJob === jobId && (onDeleteJob || onDismissJob) && (
                  <div className="absolute -top-1 -right-1 flex gap-1">
                    {onDismissJob && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissJob(jobId);
                        }}
                        className="w-6 h-6 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
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
                        className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
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