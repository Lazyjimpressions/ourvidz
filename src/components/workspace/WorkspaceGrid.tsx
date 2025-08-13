import React, { useState, useMemo } from 'react';
import { ContentCard } from './ContentCard';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { Play, Video as VideoIcon, Image as ImageIcon, Trash2 } from 'lucide-react';

interface WorkspaceGridProps {
  items: UnifiedAsset[];
  // LTX-Style Actions
  onIterate?: (item: UnifiedAsset) => void;
  onCreateVideo?: (item: UnifiedAsset) => void;
  onDownload: (item: UnifiedAsset) => void;
  onExpand?: (item: UnifiedAsset) => void;
  // Legacy Actions (for compatibility)
  onEdit: (item: UnifiedAsset) => void;
  onSave: (item: UnifiedAsset) => void;
  onDelete: (item: UnifiedAsset) => void;
  onDismiss?: (item: UnifiedAsset) => void;
  onView: (item: UnifiedAsset) => void;
  onUseAsReference: (item: UnifiedAsset) => void;
  onUseSeed: (item: UnifiedAsset) => void;
  // NEW: Separate iterate and regenerate actions
  onIterateFromItem?: (item: UnifiedAsset) => void;
  onRegenerateJob?: (jobId: string) => void;
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
  // NEW: Separate iterate and regenerate actions
  onIterateFromItem,
  onRegenerateJob,
  // Job-level Actions
  onDeleteJob,
  onDismissJob,
  isDeleting,
  activeJobId,
  onJobSelect
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredJob, setHoveredJob] = useState<string | null>(null);

  // Job-level grouping with proper sorting
  const sessionGroups = useMemo(() => {
    console.log('🔍 WORKSPACE GRID: Processing items for job grouping:', {
      totalItems: items.length,
      items: items.map(item => ({
        id: item.id,
        type: item.type,
        jobId: item.metadata?.job_id,
        prompt: item.prompt,
        createdAt: item.createdAt
      }))
    });

    const groups = items.reduce((acc, item) => {
      // Use job_id as the primary grouping key, only fallback to item.id if no job_id exists
      const jobId = item.metadata?.job_id;
      
      // If no job_id exists, this item should be in its own group
      const groupKey = jobId || `single-${item.id}`;
      
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, UnifiedAsset[]>);

    // Sort items within each job group by creation date (newest first)
    Object.keys(groups).forEach(jobId => {
      groups[jobId].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    return groups;
  }, [items]);

  // Scroll to job function
  const scrollToJob = (jobId: string) => {
    const jobElement = document.querySelector(`[data-job-id="${jobId}"]`);
    if (jobElement) {
      jobElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  // Get job metadata for display
  const getJobMetadata = (jobItems: UnifiedAsset[]) => {
    const firstItem = jobItems[0];
    const isVideoJob = firstItem?.type === 'video';
    const itemCount = jobItems.length;
    const hasVideos = jobItems.some(item => item.type === 'video');
    const hasImages = jobItems.some(item => item.type === 'image');
    
    return {
      isVideoJob,
      itemCount,
      hasVideos,
      hasImages,
      mixedContent: hasVideos && hasImages,
      prompt: firstItem?.prompt || 'No prompt',
      timestamp: firstItem?.createdAt
    };
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
      <div className="flex-1 overflow-y-auto">
        {/* Job Groups - 1x3 Layout */}
        {Object.entries(displayJobs).map(([jobId, jobItems]) => {
          const metadata = getJobMetadata(jobItems);
          
          // Create 1x3 grid: always 3 tiles per job
          const displayItems = [...jobItems];
          // For image jobs, pad to 3 items if needed
          if (!metadata.isVideoJob) {
            while (displayItems.length < 3) {
              displayItems.push(null); // Empty slots
            }
            // Limit to 3 items maximum
            displayItems.splice(3);
          } else {
            // For video jobs, only show the first item, pad with empty slots
            displayItems.splice(1);
            while (displayItems.length < 3) {
              displayItems.push(null);
            }
          }
          
          return (
            <div key={jobId} data-job-id={jobId} className="job-group mb-6 relative group">
              {/* 1x3 Grid Layout - Fixed 3 columns */}
              <div className="grid grid-cols-3 gap-1 w-full">
                {displayItems.map((item, index) => (
                  <div key={item?.id || `empty-${index}`} className="aspect-square">
                    {item ? (
                      <ContentCard
                        item={item}
                        // LTX-Style Actions
                        onIterate={onIterate ? () => onIterate(item) : undefined}
                        onCreateVideo={onCreateVideo ? () => onCreateVideo(item) : undefined}
                        onDownload={() => onDownload(item)}
                        onExpand={onExpand ? () => onExpand(item) : () => onView(item)}
                        // Legacy Actions (for compatibility)
                        onEdit={() => onEdit(item)}
                        onSave={() => onSave(item)}
                        onDelete={() => onDelete(item)}
                        onDismiss={() => onDismiss?.(item)}
                        onView={() => onView(item)}
                        onUseAsReference={() => onUseAsReference(item)}
                        onUseSeed={() => onUseSeed(item)}
                        // NEW: Separate iterate and regenerate actions
                        onIterateFromItem={onIterateFromItem ? () => onIterateFromItem(item) : undefined}
                        onRegenerateJob={onRegenerateJob ? () => onRegenerateJob(item.metadata?.job_id) : undefined}
                        isDeleting={isDeleting.has(item.id)}
                        size="lg"
                      />
                    ) : (
                      // Empty slot for incomplete jobs - match ContentCard sizing
                      <div className="w-full aspect-square bg-muted/30 border border-border/50 rounded-lg flex items-center justify-center">
                        <div className="text-muted-foreground text-xs">Empty</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Job Actions - Clear and Delete Buttons */}
              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {onDismissJob && (
                  <button
                    onClick={() => onDismissJob(jobId)}
                    className="w-5 h-5 bg-background/80 hover:bg-background border border-border rounded-full flex items-center justify-center text-xs transition-all shadow-sm"
                    title="Clear job from workspace"
                    disabled={isDeleting.has(jobId)}
                  >
                    {isDeleting.has(jobId) ? (
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                    ) : (
                      <span className="text-muted-foreground">×</span>
                    )}
                  </button>
                )}
                {onDeleteJob && (
                  <button
                    onClick={() => {
                      // Handle synthetic "single-" job IDs - route to individual item deletion
                      if (jobId.startsWith('single-')) {
                        const itemId = jobId.replace('single-', '');
                        const item = jobItems.find(item => item.id === itemId);
                        if (item && onDelete) {
                          onDelete(item);
                        }
                      } else {
                        onDeleteJob(jobId);
                      }
                    }}
                    className="w-5 h-5 bg-red-600/80 hover:bg-red-700/90 border border-red-500/50 rounded-full flex items-center justify-center text-xs transition-all shadow-sm"
                    title="Delete job permanently"
                    disabled={isDeleting.has(jobId)}
                  >
                    {isDeleting.has(jobId) ? (
                      <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse" />
                    ) : (
                      <Trash2 className="w-3 h-3 text-white" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Job Thumbnail Sidebar with Scroll-to Functionality */}
      {Object.keys(sessionGroups).length > 0 && (
        <div className="w-20 border-l border-gray-700 bg-gray-800/50 p-2 space-y-2 overflow-y-auto">
          {Object.entries(sessionGroups)
            .sort(([, a], [, b]) => new Date(b[0].createdAt).getTime() - new Date(a[0].createdAt).getTime())
            .map(([jobId, jobItems]) => {
            const thumbnailItem = jobItems[0];
            const metadata = getJobMetadata(jobItems);
            const isActive = activeJobId === jobId;
            
            return (
              <div 
                key={jobId}
                className={`relative group cursor-pointer transition-all duration-200 ${
                  isActive ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-gray-500'
                }`}
                onClick={() => {
                  // Scroll to job instead of filtering
                  scrollToJob(jobId);
                  onJobSelect?.(jobId);
                }}
                onMouseEnter={() => setHoveredJob(jobId)}
                onMouseLeave={() => setHoveredJob(null)}
                title={`Scroll to ${metadata.isVideoJob ? 'video' : 'image'} job`}
              >
                {/* Thumbnail Container */}
                <div className="w-16 h-16 rounded overflow-hidden bg-gray-700 relative">
                   {/* Sidebar thumbnail - always show an image (real thumbnail for video if available, else placeholder) */}
                   {thumbnailItem?.type === 'video' ? (
                     <div className="relative w-full h-full">
                       <img
                         src={thumbnailItem.thumbnailUrl || '/video-thumbnail-placeholder.svg'}
                         alt="Video thumbnail"
                         className="w-full h-full object-cover"
                         onError={(e) => {
                           const target = e.currentTarget;
                           target.style.display = 'none';
                           const fallback = target.parentElement?.querySelector('.fallback-placeholder') as HTMLElement;
                           if (fallback) fallback.style.display = 'flex';
                         }}
                       />
                       {/* Video Play Overlay */}
                       <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                         <div className="bg-black/60 rounded-full p-1">
                           <Play className="w-4 h-4 text-white" fill="white" />
                         </div>
                       </div>
                       {/* Video Duration */}
                       {thumbnailItem.duration && (
                         <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">
                           {thumbnailItem.duration}s
                         </div>
                       )}
                       {/* Fallback for failed loads */}
                       <div className="fallback-placeholder absolute inset-0 bg-muted animate-pulse flex items-center justify-center" style={{ display: 'none' }}>
                         <VideoIcon className="w-4 h-4 text-muted-foreground" />
                       </div>
                     </div>
                   ) : thumbnailItem?.url ? (
                     /* Image Thumbnail */
                     <div className="relative w-full h-full">
                       <img
                         src={thumbnailItem.url}
                         alt="Image thumbnail"
                         className="w-full h-full object-cover"
                         onError={(e) => {
                           const target = e.currentTarget;
                           target.style.display = 'none';
                           const fallback = target.parentElement?.querySelector('.fallback-placeholder') as HTMLElement;
                           if (fallback) fallback.style.display = 'flex';
                         }}
                       />
                       {/* Fallback for failed loads */}
                       <div className="fallback-placeholder absolute inset-0 bg-muted animate-pulse flex items-center justify-center" style={{ display: 'none' }}>
                         <ImageIcon className="w-4 h-4 text-muted-foreground" />
                       </div>
                     </div>
                   ) : (
                     <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
                       <div className="w-4 h-4 rounded bg-muted-foreground/20" />
                     </div>
                   )}
                   
                    {/* Content Type Indicator - Removed redundant icons, keeping only play button for videos */}
                 </div>

                {/* Sidebar Actions - Clear and Delete Buttons */}
                {hoveredJob === jobId && (
                  <div className="absolute -top-1 -right-1 flex gap-1">
                    {onDismissJob && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissJob(jobId);
                        }}
                        className="w-4 h-4 bg-background/90 hover:bg-background border border-border rounded-full flex items-center justify-center transition-all shadow-sm"
                        disabled={isDeleting.has(jobId)}
                        title="Clear from workspace"
                      >
                        {isDeleting.has(jobId) ? (
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" />
                        ) : (
                          <span className="text-xs text-muted-foreground leading-none">×</span>
                        )}
                      </button>
                    )}
                    {onDeleteJob && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle synthetic "single-" job IDs - route to individual item deletion
                          if (jobId.startsWith('single-')) {
                            const itemId = jobId.replace('single-', '');
                            const item = jobItems.find(item => item.id === itemId);
                            if (item && onDelete) {
                              onDelete(item);
                            }
                          } else {
                            onDeleteJob(jobId);
                          }
                        }}
                        className="w-4 h-4 bg-red-600/90 hover:bg-red-700 border border-red-500/50 rounded-full flex items-center justify-center transition-all shadow-sm"
                        disabled={isDeleting.has(jobId)}
                        title="Delete permanently"
                      >
                        {isDeleting.has(jobId) ? (
                          <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse" />
                        ) : (
                          <Trash2 className="w-2.5 h-2.5 text-white" />
                        )}
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