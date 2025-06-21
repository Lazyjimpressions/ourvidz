
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Download, Share } from "lucide-react";
import { VideoConfig } from "./VideoConfiguration";
import { uploadFinalVideo, getFinalVideoUrl } from "@/lib/storage";
import { toast } from "sonner";

interface SceneImage {
  sceneId: string;
  imageUrl: string;
  approved: boolean;
}

interface EnhancedVideoGenerationProps {
  config: VideoConfig;
  sceneImages: SceneImage[];
  onVideoGenerated: () => void;
}

export const EnhancedVideoGeneration = ({ 
  config, 
  sceneImages, 
  onVideoGenerated 
}: EnhancedVideoGenerationProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentScene, setCurrentScene] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
    setIsGenerating(true);
    setProgress(0);
    setCurrentScene(0);
    setGenerationError(null);

    try {
      // Simulate scene-by-scene video generation
      for (let i = 0; i < sceneImages.length; i++) {
        setCurrentScene(i + 1);
        setProgress(((i + 1) / sceneImages.length) * 90); // Leave 10% for final assembly
        
        // Simulate processing time per scene
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log(`Processing scene ${i + 1}...`);
      }

      // Simulate final video assembly
      setCurrentScene(0);
      setProgress(95);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create a mock video file for demonstration
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create a simple video frame
        const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
        gradient.addColorStop(0, '#8B5CF6');
        gradient.addColorStop(1, '#3B82F6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1280, 720);
        
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Generated Video', 640, 360);
      }

      // Convert canvas to blob and upload as video (this is a mock - in real app you'd generate actual video)
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'generated-video.mp4', { type: 'video/mp4' });
          const projectId = (config as any).projectId || 'demo-project';
          
          const uploadResult = await uploadFinalVideo(projectId, file);
          
          if (uploadResult.error) {
            throw uploadResult.error;
          }

          if (uploadResult.data) {
            const signedVideoUrl = await getFinalVideoUrl(uploadResult.data.path);
            setVideoUrl(signedVideoUrl || "/placeholder.svg");
            setProgress(100);
            
            toast.success("Video generated successfully!");
            onVideoGenerated();
          }
        }
      }, 'image/png'); // Mock as image for demo - real implementation would generate video

    } catch (error) {
      console.error('Video generation error:', error);
      setGenerationError('Failed to generate video. Please try again.');
      toast.error("Video generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (videoUrl) {
      try {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'generated-video.mp4';
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success("Download started");
      } catch (error) {
        console.error('Download error:', error);
        toast.error("Download failed");
      }
    }
  };

  const handleShare = () => {
    if (videoUrl) {
      navigator.clipboard.writeText(videoUrl).then(() => {
        toast.success("Video URL copied to clipboard");
      }).catch(() => {
        toast.error("Failed to copy URL");
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Video Generation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="text-sm font-medium">Video Specifications</div>
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
            <div>Duration: {config.duration} seconds</div>
            <div>Scenes: {config.sceneCount}</div>
            <div>Resolution: 720p</div>
            <div>Frame Rate: 16 fps</div>
          </div>
        </div>

        {generationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {generationError}
          </div>
        )}

        {!videoUrl && (
          <div className="space-y-4">
            {isGenerating ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm">
                    {currentScene > 0 
                      ? `Processing scene ${currentScene} of ${sceneImages.length}...`
                      : 'Assembling final video...'
                    }
                  </span>
                </div>
                <Progress value={progress} className="w-full" />
                <div className="text-xs text-gray-600 text-center">
                  This may take a few minutes. Please don't close this tab.
                </div>
              </div>
            ) : (
              <Button 
                onClick={handleGenerateVideo}
                className="w-full"
                size="lg"
              >
                Generate Final Video ({config.estimatedCost} tokens)
              </Button>
            )}
          </div>
        )}

        {videoUrl && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Video Generated Successfully!</span>
            </div>

            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <video 
                src={videoUrl}
                controls
                className="w-full h-full rounded-lg"
                poster="/placeholder.svg"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={handleShare} variant="outline" className="flex-1">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
