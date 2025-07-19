
import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGeneration } from '@/hooks/useGeneration';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useGenerationWorkspace } from '@/hooks/useGenerationWorkspace';

import { ImageInputControls } from "@/components/ImageInputControls";
import { VideoInputControls } from "@/components/VideoInputControls";
import { MultiReferencePanel } from "@/components/workspace/MultiReferencePanel";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { VirtualizedMediaGrid } from "@/components/VirtualizedMediaGrid";
import { LibraryImportModal } from "@/components/LibraryImportModal";
import { ReferenceImage } from "@/types/workspace";
import { GenerationRequest, GenerationFormat } from '@/types/generation';

const Workspace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [numImages, setNumImages] = useState(4);
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  const [enhanced, setEnhanced] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [referenceStrength, setReferenceStrength] = useState(0.8);
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [videoReferences, setVideoReferences] = useState<{ start?: ReferenceImage; end?: ReferenceImage; }>({});
  const isMobile = useIsMobile();

  // Use generation hook for real generation
  const { generateContent, isGenerating, currentJob, error } = useGeneration();
  
  // Use workspace hook for asset management
  const { 
    tiles, 
    isLoading, 
    addToWorkspace, 
    importToWorkspace, 
    clearWorkspace, 
    deleteTile 
  } = useWorkspace();

  // Auto-add generated assets to workspace
  useGenerationWorkspace({ 
    addToWorkspace, 
    isEnabled: true 
  });

  // Ensure user is authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleModeSwitch = (newMode: 'image' | 'video') => {
    setMode(newMode);
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt.');
      return;
    }

    const generationRequest: GenerationRequest = {
      prompt,
      format: mode === 'image' ? 'sdxl_image_fast' : 'video_fast',
      quality,
      enhanced,
      numImages: mode === 'image' ? numImages : 1,
      referenceImage: references?.find(ref => ref.type === 'character'),
      referenceStrength,
      startReferenceImage: videoReferences?.start,
      endReferenceImage: videoReferences?.end
    };

    await generateContent(generationRequest);
  }, [prompt, mode, quality, enhanced, numImages, references, referenceStrength, videoReferences, generateContent]);

  const handleReferenceChange = (newReferences: ReferenceImage[]) => {
    setReferences(prev => {
      const filtered = prev.filter(ref => !newReferences.find(newRef => newRef.type === ref.type));
      return [...filtered, ...newReferences];
    });
  };

  const handleVideoReferenceChange = (newVideoReferences: { start?: ReferenceImage; end?: ReferenceImage; }) => {
    setVideoReferences(prev => ({
      ...prev,
      ...newVideoReferences,
    }));
  };

  const handleClearReferences = () => {
    setReferences([]);
  };

  const handleLibraryImport = (importedAssets: any[]) => {
    importToWorkspace(importedAssets);
    setShowLibrary(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WorkspaceHeader 
        onClearWorkspace={clearWorkspace}
      />

      {/* Main content area */}
      <main className="flex-1 pt-20 pb-32 overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl h-full">
          {/* Multi-Reference Panel */}
          {mode === 'image' && (
            <div className="mb-6">
              <MultiReferencePanel
                mode={mode}
                strength={referenceStrength}
                onStrengthChange={setReferenceStrength}
                onReferencesChange={handleReferenceChange}
                onClear={handleClearReferences}
              />
            </div>
          )}

          {/* Workspace Content */}
          <div className="h-full">
            <VirtualizedMediaGrid 
              tiles={tiles}
              isLoading={isLoading}
              onDeleteTile={deleteTile}
              onClearWorkspace={tiles.length > 0 ? clearWorkspace : undefined}
            />
          </div>
        </div>
      </main>

      {/* Fixed footer with input controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="py-4">
            {mode === 'image' ? (
              <ImageInputControls
                prompt={prompt}
                setPrompt={setPrompt}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                onSwitchToVideo={() => handleModeSwitch('video')}
                quality={quality}
                setQuality={setQuality}
                onLibraryClick={() => setShowLibrary(true)}
                enhanced={enhanced}
                setEnhanced={setEnhanced}
                numImages={numImages}
                setNumImages={setNumImages}
                referenceImage={references?.find(ref => ref.type === 'character')?.file || null}
                referenceImageUrl={references?.find(ref => ref.type === 'character')?.url}
                onReferenceImageChange={(file, url) => {
                  handleReferenceChange([{
                    type: 'character' as const,
                    file,
                    url
                  }]);
                }}
                onClearReference={() => {
                  setReferences(prev => prev.filter(ref => ref.type !== 'character'));
                }}
              />
            ) : (
              <VideoInputControls
                prompt={prompt}
                setPrompt={setPrompt}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                onSwitchToImage={() => handleModeSwitch('image')}
                quality={quality}
                setQuality={setQuality}
                onLibraryClick={() => setShowLibrary(true)}
                enhanced={enhanced}
                setEnhanced={setEnhanced}
                startReferenceImage={videoReferences?.start?.file || null}
                startReferenceImageUrl={videoReferences?.start?.url}
                endReferenceImage={videoReferences?.end?.file || null}
                endReferenceImageUrl={videoReferences?.end?.url}
                onStartReferenceChange={(file, url) => {
                  handleVideoReferenceChange({
                    ...videoReferences,
                    start: { file, url }
                  });
                }}
                onEndReferenceChange={(file, url) => {
                  handleVideoReferenceChange({
                    ...videoReferences,
                    end: { file, url }
                  });
                }}
                onClearStartReference={() => {
                  handleVideoReferenceChange({
                    ...videoReferences,
                    start: undefined
                  });
                }}
                onClearEndReference={() => {
                  handleVideoReferenceChange({
                    ...videoReferences,
                    end: undefined
                  });
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Library Import Modal */}
      <LibraryImportModal 
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onImport={handleLibraryImport}
      />
    </div>
  );
};

export default Workspace;
