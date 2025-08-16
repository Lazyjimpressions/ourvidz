import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, HardDrive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StorageUsage {
  total: number;
  used: number;
  images: number;
  videos: number;
}

export const StorageUsageIndicator = () => {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStorageUsage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user's assets count from workspace_assets
        const [imagesResult, videosResult] = await Promise.all([
          supabase
            .from('workspace_assets')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('asset_type', 'image'),
          supabase
            .from('workspace_assets')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('asset_type', 'video')
        ]);

        const imageCount = imagesResult.count || 0;
        const videoCount = videosResult.count || 0;
        
        // Estimate storage usage (rough calculation)
        // Images: ~2MB average, Videos: ~50MB average
        const estimatedImageStorage = imageCount * 2; // MB
        const estimatedVideoStorage = videoCount * 50; // MB
        const totalUsed = estimatedImageStorage + estimatedVideoStorage;
        
        // Assume 1GB free tier limit
        const totalLimit = 1024; // MB
        
        setUsage({
          total: totalLimit,
          used: totalUsed,
          images: imageCount,
          videos: videoCount
        });
      } catch (error) {
        console.error('Failed to fetch storage usage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStorageUsage();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <HardDrive className="h-4 w-4 animate-pulse" />
        <span>Loading storage...</span>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const usagePercentage = Math.min((usage.used / usage.total) * 100, 100);
  const isNearLimit = usagePercentage > 80;
  const isOverLimit = usagePercentage > 100;

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1">
        <HardDrive className="h-4 w-4 text-gray-400" />
        <span className="text-gray-300">Storage</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-20">
          <Progress 
            value={usagePercentage} 
            className="h-2"
            style={{
              '--progress-background': isOverLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#3b82f6'
            } as React.CSSProperties}
          />
        </div>
        <Badge 
          variant={isOverLimit ? "destructive" : isNearLimit ? "secondary" : "outline"}
          className="text-xs"
        >
          {Math.round(usage.used)}MB / {usage.total}MB
        </Badge>
      </div>
      
      <div className="flex items-center gap-1 text-gray-400">
        <Database className="h-3 w-3" />
        <span className="text-xs">
          {usage.images} images, {usage.videos} videos
        </span>
      </div>
    </div>
  );
}; 