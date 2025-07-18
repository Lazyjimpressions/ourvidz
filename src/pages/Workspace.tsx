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
import { MultiReferencePanel } from '@/components/workspace/MultiReferencePanel';
import { CharacterReferenceWarning } from '@/components/workspace/CharacterReferenceWarning';
import { SeedDisplay } from '@/components/workspace/SeedDisplay';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Info, Image, Dice6 } from 'lucide-react';
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
  seed?: string | number;
  referenceStrength?: number;
  negativePrompt?: string;
  generationParams?: any;
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
  
  // Multi-reference state (connected to MultiReferencePanel)
  const [activeReferences, setActiveReferences] = useState<any[]>([]);
  const [referenceStrength, setReferenceStrength] = useState(0.900); // Default to 0.900 for better consistency
  
  // Legacy reference state (kept for backwards compatibility)
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  const [referenceType, setReferenceType] = useState<'style' | 'composition' | 'character'>('character');
  
  // New prompt optimization and seed state
  const [optimizeForCharacter, setOptimizeForCharacter] = useState(false);
  const [seed, setSeed] = useState<number | undefined>();
  
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
      setActiveReferences([]);
    } else {
      setActiveReferences([]);
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
      setNumImages(1);
    } else {
      if (enhanced) {
        setSelectedMode(quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced');
      } else {
        setSelectedMode(quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast');
      }
    }
  }, [isVideoMode, quality, enhanced]);

  // Helper function to apply optional prompt optimizations ONLY when enabled
  const optimizePromptForCharacter = (originalPrompt: string) => {
    if (!optimizeForCharacter) {
      console.log('🎭 Character optimization disabled, using original prompt:', originalPrompt);
      return originalPrompt;
    }
    
    let optimizedPrompt = originalPrompt.trim();
    
    // Only apply these specific optimizations when explicitly enabled
    optimizedPrompt = optimizedPrompt.replace(/same girl/gi, 'this person');
    optimizedPrompt = optimizedPrompt.replace(/same person/gi, 'this person');
    
    // Add single portrait instruction to prevent split-screen
    if (!optimizedPrompt.includes('single portrait') && !optimizedPrompt.includes('portrait')) {
      optimizedPrompt = `${optimizedPrompt}, single portrait`;
    }
    
    // Add solo if not present and not contradictory
    if (!optimizedPrompt.includes('solo') && !optimizedPrompt.includes('group') && !optimizedPrompt.includes('multiple')) {
      optimizedPrompt = `${optimizedPrompt}, solo`;
    }
    
    console.log('🎭 Character optimization applied:', {
      original: originalPrompt,
      optimized: optimizedPrompt,
      enabled: optimizeForCharacter
    });
    
    return optimizedPrompt;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (generationError) {
      clearError();
    }

    try {
      // Build reference metadata from MultiReferencePanel
      const enabledReferences = activeReferences.filter(ref => ref.enabled && ref.url);
      const referenceMetadata: any = {
        model_variant: selectedMode.startsWith('sdxl') ? 'lustify_sdxl' : 'wan_2_1_1_3b',
        num_images: numImages
      };

      // Apply optional prompt optimization ONLY when explicitly enabled
      let finalPrompt = prompt.trim();
      const hasCharacterReference = enabledReferences.some(ref => ref.id === 'character');
      
      if (hasCharacterReference && optimizeForCharacter) {
        finalPrompt = optimizePromptForCharacter(finalPrompt);
      }
      
      // Add reference data if we have active references
      if (enabledReferences.length > 0) {
        referenceMetadata.reference_image = true;
        referenceMetadata.reference_strength = referenceStrength; // Use the exact value from slider
        
        // Set reference type based on the primary reference
        const characterRef = enabledReferences.find(ref => ref.id === 'character');
        if (characterRef) {
          referenceMetadata.reference_type = 'character';
          referenceMetadata.character_consistency = true;
        } else if (enabledReferences.find(ref => ref.id === 'style')) {
          referenceMetadata.reference_type = 'style';
        } else if (enabledReferences.find(ref => ref.id === 'composition')) {
          referenceMetadata.reference_type = 'composition';
        }

        // Use the first enabled reference URL (prioritize character > style > composition)
        const primaryReference = enabledReferences.find(ref => ref.id === 'character') ||
                               enabledReferences.find(ref => ref.id === 'style') ||
                               enabledReferences[0];
        
        referenceMetadata.reference_url = primaryReference.url;
        referenceMetadata.reference_source = primaryReference.isWorkspaceAsset ? 'workspace' : 'upload';
      }

      // Add seed if provided
      if (seed !== undefined) {
        referenceMetadata.seed = seed;
      }

      console.log('🚀 Starting generation with corrected settings:', {
        format: selectedMode,
        originalPrompt: prompt.trim(),
        finalPrompt,
        optimizationEnabled: optimizeForCharacter,
        activeReferences: enabledReferences,
        referenceStrength: referenceStrength, // Log the actual value being used
        numImages,
        seed
      });

      // Build generation request
      const generationRequest = {
        format: selectedMode,
        prompt: finalPrompt,
        referenceImageUrl: enabledReferences.length > 0 ? enabledReferences[0].url : undefined,
        metadata: referenceMetadata
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
      timestamp: tile.timestamp,
      seed: tile.generationParams?.seed || tile.seed,
      referenceStrength: tile.generationParams?.reference_strength,
      negativePrompt: tile.generationParams?.negative_prompt
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

  // Multi-reference handlers for MultiReferencePanel
  const handleReferencesChange = useCallback((references: any[]) => {
    setActiveReferences(references);
  }, []);

  const handleClearReferences = useCallback(() => {
    setActiveReferences([]);
  }, []);

  // Use as reference functionality
  const handleUseAsReference = useCallback((tile: any) => {
    // Add to active references via MultiReferencePanel
    const newReference = {
      id: 'character', // Always use character for workspace assets
      url: tile.url,
      enabled: true,
      isWorkspaceAsset: true,
      originalPrompt: tile.prompt,
      modelType: tile.modelType,
      quality: tile.quality
    };
    
    // Replace any existing character reference or add as new
    setActiveReferences(prev => {
      const filtered = prev.filter(ref => ref.id !== 'character');
      return [...filtered, newReference];
    });
    
    toast.success('Image set as character reference');
  }, []);

  // NEW: Use seed from workspace asset
  const handleUseSeed = useCallback((tile: any) => {
    const tileSeed = tile.generationParams?.seed || tile.seed;
    if (tileSeed) {
      setSeed(tileSeed);
      toast.success(`Using seed ${tileSeed} for generation`);
    } else {
      toast.error('No seed information available for this image');
    }
  }, []);

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

  // Check if character reference is active
  const hasCharacterReference = activeReferences.some(ref => 
    ref.enabled && ref.id === 'character' && ref.url
  );

  // Filter workspace tiles for lightbox (images only)
  const imageTiles = workspaceTiles.filter(tile => tile.type !== 'video');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Fixed Header */}
      <WorkspaceHeader onClearWorkspace={handleClearWorkspace} />

      {/* Main Content Area */}
      <div className="flex-1 pt-12">
        {/* Character Reference Warning */}
        {hasCharacterReference && (
          <div className="p-6 pb-0">
            <CharacterReferenceWarning
              hasCharacterReference={hasCharacterReference}
              referenceStrength={referenceStrength}
              numImages={numImages}
              onOptimizeChange={setOptimizeForCharacter}
              optimizeEnabled={optimizeForCharacter}
              seed={seed}
              onSeedChange={setSeed}
            />
          </div>
        )}

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
                      draggable="true"
                      onDragStart={(e) => {
                        const assetData = {
                          url: tile.url,
                          thumbnailUrl: tile.thumbnailUrl,
                          prompt: tile.prompt,
                          modelType: tile.modelType,
                          quality: tile.quality,
                          type: tile.type,
                          duration: tile.duration,
                          generationParams: {
                            originalAssetId: tile.originalAssetId,
                            timestamp: tile.timestamp,
                            seed: tile.generationParams?.seed || tile.seed
                          }
                        };
                        e.dataTransfer.setData('application/workspace-asset', JSON.stringify(assetData));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      style={{ cursor: 'move' }}
                      title={`${tile.prompt}${tile.generationParams?.seed ? ` | Seed: ${tile.generationParams.seed}` : ''}`}
                    />
                  ) : (
                    <img
                      src={tile.url}
                      alt={`Workspace ${tile.id}`}
                      onClick={() => handleImageClick(tile)}
                      className="w-full aspect-square object-cover rounded-lg border border-border hover:scale-105 transition cursor-pointer"
                      draggable="true"
                      onDragStart={(e) => {
                        const assetData = {
                          url: tile.url,
                          prompt: tile.prompt,
                          modelType: tile.modelType,
                          quality: tile.quality,
                          type: tile.type,
                          generationParams: {
                            originalAssetId: tile.originalAssetId,
                            timestamp: tile.timestamp,
                            seed: tile.generationParams?.seed || tile.seed
                          }
                        };
                        e.dataTransfer.setData('application/workspace-asset', JSON.stringify(assetData));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      style={{ cursor: 'move' }}
                      title={`${tile.prompt}${tile.generationParams?.seed ? ` | Seed: ${tile.generationParams.seed}` : ''}`}
                    />
                  )}
                  
                  {/* Action buttons */}
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    {tile.type === 'image' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUseAsReference(tile);
                          }}
                          className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-primary/80 transition"
                          title="Use as Character Reference"
                        >
                          <Image className="w-3 h-3" />
                        </button>
                        {(tile.generationParams?.seed || tile.seed) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseSeed(tile);
                            }}
                            className="bg-secondary text-secondary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-secondary/80 transition"
                            title={`Use seed ${tile.generationParams?.seed || tile.seed}`}
                          >
                            <Dice6 className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleRemoveFromWorkspace(tile.id)}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                    disabled={deletingTiles.has(tile.id)}
                  >
                    {deletingTiles.has(tile.id) ? '⌛' : '×'}
                  </button>

                  {/* Seed display in bottom corner */}
                  {(tile.generationParams?.seed || tile.seed) && (
                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition">
                      <SeedDisplay 
                        seed={tile.generationParams?.seed || tile.seed}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Workspace is empty. Generated images and videos will automatically appear here.</p>
            </div>
          )}
        </div>
        
        {/* Multi-Reference Panel - Connected to Generation Pipeline */}
        <MultiReferencePanel
          mode={isVideoMode ? 'video' : 'image'}
          strength={referenceStrength}
          onStrengthChange={setReferenceStrength}
          onReferencesChange={handleReferencesChange}
          onClear={handleClearReferences}
        />
      </div>

      {/* Scroll Navigation */}
      <ScrollNavigation />

      {/* Bottom Input Controls - Simplified (No Reference Upload) */}
      <div className="p-6 bg-black">
        {isVideoMode ? (
          <VideoInputControls
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            onSwitchToImage={() => {
              setIsVideoMode(false);
              setNumImages(1); // Reset to 1 for image mode
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
            onSwitchToVideo={() => setIsVideoMode(true)}
            quality={quality}
            setQuality={setQuality}
            onLibraryClick={() => setShowLibraryModal(true)}
            enhanced={enhanced}
            setEnhanced={setEnhanced}
            numImages={numImages}
            setNumImages={setNumImages}
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
          seed={typeof currentPromptAsset.seed === 'string' ? parseInt(currentPromptAsset.seed) : currentPromptAsset.seed}
          modelType={currentPromptAsset.modelType}
          referenceStrength={currentPromptAsset.referenceStrength}
          negativePrompt={currentPromptAsset.negativePrompt}
          generationParams={currentPromptAsset.generationParams}
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
