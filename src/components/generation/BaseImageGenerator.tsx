
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ImageGenerationService, GenerationContext } from "@/lib/services/ImageGenerationService";
import { toast } from "sonner";

interface BaseImageGeneratorProps {
  context: GenerationContext;
  initialPrompt?: string;
  onImageGenerated: (images: any[]) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
  buttonText?: string;
}

export const BaseImageGenerator = ({
  context,
  initialPrompt = "",
  onImageGenerated,
  onError,
  disabled = false,
  buttonText = "Generate Image"
}: BaseImageGeneratorProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);

    try {
      const result = await ImageGenerationService.generateImage({
        prompt: prompt.trim(),
        context
      });

      console.log('Image generation result:', result);

      if (context.mode === 'admin') {
        // For admin mode, result contains the image directly
        onImageGenerated([result.image]);
        toast.success("Admin image generated successfully!");
      } else {
        // For regular mode, poll for completion
        const pollForCompletion = () => {
          const pollInterval = setInterval(async () => {
            try {
              const updatedImage = await ImageGenerationService.getImageStatus(result.image.id);
              
              if (updatedImage.status === 'completed' && updatedImage.image_url) {
                clearInterval(pollInterval);
                setIsGenerating(false);
                onImageGenerated([updatedImage]);
                toast.success("Image generated successfully!");
              } else if (updatedImage.status === 'failed') {
                clearInterval(pollInterval);
                setIsGenerating(false);
                throw new Error('Image generation failed');
              }
            } catch (error) {
              clearInterval(pollInterval);
              setIsGenerating(false);
              throw error;
            }
          }, 2000);

          // Timeout after 2 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
            if (isGenerating) {
              setIsGenerating(false);
              toast.error('Image generation timeout. Please try again.');
            }
          }, 120000);
        };

        pollForCompletion();
        toast.success("Image generation started...");
      }

    } catch (error) {
      console.error('Image generation error:', error);
      setIsGenerating(false);
      toast.error(`Image generation failed: ${error.message}`);
      onError?.(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          rows={3}
          disabled={disabled || isGenerating}
        />
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

      {context.mode !== 'admin' && isGenerating && (
        <div className="p-4 bg-blue-50 rounded-lg border">
          <p className="text-sm text-blue-800 font-medium mb-2">
            Image Generation in Progress
          </p>
          <p className="text-xs text-blue-600">
            Your image is being generated. This usually takes 30-60 seconds.
          </p>
        </div>
      )}
    </div>
  );
};
