
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useGeneration } from "@/hooks/useGeneration";
import { useGenerationStatus } from "@/hooks/useGenerationStatus";
import { Image, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface HighImageGeneratorProps {
  prompt?: string;
  projectId?: string;
  onImagesGenerated: (images: any[]) => void;
  buttonText?: string;
}

export const HighImageGenerator = ({ 
  prompt: initialPrompt = "",
  projectId,
  onImagesGenerated,
  buttonText = "Generate High Quality Image"
}: HighImageGeneratorProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const { generateContent, isGenerating, currentJob, error } = useGeneration();
  const { data: generationData } = useGenerationStatus(generatedId, 'image_high');

  // Check if generation is complete
  if (generationData?.status === 'completed') {
    const imageData = generationData as any;
    if (imageData.image_urls && imageData.image_urls.length > 0) {
      const images = imageData.image_urls.map((url: string, index: number) => ({
        id: `${generatedId}-${index}`,
        url,
        prompt,
        timestamp: new Date(),
        quality: 'high'
      }));
      onImagesGenerated(images);
      setGeneratedId(null);
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    try {
      await generateContent({
        format: 'image_high',
        prompt: prompt.trim(),
        projectId,
        metadata: {
          source: 'high_image_generator'
        }
      });
      
      if (currentJob?.id) {
        setGeneratedId(currentJob.id);
        toast.success("High quality image generation started!");
      }
    } catch (error) {
      toast.error(`High quality image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          High Quality Image Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the high-quality image you want to generate..."
            rows={3}
            disabled={isGenerating}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Quality: <strong>High</strong></span>
          <span>Credits: <strong>2</strong></span>
          <span>Time: <strong>45-90s</strong></span>
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
              Generating High Quality Image...
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
              High Quality Image Generation in Progress
            </p>
            <p className="text-xs text-purple-600">
              Generating your high-quality image using the premium model. This usually takes 45-90 seconds.
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800 font-medium mb-2">
              Generation Error
            </p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
