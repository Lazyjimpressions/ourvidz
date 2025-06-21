import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VideoGenerationProgress } from '@/components/VideoGenerationProgress';
import { generateVideo } from '@/lib/videoGeneration';
import { useToast } from '@/hooks/use-toast';
import { Play, Settings, Wand2, Clock } from 'lucide-react';

interface EnhancedVideoGenerationProps {
  projectId: string;
  scenes?: any[];
  onComplete?: (videoUrl: string) => void;
}

export const EnhancedVideoGeneration: React.FC<EnhancedVideoGenerationProps> = ({
  projectId,
  scenes = [],
  onComplete
}) => {
  const [duration, setDuration] = useState([15]);
  const [resolution, setResolution] = useState('720p');
  const [format, setFormat] = useState('mp4');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const { toast } = useToast();

  // Configuration options

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      
      const result = await generateVideo({
        projectId,
        duration: duration[0],
        resolution,
        format
      });

      setCurrentJob(result.job);
      setCurrentVideo(result.video);

      toast({
        title: "Video Generation Started",
        description: "Your video is being generated. This may take a few minutes.",
      });

    } catch (error) {
      console.error('Error starting video generation:', error);
      toast({
        title: "Error",
        description: "Failed to start video generation. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleVideoComplete = (videoUrl: string) => {
    setIsGenerating(false);
    if (onComplete) {
      onComplete(videoUrl);
    }
    toast({
      title: "Video Ready!",
      description: "Your video has been generated successfully.",
    });
  };

  const handleVideoError = (error: string) => {
    setIsGenerating(false);
    toast({
      title: "Generation Failed",
      description: error,
      variant: "destructive",
    });
  };

  if (isGenerating && currentJob) {
    return (
      <VideoGenerationProgress
        jobId={currentJob.id}
        videoId={currentVideo?.id}
        onComplete={handleVideoComplete}
        onError={handleVideoError}
      />
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Wand2 className="h-5 w-5" />
          Enhanced Video Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Duration: {duration[0]} seconds</label>
            <Slider
              value={duration}
              onValueChange={setDuration}
              max={30}
              min={5}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5s</span>
              <span>15s</span>
              <span>30s</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution</label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">480p (SD)</SelectItem>
                  <SelectItem value="720p">720p (HD)</SelectItem>
                  <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4</SelectItem>
                  <SelectItem value="webm">WebM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scenes.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Scenes to Generate ({scenes.length})</label>
              <div className="flex flex-wrap gap-2">
                {scenes.map((scene, index) => (
                  <Badge key={index} variant="secondary">
                    Scene {scene.scene_number}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Estimated generation time: 2-5 minutes</span>
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || scenes.length === 0}
            className="w-full"
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Video'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
