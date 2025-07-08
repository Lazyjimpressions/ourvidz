import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';

interface WorkspaceAsset {
  id: string;
  url: string;
  jobId: string;
  prompt: string;
}

interface TestMediaGridProps {
  jobs: any[];
  onImport: (assets: WorkspaceAsset[]) => void;
  mode: 'image' | 'video';
}

const TestMediaGrid = ({ jobs, onImport, mode }: TestMediaGridProps) => {
  const { getSignedUrl } = useSignedImageUrls();

  const handleImportJob = async (job: any) => {
    try {
      if (mode === 'image') {
        // Handle SDXL jobs (6 images) and WAN jobs (1 image)
        const imageUrls = job.image_urls as string[] | null;
        
        if (imageUrls && Array.isArray(imageUrls)) {
          // SDXL job with multiple images
          const assets: WorkspaceAsset[] = [];
          
          for (let i = 0; i < imageUrls.length; i++) {
            const imageUrl = imageUrls[i];
            if (imageUrl) {
              const signedUrl = await getSignedUrl(imageUrl, job.generation_mode || 'sdxl_image_fast');
              if (signedUrl) {
                assets.push({
                  id: `${job.id}_${i}`,
                  url: signedUrl,
                  jobId: job.id,
                  prompt: job.prompt
                });
              }
            }
          }
          
          if (assets.length > 0) {
            onImport(assets);
            console.log(`Imported ${assets.length} images from SDXL job ${job.id}`);
          }
        } else if (job.image_url) {
          // WAN job with single image
          const signedUrl = await getSignedUrl(job.image_url, job.generation_mode || 'image_fast');
          if (signedUrl) {
            onImport([{
              id: job.id,
              url: signedUrl,
              jobId: job.id,
              prompt: job.prompt
            }]);
            console.log(`Imported 1 image from WAN job ${job.id}`);
          }
        }
      } else {
        // Handle video jobs
        const videoUrl = job.signed_url || job.video_url;
        if (videoUrl) {
          onImport([{
            id: job.id,
            url: videoUrl,
            jobId: job.id,
            prompt: job.prompt
          }]);
          console.log(`Imported 1 video from job ${job.id}`);
        }
      }
    } catch (error) {
      console.error('Error importing job:', error);
    }
  };

  const renderJobPreview = (job: any) => {
    if (mode === 'image') {
      const imageUrls = job.image_urls as string[] | null;
      
      if (imageUrls && Array.isArray(imageUrls)) {
        // SDXL job - show first image with count badge
        return (
          <div className="relative">
            <img
              src={imageUrls[0]}
              alt="Job preview"
              className="w-full aspect-square object-cover rounded-lg"
            />
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
              {imageUrls.length} images
            </div>
          </div>
        );
      } else if (job.image_url) {
        // WAN job - show single image
        return (
          <img
            src={job.image_url}
            alt="Job preview"
            className="w-full aspect-square object-cover rounded-lg"
          />
        );
      }
    } else {
      // Video preview (placeholder for now)
      return (
        <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Video</p>
        </div>
      );
    }
    
    return (
      <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No preview</p>
      </div>
    );
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No {mode}s found. Generate some content first!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {jobs.map((job) => (
        <Card key={job.id} className="overflow-hidden">
          <CardContent className="p-4">
            {renderJobPreview(job)}
            <div className="mt-3 space-y-1">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {job.prompt}
              </p>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{job.quality || 'fast'}</span>
                <span>{new Date(job.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <Button 
              onClick={() => handleImportJob(job)}
              className="w-full"
              size="sm"
            >
              Import to Workspace
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default TestMediaGrid;