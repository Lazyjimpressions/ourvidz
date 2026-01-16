import React from 'react';
import { PillFilter } from '@/components/ui/pill-filter';
import { Image, Video, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface CompactLibraryFiltersProps {
  typeFilter: 'all' | 'image' | 'video';
  onTypeFilterChange: (type: 'all' | 'image' | 'video') => void;
  statusFilter: 'all' | 'completed' | 'processing' | 'failed';
  onStatusFilterChange: (status: 'all' | 'completed' | 'processing' | 'failed') => void;
  counts: {
    images: number;
    videos: number;
    completed: number;
    processing: number;
    failed: number;
  };
}

export const CompactLibraryFilters = ({
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  counts
}: CompactLibraryFiltersProps) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
      {/* Type Filters */}
      <div className="flex items-center gap-1">
        <PillFilter
          active={typeFilter === 'all'}
          onClick={() => onTypeFilterChange('all')}
          className="h-8 text-xs px-3"
        >
          All
        </PillFilter>
        <PillFilter
          active={typeFilter === 'image'}
          onClick={() => onTypeFilterChange('image')}
          className="h-8 text-xs gap-1 px-3"
        >
          <Image className="h-3 w-3" />
          {counts.images}
        </PillFilter>
        <PillFilter
          active={typeFilter === 'video'}
          onClick={() => onTypeFilterChange('video')}
          className="h-8 text-xs gap-1 px-3"
        >
          <Video className="h-3 w-3" />
          {counts.videos}
        </PillFilter>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-1">
        <PillFilter
          active={statusFilter === 'all'}
          onClick={() => onStatusFilterChange('all')}
          className="h-8 text-xs px-3"
        >
          All
        </PillFilter>
        <PillFilter
          active={statusFilter === 'completed'}
          onClick={() => onStatusFilterChange('completed')}
          className="h-8 text-xs gap-1 px-3"
        >
          <CheckCircle className="h-3 w-3" />
          {counts.completed}
        </PillFilter>
        {counts.processing > 0 && (
          <PillFilter
            active={statusFilter === 'processing'}
            onClick={() => onStatusFilterChange('processing')}
            className="h-8 text-xs gap-1 px-3"
          >
            <Clock className="h-3 w-3" />
            {counts.processing}
          </PillFilter>
        )}
        {counts.failed > 0 && (
          <PillFilter
            active={statusFilter === 'failed'}
            onClick={() => onStatusFilterChange('failed')}
            className="h-8 text-xs gap-1 px-3"
          >
            <AlertCircle className="h-3 w-3" />
            {counts.failed}
          </PillFilter>
        )}
      </div>
    </div>
  );
};