
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { StyleSelector } from "@/components/StyleSelector";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Wand2, Copy, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { GeneratedImage } from "@/pages/ImageCreation";
import { supabase } from "@/integrations/supabase/client";

interface PromptBuilderProps {
  mode: "character" | "general";
  onPromptUpdate: (original: string, enhanced: string) => void;
  onImagesGenerated: (images: GeneratedImage[]) => void;
  prompt: string;
  enhancedPrompt: string;
}

export const PromptBuilder = ({ 
  mode, 
  onPromptUpdate, 
  onImagesGenerated,
  prompt,
  enhancedPrompt 
}: PromptBuilderProps) => {
  const [originalPrompt, setOriginalPrompt] = useState(prompt);
  const [enhancedPromptState, setEnhancedPromptState] = useState(enhancedPrompt);
  const [characterName, setCharacterName] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancedExpanded, setIsEnhancedExpanded] = useState(false);
  const [progress, setProgress] = useState(0);

  const handlePromptChange = (value: string) => {
    setOriginalPrompt(value);
    onPromptUpdate(value, enhancedPromptState);
  };

  const handleEnhancePrompt = async () => {
    if (!originalPrompt.trim()) return;
    
    setIsEnhancing(true);
    
    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Create a temporary project for enhancement
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: 'Prompt Enhancement',
          original_prompt: originalPrompt,
          media_type: 'image'
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create video record for enhancement job
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert({
          project_id: project.id,
          user_id: user.id,
          status: 'draft',
          duration: 0,
          format: 'text'
        })
        .select()
        .single();

      if (videoError) throw videoError;

      // Queue enhancement job
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType: 'enhance',
          videoId: video.id,
          projectId: project.id,
          metadata: {
            prompt: originalPrompt,
            characterName,
            styles: selectedStyles,
            mode
          }
        }
      });

      if (error) throw error;

      // Poll for completion
      const pollForCompletion = () => {
        const pollInterval = setInterval(async () => {
          try {
            const { data: updatedProject, error: pollError } = await supabase
              .from('projects')
              .select('enhanced_prompt')
              .eq('id', project.id)
              .single();

            if (pollError) throw pollError;

            if (updatedProject.enhanced_prompt) {
              clearInterval(pollInterval);
              setEnhancedPromptState(updatedProject.enhanced_prompt);
              setIsEnhancedExpanded(true);
              onPromptUpdate(originalPrompt, updatedProject.enhanced_prompt);
              setIsEnhancing(false);
              
              toast({
                title: "Prompt Enhanced",
                description: "Your prompt has been enhanced with AI improvements.",
              });
            }
          } catch (error) {
            clearInterval(pollInterval);
            throw error;
          }
        }, 2000);

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
          if (isEnhancing) {
            setIsEnhancing(false);
            throw new Error('Enhancement timeout');
          }
        }, 30000);
      };

      pollForCompletion();

    } catch (error) {
      console.error('Error enhancing prompt:', error);
      setIsEnhancing(false);
      toast({
        title: "Enhancement Failed",
        description: "Failed to enhance prompt. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGenerateImages = async () => {
    if (!originalPrompt.trim()) return;
    
    setIsGenerating(true);
    setProgress(0);
    
    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Create project for image generation
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: mode === "character" ? `Character: ${characterName}` : 'Image Generation',
          original_prompt: originalPrompt,
          enhanced_prompt: enhancedPromptState,
          media_type: 'image'
        })
        .select()
        .single();

      if (projectError) throw projectError;

      const numberOfImages = 4;
      const generationPromises = Array.from({ length: numberOfImages }, async (_, index) => {
        // Create video record for image generation
        const { data: video, error: videoError } = await supabase
          .from('videos')
          .insert({
            project_id: project.id,
            user_id: user.id,
            status: 'draft',
            duration: 0,
            format: 'png'
          })
          .select()
          .single();

        if (videoError) throw videoError;

        // Queue image generation job
        const { data, error } = await supabase.functions.invoke('queue-job', {
          body: {
            jobType: 'preview',
            videoId: video.id,
            projectId: project.id,
            metadata: {
              prompt: enhancedPromptState || originalPrompt,
              variation: index + 1,
              characterName: mode === "character" ? characterName : undefined,
              styles: selectedStyles
            }
          }
        });

        if (error) throw error;

        // Poll for completion
        return new Promise<GeneratedImage>((resolve, reject) => {
          const pollInterval = setInterval(async () => {
            try {
              const { data: updatedVideo, error: pollError } = await supabase
                .from('videos')
                .select('status, preview_url')
                .eq('id', video.id)
                .single();

              if (pollError) throw pollError;

              if (updatedVideo.status === 'preview_ready' && updatedVideo.preview_url) {
                clearInterval(pollInterval);
                resolve({
                  id: video.id,
                  url: updatedVideo.preview_url,
                  prompt: originalPrompt,
                  enhancedPrompt: enhancedPromptState,
                  timestamp: new Date(),
                  isCharacter: mode === "character",
                  characterName: mode === "character" ? characterName : undefined
                });
              } else if (updatedVideo.status === 'failed') {
                clearInterval(pollInterval);
                reject(new Error('Image generation failed'));
              }
            } catch (error) {
              clearInterval(pollInterval);
              reject(error);
            }
          }, 3000);

          // Timeout after 90 seconds
          setTimeout(() => {
            clearInterval(pollInterval);
            reject(new Error('Image generation timeout'));
          }, 90000);
        });
      });

      // Update progress as images complete
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 85));
      }, 1000);

      const results = await Promise.allSettled(generationPromises);
      clearInterval(progressInterval);
      setProgress(100);
      
      const successfulImages: GeneratedImage[] = results
        .filter((result): result is PromiseFulfilledResult<GeneratedImage> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);

      onImagesGenerated(successfulImages);
      setIsGenerating(false);
      setProgress(0);
      
      toast({
        title: "Images Generated",
        description: `Successfully generated ${successfulImages.length} ${mode === "character" ? "character" : "image"} variations using Wan 2.1.`,
      });

    } catch (error) {
      console.error('Error generating images:', error);
      setIsGenerating(false);
      setProgress(0);
      toast({
        title: "Generation Failed",
        description: "Failed to generate images. Please try again.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard.",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5" />
          {mode === "character" ? "Design Your Character" : "Create Your Image"}
        </CardTitle>
        <p className="text-gray-600">
          {mode === "character" 
            ? "Describe your character's appearance, personality, and style"
            : "Describe the image you want to create in detail"
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {mode === "character" && (
          <div className="space-y-2">
            <Label htmlFor="character-name" className="text-base font-medium">
              Character Name
            </Label>
            <Input
              id="character-name"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Give your character a name..."
              className="h-12 text-base transition-all duration-200 focus:scale-[1.01]"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-base font-medium">
            {mode === "character" ? "Character Description" : "Image Description"}
          </Label>
          <Textarea
            id="prompt"
            value={originalPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={
              mode === "character"
                ? "A brave knight with silver armor, standing confidently in a mystical forest with glowing blue eyes and a magical sword..."
                : "A serene mountain landscape at sunset with golden light reflecting on a crystal clear lake..."
            }
            className="min-h-[150px] text-base resize-none transition-all duration-200 focus:scale-[1.01]"
          />
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Be as descriptive as possible for better results</span>
            <span>{originalPrompt.length}/1000</span>
          </div>
        </div>

        <StyleSelector
          mode={mode}
          selectedStyles={selectedStyles}
          onStylesChange={setSelectedStyles}
        />

        <div className="flex gap-3">
          <Button
            onClick={handleEnhancePrompt}
            disabled={!originalPrompt.trim() || isEnhancing}
            variant="outline"
            className="flex-1 h-12 transition-all duration-200 hover:scale-[1.02]"
          >
            {isEnhancing ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Enhancing...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Enhance with AI
              </>
            )}
          </Button>

          <Button
            onClick={handleGenerateImages}
            disabled={!originalPrompt.trim() || isGenerating}
            className="flex-1 h-12 transition-all duration-200 hover:scale-[1.02]"
            size="lg"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Images
              </>
            )}
          </Button>
        </div>

        {isGenerating && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Creating your {mode === "character" ? "character" : "images"} with Wan 2.1...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500 text-center">
              This usually takes 15-30 seconds
            </p>
          </div>
        )}

        {enhancedPromptState && (
          <>
            <Separator />
            <Collapsible open={isEnhancedExpanded} onOpenChange={setIsEnhancedExpanded}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Enhanced Prompt</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(enhancedPromptState)}
                      className="transition-all duration-200 hover:scale-105"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="transition-all duration-200">
                        {isEnhancedExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                
                <CollapsibleContent className="animate-fade-in">
                  <div className="p-4 bg-blue-50 rounded-lg border text-sm">
                    {enhancedPromptState}
                  </div>
                </CollapsibleContent>
                
                {!isEnhancedExpanded && (
                  <div className="p-4 bg-blue-50 rounded-lg border text-sm truncate">
                    {enhancedPromptState.substring(0, 100)}...
                  </div>
                )}
              </div>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
};
