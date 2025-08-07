import React, { useState, useMemo } from 'react';
import { ContentCard } from './ContentCard';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { Play, Video as VideoIcon, Image as ImageIcon } from 'lucide-react';

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
        {/* Job Groups */}
        {Object.entries(displayJobs).map(([jobId, jobItems]) => {
          const metadata = getJobMetadata(jobItems);
          
          return (
            <div key={jobId} data-job-id={jobId} className="job-group mb-8">
              {/* Job Header with Context Indicators */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                  {/* Job Context Indicator - Images show position */}
                  <div className="flex items-center gap-2">
                    {metadata.isVideoJob ? (
                      <div className="flex items-center gap-1 bg-blue-600/20 text-blue-400 text-xs px-2 py-1 rounded">
                        <VideoIcon className="w-3 h-3" />
                        Video Job
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded">
                        <ImageIcon className="w-3 h-3" />
                        {metadata.itemCount === 3 ? 'Complete Set' : `${metadata.itemCount} of 3 Images`}
                      </div>
                    )}
                  </div>
                  
                  {/* Job ID for reference */}
                  <span className="text-xs text-gray-500 font-mono">
                    {jobId.startsWith('single-') ? 'Individual' : `Job ${jobId.slice(-8)}`}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Timestamp */}
                  <span className="text-xs text-gray-500">
                    {metadata.timestamp ? new Date(metadata.timestamp).toLocaleTimeString() : ''}
                  </span>
                  
                  {/* Job-level Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDismissJob?.(jobId)}
                      className="p-1 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors"
                      title="Dismiss job from workspace"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeleteJob?.(jobId)}
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      title="Delete entire job"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Prompt Preview */}
              <div className="mb-3 px-2">
                <p className="text-sm text-gray-300 line-clamp-2">
                  {metadata.prompt}
                </p>
              </div>

              {/* Content Grid - Dynamic inline display */}
              <div className={`grid gap-3 ${metadata.isVideoJob ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                {jobItems.map((item, index) => (
                  <div key={item.id} className="relative">
                    {/* Individual asset context indicator for images */}
                    {!metadata.isVideoJob && metadata.itemCount > 1 && (
                      <div className="absolute -top-6 left-0 text-xs text-gray-500">
                        Image {index + 1} of {metadata.itemCount}
                      </div>
                    )}
                    <ContentCard
                      item={item}
                      // LTX-Style Actions
                      onIterate={onIterate ? () => onIterate(item) : undefined}
                      onCreateVideo={onCreateVideo ? () => onCreateVideo(item) : undefined}
                      onDownload={() => onDownload(item)}
                      onExpand={onExpand ? () => onExpand(item) : undefined}
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
                      size="lg" // Larger size for LTX-style
                    />
                  </div>
                ))}
                
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
                   {thumbnailItem?.url ? (
                    <>
                      {/* Video Thumbnail */}
                      {thumbnailItem.type === 'video' ? (
                        <div className="relative w-full h-full">
                          {/* Use thumbnail URL if available, otherwise video poster */}
                          <img 
                            src={thumbnailItem.thumbnailUrl || thumbnailItem.url} 
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Video thumbnail failed to load:', thumbnailItem.thumbnailUrl || thumbnailItem.url);
                              // Show loading state instead of broken image
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
                      ) : (
                        /* Image Thumbnail */
                        <div className="relative w-full h-full">
                          <img 
                            src={thumbnailItem.url} 
                            alt="Image thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image thumbnail failed to load:', thumbnailItem.url);
                              // Show loading state instead of broken image
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
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
                      <div className="w-4 h-4 rounded bg-muted-foreground/20" />
                    </div>
                  )}
                  
                  {/* Content Type Indicator */}
                  <div className="absolute top-1 left-1">
                    {metadata.isVideoJob ? (
                      <VideoIcon className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ImageIcon className="w-3 h-3 text-green-400" />
                    )}
                  </div>
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