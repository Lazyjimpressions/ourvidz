import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGeneration } from '@/hooks/useGeneration';
import { useRealtimeGenerationStatus } from '@/hooks/useRealtimeGenerationStatus';
import { useRealtimeWorkspace } from '@/hooks/useRealtimeWorkspace';

import { GenerationFormat } from '@/types/generation';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { ScrollNavigation } from '@/components/ScrollNavigation';
import { ImageInputControls } from '@/components/ImageInputControls';
import { VideoInputControls } from '@/components/VideoInputControls';
import { LibraryImportModal } from '@/components/LibraryImportModal';
import { EnhancedReferenceUpload } from '@/components/workspace/EnhancedReferenceUpload';
import { ReferenceStrengthSlider } from '@/components/workspace/ReferenceStrengthSlider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Info, Image } from 'lucide-react';
import { PromptInfoModal } from '@/components/PromptInfoModal';
import { WorkspaceContentModal } from '@/components/WorkspaceContentModal';

interface WorkspaceAsset {
  id: string;
  url: string;
  jobId: string;
  prompt: string;
  type?: 'image' | 'video';
  quality?: string;
  modelType?: string;
  timestamp?: Date;
}

const Workspace = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Get mode from URL params, default to image
  const mode = searchParams.get('mode') || 'image';
  const [isVideoMode, setIsVideoMode] = useState(mode === 'video');
  
  // Generation state
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  const [enhanced, setEnhanced] = useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<GenerationFormat>(
    isVideoMode ? 'video_fast' : 'sdxl_image_fast'
  );
  const [prompt, setPrompt] = useState('');
  
  // Reference image state for image mode
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  const [referenceStrength, setReferenceStrength] = useState(0.5);
  const [referenceType, setReferenceType] = useState<'style' | 'composition' | 'character'>('style');
  
  // Reference image state for video mode (start/end)
  const [startReferenceImage, setStartReferenceImage] = useState<File | null>(null);
  const [startReferenceImageUrl, setStartReferenceImageUrl] = useState<string>('');
  const [endReferenceImage, setEndReferenceImage] = useState<File | null>(null);
  const [endReferenceImageUrl, setEndReferenceImageUrl] = useState<string>('');
  
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [numImages, setNumImages] = useState<number>(1);
  
  // Use the realtime workspace hook
  const { 
    tiles: workspaceTiles, 
    isLoading: workspaceLoading, 
    deletingTiles, 
    addToWorkspace, 
    importToWorkspace, 
    clearWorkspace, 
    deleteTile 
  } = useRealtimeWorkspace();
  
  const [isClearing, setIsClearing] = useState(false);
  
  // Modal states
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<WorkspaceAsset | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [currentPromptAsset, setCurrentPromptAsset] = useState<WorkspaceAsset | null>(null);
  
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


  // The realtime workspace hook already handles generation completion events

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

  // State persistence for reference images
  useEffect(() => {
    const savedReferenceStrength = sessionStorage.getItem('workspace_reference_strength');
    if (savedReferenceStrength) {
      setReferenceStrength(parseFloat(savedReferenceStrength));
    }

    const savedReferenceType = sessionStorage.getItem('workspace_reference_type');
    if (savedReferenceType) {
      setReferenceType(savedReferenceType as 'style' | 'composition' | 'character');
    }
  }, []);

  // Save reference state to session storage
  useEffect(() => {
    sessionStorage.setItem('workspace_reference_strength', referenceStrength.toString());
  }, [referenceStrength]);

  useEffect(() => {
    sessionStorage.setItem('workspace_reference_type', referenceType);
  }, [referenceType]);

  // Clear reference images when switching modes
  useEffect(() => {
    if (isVideoMode) {
      setReferenceImage(null);
      setReferenceImageUrl('');
    } else {
      setStartReferenceImage(null);
      setStartReferenceImageUrl('');
      setEndReferenceImage(null);
      setEndReferenceImageUrl('');
    }
  }, [isVideoMode]);

  // Update selected mode when URL mode changes, quality changes, or enhancement changes
  useEffect(() => {
    if (isVideoMode) {
      if (enhanced) {
        setSelectedMode(quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced');
      } else {
        setSelectedMode(quality === 'high' ? 'video_high' : 'video_fast');
      }
      // Reset image quantity for video mode
      setNumImages(1);
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
        referenceImage: referenceImage?.name,
        referenceStrength,
        referenceType
      });

      const generationRequest = {
        format: selectedMode,
        prompt: prompt.trim(),
        referenceImageUrl: isVideoMode ? undefined : referenceImageUrl || undefined,
        startReferenceImageUrl: isVideoMode ? startReferenceImageUrl || undefined : undefined,
        endReferenceImageUrl: isVideoMode ? endReferenceImageUrl || undefined : undefined,
        metadata: {
          reference_image: referenceImage || startReferenceImage || endReferenceImage ? true : false,
          reference_strength: referenceStrength,
          reference_type: referenceType,
          model_variant: selectedMode.startsWith('sdxl') ? 'lustify_sdxl' : 'wan_2_1_1_3b',
          num_images: numImages
        }
      };

      await generateContent(generationRequest);

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

  const handleRemoveFromWorkspace = (tileId: string) => {
    const tile = workspaceTiles.find(t => t.id === tileId);
    if (tile) {
      deleteTile(tile);
    }
  };

  // Clear workspace using the hook
  const handleClearWorkspace = () => {
    setIsClearing(true);
    setTimeout(() => {
      clearWorkspace();
      setIsClearing(false);
    }, 100);
  };

  const handleImageClick = (tile: any) => {
    if (tile.type === 'video') {
      setSelectedVideo({
        id: tile.id,
        url: tile.url,
        jobId: tile.originalAssetId,
        prompt: tile.prompt,
        type: tile.type,
        quality: tile.quality,
        modelType: tile.modelType,
        timestamp: tile.timestamp
      });
    } else {
      const index = workspaceTiles.findIndex(t => t.id === tile.id);
      if (index !== -1) {
        setLightboxIndex(index);
      }
    }
  };

  const handleCloseVideoModal = () => {
    setSelectedVideo(null);
  };

  const handleShowPromptInfo = (tile: any) => {
    setCurrentPromptAsset({
      id: tile.id,
      url: tile.url,
      jobId: tile.originalAssetId,
      prompt: tile.prompt,
      type: tile.type,
      quality: tile.quality,
      modelType: tile.modelType,
      timestamp: tile.timestamp
    });
    setShowPromptModal(true);
  };

  const handleClosePromptModal = () => {
    setShowPromptModal(false);
    setCurrentPromptAsset(null);
  };

  // Reference image handlers
  const handleReferenceImageChange = useCallback((file: File | null, url: string) => {
    setReferenceImage(file);
    setReferenceImageUrl(url);
  }, []);

  const handleClearReference = useCallback(() => {
    setReferenceImage(null);
    setReferenceImageUrl('');
  }, []);

  const handleStartReferenceChange = useCallback((file: File | null, url: string) => {
    setStartReferenceImage(file);
    setStartReferenceImageUrl(url);
  }, []);

  const handleEndReferenceChange = useCallback((file: File | null, url: string) => {
    setEndReferenceImage(file);
    setEndReferenceImageUrl(url);
  }, []);

  const handleClearStartReference = useCallback(() => {
    setStartReferenceImage(null);
    setStartReferenceImageUrl('');
  }, []);

  const handleClearEndReference = useCallback(() => {
    setEndReferenceImage(null);
    setEndReferenceImageUrl('');
  }, []);

  // Use as reference functionality
  const handleUseAsReference = useCallback((tile: any) => {
    if (isVideoMode) {
      // For video mode, ask user if it's start or end reference
      // For now, default to start reference
      setStartReferenceImage(null); // Clear file since we're using URL
      setStartReferenceImageUrl(tile.url);
      toast.success('Image set as video start reference');
    } else {
      // For image mode
      setReferenceImage(null); // Clear file since we're using URL  
      setReferenceImageUrl(tile.url);
      toast.success('Image set as reference');
    }
  }, [isVideoMode]);

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

  // Filter workspace tiles for lightbox (images only)
  const imageTiles = workspaceTiles.filter(tile => tile.type !== 'video');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Fixed Header */}
      <WorkspaceHeader onClearWorkspace={handleClearWorkspace} />

      {/* Main Content Area */}
      <div className="flex-1 pt-12">
        {/* Current Workspace */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Current Workspace ({workspaceTiles.length} assets)</h2>
          </div>
          
          {workspaceTiles.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {workspaceTiles.map((tile) => (
                <div key={tile.id} className="relative group">
                  {tile.type === 'video' ? (
                    <video
                      src={tile.url}
                      className="w-full aspect-square object-cover rounded-lg border border-border cursor-pointer hover:scale-105 transition"
                      muted
                      loop
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                      onClick={() => handleImageClick(tile)}
                    />
                  ) : (
                    <img
                      src={tile.url}
                      alt={`Workspace ${tile.id}`}
                      onClick={() => handleImageClick(tile)}
                      className="w-full aspect-square object-cover rounded-lg border border-border hover:scale-105 transition cursor-pointer"
                    />
                  )}
                  
                  {/* Action buttons */}
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    {tile.type === 'image' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseAsReference(tile);
                        }}
                        className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-primary/80 transition"
                        title="Use as Reference"
                      >
                        <Image className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleRemoveFromWorkspace(tile.id)}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                    disabled={deletingTiles.has(tile.id)}
                  >
                    {deletingTiles.has(tile.id) ? '⌛' : '×'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Workspace is empty. Generated images and videos will automatically appear here.</p>
            </div>
          )}
        </div>
        
        {/* Reference Controls Section */}
        {(referenceImageUrl || startReferenceImageUrl || endReferenceImageUrl) && (
          <div className="mt-4 mx-6 p-4 bg-muted/20 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Reference Settings</h3>
              <div className="flex items-center gap-2">
                <select
                  value={referenceType}
                  onChange={(e) => setReferenceType(e.target.value as 'style' | 'composition' | 'character')}
                  className="bg-background border border-border rounded px-2 py-1 text-xs"
                >
                  <option value="style">Style</option>
                  <option value="composition">Composition</option>
                  <option value="character">Character</option>
                </select>
                <button
                  onClick={() => {
                    if (isVideoMode) {
                      setStartReferenceImageUrl('');
                      setEndReferenceImageUrl('');
                    } else {
                      setReferenceImageUrl('');
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <ReferenceStrengthSlider
              value={referenceStrength}
              onChange={setReferenceStrength}
            />
            
            <div className="flex items-center gap-4 mt-3">
              {!isVideoMode && referenceImageUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Reference:</span>
                  <img src={referenceImageUrl} alt="Reference" className="w-8 h-8 rounded border object-cover" />
                </div>
              )}
              {isVideoMode && (
                <>
                  {startReferenceImageUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Start:</span>
                      <img src={startReferenceImageUrl} alt="Start Reference" className="w-8 h-8 rounded border object-cover" />
                    </div>
                  )}
                  {endReferenceImageUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">End:</span>
                      <img src={endReferenceImageUrl} alt="End Reference" className="w-8 h-8 rounded border object-cover" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
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
            onBeginningFrameUpload={() => {/* Enhanced reference upload handles this */}}
            onEndingFrameUpload={() => {/* Enhanced reference upload handles this */}}
            onSwitchToImage={() => {
              setIsVideoMode(false);
              setNumImages(1); // Reset to 1 when switching from video
            }}
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
            onReferenceImageUpload={() => {/* TODO: implement reference image upload */}}
            onSwitchToVideo={() => setIsVideoMode(true)}
            quality={quality}
            setQuality={setQuality}
            onLibraryClick={() => setShowLibraryModal(true)}
            enhanced={enhanced}
            setEnhanced={setEnhanced}
            numImages={numImages}
            setNumImages={setNumImages}
            referenceImage={referenceImage}
            referenceImageUrl={referenceImageUrl}
            onReferenceImageChange={handleReferenceImageChange}
            onClearReference={handleClearReference}
          />
        )}
      </div>

      {/* Workspace Content Modal */}
      {lightboxIndex !== null && imageTiles.length > 0 && (
        <WorkspaceContentModal
          tiles={imageTiles}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onRemoveFromWorkspace={(tileId) => {
            handleRemoveFromWorkspace(tileId);
            
            // Adjust lightbox index if needed
            const newImageTiles = imageTiles.filter(tile => tile.id !== tileId);
            if (newImageTiles.length === 0) {
              setLightboxIndex(null);
            } else if (lightboxIndex >= newImageTiles.length) {
              setLightboxIndex(newImageTiles.length - 1);
            }
          }}
          onDeleteFromLibrary={async (originalAssetId) => {
            try {
              const tile = workspaceTiles.find(t => t.originalAssetId === originalAssetId);
              if (tile) {
                await deleteTile(tile);
                toast.success('Deleted from library and removed from workspace');
                
                // Close modal if no assets left
                const remainingImageTiles = imageTiles.filter(t => t.originalAssetId !== originalAssetId);
                if (remainingImageTiles.length === 0) {
                  setLightboxIndex(null);
                } else if (lightboxIndex >= remainingImageTiles.length) {
                  setLightboxIndex(remainingImageTiles.length - 1);
                }
              }
            } catch (error) {
              console.error('Error deleting from library:', error);
              toast.error('Failed to delete from library');
            }
          }}
        />
      )}

      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={handleCloseVideoModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-lg pr-8">
              {selectedVideo?.prompt}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {selectedVideo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShowPromptInfo(selectedVideo)}
                  className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
              <button
                onClick={handleCloseVideoModal}
                className="rounded-full p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          
          {selectedVideo && (
            <div className="flex justify-center">
              <video
                controls
                className="max-w-full max-h-[70vh] rounded"
                autoPlay
              >
                <source src={selectedVideo.url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Prompt Info Modal */}
      {currentPromptAsset && (
        <PromptInfoModal
          isOpen={showPromptModal}
          onClose={handleClosePromptModal}
          prompt={currentPromptAsset.prompt}
          quality={(currentPromptAsset.quality as 'fast' | 'high') || "fast"}
          mode={currentPromptAsset.type || 'image'}
          timestamp={currentPromptAsset.timestamp || new Date()}
          contentCount={1}
          itemId={currentPromptAsset.jobId}
          originalImageUrl={currentPromptAsset.type === 'image' ? currentPromptAsset.url : undefined}
        />
      )}

      {/* Library Import Modal */}
      <LibraryImportModal
        open={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        onImport={(importedAssets) => {
          // Use the workspace hook to add imported assets
          const assetIds = importedAssets.map(asset => asset.id);
          addToWorkspace(assetIds);
          setShowLibraryModal(false);
          toast.success(`Added ${importedAssets.length} assets to workspace`);
        }}
      />
    </div>
  );
};

export default Workspace;