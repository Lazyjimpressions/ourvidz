
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { GenerationOptions } from "@/components/GenerationOptions";
import { useGeneration } from "@/hooks/useGeneration";
import { Play, Clock } from "lucide-react";
import { toast } from "sonner";
import type { GenerationQuality } from "@/types/generation";

interface SimpleVideoGenerationProps {
  projectId: string;
  scenes?: any[];
  onComplete: (videoUrl?: string) => void;
}

export const SimpleVideoGeneration = ({ 
  projectId, 
  scenes = [], 
  onComplete 
}: SimpleVideoGenerationProps) => {
  const [quality, setQuality] = useState<GenerationQuality>('fast');
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const { generate, isGenerating, useGenerationStatus, getEstimatedCredits } = useGeneration({
    onSuccess: (data) => {
      setGeneratedId(data.id);
      toast.success("Video generation started!");
    },
    onError: (error) => {
      toast.error(`Video generation failed: ${error.message}`);
    }
  });

  const { data: generationData } = useGenerationStatus(generatedId, 'video');

  // Check if generation is complete
  if (generationData?.status === 'completed' && generationData.video_url) {
    onComplete(generationData.video_url);
    setGeneratedId(null);
  }

  const handleStartGeneration = () => {
    const prompt = scenes.length > 0 
      ? scenes.map(scene => scene.description).join('. ')
      : "Generate a short video";

    generate({
      format: 'video',
      quality,
      prompt,
      projectId,
      metadata: {
        source: 'simple_video_generation',
        sceneCount: scenes.length
      }
    });
  };

  const estimatedCredits = getEstimatedCredits('video', quality);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Video Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <GenerationOptions
          selectedFormat="video"
          selectedQuality={quality}
          onFormatChange={() => {}} // Video format is fixed
          onQualityChange={setQuality}
        />

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Generation Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Project ID: {projectId}</div>
            <div>Scenes: {scenes.length}</div>
            <div>Quality: {quality}</div>
            <div>Estimated Credits: {estimatedCredits}</div>
          </div>
        </div>

        {generationData?.status && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span className="capitalize">Status: {generationData.status}</span>
          </div>
        )}

        <Button
          onClick={handleStartGeneration}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="mr-2" size="sm" />
              Generating Video...
            </>
          ) : (
            'Start Video Generation'
          )}
        </Button>

        {isGenerating && (
          <div className="p-4 bg-blue-50 rounded-lg border">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Video Generation in Progress
            </p>
            <p className="text-xs text-blue-600">
              Your video is being generated. This usually takes 2-5 minutes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
