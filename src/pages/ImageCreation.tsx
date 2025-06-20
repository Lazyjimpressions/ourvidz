
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PortalLayout } from "@/components/PortalLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PromptBuilder } from "@/components/PromptBuilder";
import { ImageGenerator } from "@/components/ImageGenerator";
import { ImageLibrary } from "@/components/ImageLibrary";

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  enhancedPrompt?: string;
  style?: string;
  timestamp: Date;
  isCharacter?: boolean;
  characterName?: string;
}

const ImageCreation = () => {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<"character" | "general">("general");
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const handlePromptUpdate = (original: string, enhanced: string) => {
    setCurrentPrompt(original);
    setEnhancedPrompt(enhanced);
  };

  const handleImageGenerated = (images: GeneratedImage[]) => {
    setGeneratedImages(prev => [...images, ...prev]);
  };

  return (
    <PortalLayout title="Image Creation Studio">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex items-center gap-4 mb-6 sm:mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="transition-all duration-200 hover:scale-110"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-semibold">Image Creation Studio</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Create characters and images with AI-powered enhancement
              </p>
            </div>
          </div>

          <Tabs 
            value={activeMode} 
            onValueChange={(value) => setActiveMode(value as "character" | "general")}
            className="animate-fade-in"
          >
            <TabsList className="mb-6 w-full sm:w-auto">
              <TabsTrigger value="general" className="flex-1 sm:flex-none">
                General Images
              </TabsTrigger>
              <TabsTrigger value="character" className="flex-1 sm:flex-none">
                Character Design
              </TabsTrigger>
            </TabsList>

            {/* Mobile Layout */}
            <div className="block lg:hidden space-y-6">
              <TabsContent value="general" className="mt-0">
                <PromptBuilder
                  mode="general"
                  onPromptUpdate={handlePromptUpdate}
                />
              </TabsContent>
              
              <TabsContent value="character" className="mt-0">
                <PromptBuilder
                  mode="character"
                  onPromptUpdate={handlePromptUpdate}
                />
              </TabsContent>

              <ImageGenerator
                prompt={currentPrompt}
                enhancedPrompt={enhancedPrompt}
                mode={activeMode}
                onImagesGenerated={handleImageGenerated}
              />

              <ImageLibrary
                images={generatedImages}
                mode={activeMode}
              />
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:grid lg:grid-cols-3 gap-6">
              {/* Left Panel - Prompt Builder */}
              <div className="lg:col-span-1 space-y-6">
                <TabsContent value="general" className="mt-0">
                  <PromptBuilder
                    mode="general"
                    onPromptUpdate={handlePromptUpdate}
                  />
                </TabsContent>
                
                <TabsContent value="character" className="mt-0">
                  <PromptBuilder
                    mode="character"
                    onPromptUpdate={handlePromptUpdate}
                  />
                </TabsContent>
              </div>

              {/* Center Panel - Image Generator */}
              <div className="lg:col-span-1">
                <ImageGenerator
                  prompt={currentPrompt}
                  enhancedPrompt={enhancedPrompt}
                  mode={activeMode}
                  onImagesGenerated={handleImageGenerated}
                />
              </div>

              {/* Right Panel - Image Library */}
              <div className="lg:col-span-1">
                <ImageLibrary
                  images={generatedImages}
                  mode={activeMode}
                />
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </PortalLayout>
  );
};

export default ImageCreation;
