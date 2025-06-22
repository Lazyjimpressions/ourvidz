
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Clock, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoGenerationStepProps {
  selectedImageId: string | null;
  prompt: string;
  projectId?: string;
  onVideoGenerated: () => void;
}

export const VideoGenerationStep = ({ 
  selectedImageId, 
  prompt, 
  projectId,
  onVideoGenerated 
}: VideoGenerationStepProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateVideo = async () => {
    if (!selectedImageId || !projectId) {
      toast.error('Missing required data for video generation');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Create video record for final video generation
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert({
          project_id: projectId,
          user_id: user.id,
          status: 'draft',
          duration: 5, // Default 5 second video
          format: 'mp4',
          reference_image_url: selectedImageId
        })
        .select()
        .single();

      if (videoError) throw videoError;

      // Queue video generation job using existing infrastructure
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType: 'video',
          videoId: video.id,
          projectId: projectId,
          metadata: {
            prompt: prompt,
            referenceImageId: selectedImageId,
            duration: 5
          }
        }
      });

      if (error) throw error;

      console.log('Video generation job queued successfully:', data);

      // Poll for completion - video generation takes longer (up to 6 minutes)
      const pollForCompletion = () => {
        const pollInterval = setInterval(async () => {
          try {
            const { data: updatedVideo, error: pollError } = await supabase
              .from('videos')
              .select('status, video_url, thumbnail_url')
              .eq('id', video.id)
              .single();

            if (pollError) throw pollError;

            console.log(`Video generation status:`, updatedVideo.status);

            if (updatedVideo.status === 'completed' && updatedVideo.video_url) {
              clearInterval(pollInterval);
              setIsGenerating(false);
              toast.success('Video generated successfully!');
              onVideoGenerated();
            } else if (updatedVideo.status === 'failed') {
              clearInterval(pollInterval);
              setIsGenerating(false);
              throw new Error('Video generation failed');
            }
          } catch (error) {
            clearInterval(pollInterval);
            setIsGenerating(false);
            throw error;
          }
        }, 5000); // Poll every 5 seconds for videos

        // Timeout after 6 minutes (360 seconds)
        setTimeout(() => {
          clearInterval(pollInterval);
          if (isGenerating) {
            setIsGenerating(false);
            toast.error('Video generation timeout. Please try again.');
          }
        }, 360000);
      };

      pollForCompletion();
      toast.success('Video generation started. This may take up to 6 minutes...');

    } catch (error) {
      console.error('Video generation error:', error);
      setIsGenerating(false);
      toast.error(`Video generation failed: ${error.message}`);
    }
  };

  const estimatedCost = 25; // tokens
  const estimatedTime = "2-6"; // minutes

  return (
    <div className="space-y-4">
      <Button
        type="button"
        onClick={handleGenerateVideo}
        disabled={!selectedImageId || !projectId || isGenerating}
        className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto"
      >
        {isGenerating ? (
          <>
            <LoadingSpinner className="mr-2" size="sm" />
            Generating Video...
          </>
        ) : (
          "Generate Video with Wan 2.1"
        )}
      </Button>

      {selectedImageId && projectId && (
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Coins className="h-4 w-4 text-blue-500" />
            <span>Cost: {estimatedCost} tokens</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-green-500" />
            <span>Time: {estimatedTime} minutes</span>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="p-4 bg-blue-50 rounded-lg border">
          <p className="text-sm text-blue-800 font-medium mb-2">
            Video Generation in Progress
          </p>
          <p className="text-xs text-blue-600">
            Your video is being created with Wan 2.1. This process can take up to 6 minutes. 
            You can safely navigate away - we'll notify you when it's complete.
          </p>
        </div>
      )}
    </div>
  );
};
