
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { GenerationOptions } from "@/components/GenerationOptions";
import { useGeneration } from "@/hooks/useGeneration";
import { Clock, Coins, Play } from "lucide-react";
import type { GenerationFormat, GenerationQuality } from "@/types/generation";
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
  const [format, setFormat] = useState<GenerationFormat>('video');
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

  const { data: generationData } = useGenerationStatus(generatedId, format);

  // Check if generation is complete - use type assertion since we know format is 'video'
  if (generationData?.status === 'completed' && generatedId) {
    const videoData = generationData as any; // Type assertion for video data
    if (videoData.video_url) {
      onVideoGenerated();
      setGeneratedId(null);
    }
  }

  const handleStartGeneration = () => {
    if (!selectedImageId && !prompt.trim()) {
      toast.error("Please select an image or provide a prompt");
      return;
    }

    generate({
      format,
      quality,
      prompt: prompt.trim(),
      projectId,
      metadata: {
        source: 'video_generation_step',
        selectedImageId: selectedImageId
      }
    });
  };

  const estimatedCredits = getEstimatedCredits(format, quality);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Generate Your Video</h2>
        <p className="text-gray-600 mb-6">
          {selectedImageId 
            ? "Convert your selected image into a dynamic video"
            : "Generate a video from your prompt"
          }
        </p>
      </div>

      <GenerationOptions
        selectedFormat={format}
        selectedQuality={quality}
        onFormatChange={setFormat}
        onQualityChange={setQuality}
      />

      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Generation Summary</h4>
        <div className="text-sm text-gray-600 space-y-1">
          {selectedImageId && <div>Selected Image: ✓</div>}
          {prompt && <div>Prompt: {prompt.substring(0, 50)}...</div>}
          <div>Quality: {quality}</div>
          <div className="flex items-center gap-1">
            <Coins className="h-4 w-4" />
            <span>Estimated Credits: {estimatedCredits}</span>
          </div>
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
        disabled={isGenerating || (!selectedImageId && !prompt.trim())}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <LoadingSpinner className="mr-2" size="sm" />
            Generating Video...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Start Video Generation ({estimatedCredits} credits)
          </>
        )}
      </Button>

      {isGenerating && (
        <div className="p-4 bg-blue-50 rounded-lg border">
          <p className="text-sm text-blue-800 font-medium mb-2">
            Video Generation in Progress
          </p>
          <p className="text-xs text-blue-600">
            Your video is being generated using functional generation. This usually takes 2-5 minutes for fast quality, 5-10 minutes for high quality.
          </p>
        </div>
      )}
    </div>
  );
};
