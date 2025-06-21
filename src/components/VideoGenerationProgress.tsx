
import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VideoGenerationProgressProps {
  jobId?: string;
  videoId?: string;
  onComplete?: (videoUrl: string) => void;
  onError?: (error: string) => void;
}

export const VideoGenerationProgress: React.FC<VideoGenerationProgressProps> = ({
  jobId,
  videoId,
  onComplete,
  onError,
}) => {
  const [status, setStatus] = useState<'queued' | 'processing' | 'completed' | 'failed'>('queued');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Initializing video generation...');

  useEffect(() => {
    if (!jobId && !videoId) return;

    const checkJobStatus = async () => {
      try {
        let query = supabase.from('jobs').select('*');
        
        if (jobId) {
          query = query.eq('id', jobId);
        } else if (videoId) {
          query = query.eq('video_id', videoId);
        }

        const { data: jobs, error } = await query.single();

        if (error) {
          console.error('Error fetching job status:', error);
          return;
        }

        if (jobs) {
          setStatus(jobs.status);
          
          switch (jobs.status) {
            case 'queued':
              setProgress(10);
              setMessage('Job queued for processing...');
              break;
            case 'processing':
              setProgress(50);
              setMessage('Generating your video...');
              break;
            case 'completed':
              setProgress(100);
              setMessage('Video generation completed!');
              if (onComplete && jobs.metadata?.video_url) {
                onComplete(jobs.metadata.video_url);
              }
              break;
            case 'failed':
              setProgress(0);
              setMessage('Video generation failed');
              if (onError) {
                onError(jobs.error_message || 'Unknown error occurred');
              }
              break;
          }
        }
      } catch (error) {
        console.error('Error checking job status:', error);
      }
    };

    // Check status immediately
    checkJobStatus();

    // Set up polling every 5 seconds
    const interval = setInterval(checkJobStatus, 5000);

    return () => clearInterval(interval);
  }, [jobId, videoId, onComplete, onError]);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {getStatusIcon()}
          Video Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-center text-muted-foreground">
          {message}
        </p>
        {status === 'processing' && (
          <p className="text-xs text-center text-muted-foreground">
            This may take a few minutes...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
