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
  onSendToRef?: (item: UnifiedAsset) => void;
  // Job-level Actions
  onDeleteJob?: (jobId: string) => void;
  onDismissJob?: (jobId: string) => void;
  isDeleting: Set<string>;
  activeJobId?: string | null;
  onJobSelect?: (jobId: string | null) => void;
  // URL Management
  registerAssetRef?: (id: string, element: HTMLElement | null) => void;
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
  onSendToRef,
  // Job-level Actions
  onDeleteJob,
  onDismissJob,
  isDeleting,
  activeJobId,
  onJobSelect,
  // URL Management
  registerAssetRef
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
    const jobElement = document.querySelector(`[data-job-id="${jobId}"]`) as HTMLElement | null;
    if (!jobElement) return;

    // Offset to account for fixed/sticky headers
    const headerOffset = 96; // 24 * 4px = 96px (matches scroll-mt-24)
    const elementTop = jobElement.getBoundingClientRect().top + window.pageYOffset;
    const targetY = Math.max(0, elementTop - headerOffset);

    window.scrollTo({ top: targetY, behavior: 'smooth' });
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
      <div className="flex-1">
        {/* Responsive Grid - Individual 1x1 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
          {Object.entries(displayJobs).flatMap(([jobId, jobItems]) => 
            jobItems.map((item) => (
              <div 
                key={item.id} 
                data-job-id={jobId} 
                className="aspect-square relative group scroll-mt-24"
                ref={(el) => registerAssetRef?.(item.id, el)}
              >
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
                  onSendToRef={onSendToRef ? () => onSendToRef(item) : undefined}
                  isDeleting={isDeleting.has(item.id)}
                  size="lg"
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Job Thumbnail Sidebar with Scroll-to Functionality */}
      {Object.keys(sessionGroups).length > 0 && (
        <div className="w-20 sticky top-24 max-h-[calc(100vh-6rem)] self-start p-2 space-y-2 overflow-auto bg-transparent">
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
                  isActive ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-border/40'
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
                <div className="w-16 h-16 rounded overflow-hidden bg-card/10 relative">
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
                       <div className="absolute inset-0 flex items-center justify-center bg-background/20">
                         <div className="bg-background/60 rounded-full p-1">
                           <Play className="w-4 h-4 text-foreground" fill="currentColor" />
                         </div>
                       </div>
                       {/* Video Duration */}
                         {thumbnailItem.duration && (
                           <div className="absolute bottom-1 left-1 bg-background/60 text-foreground text-xs px-1 rounded">
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
                        title="Clear (save to library & remove)"
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
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}; 