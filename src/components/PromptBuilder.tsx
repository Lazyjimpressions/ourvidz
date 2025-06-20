
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
    
    // Simulate AI enhancement
    setTimeout(() => {
      const basePrompt = mode === "character" && characterName 
        ? `${characterName}, ${originalPrompt}`
        : originalPrompt;
      
      const styleText = selectedStyles.length > 0 
        ? `, ${selectedStyles.join(", ")}`
        : "";
      
      const enhanced = `${basePrompt}${styleText}, highly detailed, professional quality, cinematic lighting, masterpiece`;
      
      setEnhancedPromptState(enhanced);
      setIsEnhancedExpanded(true);
      onPromptUpdate(originalPrompt, enhanced);
      setIsEnhancing(false);
      
      toast({
        title: "Prompt Enhanced",
        description: "Your prompt has been enhanced with AI improvements.",
      });
    }, 2000);
  };

  const handleGenerateImages = async () => {
    if (!originalPrompt.trim()) return;
    
    setIsGenerating(true);
    setProgress(0);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);
    
    // Simulate image generation
    setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);
      
      const mockImages: GeneratedImage[] = [
        {
          id: `${Date.now()}-1`,
          url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
          prompt: originalPrompt,
          enhancedPrompt: enhancedPromptState,
          timestamp: new Date(),
          isCharacter: mode === "character",
          characterName: mode === "character" ? characterName : undefined
        },
        {
          id: `${Date.now()}-2`, 
          url: "https://images.unsplash.com/photo-1494790108755-2616b612b692?w=400&h=400&fit=crop",
          prompt: originalPrompt,
          enhancedPrompt: enhancedPromptState,
          timestamp: new Date(),
          isCharacter: mode === "character",
          characterName: mode === "character" ? characterName : undefined
        },
        {
          id: `${Date.now()}-3`,
          url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
          prompt: originalPrompt,
          enhancedPrompt: enhancedPromptState,
          timestamp: new Date(),
          isCharacter: mode === "character",
          characterName: mode === "character" ? characterName : undefined
        },
        {
          id: `${Date.now()}-4`,
          url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
          prompt: originalPrompt,
          enhancedPrompt: enhancedPromptState,
          timestamp: new Date(),
          isCharacter: mode === "character",
          characterName: mode === "character" ? characterName : undefined
        }
      ];
      
      onImagesGenerated(mockImages);
      setIsGenerating(false);
      setProgress(0);
      
      toast({
        title: "Images Generated",
        description: `Successfully generated ${mockImages.length} ${mode === "character" ? "character" : "image"} variations.`,
      });
    }, 3000);
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
              <span>Creating your {mode === "character" ? "character" : "images"}...</span>
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
