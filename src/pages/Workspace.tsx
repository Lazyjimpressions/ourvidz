
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useGeneration } from "@/hooks/useGeneration";
import { toast } from "sonner";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { WorkspaceInputControls } from "@/components/WorkspaceInputControls";
import { WorkspaceImageGallery } from "@/components/WorkspaceImageGallery";
import { WorkspaceVideoDisplay } from "@/components/WorkspaceVideoDisplay";
import type { GenerationQuality } from "@/types/generation";

interface GeneratedContent {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality: GenerationQuality;
}

export const Workspace = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialMode = (searchParams.get('mode') as 'image' | 'video') || 'image';
  
  const [mode, setMode] = useState<'image' | 'video'>(initialMode);
  const [quality, setQuality] = useState<GenerationQuality>('fast');
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false);

  const { generate, isGenerating, useGenerationStatus } = useGeneration({
    onSuccess: (data) => {
      setGeneratedId(data.id);
      toast.success(`${mode === 'image' ? 'Image' : 'Video'} generation started!`);
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    }
  });

  const { data: generationData } = useGenerationStatus(generatedId, mode);

  // Update URL when mode changes
  const handleModeChange = (newMode: 'image' | 'video') => {
    setMode(newMode);
    navigate(`/workspace?mode=${newMode}`, { replace: true });
  };

  // Sync mode with URL parameter
  useEffect(() => {
    const urlMode = searchParams.get('mode') as 'image' | 'video';
    if (urlMode && urlMode !== mode) {
      setMode(urlMode);
    }
  }, [searchParams, mode]);

  // Check if generation is complete
  if (generationData?.status === 'completed') {
    const contentData = generationData as any;
    if (mode === 'image' && contentData.image_urls && contentData.image_urls.length > 0) {
      const images = contentData.image_urls.map((url: string, index: number) => ({
        id: `${generatedId}-${index}`,
        url,
        prompt,
        timestamp: new Date(),
        quality
      }));
      setGeneratedContent(images);
      setHasGeneratedContent(true);
      setGeneratedId(null);
    } else if (mode === 'video' && contentData.video_url) {
      const video: GeneratedContent = {
        id: generatedId!,
        url: contentData.video_url,
        prompt,
        timestamp: new Date(),
        quality
      };
      setGeneratedContent([video]);
      setHasGeneratedContent(true);
      setGeneratedId(null);
    }
  }

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    generate({
      format: mode,
      quality,
      prompt: prompt.trim(),
      metadata: {
        source: 'workspace'
      }
    });
  };

  const handleReferenceImageUpload = () => {
    toast.info("Reference image upload coming soon!");
  };

  const handleRemoveContent = () => {
    setGeneratedContent([]);
    setHasGeneratedContent(false);
  };

  const handleRegenerateItem = (itemId: string) => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // Find the item to regenerate
    const itemToRegenerate = generatedContent.find(item => item.id === itemId);
    if (!itemToRegenerate) return;

    // Generate new content with same prompt and quality
    generate({
      format: mode,
      quality: itemToRegenerate.quality,
      prompt: itemToRegenerate.prompt,
      metadata: {
        source: 'workspace',
        regenerateId: itemId
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <WorkspaceHeader />

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-8">
        {!hasGeneratedContent ? (
          <div className="text-center max-w-4xl">
            <h1 className="text-4xl font-light mb-4">
              Let's start {mode === 'video' ? 'creating some videos' : 'with some image storming'}
              <span className="inline-flex items-center gap-2">
                <div className="flex gap-1 ml-2">
                  <img 
                    src="https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=32&h=32&fit=crop&crop=center" 
                    alt="" 
                    className="w-8 h-8 rounded object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=32&h=32&fit=crop&crop=center" 
                    alt="" 
                    className="w-8 h-8 rounded object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=32&h=32&fit=crop&crop=center" 
                    alt="" 
                    className="w-8 h-8 rounded object-cover"
                  />
                </div>
              </span>
            </h1>
            <p className="text-lg text-gray-400 mb-8">
              {mode === 'video' 
                ? "Type your prompt, set your style, and generate your video"
                : "Type your prompt, set your style, and generate your image"
              }
            </p>
          </div>
        ) : (
          <div className="w-full max-w-6xl">
            {mode === 'image' ? (
              <WorkspaceImageGallery 
                images={generatedContent}
                onRemove={handleRemoveContent}
                onRegenerateItem={handleRegenerateItem}
              />
            ) : (
              <WorkspaceVideoDisplay 
                video={generatedContent[0]}
                onRemove={handleRemoveContent}
                onRegenerateItem={handleRegenerateItem}
              />
            )}
          </div>
        )}
      </div>

      {/* Unified Input Container */}
      <div className="pb-8 px-8">
        <div className="max-w-5xl mx-auto">
          <WorkspaceInputControls
            mode={mode}
            onModeChange={handleModeChange}
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            onReferenceImageUpload={handleReferenceImageUpload}
            quality={quality}
            onQualityChange={setQuality}
          />
        </div>
      </div>
    </div>
  );
};
