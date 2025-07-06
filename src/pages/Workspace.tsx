
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGeneration } from '@/hooks/useGeneration';
import { useRealtimeGenerationStatus } from '@/hooks/useRealtimeGenerationStatus';
import { useGenerationWorkspace } from '@/hooks/useGenerationWorkspace';
import { useVirtualizedWorkspace } from '@/hooks/useVirtualizedWorkspace';
import { GenerationFormat } from '@/types/generation';
import { VirtualizedMediaGrid } from '@/components/VirtualizedMediaGrid';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { ScrollNavigation } from '@/components/ScrollNavigation';
import { ImageInputControls } from '@/components/ImageInputControls';
import { VideoInputControls } from '@/components/VideoInputControls';
import { LibraryImportModal } from '@/components/LibraryImportModal';
import { UnifiedAsset } from '@/lib/services/AssetService';


const Workspace = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Get mode from URL params, default to image
  const mode = searchParams.get('mode') || 'image';
  const isVideoMode = mode === 'video';
  
  // Generation state
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  const [enhanced, setEnhanced] = useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<GenerationFormat>(
    isVideoMode ? 'video_fast' : 'sdxl_image_fast'
  );
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  
  // Workspace management - Use VirtualizedWorkspace to match VirtualizedMediaGrid
  const { addToWorkspace, clearWorkspace, importToWorkspace } = useVirtualizedWorkspace({
    itemHeight: 300,
    overscan: 3,
    visibleCount: 12
  });
  const [shouldClearWorkspace, setShouldClearWorkspace] = useState(false);
  
  // Generation hooks
  const {
    generateContent,
    isGenerating,
    generationProgress,
    currentJob,
    error: generationError,
    clearError
  } = useGeneration();

  // Use realtime generation status hook to track job completion
  useRealtimeGenerationStatus(
    currentJob?.id || null,
    selectedMode,
    !!currentJob && isGenerating
  );

  // Hook to automatically add new generations to workspace
  useGenerationWorkspace({ 
    addToWorkspace, 
    isEnabled: true 
  });

  // Handle authentication state and navigation
  useEffect(() => {
    // Don't redirect while auth is loading
    if (loading) return;
    
    // Redirect to auth if user is not authenticated
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, loading, navigate]);

  // Update selected mode when URL mode changes, quality changes, or enhancement changes
  useEffect(() => {
    if (isVideoMode) {
      if (enhanced) {
        setSelectedMode(quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced');
      } else {
        setSelectedMode(quality === 'high' ? 'video_high' : 'video_fast');
      }
    } else {
      if (enhanced) {
        setSelectedMode(quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced');
      } else {
        setSelectedMode(quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast');
      }
    }
  }, [isVideoMode, quality, enhanced]);

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

  const handleGenerateMoreLike = async (tile: any) => {
    if (!tile.url || tile.type !== 'image') {
      toast.error('Reference image not available');
      return;
    }

    try {
      console.log('🔄 Generating 3 more images like:', {
        tileId: tile.id,
        prompt: tile.prompt,
        quality: tile.quality,
        modelType: tile.modelType
      });

      // Use the same format as the original image
      const originalFormat = tile.modelType === 'SDXL' 
        ? (tile.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast')
        : (tile.quality === 'high' ? 'image_high' : 'image_fast');

      await generateContent({
        format: originalFormat,
        prompt: tile.prompt,
        referenceImageUrl: tile.url,
        batchCount: 3,
        metadata: {
          reference_image: true,
          similarity_strength: 0.8,
          model_variant: tile.modelType === 'SDXL' ? 'lustify_sdxl' : 'wan_2_1_1_3b'
        }
      });

      toast.success('Generating 3 more images like this one!');
    } catch (error) {
      console.error('❌ More like this generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      toast.error(errorMessage);
    }
  };

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-2">⏳</div>
          <p className="text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Don't render if user is not authenticated (redirect will happen in useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Fixed Header */}
      <WorkspaceHeader onClearWorkspace={() => {
        setShouldClearWorkspace(prev => !prev); // Toggle to trigger clear
      }} />

      {/* Main Content Area */}
      <div className="flex-1 pt-12">
        {/* Optimized Virtualized Media Grid */}
        <VirtualizedMediaGrid 
          onRegenerateItem={handleRegenerate} 
          onGenerateMoreLike={handleGenerateMoreLike}
          onClearWorkspace={shouldClearWorkspace}
        />
      </div>

      {/* Scroll Navigation */}
      <ScrollNavigation />

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
            onLibraryClick={() => setShowLibraryModal(true)}
            enhanced={enhanced}
            setEnhanced={setEnhanced}
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
            onLibraryClick={() => setShowLibraryModal(true)}
            enhanced={enhanced}
            setEnhanced={setEnhanced}
          />
        )}
      </div>

      {/* Library Import Modal */}
      <LibraryImportModal
        open={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        onImport={importToWorkspace}
      />
    </div>
  );
};

export default Workspace;
