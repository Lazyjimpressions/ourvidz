import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PortalLayout } from "@/components/PortalLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StandaloneImageGenerator } from "@/components/generation/StandaloneImageGenerator";
import { GeneratedImagesDisplay } from "@/components/GeneratedImagesDisplay";
import { ImageLibrary } from "@/components/ImageLibrary";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>([]);

  const handleImageGenerated = (images: any[]) => {
    // Convert the new format to existing GeneratedImage format
    const convertedImages: GeneratedImage[] = images.map(image => ({
      id: image.id,
      url: image.image_url || image.url,
      prompt: image.prompt,
      enhancedPrompt: image.enhanced_prompt,
      timestamp: new Date(image.created_at || Date.now()),
      isCharacter: activeMode === "character"
    }));
    
    setGeneratedImages(convertedImages);
  };

  const handleImagesSaved = (images: GeneratedImage[]) => {
    setSavedImages(prev => [...images, ...prev]);
    setGeneratedImages([]);
  };

  return (
    <PortalLayout title="Image Creation Studio">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
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
              <h1 className="text-2xl sm:text-3xl font-bold">Image Creation Studio</h1>
              <p className="text-gray-600 mt-1">
                Create stunning images with AI
              </p>
            </div>
          </div>

          <Tabs 
            value={activeMode} 
            onValueChange={(value) => setActiveMode(value as "character" | "general")}
            className="animate-fade-in"
          >
            <div className="flex justify-center mb-8">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="general" className="text-base">
                  General Images
                </TabsTrigger>
                <TabsTrigger value="character" className="text-base">
                  Character Design
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="space-y-8">
              <TabsContent value="general" className="mt-0">
                <StandaloneImageGenerator onImagesGenerated={handleImageGenerated} />
              </TabsContent>
              
              <TabsContent value="character" className="mt-0">
                <StandaloneImageGenerator onImagesGenerated={handleImageGenerated} />
              </TabsContent>

              {/* Generated Images Display */}
              {generatedImages.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="px-3 py-1">
                        Generated
                      </Badge>
                      <h2 className="text-xl font-semibold">Generated Images</h2>
                    </div>
                    <GeneratedImagesDisplay
                      images={generatedImages}
                      mode={activeMode}
                      onImagesSaved={handleImagesSaved}
                    />
                  </div>
                </>
              )}

              {/* Image Library */}
              <Separator />
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Your Image Library</h2>
                <ImageLibrary
                  images={savedImages}
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
