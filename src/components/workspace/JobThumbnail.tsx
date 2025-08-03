import React from 'react';
import { WorkspaceJob } from '@/hooks/useSimplifiedWorkspaceState';
import { Play, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface JobThumbnailProps {
  job: WorkspaceJob;
  isActive: boolean;
  onClick: () => void;
  onImport: () => void;
  isDeleting: boolean;
}

export const JobThumbnail: React.FC<JobThumbnailProps> = ({
  job,
  isActive,
  onClick,
  onImport,
  isDeleting
}) => {
  const thumbnailItem = job.items[0]; // Use first item as thumbnail
  
  // Handle click based on job status
  const handleClick = () => {
    if (job.status === 'pending') {
      // Show message for pending jobs
      return;
    } else if (job.status === 'ready') {
      // Import the job
      onImport();
    } else {
      // For imported jobs, just select
      onClick();
    }
  };

  // Determine visual state based on job status
  const getStatusDisplay = () => {
    switch (job.status) {
      case 'pending':
        return { text: 'Preparing...', className: 'opacity-60' };
      case 'ready':
        return { text: 'Ready', className: 'border-primary/50 ring-1 ring-primary/20' };
      case 'imported':
        return { text: 'Imported', className: '' };
      case 'failed':
        return { text: 'Retry', className: 'border-destructive' };
      default:
        return { text: '', className: '' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div
      className={`relative group cursor-pointer rounded-lg border-2 transition-colors ${
        isActive 
          ? 'border-primary bg-primary/5' 
          : `border-border hover:border-primary/50 ${statusDisplay.className}`
      } ${statusDisplay.className}`}
      onClick={handleClick}
    >
      {/* Thumbnail Image/Video */}
      <div className="aspect-square rounded-md overflow-hidden mb-2">
        {job.type === 'video' ? (
          <div className="relative w-full h-full">
            <video
              src={thumbnailItem?.url}
              className="w-full h-full object-cover"
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="w-6 h-6 text-white" />
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {job.status === 'pending' || !thumbnailItem?.url ? (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <div className="w-4 h-4 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : (
              <img
                src={thumbnailItem.url}
                alt="Job thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('❌ JobThumbnail: Image failed to load:', thumbnailItem.url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Job Info */}
      <div className="p-2">
        <div className="text-xs text-muted-foreground mb-1">
          {new Date(job.createdAt).toLocaleTimeString()}
        </div>
        <div className="text-sm text-foreground font-medium line-clamp-2">
          {job.prompt}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {job.items.length} {job.type}s • {statusDisplay.text}
        </div>
      </div>

      {/* Delete Button (visible on hover) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                className="w-6 h-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Handle delete
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="w-3 h-3 animate-spin rounded-full border-b border-current" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete job</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-2 left-2">
        {job.status === 'ready' && (
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}
        {job.status === 'imported' && (
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        )}
        {job.status === 'failed' && (
          <div className="w-2 h-2 bg-destructive rounded-full" />
        )}
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full" />
      )}
    </div>
  );
};