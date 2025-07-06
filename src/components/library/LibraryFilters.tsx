import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Image as ImageIcon, 
  Video as VideoIcon,
  CheckCircle,
  Clock,
  XCircle,
  Zap,
  Sparkles
} from "lucide-react";

interface LibraryFiltersProps {
  typeFilter: 'all' | 'image' | 'video';
  onTypeFilterChange: (type: 'all' | 'image' | 'video') => void;
  statusFilter: 'all' | 'completed' | 'processing' | 'failed';
  onStatusFilterChange: (status: 'all' | 'completed' | 'processing' | 'failed') => void;
  qualityFilter: 'all' | 'fast' | 'high';
  onQualityFilterChange: (quality: 'all' | 'fast' | 'high') => void;
  counts: {
    total: number;
    images: number;
    videos: number;
    completed: number;
    processing: number;
    failed: number;
    fast: number;
    high: number;
  };
}

export const LibraryFilters = ({
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  qualityFilter,
  onQualityFilterChange,
  counts
}: LibraryFiltersProps) => {
  return (
    <div className="space-y-3">
      {/* Type Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={typeFilter === 'all' ? "default" : "outline"}
          size="sm"
          onClick={() => onTypeFilterChange('all')}
          className="border-gray-600"
        >
          All ({counts.total})
        </Button>
        <Button
          variant={typeFilter === 'image' ? "default" : "outline"}
          size="sm"
          onClick={() => onTypeFilterChange('image')}
          className="border-gray-600"
        >
          <ImageIcon className="h-3 w-3 mr-1" />
          Images ({counts.images})
        </Button>
        <Button
          variant={typeFilter === 'video' ? "default" : "outline"}
          size="sm"
          onClick={() => onTypeFilterChange('video')}
          className="border-gray-600"
        >
          <VideoIcon className="h-3 w-3 mr-1" />
          Videos ({counts.videos})
        </Button>
      </div>

      {/* Status and Quality Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Status */}
        <div className="flex gap-1">
          <Button
            variant={statusFilter === 'all' ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusFilterChange('all')}
            className="border-gray-600 text-xs"
          >
            All Status
          </Button>
          <Button
            variant={statusFilter === 'completed' ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusFilterChange('completed')}
            className="border-gray-600 text-xs"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Done ({counts.completed})
          </Button>
          {counts.processing > 0 && (
            <Button
              variant={statusFilter === 'processing' ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusFilterChange('processing')}
              className="border-gray-600 text-xs"
            >
              <Clock className="h-3 w-3 mr-1" />
              Working ({counts.processing})
            </Button>
          )}
          {counts.failed > 0 && (
            <Button
              variant={statusFilter === 'failed' ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusFilterChange('failed')}
              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white text-xs"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Failed ({counts.failed})
            </Button>
          )}
        </div>

        {/* Quality */}
        <div className="flex gap-1">
          <Button
            variant={qualityFilter === 'all' ? "default" : "outline"}
            size="sm"
            onClick={() => onQualityFilterChange('all')}
            className="border-gray-600 text-xs"
          >
            All Quality
          </Button>
          <Button
            variant={qualityFilter === 'fast' ? "default" : "outline"}
            size="sm"
            onClick={() => onQualityFilterChange('fast')}
            className="border-gray-600 text-xs"
          >
            <Zap className="h-3 w-3 mr-1" />
            Fast ({counts.fast})
          </Button>
          <Button
            variant={qualityFilter === 'high' ? "default" : "outline"}
            size="sm"
            onClick={() => onQualityFilterChange('high')}
            className="border-gray-600 text-xs"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            HD ({counts.high})
          </Button>
        </div>
      </div>
    </div>
  );
};