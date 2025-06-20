
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PortalLayout } from "@/components/PortalLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PromptBuilder } from "@/components/PromptBuilder";
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
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>([]);
  const [currentStep, setCurrentStep] = useState<"create" | "generate" | "save">("create");

  const handlePromptUpdate = (original: string, enhanced: string) => {
    setCurrentPrompt(original);
    setEnhancedPrompt(enhanced);
    setCurrentStep(original ? "generate" : "create");
  };

  const handleImageGenerated = (images: GeneratedImage[]) => {
    setGeneratedImages(images);
    setCurrentStep("save");
  };

  const handleImagesSaved = (images: GeneratedImage[]) => {
    setSavedImages(prev => [...images, ...prev]);
    setGeneratedImages([]);
    setCurrentStep("create");
  };

  const steps = [
    { id: "create", label: "Create Prompt", active: currentStep === "create" },
    { id: "generate", label: "Generate Images", active: currentStep === "generate" },
    { id: "save", label: "Save to Library", active: currentStep === "save" }
  ];

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
                Create stunning images and characters with AI
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 ${
                    step.active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      step.active ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-8 h-px bg-gray-300 mx-2" />
                  )}
                </div>
              ))}
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

            {/* Main Content Area */}
            <div className="space-y-8">
              {/* Step 1: Prompt Creation */}
              <TabsContent value="general" className="mt-0">
                <PromptBuilder
                  mode="general"
                  onPromptUpdate={handlePromptUpdate}
                  onImagesGenerated={handleImageGenerated}
                  prompt={currentPrompt}
                  enhancedPrompt={enhancedPrompt}
                />
              </TabsContent>
              
              <TabsContent value="character" className="mt-0">
                <PromptBuilder
                  mode="character"
                  onPromptUpdate={handlePromptUpdate}
                  onImagesGenerated={handleImageGenerated}
                  prompt={currentPrompt}
                  enhancedPrompt={enhancedPrompt}
                />
              </TabsContent>

              {/* Step 2 & 3: Generated Images Display */}
              {generatedImages.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="px-3 py-1">
                        Step 2 Complete
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
