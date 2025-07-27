
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PromptEnhancementModal } from "@/components/PromptEnhancementModal";
import { useGeneration } from "@/hooks/useGeneration";
import { useGenerationStatus } from "@/hooks/useGenerationStatus";
import { Play, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface HighVideoGeneratorProps {
  prompt?: string;
  projectId?: string;
  onVideoGenerated: (video: any) => void;
  buttonText?: string;
  autoEnhance?: boolean;
}

export const HighVideoGenerator = ({ 
  prompt: initialPrompt = "",
  projectId,
  onVideoGenerated,
  buttonText = "Generate High Quality Video",
  autoEnhance = false
}: HighVideoGeneratorProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);

  const { generateContent, isGenerating, currentJob, error } = useGeneration();
  const { data: generationData } = useGenerationStatus(generatedId, 'video_high');

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

  const handleGenerate = async (finalPrompt?: string) => {
    const promptToUse = finalPrompt || prompt.trim();
    
    if (!promptToUse) {
      toast.error("Please enter a prompt");
      return;
    }

    try {
      await generateContent({
        format: 'video_high',
        prompt: promptToUse,
        projectId,
        metadata: {
          source: 'high_video_generator',
          enhanced: !!finalPrompt,
          job_type: 'video_high'
        }
      });
      
      if (currentJob?.id) {
        setGeneratedId(currentJob.id);
        toast.success("High quality video generation started!");
      }
    } catch (error) {
      toast.error(`High quality video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEnhanceAndGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    setShowEnhancementModal(true);
  };

  const handleEnhancementComplete = (enhancedPrompt: string) => {
    setPrompt(enhancedPrompt);
    setShowEnhancementModal(false);
    if (autoEnhance) {
      handleGenerate(enhancedPrompt);
    }
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

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Quality: <strong>High</strong></span>
          <span>Credits: <strong>5</strong></span>
          <span>Time: <strong>3-6 min</strong></span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleEnhanceAndGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="flex-1"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Enhance & Generate
          </Button>
          
          <Button
            onClick={() => handleGenerate()}
            disabled={isGenerating || !prompt.trim()}
            className="flex-1"
            size="lg"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>

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

        {error && (
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-sm text-destructive font-medium mb-2">
              Generation Error
            </p>
            <p className="text-xs text-destructive/80">{error}</p>
          </div>
        )}

        <PromptEnhancementModal
          isOpen={showEnhancementModal}
          onClose={() => setShowEnhancementModal(false)}
          originalPrompt={prompt}
          onAccept={handleEnhancementComplete}
          jobType="video_high"
          format="video_high"
          quality="high"
        />
      </CardContent>
    </Card>
  );
};
