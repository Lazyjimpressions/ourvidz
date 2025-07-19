
import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

import { ImageInputControls } from "@/components/ImageInputControls";
import { VideoInputControls } from "@/components/VideoInputControls";
import { MultiReferencePanel } from "@/components/workspace/MultiReferencePanel";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { SimpleWorkspaceGrid } from "@/components/workspace/SimpleWorkspaceGrid";
import { ReferenceImage, MediaTile } from "@/types/workspace";

const defaultWorkspaceData = {
  mediaTiles: [] as MediaTile[],
  references: [] as ReferenceImage[],
  videoReferences: {} as { start?: ReferenceImage; end?: ReferenceImage; }
};

const Workspace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [numImages, setNumImages] = useState(4);
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  const [enhanced, setEnhanced] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [referenceStrength, setReferenceStrength] = useState(0.8);
  const [generationCount, setGenerationCount] = useState(0);
  const [workspaceData, setWorkspaceData] = useState(defaultWorkspaceData);
  const isMobile = useIsMobile();

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

  const handleModeSwitch = (newMode: 'image' | 'video') => {
    setMode(newMode);
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt.');
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate generation for now - replace with actual API call
      const mockAssets = Array.from({ length: mode === 'image' ? numImages : 1 }, (_, i) => ({
        id: crypto.randomUUID(),
        url: mode === 'image' 
          ? `https://picsum.photos/512/512?random=${Date.now() + i}`
          : `https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4`,
      }));

      const newMediaTiles = mockAssets.map((asset, index) => ({
        id: crypto.randomUUID(),
        originalAssetId: asset.id,
        type: mode,
        url: asset.url,
        prompt,
        timestamp: new Date(),
        quality,
        modelType: enhanced ? 'enhanced' : 'standard',
        duration: mode === 'video' ? 30 : undefined,
        isUrlLoaded: true,
        isVisible: true,
        virtualIndex: workspaceData.mediaTiles.length + index,
      }));

      setWorkspaceData(prev => ({
        ...prev,
        mediaTiles: [...prev.mediaTiles, ...newMediaTiles],
      }));
      
      setGenerationCount(count => count + 1);
      toast.success(`${mode === 'image' ? numImages : 1} ${mode === 'image' ? 'image(s)' : 'video'} generated successfully!`);
    } catch (error: any) {
      console.error('Generation failed:', error);
      toast.error(`Generation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, numImages, quality, enhanced, mode, workspaceData.mediaTiles.length]);

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
    </div>
  );
};

export default Workspace;
