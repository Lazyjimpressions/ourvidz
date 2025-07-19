
import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGeneration } from '@/hooks/useGeneration';

import { ImageInputControls } from "@/components/ImageInputControls";
import { VideoInputControls } from "@/components/VideoInputControls";
import { MultiReferencePanel } from "@/components/workspace/MultiReferencePanel";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { SimpleWorkspaceGrid } from "@/components/workspace/SimpleWorkspaceGrid";
import { LibraryImportModal } from "@/components/LibraryImportModal";
import { ReferenceImage, MediaTile } from "@/types/workspace";
import { GenerationRequest } from "@/types/generation";

const defaultWorkspaceData = {
  mediaTiles: [] as MediaTile[],
  references: [] as ReferenceImage[],
  videoReferences: {} as { start?: ReferenceImage; end?: ReferenceImage; }
};

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
  const [workspaceData, setWorkspaceData] = useState(defaultWorkspaceData);
  const isMobile = useIsMobile();

  // Use the real generation hook
  const { generateContent, isGenerating, currentJob, error } = useGeneration();

  // Ensure user is authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Load workspace data from session storage
  useEffect(() => {
    const savedData = sessionStorage.getItem('workspaceData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setWorkspaceData(parsed);
      } catch (error) {
        console.error('Failed to load workspace data:', error);
      }
    }
  }, []);

  // Save workspace data to session storage
  useEffect(() => {
    sessionStorage.setItem('workspaceData', JSON.stringify(workspaceData));
  }, [workspaceData]);

  // Listen for generation completion events
  useEffect(() => {
    const handleGenerationComplete = (event: CustomEvent) => {
      const { assetId, type, jobId } = event.detail;
      console.log('Generation completed:', { assetId, type, jobId });
      
      // Add the new asset to workspace
      const newMediaTile: MediaTile = {
        id: crypto.randomUUID(),
        originalAssetId: assetId,
        type: type as 'image' | 'video',
        url: undefined, // Will be loaded by the grid component
        prompt,
        timestamp: new Date(),
        quality,
        modelType: enhanced ? 'enhanced' : 'standard',
        duration: type === 'video' ? 30 : undefined,
        isUrlLoaded: false,
        isVisible: true,
        virtualIndex: workspaceData.mediaTiles.length,
      };

      setWorkspaceData(prev => ({
        ...prev,
        mediaTiles: [...prev.mediaTiles, newMediaTile],
      }));
      
      toast.success(`${type === 'image' ? 'Image' : 'Video'} generated successfully!`);
    };

    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    return () => {
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
    };
  }, [prompt, quality, enhanced, workspaceData.mediaTiles.length]);

  const handleModeSwitch = (newMode: 'image' | 'video') => {
    setMode(newMode);
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt.');
      return;
    }

    if (!user) {
      toast.error('Please sign in to generate content.');
      return;
    }

    try {
      // Determine the generation format based on mode, quality, and enhanced settings
      let format: string;
      if (mode === 'image') {
        if (enhanced) {
          format = quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
        } else {
          format = quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
        }
      } else {
        if (enhanced) {
          format = quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced';
        } else {
          format = quality === 'high' ? 'video_high' : 'video_fast';
        }
      }

      // Prepare the generation request
      const generationRequest: GenerationRequest = {
        format: format as any,
        prompt: prompt.trim(),
        metadata: {
          credits: quality === 'high' ? 2 : 1,
          num_images: mode === 'image' ? numImages : 1,
        }
      };

      // Add reference image if present
      const characterRef = workspaceData.references?.find(ref => ref.type === 'character');
      if (characterRef?.url && mode === 'image') {
        generationRequest.referenceImageUrl = characterRef.url;
        generationRequest.metadata = {
          ...generationRequest.metadata,
          reference_strength: referenceStrength,
          reference_type: 'character'
        };
      }

      // Add video references if present
      if (mode === 'video') {
        if (workspaceData.videoReferences?.start?.url) {
          generationRequest.startReferenceImageUrl = workspaceData.videoReferences.start.url;
        }
        if (workspaceData.videoReferences?.end?.url) {
          generationRequest.endReferenceImageUrl = workspaceData.videoReferences.end.url;
        }
      }

      console.log('Starting generation with request:', generationRequest);
      await generateContent(generationRequest);
      
    } catch (error: any) {
      console.error('Generation failed:', error);
      toast.error(`Generation failed: ${error.message || 'Unknown error'}`);
    }
  }, [prompt, numImages, quality, enhanced, mode, workspaceData.references, workspaceData.videoReferences, referenceStrength, user, generateContent]);

  const handleReferenceChange = (newReferences: ReferenceImage[]) => {
    setWorkspaceData(prev => ({
      ...prev,
      references: newReferences.length > 0
        ? [...(prev.references || []).filter(ref => !newReferences.find(newRef => newRef.type === ref.type)), ...newReferences]
        : (prev.references || []).filter(ref => !newReferences.find(newRef => newRef.type === ref.type)),
    }));
  };

  const handleVideoReferenceChange = (newVideoReferences: { start?: ReferenceImage; end?: ReferenceImage; }) => {
    setWorkspaceData(prev => ({
      ...prev,
      videoReferences: {
        ...prev.videoReferences,
        ...newVideoReferences,
      },
    }));
  };

  const handleClearReferences = () => {
    setWorkspaceData(prev => ({
      ...prev,
      references: [],
    }));
  };

  const handleClearWorkspace = () => {
    setWorkspaceData(defaultWorkspaceData);
    setPrompt('');
    sessionStorage.removeItem('workspaceData');
    toast.success('Workspace cleared');
  };

  const handleRemoveTile = (tileId: string) => {
    setWorkspaceData(prev => ({
      ...prev,
      mediaTiles: prev.mediaTiles.filter(tile => tile.id !== tileId),
    }));
    toast.success('Removed from workspace');
  };

  const handleImport = (assets: any[]) => {
    const newMediaTiles = assets.map((asset, index) => ({
      id: crypto.randomUUID(),
      originalAssetId: asset.id,
      type: asset.type || 'image',
      url: asset.url || asset.signed_url,
      prompt: asset.prompt || 'Imported from library',
      timestamp: new Date(asset.created_at || Date.now()),
      quality: asset.quality || 'fast',
      modelType: asset.modelType || 'standard',
      duration: asset.duration,
      isUrlLoaded: true,
      isVisible: true,
      virtualIndex: workspaceData.mediaTiles.length + index,
    }));

    setWorkspaceData(prev => ({
      ...prev,
      mediaTiles: [...prev.mediaTiles, ...newMediaTiles],
    }));
    
    toast.success(`Imported ${assets.length} asset(s) to workspace`);
    setShowLibrary(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WorkspaceHeader onClearWorkspace={handleClearWorkspace} />

      {/* Main content area */}
      <main className="flex-1 pt-20 pb-32">
        <div className="container mx-auto px-4 max-w-7xl">
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
          <div className="space-y-6">
            <SimpleWorkspaceGrid 
              mediaTiles={workspaceData.mediaTiles}
              onRemoveTile={handleRemoveTile}
            />
          </div>
        </div>
      </main>

      {/* Fixed footer with input controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40">
        <div className="container mx-auto px-4 max-w-7xl py-4">
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
              referenceImage={
                workspaceData.references?.find(ref => ref.type === 'character')?.file || null
              }
              referenceImageUrl={
                workspaceData.references?.find(ref => ref.type === 'character')?.url
              }
              onReferenceImageChange={(file, url) => {
                handleReferenceChange([{
                  type: 'character' as const,
                  file,
                  url
                }]);
              }}
              onClearReference={() => {
                setWorkspaceData(prev => ({
                  ...prev,
                  references: prev.references?.filter(ref => ref.type !== 'character') || []
                }));
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
              startReferenceImage={
                workspaceData.videoReferences?.start?.file || null
              }
              startReferenceImageUrl={
                workspaceData.videoReferences?.start?.url
              }
              endReferenceImage={
                workspaceData.videoReferences?.end?.file || null
              }
              endReferenceImageUrl={
                workspaceData.videoReferences?.end?.url
              }
              onStartReferenceChange={(file, url) => {
                handleVideoReferenceChange({
                  ...workspaceData.videoReferences,
                  start: { file, url }
                });
              }}
              onEndReferenceChange={(file, url) => {
                handleVideoReferenceChange({
                  ...workspaceData.videoReferences,
                  end: { file, url }
                });
              }}
              onClearStartReference={() => {
                handleVideoReferenceChange({
                  ...workspaceData.videoReferences,
                  start: undefined
                });
              }}
              onClearEndReference={() => {
                handleVideoReferenceChange({
                  ...workspaceData.videoReferences,
                  end: undefined
                });
              }}
            />
          )}
        </div>
      </div>

      {/* Library Import Modal */}
      <LibraryImportModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onImport={handleImport}
      />
    </div>
  );
};

export default Workspace;
