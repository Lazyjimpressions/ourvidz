import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useMediaQuery } from 'usehooks-ts'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ImageInputControls } from "@/components/ImageInputControls";
import { VideoInputControls } from "@/components/VideoInputControls";
import { MultiReferencePanel } from "@/components/workspace/MultiReferencePanel";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceTiles } from "@/components/workspace/WorkspaceTiles";
import { LibraryPanel } from "@/components/workspace/LibraryPanel";
import { MediaTile } from "@/components/workspace/MediaTile";
import { ReferenceImage } from "@/types/workspace";

const defaultWorkspaceData = {
  mediaTiles: [] as MediaTile[],
  references: [] as ReferenceImage[],
  videoReferences: {} as { start?: ReferenceImage; end?: ReferenceImage; }
};

const Workspace = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
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
	const isMobile = useMediaQuery('(max-width: 768px)')

  // Ensure user is authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
    }
  }, [status, router]);

  // Reset workspace data on unmount
  useEffect(() => {
    return () => {
      setWorkspaceData(defaultWorkspaceData);
    };
  }, []);

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
      const response = await fetch('/api/generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          numImages: mode === 'image' ? numImages : 1,
          quality,
          enhanced,
          mode,
          referenceImage: workspaceData.references?.find(ref => ref.id === 'character'),
					referenceStrength
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.assets) {
        const newMediaTiles = data.assets.map((asset: any) => ({
          id: uuidv4(),
          originalAssetId: asset.id,
          type: mode,
          url: asset.url,
          prompt,
          timestamp: new Date(),
          quality,
          modelType: enhanced ? 'enhanced' : 'standard',
          duration: asset.duration || undefined,
          thumbnailUrl: asset.thumbnailUrl || undefined,
          isUrlLoaded: false,
          isVisible: true,
          virtualIndex: workspaceData.mediaTiles.length,
          enhancedPrompt: data.enhancedPrompt,
          seed: data.seed,
          generationParams: data.generationParams
        }));

        setWorkspaceData(prev => ({
          ...prev,
          mediaTiles: [...prev.mediaTiles, ...newMediaTiles],
        }));
        setGenerationCount(count => count + 1);
        toast.success(`${mode === 'image' ? numImages : 1} ${mode === 'image' ? 'image(s)' : 'video'} generated successfully!`);
      } else {
        toast.error('No assets were generated.');
      }
    } catch (error: any) {
      console.error('Generation failed:', error);
      toast.error(`Generation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, numImages, quality, enhanced, mode, workspaceData.references, referenceStrength]);

  const handleReferenceChange = (newReferences: ReferenceImage[]) => {
    setWorkspaceData(prev => ({
      ...prev,
      references: newReferences.length > 0
        ? [...(prev.references || []).filter(ref => !newReferences.find(newRef => newRef.id === ref.id)), ...newReferences]
        : (prev.references || []).filter(ref => !newReferences.find(newRef => newRef.id === ref.id)),
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

  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader
        generationCount={generationCount}
        hasGeneratedMedia={workspaceData.mediaTiles.length > 0}
        onLibraryClick={() => setShowLibrary(true)}
        isLibraryOpen={showLibrary}
        mode={mode}
        onModeSwitch={handleModeSwitch}
      />

      <main className="pt-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mb-8">
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
                  workspaceData.references?.find(ref => ref.id === 'character')?.file || null
                }
                referenceImageUrl={
                  workspaceData.references?.find(ref => ref.id === 'character')?.url
                }
                onReferenceImageChange={(file, url) => {
                  handleReferenceChange([{
                    id: 'character' as const,
                    label: 'Character',
                    description: 'Preserve character appearance and features',
                    file,
                    url,
                    enabled: true
                  }]);
                }}
                onClearReference={() => {
                  handleReferenceChange([{
                    id: 'character' as const,
                    label: 'Character',
                    description: 'Preserve character appearance and features',
                    file: null,
                    url: undefined,
                    enabled: false
                  }]);
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

          {/* Multi-Reference Panel */}
          {mode === 'image' && (
            <MultiReferencePanel
              mode={mode}
              strength={referenceStrength}
              onStrengthChange={setReferenceStrength}
              onReferencesChange={handleReferenceChange}
              onClear={handleClearReferences}
            />
          )}

          {/* Workspace Content */}
          <div className="space-y-6">
            <WorkspaceTiles
              mediaTiles={workspaceData.mediaTiles}
              setMediaTiles={(updatedTiles) => setWorkspaceData(prev => ({ ...prev, mediaTiles: updatedTiles }))}
            />
          </div>
        </div>
      </main>

      {/* Library Panel */}
      <LibraryPanel
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        mediaTiles={workspaceData.mediaTiles}
        setMediaTiles={(updatedTiles) => setWorkspaceData(prev => ({ ...prev, mediaTiles: updatedTiles }))}
      />
    </div>
  );
};

export default Workspace;
