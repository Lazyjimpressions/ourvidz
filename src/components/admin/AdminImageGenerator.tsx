
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { GenerationService } from "@/lib/services/GenerationService";
import { useGeneration } from "@/hooks/useGeneration";
import { Settings, Zap } from "lucide-react";
import { toast } from "sonner";
import type { GenerationQuality } from "@/types/generation";

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
  const [quality, setQuality] = useState<GenerationQuality>('fast');

  const { generate, isGenerating } = useGeneration({
    onSuccess: (data) => {
      toast.success("Admin image generation started!");
      // For admin testing, we'll simulate immediate completion
      const imageData = {
        id: data.id,
        url: `https://picsum.photos/512/512?random=${Date.now()}`, // Placeholder for testing
        prompt: prompt,
        timestamp: new Date(),
        status: 'completed'
      };
      onImagesGenerated([imageData]);
      onGenerationEnd?.();
    },
    onError: (error) => {
      toast.error(`Admin generation failed: ${error.message}`);
      onGenerationEnd?.();
    }
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    onGenerationStart?.();

    try {
      // Generate using the new unified service
      await generate({
        format: 'image',
        quality,
        prompt: prompt.trim(),
        metadata: {
          source: 'admin_generator',
          mode: mode,
          batchIndex: 1,
          totalBatch: batchSize
        }
      });
    } catch (error) {
      console.error('Admin generation error:', error);
      toast.error(`Generation failed: ${error.message}`);
      onGenerationEnd?.();
    }
  };

  const estimatedCredits = GenerationService.getEstimatedCredits('image', quality);

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
          <span>Quality: <strong>{quality}</strong></span>
          <span>Credits: <strong>{estimatedCredits}</strong></span>
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
              Generating Test Image...
            </>
          ) : (
            `Generate Test Image`
          )}
        </Button>

        {isGenerating && (
          <div className="p-4 bg-blue-50 rounded-lg border">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Admin Test Generation in Progress
            </p>
            <p className="text-xs text-blue-600">
              Generating test image using the new unified generation service...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
