
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PromptEnhancementModal } from "@/components/PromptEnhancementModal";
import { useGeneration } from "@/hooks/useGeneration";
import { useGenerationStatus } from "@/hooks/useGenerationStatus";
import { Play, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface FastVideoGeneratorProps {
  prompt?: string;
  projectId?: string;
  onVideoGenerated: (video: any) => void;
  buttonText?: string;
  autoEnhance?: boolean;
}

export const FastVideoGenerator = ({ 
  prompt: initialPrompt = "",
  projectId,
  onVideoGenerated,
  buttonText = "Generate Fast Video",
  autoEnhance = false
}: FastVideoGeneratorProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);

  const { generateContent, isGenerating, currentJob, error, cancelGeneration } = useGeneration();
  const { data: generationData } = useGenerationStatus(generatedId, 'video_fast');

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

  const handleGenerate = async (finalPrompt?: string) => {
    const promptToUse = finalPrompt || prompt.trim();
    
    if (!promptToUse) {
      toast.error("Please enter a prompt");
      return;
    }

    try {
      await generateContent({
        format: 'video_fast',
        prompt: promptToUse,
        projectId,
        metadata: {
          source: 'fast_video_generator',
          enhanced: !!finalPrompt,
          job_type: 'video_fast'
        }
      });
      
      if (currentJob?.id) {
        setGeneratedId(currentJob.id);
        toast.success("Fast video generation started!");
      }
    } catch (error) {
      toast.error(`Fast video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Quality: <strong>Fast</strong></span>
          <span>Credits: <strong>3</strong></span>
          <span>Time: <strong>1-2 min</strong></span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleEnhanceAndGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="flex-1"
          >
            <Sparkles className="mr-2 h-4 w-4" />
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
                <Play className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>

        {isGenerating && (
          <div className="p-4 bg-blue-50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-800 font-medium">
                Fast Video Generation in Progress
              </p>
              {currentJob?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelGeneration}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Cancel
                </Button>
              )}
            </div>
            <p className="text-xs text-blue-600">
              Generating your video using the fast model. This usually takes 1-2 minutes.
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
          onGenerateWithEnhancement={(data) => {
            setPrompt(data.enhancedPrompt);
            setShowEnhancementModal(false);
          }}
          jobType="video_fast"
          format="video"
          quality="fast"
          generationFormat="video_fast"
        />
      </CardContent>
    </Card>
  );
};
