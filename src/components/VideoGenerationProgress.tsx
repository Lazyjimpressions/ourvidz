
import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Eye, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { queuePreviewJob, queueVideoJob } from '@/lib/videoGeneration';

interface VideoGenerationProgressProps {
  videoId: string;
  onComplete?: (videoUrl: string) => void;
  onError?: (error: string) => void;
}

type VideoStatus = 'draft' | 'processing' | 'preview_ready' | 'completed' | 'failed';
type CurrentStage = 'enhance' | 'preview' | 'video' | 'completed' | 'failed';

export const VideoGenerationProgress: React.FC<VideoGenerationProgressProps> = ({
  videoId,
  onComplete,
  onError,
}) => {
  const [status, setStatus] = useState<VideoStatus>('draft');
  const [currentStage, setCurrentStage] = useState<CurrentStage>('enhance');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Starting video generation...');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) return;

    // Set up real-time subscription for video updates
    const videoSubscription = supabase
      .channel('video-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'videos',
        filter: `id=eq.${videoId}`
      }, (payload) => {
        console.log('Video update received:', payload);
        const newVideo = payload.new as any;
        setStatus(newVideo.status);
        if (newVideo.preview_url) setPreviewUrl(newVideo.preview_url);
        if (newVideo.video_url) setVideoUrl(newVideo.video_url);
        
        updateStageFromStatus(newVideo.status);
      })
      .subscribe();

    // Set up real-time subscription for job updates
    const jobSubscription = supabase
      .channel('job-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `video_id=eq.${videoId}`
      }, (payload) => {
        console.log('Job update received:', payload);
        const job = payload.new as any;
        
        if (job.status === 'completed' && job.job_type === 'enhance') {
          if (job.metadata?.enhanced_prompt) {
            setEnhancedPrompt(job.metadata.enhanced_prompt);
            handleEnhanceComplete(job.metadata.enhanced_prompt);
          }
        }
        
        if (job.status === 'failed') {
          setError(job.error_message || 'Job failed');
          setCurrentStage('failed');
          if (onError) onError(job.error_message || 'Job failed');
        }
      })
      .subscribe();

    // Initial status check
    checkInitialStatus();

    return () => {
      supabase.removeChannel(videoSubscription);
      supabase.removeChannel(jobSubscription);
    };
  }, [videoId]);

  const checkInitialStatus = async () => {
    try {
      const { data: video, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (error) throw error;
      
      setStatus(video.status);
      if (video.preview_url) setPreviewUrl(video.preview_url);
      if (video.video_url) setVideoUrl(video.video_url);
      
      updateStageFromStatus(video.status);
    } catch (error) {
      console.error('Error checking initial status:', error);
    }
  };

  const updateStageFromStatus = (videoStatus: string) => {
    switch (videoStatus) {
      case 'draft':
        setCurrentStage('enhance');
        setProgress(10);
        setMessage('Enhancing your prompt...');
        break;
      case 'processing':
        setCurrentStage('preview');
        setProgress(40);
        setMessage('Generating preview image...');
        break;
      case 'preview_ready':
        setCurrentStage('preview');
        setProgress(60);
        setMessage('Preview ready! Review and continue to video generation.');
        break;
      case 'completed':
        setCurrentStage('completed');
        setProgress(100);
        setMessage('Video generation completed!');
        break;
      case 'failed':
        setCurrentStage('failed');
        setProgress(0);
        setMessage('Generation failed');
        break;
    }
  };

  const handleEnhanceComplete = async (prompt: string) => {
    try {
      console.log('Starting preview generation with enhanced prompt:', prompt);
      await queuePreviewJob(videoId, prompt);
      
      // Update video status to processing
      await supabase
        .from('videos')
        .update({ status: 'processing' })
        .eq('id', videoId);
        
    } catch (error) {
      console.error('Error starting preview generation:', error);
      setError('Failed to start preview generation');
    }
  };

  const handleGenerateVideo = async () => {
    if (!previewUrl) return;
    
    try {
      console.log('Starting final video generation');
      setProgress(80);
      setMessage('Generating final video...');
      
      await queueVideoJob(videoId, previewUrl);
    } catch (error) {
      console.error('Error starting video generation:', error);
      setError('Failed to start video generation');
    }
  };

  const getStatusIcon = () => {
    switch (currentStage) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  if (currentStage === 'completed' && videoUrl && onComplete) {
    onComplete(videoUrl);
    return null;
  }

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
        
        {error && (
          <p className="text-sm text-center text-red-500">
            {error}
          </p>
        )}
        
        {previewUrl && currentStage === 'preview' && status === 'preview_ready' && (
          <div className="space-y-3">
            <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
            <Button 
              onClick={handleGenerateVideo}
              className="w-full"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Continue to Video Generation
            </Button>
          </div>
        )}
        
        {(currentStage === 'enhance' || currentStage === 'preview') && status !== 'preview_ready' && (
          <p className="text-xs text-center text-muted-foreground">
            This may take a few minutes...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
