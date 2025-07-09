import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from '@/components/ui/use-toast';

const supabase = createClient(
  'https://ulmdmzhcdwfadbvfpckt.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface TestMediaGridProps {
  jobs: any[];
  onImport: (signedUrl: string, jobId: string, prompt: string) => void;
  mode: 'image' | 'video';
}

const TestMediaGrid = ({ jobs, onImport, mode }: TestMediaGridProps) => {
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const sessionCache = JSON.parse(sessionStorage.getItem('signed_urls') || '{}');
      const updatedCache = { ...sessionCache };
      const result: { [key: string]: string } = {};

      await Promise.all(jobs.map(async (job) => {
        if (!Array.isArray(job.image_urls)) return;

        for (const path of job.image_urls) {
          const key = `${job.metadata?.bucket || 'sdxl_image_fast'}|${path}`;

          if (sessionCache[key]) {
            result[path] = sessionCache[key];
          } else {
            const { data, error } = await supabase
              .storage
              .from(job.metadata?.bucket || 'sdxl_image_fast')
              .createSignedUrl(path, 3600);

            if (data?.signedUrl) {
              result[path] = data.signedUrl;
              updatedCache[key] = data.signedUrl;
              const preload = new Image();
              preload.src = data.signedUrl;
            } else {
              console.warn('Failed to sign:', key, error);
              toast({ title: 'Signing Failed', description: path, variant: 'destructive' });
            }
          }
        }
      }));

      sessionStorage.setItem('signed_urls', JSON.stringify(updatedCache));
      setSignedUrls(result);
    };
    fetchSignedUrls();
  }, [jobs]);

  const handleImport = (url: string, jobId: string, prompt: string) => {
    if (!url) return toast({ title: 'Import Failed', description: 'Missing URL', variant: 'destructive' });
    onImport(url, jobId, prompt);
    toast({ title: 'Imported to Workspace', description: 'Image added successfully!' });
  };

  return (
    <div className="space-y-6">
      {jobs.map((job, index) => (
        <div key={job.id} className="border border-gray-700 rounded p-4">
          <h3 className="text-md font-semibold mb-2">
            Job {index + 1} – {job.generation_mode || 'unknown'} – {job.quality || 'fast'}
          </h3>

          <div className="grid grid-cols-3 gap-4">
            {Array.isArray(job.image_urls) && job.image_urls.map((path: string) => {
              const signed = signedUrls[path];
              return (
                <div key={path} className="relative group">
                  {signed ? (
                    <img
                      src={signed}
                      alt="Generated asset"
                      className="rounded border border-gray-600 object-cover h-36 w-full"
                    />
                  ) : (
                    <div className="w-full h-36 bg-gray-800 animate-pulse rounded" />
                  )}

                  <button
                    onClick={() => handleImport(signed, job.id, job.prompt)}
                    disabled={!signed}
                    className="absolute bottom-2 right-2 px-2 py-1 text-xs rounded bg-white text-black opacity-0 group-hover:opacity-100 transition"
                  >
                    Import
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TestMediaGrid;