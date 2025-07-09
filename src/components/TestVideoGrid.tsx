import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from '@/components/ui/use-toast';

const supabase = createClient(
  'https://ulmdmzhcdwfadbvfpckt.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface TestVideoGridProps {
  jobs: any[];
  onImport: (signedUrl: string, jobId: string, prompt: string) => void;
  mode: 'image' | 'video';
}

const TestVideoGrid = ({ jobs, onImport, mode }: TestVideoGridProps) => {
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const sessionCache = JSON.parse(sessionStorage.getItem('signed_urls') || '{}');
      const updatedCache = { ...sessionCache };
      const result: { [key: string]: string } = {};

      await Promise.all(jobs.map(async (job) => {
        if (mode === 'video' && job.video_url) {
          const bucket = job.metadata?.bucket || 'video_fast';
          const path = job.video_url;
          const key = `${bucket}|${path}`;

          if (sessionCache[key]) {
            result[job.id] = sessionCache[key];
          } else {
            const { data, error } = await supabase
              .storage
              .from(bucket)
              .createSignedUrl(path, 3600);

            if (data?.signedUrl) {
              result[job.id] = data.signedUrl;
              updatedCache[key] = data.signedUrl;
            } else {
              console.warn('Failed to sign video:', key, error);
              toast({ title: 'Video Signing Failed', description: path, variant: 'destructive' });
            }
          }
        }
      }));

      sessionStorage.setItem('signed_urls', JSON.stringify(updatedCache));
      setSignedUrls(result);
    };
    fetchSignedUrls();
  }, [jobs, mode]);

  const handleImport = (url: string, jobId: string, prompt: string) => {
    if (!url) return toast({ title: 'Import Failed', description: 'Missing video URL', variant: 'destructive' });
    onImport(url, jobId, prompt);
    toast({ title: 'Imported to Workspace', description: 'Video added successfully!' });
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No videos found. Generate some content first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {jobs.map((job, index) => {
        const signedUrl = signedUrls[job.id];
        const bucket = job.metadata?.bucket || 'video_fast';

        return (
          <div key={job.id} className="border border-gray-700 rounded p-4">
            <h3 className="text-md font-semibold mb-2">
              Job {index + 1} – Video – {job.metadata?.generation_format || 'fast'}
            </h3>

            <div className="flex gap-4 items-center">
              {signedUrl ? (
                <div className="relative group">
                  <video
                    src={signedUrl}
                    controls
                    className="w-64 h-36 object-cover rounded border border-gray-600"
                    poster={job.thumbnail_url}
                  />
                  <button
                    onClick={() => handleImport(signedUrl, job.id, job.metadata?.prompt || 'No prompt available')}
                    className="absolute bottom-2 right-2 px-2 py-1 text-xs rounded bg-white text-black opacity-0 group-hover:opacity-100 transition"
                  >
                    Import
                  </button>
                </div>
              ) : (
                <div className="w-64 h-36 bg-gray-800 animate-pulse rounded border border-gray-600" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TestVideoGrid;