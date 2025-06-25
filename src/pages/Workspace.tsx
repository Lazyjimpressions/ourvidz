
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { Input } from "@/components/ui/input";
import { Plus, Image, Music, Zap, WandSparkles } from "lucide-react";
import { useGeneration } from "@/hooks/useGeneration";
import { GeneratedImageGallery } from "@/components/generation/GeneratedImageGallery";
import type { GenerationFormat, GenerationQuality } from '@/types/generation';
import { toast } from "sonner";

type WorkspaceMode = GenerationFormat;

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  status: string;
}

const Workspace = () => {
  const [searchParams] = useSearchParams();
  
  // Get mode from URL params, fallback to 'image'
  const initialMode = (searchParams.get('mode') as WorkspaceMode) || 'image';
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const [quality, setQuality] = useState<GenerationQuality>('fast');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  
  // Form state that persists across mode changes
  const [formState, setFormState] = useState({
    imagePrompt: '',
    videoPrompt: '',
    imageAspectRatio: '16:9',
    videoAspectRatio: '16:9',
    shotType: 'Shot Type',
    angle: 'Angle',
    style: 'Style',
    styleRef: 'Style ref',
    duration: '5s',
    model: 'LTXV Turbo'
  });

  const { generate, isGenerating, useGenerationStatus, getEstimatedCredits } = useGeneration({
    onSuccess: (data) => {
      setCurrentGenerationId(data.id);
      toast.success(`${mode === 'image' ? 'Image' : 'Video'} generation started! ID: ${data.id}`);
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
      setCurrentGenerationId(null);
    }
  });

  // Poll for generation status
  const { data: generationData } = useGenerationStatus(currentGenerationId, mode);

  // Handle completed generation
  useEffect(() => {
    if (generationData?.status === 'completed' && currentGenerationId) {
      const currentPrompt = mode === 'image' ? formState.imagePrompt : formState.videoPrompt;
      
      // Type assertion to handle the different response types
      const responseData = generationData as any;
      
      if (responseData.image_urls && mode === 'image') {
        // Create image objects for each generated image
        const newImages: GeneratedImage[] = responseData.image_urls.map((url: string, index: number) => ({
          id: `${currentGenerationId}_${index}`,
          url,
          prompt: currentPrompt,
          timestamp: new Date(),
          status: 'completed'
        }));

        setGeneratedImages(newImages);
        setCurrentGenerationId(null);
        
        toast.success(`Generated ${newImages.length} ${mode === 'image' ? 'images' : 'videos'}!`);
      } else if (responseData.video_url && mode === 'video') {
        // Handle video completion
        const newVideo: GeneratedImage = {
          id: currentGenerationId,
          url: responseData.video_url,
          prompt: currentPrompt,
          timestamp: new Date(),
          status: 'completed'
        };

        setGeneratedImages([newVideo]);
        setCurrentGenerationId(null);
        
        toast.success('Video generated successfully!');
      }
    }
  }, [generationData, currentGenerationId, mode, formState.imagePrompt, formState.videoPrompt]);

  // Handle failed generation
  useEffect(() => {
    if (generationData?.status === 'failed' && currentGenerationId) {
      console.log('❌ Generation failed:', generationData);
      
      // Reset state
      setCurrentGenerationId(null);
      setGeneratedImages([]);
      
      // Show error message with retry option
      const errorMessage = generationData.error || 'Generation failed due to server error';
      
      // Provide specific error messages for common issues
      let userFriendlyMessage = 'Generation failed. Please try again.';
      if (errorMessage.includes('CUDA out of memory') || errorMessage.includes('memory')) {
        userFriendlyMessage = 'Server is currently overloaded. Please try again in a few moments.';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Generation timed out. Please try with a simpler prompt.';
      }
      
      toast.error(userFriendlyMessage, {
        action: {
          label: 'Retry',
          onClick: () => handleGenerate()
        }
      });
    }
  }, [generationData, currentGenerationId]);

  // Update mode when URL params change
  useEffect(() => {
    const urlMode = (searchParams.get('mode') as WorkspaceMode) || 'image';
    setMode(urlMode);
  }, [searchParams]);

  const handleModeSwitch = (newMode: WorkspaceMode) => {
    setMode(newMode);
    // Clear images when switching modes
    setGeneratedImages([]);
    setCurrentGenerationId(null);
    // Update URL without navigation
    window.history.replaceState({}, '', `/workspace?mode=${newMode}`);
  };

  const updateFormState = (field: string, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    const prompt = mode === 'image' ? formState.imagePrompt : formState.videoPrompt;
    
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    // Clear previous images
    setGeneratedImages([]);

    generate({
      format: mode,
      quality,
      prompt: prompt.trim(),
      metadata: {
        source: 'workspace',
        aspectRatio: mode === 'image' ? formState.imageAspectRatio : formState.videoAspectRatio,
        ...(mode === 'video' && { duration: formState.duration, model: formState.model })
      }
    });
  };

  const currentPrompt = mode === 'image' ? formState.imagePrompt : formState.videoPrompt;
  const estimatedCredits = getEstimatedCredits(mode, quality);

  // Placeholder images for scattered layout
  const placeholderImages = [
    "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=120&h=120&fit=crop", 
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=140&h=140&fit=crop",
    "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=130&h=130&fit=crop",
    "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=160&h=160&fit=crop"
  ];

  // Show gallery if we have generated images or are generating
  const showGallery = generatedImages.length > 0 || isGenerating || currentGenerationId;

  return (
    <OurVidzDashboardLayout>
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {/* Hero Section with Scattered Images */}
          {!showGallery && (
            <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
              {/* Scattered Background Images */}
              <div className="absolute inset-0 overflow-hidden">
                {/* Mobile-first responsive positioning */}
                <img 
                  src={placeholderImages[0]} 
                  alt="" 
                  className="absolute w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-lg opacity-20 top-1/4 left-4 md:left-12 lg:left-24"
                />
                <img 
                  src={placeholderImages[1]} 
                  alt="" 
                  className="absolute w-14 h-14 md:w-18 md:h-18 lg:w-20 lg:h-20 rounded-lg opacity-20 top-1/3 right-6 md:right-16 lg:right-32"
                />
                <img 
                  src={placeholderImages[2]} 
                  alt="" 
                  className="absolute w-18 h-18 md:w-22 md:h-22 lg:w-26 lg:h-26 rounded-lg opacity-20 bottom-1/3 left-8 md:left-20 lg:left-40"
                />
                <img 
                  src={placeholderImages[3]} 
                  alt="" 
                  className="absolute w-15 h-15 md:w-19 md:h-19 lg:w-22 lg:h-22 rounded-lg opacity-20 top-1/2 right-4 md:right-12 lg:right-28"
                />
                <img 
                  src={placeholderImages[4]} 
                  alt="" 
                  className="absolute w-17 h-17 md:w-21 md:h-21 lg:w-25 lg:h-25 rounded-lg opacity-20 bottom-1/4 right-12 md:right-24 lg:right-48"
                />
              </div>

              {/* Centered Content */}
              <div className="text-center z-10 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                  {mode === 'image' 
                    ? "Let's start with some image storming"
                    : "Let's start creating some videos"
                  }
                </h1>
                <p className="text-lg md:text-xl text-gray-400">
                  {mode === 'image'
                    ? "Type your prompt, set your style, and generate your image"
                    : "Select or upload an image, add a prompt, and watch it go"
                  }
                </p>
              </div>
            </div>
          )}

          {/* Generated Images Gallery */}
          {showGallery && (
            <div className="flex-1 px-6 py-8">
              <GeneratedImageGallery
                images={generatedImages}
                isGenerating={isGenerating || !!currentGenerationId}
                prompt={currentPrompt}
                onRegenerate={handleGenerate}
                mode={mode}
              />
            </div>
          )}

          {/* Control Panel */}
          <div className="bg-[#111111] border-t border-gray-800 p-6">
            <div className="max-w-6xl mx-auto">
              {/* Main Prompt Area */}
              <div className="bg-[#1a1a1a] rounded-2xl border border-gray-700 p-6 space-y-4">
                
                {/* Desktop: Row 1 - Mode buttons, optional elements, and prompt */}
                <div className="hidden md:flex gap-4 items-stretch">
                  {/* Left - Mode Buttons Stack */}
                  <div className="flex flex-col gap-2 min-w-[80px]">
                    <button
                      onClick={() => handleModeSwitch('image')}
                      className={`px-4 py-3.5 text-sm font-medium rounded-lg transition-colors h-7 flex items-center justify-center ${
                        mode === 'image' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      IMAGE
                    </button>
                    <button
                      onClick={() => handleModeSwitch('video')}
                      className={`px-4 py-3.5 text-sm font-medium rounded-lg transition-colors h-7 flex items-center justify-center ${
                        mode === 'video' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      VIDEO
                    </button>
                  </div>

                  {/* Middle - Optional Elements */}
                  <div className="flex gap-3 items-stretch">
                    {mode === 'image' ? (
                      // Image Reference Button
                      <button className="w-20 h-14 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                        <Image className="w-5 h-5 text-gray-400" />
                      </button>
                    ) : (
                      // Start and End Frame Boxes for Video
                      <>
                        <button className="w-20 h-14 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                          <Plus className="w-5 h-5 text-gray-400" />
                        </button>
                        <button className="w-20 h-14 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                          <Plus className="w-5 h-5 text-gray-400" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Right - Prompt Input with Integrated Action */}
                  <div className="flex-1 relative">
                    <Input
                      value={currentPrompt}
                      onChange={(e) => updateFormState(mode === 'image' ? 'imagePrompt' : 'videoPrompt', e.target.value)}
                      placeholder={mode === 'image' ? "Describe the image you want to create..." : "Describe the video you want to create..."}
                      className="w-full h-14 pr-12 bg-gray-800 border-gray-600 text-white placeholder-gray-500 text-base rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleGenerate();
                        }
                      }}
                      disabled={isGenerating || !!currentGenerationId}
                    />
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !!currentGenerationId || !currentPrompt.trim()}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-blue-400 hover:text-blue-300 transition-colors disabled:text-gray-600"
                    >
                      <WandSparkles className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Mobile: Single Column Stack */}
                <div className="md:hidden space-y-4">
                  {/* Mode Buttons - Horizontal on mobile */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleModeSwitch('image')}
                      className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        mode === 'image' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      IMAGE
                    </button>
                    <button
                      onClick={() => handleModeSwitch('video')}
                      className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        mode === 'video' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      VIDEO
                    </button>
                  </div>

                  {/* Optional Elements Row */}
                  <div className="flex gap-3">
                    {mode === 'image' ? (
                      <button className="w-16 h-14 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                        <Image className="w-5 h-5 text-gray-400" />
                      </button>
                    ) : (
                      <>
                        <button className="w-16 h-14 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                          <Plus className="w-5 h-5 text-gray-400" />
                        </button>
                        <button className="w-16 h-14 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                          <Plus className="w-5 h-5 text-gray-400" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Prompt Input */}
                  <div className="relative">
                    <Input
                      value={currentPrompt}
                      onChange={(e) => updateFormState(mode === 'image' ? 'imagePrompt' : 'videoPrompt', e.target.value)}
                      placeholder={mode === 'image' ? "Describe the image you want to create..." : "Describe the video you want to create..."}
                      className="w-full h-14 pr-12 bg-gray-800 border-gray-600 text-white placeholder-gray-500 text-base rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleGenerate();
                        }
                      }}
                      disabled={isGenerating || !!currentGenerationId}
                    />
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !!currentGenerationId || !currentPrompt.trim()}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-blue-400 hover:text-blue-300 transition-colors disabled:text-gray-600"
                    >
                      <WandSparkles className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Row 2 - Bottom Controls with integrated Quality selector (Both Desktop and Mobile) */}
                <div className="flex flex-wrap gap-6 items-center">
                  {/* Quality Selector - Integrated into bottom controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuality('fast')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        quality === 'fast'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Fast
                    </button>
                    <button
                      onClick={() => setQuality('high')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        quality === 'high'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      High Quality
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>Credits: {estimatedCredits}</span>
                  </div>
                  
                  {mode === 'image' ? (
                    // Image Mode Controls
                    <>
                      <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                        <span>{formState.imageAspectRatio}</span>
                      </button>
                      <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                        <span>{formState.shotType}</span>
                      </button>
                      <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                        <span>{formState.angle}</span>
                      </button>
                      <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                        <span>{formState.style}</span>
                      </button>
                      <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                        <span>{formState.styleRef}</span>
                      </button>
                    </>
                  ) : (
                    // Video Mode Controls
                    <>
                      <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                        <span>{formState.model}</span>
                      </button>
                      <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                        <span>{formState.videoAspectRatio}</span>
                      </button>
                      <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                        <span>{formState.duration}</span>
                      </button>
                      <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 transition-colors">
                        <Music className="w-4 h-4 line-through" />
                      </button>
                      <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
                        <Zap className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </OurVidzDashboardLayout>
  );
};

export default Workspace;
