
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ImageGenerationService, GenerationContext } from "@/lib/services/ImageGenerationService";
import { Settings, Zap } from "lucide-react";
import { toast } from "sonner";

interface AdminImageGeneratorProps {
  mode?: "character" | "general";
  batchSize?: number;
  onImagesGenerated: (images: any[]) => void;
  onGenerationStart?: () => void;
  onGenerationEnd?: () => void;
}

export const AdminImageGenerator = ({ 
  mode = "general",
  batchSize = 1,
  onImagesGenerated,
  onGenerationStart,
  onGenerationEnd
}: AdminImageGeneratorProps) => {
  const [prompt, setPrompt] = useState("A beautiful landscape with mountains and a lake at sunset");
  const [isGenerating, setIsGenerating] = useState(false);

  const context: GenerationContext = {
    mode: 'admin'
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    onGenerationStart?.();

    try {
      const generatedImages = [];

      // Generate images in batch
      for (let i = 0; i < batchSize; i++) {
        try {
          const result = await ImageGenerationService.generateImage({
            prompt: prompt.trim(),
            context,
            metadata: {
              batchIndex: i + 1,
              totalBatch: batchSize,
              mode: mode
            }
          });

          console.log('Admin image generation result:', result);

          // For admin mode, result contains the image directly
          if (result && result.image) {
            generatedImages.push({
              id: `admin-${Date.now()}-${i}`,
              url: result.image.url || result.image,
              prompt: prompt,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error(`Error generating image ${i + 1}:`, error);
          toast.error(`Failed to generate image ${i + 1}: ${error.message}`);
        }
      }

      if (generatedImages.length > 0) {
        onImagesGenerated(generatedImages);
        toast.success(`Successfully generated ${generatedImages.length} out of ${batchSize} images!`);
      } else {
        toast.error("Failed to generate any images");
      }

    } catch (error) {
      console.error('Batch generation error:', error);
      toast.error(`Generation failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
      onGenerationEnd?.();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Admin Image Generator
          <Zap className="h-4 w-4 text-yellow-500" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Test Prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            rows={3}
            disabled={isGenerating}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Mode: <strong>{mode}</strong></span>
          <span>Batch: <strong>{batchSize} image{batchSize > 1 ? 's' : ''}</strong></span>
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
              Generating {batchSize} Image{batchSize > 1 ? 's' : ''}...
            </>
          ) : (
            `Generate ${batchSize} Test Image${batchSize > 1 ? 's' : ''}`
          )}
        </Button>

        {isGenerating && (
          <div className="p-4 bg-blue-50 rounded-lg border">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Admin Test Generation in Progress
            </p>
            <p className="text-xs text-blue-600">
              Generating {batchSize} image{batchSize > 1 ? 's' : ''} for testing. This may take a moment...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
