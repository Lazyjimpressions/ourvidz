
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGeneration } from "@/hooks/useGeneration";
import { toast } from "sonner";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { VideoInputControls } from "@/components/VideoInputControls";
import { ImageInputControls } from "@/components/ImageInputControls";

interface GeneratedContent {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
}

export const Workspace = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'image';
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const { generate, isGenerating, useGenerationStatus } = useGeneration({
    onSuccess: (data) => {
      setGeneratedId(data.id);
      toast.success(`${mode === 'image' ? 'Image' : 'Video'} generation started!`);
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    }
  });

  const { data: generationData } = useGenerationStatus(generatedId, mode as 'image' | 'video');

  // Check if generation is complete
  if (generationData?.status === 'completed') {
    const contentData = generationData as any;
    if (mode === 'image' && contentData.image_urls && contentData.image_urls.length > 0) {
      const images = contentData.image_urls.map((url: string, index: number) => ({
        id: `${generatedId}-${index}`,
        url,
        prompt,
        timestamp: new Date(),
        quality: 'fast' as const
      }));
      setGeneratedContent(prev => [...images, ...prev]);
      setGeneratedId(null);
    } else if (mode === 'video' && contentData.video_url) {
      const video: GeneratedContent = {
        id: generatedId!,
        url: contentData.video_url,
        prompt,
        timestamp: new Date(),
        quality: 'fast' as const
      };
      setGeneratedContent(prev => [video, ...prev]);
      setGeneratedId(null);
    }
  }

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    generate({
      format: mode as 'image' | 'video',
      quality: 'fast',
      prompt: prompt.trim(),
      metadata: {
        source: 'workspace'
      }
    });
  };

  const handleReferenceImageUpload = () => {
    // TODO: Implement reference image upload functionality
    toast.info("Reference image upload coming soon!");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <WorkspaceHeader />

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-8">
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
      </div>

      {/* Free-Floating Input Container */}
      <div className="pb-8 px-8">
        <div className="max-w-5xl mx-auto">
          {mode === 'video' ? (
            <VideoInputControls
              prompt={prompt}
              setPrompt={setPrompt}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              onReferenceImageUpload={handleReferenceImageUpload}
            />
          ) : (
            <ImageInputControls
              prompt={prompt}
              setPrompt={setPrompt}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              onReferenceImageUpload={handleReferenceImageUpload}
            />
          )}
        </div>
      </div>

      {/* Generated Content Display */}
      {generatedContent.length > 0 && (
        <div className="border-t border-gray-800 p-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-medium mb-4">Generated {mode === 'image' ? 'Images' : 'Videos'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {generatedContent.map((item) => (
                <div key={item.id} className="bg-gray-900 rounded-lg overflow-hidden">
                  {mode === 'image' ? (
                    <img
                      src={item.url}
                      alt="Generated content"
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="w-full h-32 object-cover"
                      controls
                    />
                  )}
                  <div className="p-2">
                    <p className="text-xs text-gray-400 truncate">{item.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
