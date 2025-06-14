
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Clock, Coins } from "lucide-react";

interface VideoGenerationStepProps {
  selectedImageId: string | null;
  prompt: string;
  onVideoGenerated: () => void;
}

export const VideoGenerationStep = ({ selectedImageId, prompt, onVideoGenerated }: VideoGenerationStepProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateVideo = async () => {
    if (!selectedImageId) return;
    
    setIsGenerating(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch('http://213.173.110.38:8888/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          num_frames: 24,
          selected_image_id: selectedImageId,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned error: ${response.status} ${response.statusText}`);
      }

      await response.json();
      onVideoGenerated();
    } catch (error) {
      console.error('Video generation error:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const estimatedCost = 25; // tokens
  const estimatedTime = "2-3"; // minutes

  return (
    <div className="space-y-4">
      <Button
        type="button"
        onClick={handleGenerateVideo}
        disabled={!selectedImageId || isGenerating}
        className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto"
      >
        {isGenerating ? (
          <>
            <LoadingSpinner className="mr-2" size="sm" />
            Generating Video...
          </>
        ) : (
          "Generate Video"
        )}
      </Button>

      {selectedImageId && (
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
    </div>
  );
};
