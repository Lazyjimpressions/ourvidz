
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGeneration } from '@/hooks/useGeneration';
import { GenerationFormat } from '@/types/generation';
import { MediaGrid } from '@/components/MediaGrid';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ImageInputControls } from '@/components/ImageInputControls';
import { VideoInputControls } from '@/components/VideoInputControls';

const Workspace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Get mode from URL params, default to image
  const mode = searchParams.get('mode') || 'image';
  const isVideoMode = mode === 'video';
  
  // Generation state
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  const [selectedMode, setSelectedMode] = useState<GenerationFormat>(
    isVideoMode ? 'video_fast' : 'sdxl_image_fast'
  );
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  
  const {
    generateContent,
    isGenerating,
    generationProgress,
    currentJob,
    error: generationError,
    clearError
  } = useGeneration();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  // Update selected mode when URL mode changes or quality changes
  useEffect(() => {
    if (isVideoMode) {
      setSelectedMode(quality === 'high' ? 'video_high' : 'video_fast');
    } else {
      setSelectedMode(quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast');
    }
  }, [isVideoMode, quality]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (generationError) {
      clearError();
    }

    try {
      console.log('🚀 Starting generation with:', {
        format: selectedMode,
        prompt: prompt.trim(),
        referenceImage: referenceImage?.name
      });

      await generateContent({
        format: selectedMode,
        prompt: prompt.trim(),
        metadata: {
          reference_image: referenceImage ? true : false,
          model_variant: selectedMode.startsWith('sdxl') ? 'lustify_sdxl' : 'wan_2_1_1_3b'
        }
      });

      toast.success('Generation started successfully!');
    } catch (error) {
      console.error('❌ Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      toast.error(errorMessage);
    }
  };

  const handleRegenerate = () => {
    if (currentJob && prompt) {
      handleGenerate();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="text-white hover:text-gray-300 p-2"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 pt-20">
        {/* Unified Media Grid for both images and videos */}
        <MediaGrid onRegenerateItem={handleRegenerate} />
      </div>

      {/* Bottom Input Controls */}
      <div className="p-6 bg-black">
        {isVideoMode ? (
          <VideoInputControls
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            onBeginningFrameUpload={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  setReferenceImage(file);
                }
              };
              input.click();
            }}
            onEndingFrameUpload={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  setReferenceImage(file);
                }
              };
              input.click();
            }}
            onSwitchToImage={() => navigate('/workspace?mode=image')}
            quality={quality}
            setQuality={setQuality}
          />
        ) : (
          <ImageInputControls
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            onReferenceImageUpload={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  setReferenceImage(file);
                }
              };
              input.click();
            }}
            onSwitchToVideo={() => navigate('/workspace?mode=video')}
            quality={quality}
            setQuality={setQuality}
          />
        )}
      </div>
    </div>
  );
};

export default Workspace;
