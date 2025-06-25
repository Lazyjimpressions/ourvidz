
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useGeneration } from "@/hooks/useGeneration";
import { Play, Zap } from "lucide-react";
import { toast } from "sonner";

interface FastVideoGeneratorProps {
  prompt?: string;
  projectId?: string;
  onVideoGenerated: (video: any) => void;
  buttonText?: string;
}

export const FastVideoGenerator = ({ 
  prompt: initialPrompt = "",
  projectId,
  onVideoGenerated,
  buttonText = "Generate Fast Video"
}: FastVideoGeneratorProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const { generate, isGenerating, useGenerationStatus } = useGeneration({
    onSuccess: (data) => {
      setGeneratedId(data.id);
      toast.success("Fast video generation started!");
    },
    onError: (error) => {
      toast.error(`Fast video generation failed: ${error.message}`);
    }
  });

  const { data: generationData } = useGenerationStatus(generatedId, 'video');

  // Check if generation is complete
  if (generationData?.status === 'completed') {
    const videoData = generationData as any;
    if (videoData.video_url) {
      const video = {
        id: generatedId,
        url: videoData.video_url,
        prompt,
        timestamp: new Date(),
        quality: 'fast'
      };
      onVideoGenerated(video);
      setGeneratedId(null);
    }
  }

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    generate({
      format: 'video',
      quality: 'fast',
      prompt: prompt.trim(),
      projectId,
      metadata: {
        source: 'fast_video_generator'
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Fast Video Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video you want to generate..."
            rows={3}
            disabled={isGenerating}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Quality: <strong>Fast</strong></span>
          <span>Credits: <strong>3</strong></span>
          <span>Time: <strong>1-2 min</strong></span>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="mr-2" size="sm" />
              Generating Fast Video...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              {buttonText}
            </>
          )}
        </Button>

        {isGenerating && (
          <div className="p-4 bg-blue-50 rounded-lg border">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Fast Video Generation in Progress
            </p>
            <p className="text-xs text-blue-600">
              Generating your video using the fast model. This usually takes 1-2 minutes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
