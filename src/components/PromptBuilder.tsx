
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { StyleSelector } from "@/components/StyleSelector";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Wand2, Copy } from "lucide-react";

interface PromptBuilderProps {
  mode: "character" | "general";
  onPromptUpdate: (original: string, enhanced: string) => void;
}

export const PromptBuilder = ({ mode, onPromptUpdate }: PromptBuilderProps) => {
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handlePromptChange = (value: string) => {
    setOriginalPrompt(value);
    onPromptUpdate(value, enhancedPrompt);
  };

  const handleEnhancePrompt = async () => {
    if (!originalPrompt.trim()) return;
    
    setIsEnhancing(true);
    
    // Simulate AI enhancement - in real app, this would call your AI service
    setTimeout(() => {
      const basePrompt = mode === "character" && characterName 
        ? `${characterName}, ${originalPrompt}`
        : originalPrompt;
      
      const styleText = selectedStyles.length > 0 
        ? `, ${selectedStyles.join(", ")}`
        : "";
      
      const enhanced = `${basePrompt}${styleText}, highly detailed, professional quality, cinematic lighting, masterpiece`;
      
      setEnhancedPrompt(enhanced);
      onPromptUpdate(originalPrompt, enhanced);
      setIsEnhancing(false);
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "character" ? "Character Design" : "Image Creation"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "character" && (
          <div className="space-y-2">
            <Label htmlFor="character-name">Character Name</Label>
            <Input
              id="character-name"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Enter character name"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="prompt">
            {mode === "character" ? "Character Description" : "Image Description"}
          </Label>
          <Textarea
            id="prompt"
            value={originalPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={
              mode === "character"
                ? "Describe your character (appearance, clothing, pose, expression)..."
                : "Describe the image you want to create..."
            }
            className="min-h-[100px] resize-none"
          />
        </div>

        <StyleSelector
          mode={mode}
          selectedStyles={selectedStyles}
          onStylesChange={setSelectedStyles}
        />

        <Button
          onClick={handleEnhancePrompt}
          disabled={!originalPrompt.trim() || isEnhancing}
          className="w-full"
        >
          {isEnhancing ? (
            <>
              <LoadingSpinner className="mr-2" size="sm" />
              Enhancing Prompt...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Enhance with AI
            </>
          )}
        </Button>

        {enhancedPrompt && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Enhanced Prompt</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(enhancedPrompt)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border text-sm">
                {enhancedPrompt}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
