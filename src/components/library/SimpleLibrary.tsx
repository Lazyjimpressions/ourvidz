import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { AssetCard } from "@/components/AssetCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video as VideoIcon } from "lucide-react";

interface SimpleAsset {
  id: string;
  type: 'image' | 'video';
  title: string | null;
  prompt: string;
  thumbnailUrl: string | null;
  url: string | null;
  status: string;
  createdAt: Date;
  metadata: any;
}

const SimpleLibrary = () => {
  const [typeFilter, setTypeFilter] = useState<'image' | 'video'>('image');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Reset page when switching types
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter]);

  // Fetch assets based on type
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['simple-assets', typeFilter, currentPage],
    queryFn: async () => {
      console.log(`🔍 Fetching ${typeFilter}s for page ${currentPage}`);
      
      const offset = (currentPage - 1) * pageSize;
      
      if (typeFilter === 'image') {
        const { data, error } = await supabase
          .from('images')
          .select('id, title, prompt, image_url, thumbnail_url, status, created_at, metadata')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
          
        if (error) {
          console.error('❌ Error fetching images:', error);
          throw error;
        }
        
        return data?.map(item => ({
          id: item.id,
          type: 'image' as const,
          title: item.title,
          prompt: item.prompt,
          thumbnailUrl: item.thumbnail_url || item.image_url,
          url: item.image_url,
          status: item.status,
          createdAt: new Date(item.created_at),
          metadata: item.metadata
        })) || [];
      } else {
        const { data, error } = await supabase
          .from('videos')
          .select('id, title, video_url, thumbnail_url, status, created_at, metadata')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
          
        if (error) {
          console.error('❌ Error fetching videos:', error);
          throw error;
        }
        
        return data?.map(item => ({
          id: item.id,
          type: 'video' as const,
          title: item.title,
          prompt: '', // Videos don't have prompts in this schema
          thumbnailUrl: item.thumbnail_url,
          url: item.video_url,
          status: item.status,
          createdAt: new Date(item.created_at),
          metadata: item.metadata
        })) || [];
      }
    },
    retry: 1
  });

  // Fetch total counts
  const { data: counts } = useQuery({
    queryKey: ['asset-counts'],
    queryFn: async () => {
      const [imageResult, videoResult] = await Promise.all([
        supabase.from('images').select('id', { count: 'exact', head: true }),
        supabase.from('videos').select('id', { count: 'exact', head: true })
      ]);
      
      return {
        images: imageResult.count || 0,
        videos: videoResult.count || 0
      };
    }
  });

  const totalPages = Math.ceil((typeFilter === 'image' ? (counts?.images || 0) : (counts?.videos || 0)) / pageSize);

  if (isLoading) {
    return (
      <OurVidzDashboardLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </OurVidzDashboardLayout>
    );
  }

  if (error) {
    return (
      <OurVidzDashboardLayout>
        <div className="text-center py-8">
          <p className="text-destructive">Error loading assets: {error.message}</p>
          <p className="text-sm text-muted-foreground mt-2">
            This might be a permissions issue. Check if you're logged in and have access to your assets.
          </p>
        </div>
      </OurVidzDashboardLayout>
    );
  }

  return (
    <OurVidzDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Library</h1>
        </div>

        {/* Type Filters */}
        <div className="flex gap-2">
          <Button
            variant={typeFilter === 'image' ? "default" : "outline"}
            onClick={() => setTypeFilter('image')}
            className="gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            Images ({counts?.images || 0})
          </Button>
          <Button
            variant={typeFilter === 'video' ? "default" : "outline"}
            onClick={() => setTypeFilter('video')}
            className="gap-2"
          >
            <VideoIcon className="h-4 w-4" />
            Videos ({counts?.videos || 0})
          </Button>
        </div>

        {/* Assets Grid */}
        {assets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No {typeFilter}s found. Start creating some content!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onSelect={() => {}}
                  onPreview={() => {}}
                  onDelete={() => {}}
                  onDownload={() => {}}
                  isSelected={false}
                  selectionMode={false}
                  isDeleting={false}
                />
              ))}
            </div>

            {/* Simple Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </OurVidzDashboardLayout>
  );
};

export default SimpleLibrary;