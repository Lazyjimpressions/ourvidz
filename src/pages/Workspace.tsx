
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { VideoReferencePanel } from '@/components/workspace/VideoReferencePanel';
import { CharacterReferenceWarning } from '@/components/workspace/CharacterReferenceWarning';
import { SeedDisplay } from '@/components/workspace/SeedDisplay';
import { Button } from '@/components/ui/button';
import { Image, Dice6 } from 'lucide-react';
import { WorkspaceContentModal } from '@/components/WorkspaceContentModal';

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
  const [referenceStrength, setReferenceStrength] = useState(0.85); // Default to 0.85 for optimal character consistency
  
  // Video reference state (for video mode)
  const [videoReferences, setVideoReferences] = useState<Array<{
    id: 'start' | 'end';
    label: string;
    description: string;
    enabled: boolean;
    file?: File | null;
    url?: string;
    isWorkspaceAsset?: boolean;
    originalPrompt?: string;
    enhancedPrompt?: string;
    seed?: string;
    modelType?: string;
    quality?: 'fast' | 'high';
    generationParams?: Record<string, any>;
  }>>([
    { id: 'start', label: 'Starting Point', description: 'Initial frame for video generation', enabled: false },
    { id: 'end', label: 'Ending Point', description: 'Final frame for video generation', enabled: false }
  ]);
  
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
  
  // Unified modal state - only one modal system
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  // Reference button state
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  
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
      // Build reference metadata based on mode
      let referenceMetadata: any = {
        model_variant: selectedMode.startsWith('sdxl') ? 'lustify_sdxl' : 'wan_2_1_1_3b',
        num_images: numImages
      };

      // Apply optional prompt optimization ONLY when explicitly enabled
      let finalPrompt = prompt.trim();
      
      if (isVideoMode) {
        // VIDEO MODE: Handle video references (start/end frames)
        const enabledVideoReferences = videoReferences.filter(ref => ref.enabled && ref.url);
        
        if (enabledVideoReferences.length > 0) {
          referenceMetadata.reference_image = true;
          referenceMetadata.reference_strength = referenceStrength;
          
          // Add start and end reference URLs if available
          const startRef = enabledVideoReferences.find(ref => ref.id === 'start');
          const endRef = enabledVideoReferences.find(ref => ref.id === 'end');
          
          if (startRef) {
            referenceMetadata.start_reference_url = startRef.url;
            referenceMetadata.start_reference_source = startRef.isWorkspaceAsset ? 'workspace' : 'upload';
          }
          
          if (endRef) {
            referenceMetadata.end_reference_url = endRef.url;
            referenceMetadata.end_reference_source = endRef.isWorkspaceAsset ? 'workspace' : 'upload';
          }
          
          // For video mode, use character reference type by default
          referenceMetadata.reference_type = 'character';
          referenceMetadata.character_consistency = true;
          
          console.log('🎬 Video references configured:', {
            startRef: startRef?.url,
            endRef: endRef?.url,
            strength: referenceStrength
          });
        }
      } else {
        // IMAGE MODE: Handle image references (style/composition/character)
        const enabledReferences = activeReferences.filter(ref => ref.enabled && ref.url);
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
        activeReferences: isVideoMode ? videoReferences : activeReferences,
        referenceStrength: referenceStrength, // Log the actual value being used
        numImages,
        seed,
        isVideoMode
      });

      // Build generation request
      const generationRequest = {
        format: selectedMode,
        prompt: finalPrompt,
        referenceImageUrl: isVideoMode 
          ? (videoReferences.find(ref => ref.enabled && ref.url)?.url || undefined)
          : (activeReferences.find(ref => ref.enabled && ref.url)?.url || undefined),
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

  // Unified modal handler for both images and videos
  const handleImageClick = (tile: any) => {
    const index = workspaceTiles.findIndex(t => t.id === tile.id);
    if (index !== -1) {
      setLightboxIndex(index);
    }
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

  // Initialize default references structure
  const defaultReferences = useMemo(() => [
    { id: 'style', label: 'Style', description: 'Transfer artistic style and visual aesthetics', enabled: false },
    { id: 'composition', label: 'Composition', description: 'Match layout, positioning, and structure', enabled: false },
    { id: 'character', label: 'Character', description: 'Preserve character appearance and features', enabled: false }
  ], []);

  // Multi-reference handlers for MultiReferencePanel
  const handleReferencesChange = useCallback((references: any[]) => {
    setActiveReferences(references);
  }, []);

  const handleClearReferences = useCallback(() => {
    setActiveReferences([]);
  }, []);

  // Video reference handlers for VideoReferencePanel
  const handleVideoReferencesChange = useCallback((references: any[]) => {
    setVideoReferences(references);
  }, []);

  const handleClearVideoReferences = useCallback(() => {
    setVideoReferences([
      { id: 'start' as const, label: 'Starting Point', description: 'Initial frame for video generation', enabled: false },
      { id: 'end' as const, label: 'Ending Point', description: 'Final frame for video generation', enabled: false }
    ]);
  }, []);

  // Use as reference functionality
  const handleUseAsReference = useCallback((tile: any) => {
    // Create character reference with proper structure
    const characterReference = {
      id: 'character',
      label: 'Character',
      description: 'Preserve character appearance and features',
      url: tile.url,
      enabled: true,
      isWorkspaceAsset: true,
      originalPrompt: tile.prompt,
      modelType: tile.modelType,
      quality: tile.quality,
      generationParams: tile.generationParams
    };
    
    // Update references: replace character, keep others
    setActiveReferences(prev => {
      const otherRefs = prev.filter(ref => ref.id !== 'character');
      return [...otherRefs, characterReference];
    });
    
    // Show reference panel if not already visible
    if (!showReferencePanel) {
      setShowReferencePanel(true);
    }
    
    toast.success('Image set as character reference');
  }, [showReferencePanel]);

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

  // Reference button handler
  const handleReferenceClick = useCallback(() => {
    setShowReferencePanel(!showReferencePanel);
  }, [showReferencePanel]);

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
        
        {/* Reference Panel - Connected to Generation Pipeline */}
        {showReferencePanel && (
          isVideoMode ? (
            <VideoReferencePanel
              strength={referenceStrength}
              onStrengthChange={setReferenceStrength}
              onReferencesChange={handleVideoReferencesChange}
              onClear={handleClearVideoReferences}
              references={videoReferences}
            />
          ) : (
            <MultiReferencePanel
              mode="image"
              strength={referenceStrength}
              onStrengthChange={setReferenceStrength}
              onReferencesChange={handleReferencesChange}
              onClear={handleClearReferences}
              references={activeReferences.length > 0 ? activeReferences : defaultReferences}
            />
          )
        )}
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
            hasReference={videoReferences.some(ref => ref.enabled && ref.url)}
            onReferenceClick={handleReferenceClick}
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
            hasReference={activeReferences.some(ref => ref.enabled && ref.url)}
            onReferenceClick={handleReferenceClick}
          />
        )}
      </div>

      {/* Unified Modal System - WorkspaceContentModal handles everything */}
      {lightboxIndex !== null && workspaceTiles.length > 0 && (
        <WorkspaceContentModal
          tiles={workspaceTiles}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onRemoveFromWorkspace={(tileId) => {
            handleRemoveFromWorkspace(tileId);
            
            // Adjust lightbox index if needed
            const newTiles = workspaceTiles.filter(tile => tile.id !== tileId);
            if (newTiles.length === 0) {
              setLightboxIndex(null);
            } else if (lightboxIndex >= newTiles.length) {
              setLightboxIndex(newTiles.length - 1);
            }
          }}
          onDeleteFromLibrary={async (originalAssetId) => {
            try {
              const tile = workspaceTiles.find(t => t.originalAssetId === originalAssetId);
              if (tile) {
                await deleteTile(tile);
                toast.success('Deleted from library and removed from workspace');
                
                // Close modal if no assets left
                const remainingTiles = workspaceTiles.filter(t => t.originalAssetId !== originalAssetId);
                if (remainingTiles.length === 0) {
                  setLightboxIndex(null);
                } else if (lightboxIndex >= remainingTiles.length) {
                  setLightboxIndex(remainingTiles.length - 1);
                }
              }
            } catch (error) {
              console.error('Error deleting from library:', error);
              toast.error('Failed to delete from library');
            }
          }}
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
