
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { GenerationService } from "@/lib/services/GenerationService";
import { useGeneration } from "@/hooks/useGeneration";
import { GenerationOptions } from "@/components/GenerationOptions";
import type { GenerationFormat, GenerationQuality } from "@/types/generation";
import { toast } from "sonner";

interface BaseImageGeneratorProps {
  initialPrompt?: string;
  onImageGenerated: (images: any[]) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
  buttonText?: string;
  projectId?: string;
}

export const BaseImageGenerator = ({
  initialPrompt = "",
  onImageGenerated,
  onError,
  disabled = false,
  buttonText = "Generate Image",
  projectId
}: BaseImageGeneratorProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [format, setFormat] = useState<GenerationFormat>('image');
  const [quality, setQuality] = useState<GenerationQuality>('fast');
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const { generate, isGenerating, useGenerationStatus, getEstimatedCredits } = useGeneration({
    onSuccess: (data) => {
      setGeneratedId(data.id);
      toast.success("Generation started successfully!");
    },
    onError: (error) => {
      console.error('Generation failed:', error);
      toast.error(`Generation failed: ${error.message}`);
      onError?.(error);
    }
  });

  const { data: generationData } = useGenerationStatus(generatedId, format);

  // Check if generation is complete and handle both success/error cases
  if (generationData?.status === 'completed' && generatedId) {
    const imageData = generationData as any;
    
    // Handle successful image generation with URLs
    if (imageData.image_urls && Array.isArray(imageData.image_urls)) {
      const imageResults = imageData.image_urls.map((url: string, index: number) => ({
        id: `${generatedId}_${index}`,
        url,
        prompt,
        timestamp: new Date(),
        status: 'completed'
      }));
      
      onImageGenerated(imageResults);
      setGeneratedId(null);
    }
    // Handle URL generation errors
    else if (imageData.url_error) {
      console.error('URL generation error:', imageData.url_error);
      toast.error(`Image ready but URL generation failed: ${imageData.url_error}`);
      onError?.(new Error(imageData.url_error));
      setGeneratedId(null);
    }
    // Handle missing URLs (fallback)
    else {
      console.warn('Generation completed but no image URLs available');
      toast.error("Generation completed but image URLs are not available");
      onError?.(new Error("No image URLs available"));
      setGeneratedId(null);
    }
  }

  // Handle failed generation
  if (generationData?.status === 'failed' && generatedId) {
    const errorMessage = (generationData as any).error_message || "Generation failed";
    console.error('Generation failed:', errorMessage);
    toast.error(`Generation failed: ${errorMessage}`);
    onError?.(new Error(errorMessage));
    setGeneratedId(null);
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    generate({
      format,
      quality,
      prompt: prompt.trim(),
      projectId,
      metadata: {
        source: 'base_generator'
      }
    });
  };

  const estimatedCredits = getEstimatedCredits(format, quality);

  return (
    <div className="space-y-6">
      <GenerationOptions
        selectedFormat={format}
        selectedQuality={quality}
        onFormatChange={setFormat}
        onQualityChange={setQuality}
      />
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to generate..."
            rows={3}
            disabled={disabled || isGenerating}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Estimated cost: {estimatedCredits} credits</span>
          {generationData?.status && (
            <span className="capitalize">Status: {generationData.status}</span>
          )}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={disabled || isGenerating || !prompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="mr-2" size="sm" />
              Generating...
            </>
          ) : (
            buttonText
          )}
        </Button>

        {isGenerating && (
          <div className="p-4 bg-blue-50 rounded-lg border">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Generation in Progress
            </p>
            <p className="text-xs text-blue-600">
              Your {format} is being generated. This usually takes {format === 'image' ? '30-60 seconds' : '2-5 minutes'}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
