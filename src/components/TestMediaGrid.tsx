import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TestMediaGridProps {
  jobs: any[];
  onImport: (signedUrl: string, jobId: string, prompt: string) => void;
  mode: 'image' | 'video';
}

const TestMediaGrid = ({ jobs, onImport, mode }: TestMediaGridProps) => {
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [loadingPaths, setLoadingPaths] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState<string | null>(null);

  const inferBucketFromJob = (job: any): string => {
    // Primary: Use bucket from metadata if available
    if (job.metadata?.bucket) {
      console.log(`Using bucket from metadata: ${job.metadata.bucket}`);
      return job.metadata.bucket;
    }

    // Fallback logic based on job properties
    const mode = job.generation_mode || '';
    const quality = job.quality || 'fast';
    const modelVariant = job.metadata?.model_variant || '';

    // Enhanced model variants
    if (modelVariant.includes('image7b')) {
      const bucket = quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
      console.log(`Using enhanced bucket for ${modelVariant}: ${bucket}`);
      return bucket;
    }

    // SDXL models
    if (mode.includes('sdxl')) {
      const bucket = quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
      console.log(`Using SDXL bucket: ${bucket}`);
      return bucket;
    }

    // Default buckets
    const bucket = quality === 'high' ? 'image_high' : 'image_fast';
    console.log(`Using default bucket: ${bucket}`);
    return bucket;
  };

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: { [key: string]: string } = {};
      for (const job of jobs) {
        if (mode === 'image') {
          const imageUrls = job.image_urls || [];
          const bucket = inferBucketFromJob(job);
          
          console.log(`Processing job ${job.id} with bucket: ${bucket}, paths:`, imageUrls);
          
          for (const path of imageUrls) {
            try {
              setLoadingPaths((prev) => [...prev, path]);
              console.log(`Attempting to sign URL: bucket=${bucket}, path=${path}`);
              
              const { data, error } = await supabase
                .storage
                .from(bucket)
                .createSignedUrl(path, 3600);
                
              if (!error && data?.signedUrl) {
                urls[path] = data.signedUrl;
                console.log(`Successfully signed URL for ${path}`);
              } else {
                console.warn(`Signed URL failed for bucket=${bucket}, path=${path}:`, error);
                toast({ 
                  title: 'URL Error', 
                  description: `Failed to sign ${path} in ${bucket}`, 
                  variant: 'destructive' 
                });
              }
            } finally {
              setLoadingPaths((prev) => prev.filter((p) => p !== path));
            }
          }
        }
      }
      setSignedUrls(urls);
    };
    
    if (jobs.length > 0) {
      fetchSignedUrls();
    }
  }, [jobs, mode]);

  const handleImport = (url: string, jobId: string, prompt: string) => {
    if (!url) {
      toast({ 
        title: 'Import Failed', 
        description: 'Missing URL', 
        variant: 'destructive' 
      });
      return;
    }
    onImport(url, jobId, prompt);
    toast({ 
      title: 'Imported to Workspace', 
      description: 'Item added successfully!' 
    });
  };

  const handleImportAll = (imageUrls: string[], jobId: string, prompt: string) => {
    setBatchLoading(jobId);
    let imported = 0;
    imageUrls.forEach((path: string) => {
      if (signedUrls[path]) {
        handleImport(signedUrls[path], jobId, prompt);
        imported++;
      }
    });
    if (imported === 0) {
      toast({ 
        title: 'Import Failed', 
        description: 'No images were imported.', 
        variant: 'destructive' 
      });
    }
    setBatchLoading(null);
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No {mode}s found. Generate some content first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {jobs.map((job, index) => {
        const isSDXL = job.generation_mode?.includes('sdxl') || job.image_urls?.length === 6;
        const isWAN = job.generation_mode?.includes('wan') || job.image_urls?.length === 1;

        return (
          <div key={job.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Job {index + 1} – {isSDXL ? 'SDXL' : isWAN ? 'WAN' : 'Unknown'} – Bucket: {inferBucketFromJob(job)}
              </h3>
              <div className="text-sm text-muted-foreground">
                {job.quality || 'fast'} • {new Date(job.created_at).toLocaleDateString()}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {job.prompt}
            </p>

            {mode === 'image' && job.image_urls && (
              <>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {job.image_urls.map((path: string, idx: number) => (
                    <div key={idx} className="relative group flex-shrink-0">
                      <img
                        src={signedUrls[path] || ''}
                        alt={`Image ${idx + 1}`}
                        className={`w-40 h-28 object-cover rounded border border-border transition ${
                          loadingPaths.includes(path) ? 'opacity-50' : ''
                        }`}
                      />
                      {loadingPaths.includes(path) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        </div>
                      )}
                      <button
                        onClick={() => handleImport(signedUrls[path], job.id, job.prompt)}
                        disabled={!signedUrls[path]}
                        className="absolute bottom-1 left-1 right-1 bg-primary text-primary-foreground text-xs py-1 rounded opacity-0 group-hover:opacity-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Import
                      </button>
                    </div>
                  ))}
                </div>

                {isSDXL && job.image_urls.length === 6 && (
                  <div>
                    <button
                      onClick={() => handleImportAll(job.image_urls, job.id, job.prompt)}
                      disabled={batchLoading === job.id}
                      className="text-sm text-primary hover:underline flex items-center gap-2 disabled:opacity-50"
                    >
                      {batchLoading === job.id ? 'Importing...' : 'Import All 6 Images'}
                      {batchLoading === job.id && (
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {mode === 'video' && (
              <div className="w-40 h-28 bg-muted rounded flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Video Preview</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TestMediaGrid;