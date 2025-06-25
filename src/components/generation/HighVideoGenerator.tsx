
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useGeneration } from "@/hooks/useGeneration";
import { Play, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface HighVideoGeneratorProps {
  prompt?: string;
  projectId?: string;
  onVideoGenerated: (video: any) => void;
  buttonText?: string;
}

export const HighVideoGenerator = ({ 
  prompt: initialPrompt = "",
  projectId,
  onVideoGenerated,
  buttonText = "Generate High Quality Video"
}: HighVideoGeneratorProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const { generate, isGenerating, useGenerationStatus } = useGeneration({
    onSuccess: (data) => {
      setGeneratedId(data.id);
      toast.success("High quality video generation started!");
    },
    onError: (error) => {
      toast.error(`High quality video generation failed: ${error.message}`);
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
        quality: 'high'
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
      quality: 'high',
      prompt: prompt.trim(),
      projectId,
      metadata: {
        source: 'high_video_generator'
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          High Quality Video Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the high-quality video you want to generate..."
            rows={3}
            disabled={isGenerating}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Quality: <strong>High</strong></span>
          <span>Credits: <strong>5</strong></span>
          <span>Time: <strong>3-6 min</strong></span>
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
              Generating High Quality Video...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {buttonText}
            </>
          )}
        </Button>

        {isGenerating && (
          <div className="p-4 bg-purple-50 rounded-lg border">
            <p className="text-sm text-purple-800 font-medium mb-2">
              High Quality Video Generation in Progress
            </p>
            <p className="text-xs text-purple-600">
              Generating your high-quality video using the premium model. This usually takes 3-6 minutes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
