import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLibraryFirstWorkspace } from '@/hooks/useLibraryFirstWorkspace';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';
import { SimplePromptInput } from '@/components/workspace/SimplePromptInput';
import { SharedGrid } from '@/components/shared/SharedGrid';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { SharedLightbox, WorkspaceAssetActions } from '@/components/shared/SharedLightbox';
import { uploadReferenceImage as uploadReferenceFile, getReferenceImageUrl } from '@/lib/storage';
import { extractReferenceMetadata } from '@/utils/extractReferenceMetadata';
import { toSharedFromWorkspace } from '@/lib/services/AssetMappers';
import { useSignedAssets } from '@/lib/hooks/useSignedAssets';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * LIBRARY-FIRST: Desktop workspace using library-first generation architecture
 * 
 * Features:
 * - Library-first generation (all assets go to library first)
 * - Fixed bottom control bar with SimplePromptInput
 * - WorkspaceGrid for session-only assets
 * - URL param mode support (image/video)
 * - Drag-drop metadata extraction
 * - Full generation controls
 */
export const SimplifiedWorkspace: React.FC = () => {
  console.log('🚀 SimplifiedWorkspace: Component rendering...');
  
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const processedRef = useRef(false);
  
  // Note: Signed URLs now handled centrally in useLibraryFirstWorkspace hook

  
  console.log('🚀 SimplifiedWorkspace: About to call useLibraryFirstWorkspace...');
  
  // Library-first workspace state - single hook call
  const {
    // Core State
    mode,
    prompt,
    referenceImage,
    referenceImageUrl,
    referenceStrength,
    contentType,
    quality,
    selectedModel,
    // Video State
    beginningRefImage,
    endingRefImage,
    videoDuration,
    motionIntensity,
    soundEnabled,
    // Control Parameters
    aspectRatio,
    shotType,
    cameraAngle,
    style,
    styleRef,
    enhancementModel,
    referenceType,
    // UI State
    isGenerating,
    workspaceAssets,
    activeJobId,
    lightboxIndex,
    referenceMetadata,
    exactCopyMode,
    useOriginalParams,
    lockSeed,
    // Advanced SDXL Settings
    numImages,
    steps,
    guidanceScale,
    negativePrompt,
    compelEnabled,
    compelWeights,
    seed,
    // Actions
    updateMode,
    setPrompt,
    setReferenceImage,
    setReferenceImageUrl,
    setReferenceStrength,
    setContentType,
    setQuality,
    setSelectedModel,
    setBeginningRefImage,
    setEndingRefImage,
    setVideoDuration,
    setMotionIntensity,
    setSoundEnabled,
    setAspectRatio,
    setShotType,
    setCameraAngle,
    setStyle,
    setStyleRef,
    setEnhancementModel,
    setReferenceType,
    generate,
    clearWorkspace,
    deleteAllWorkspace,
    deleteItem,
    clearItem,
    setLightboxIndex,
    selectJob,
    deleteJob,
    clearJob,
    saveJob,
    useJobAsReference,
    applyAssetParamsFromItem,
    applyExactCopyParamsFromItem,
    setExactCopyMode,
    setUseOriginalParams,
    setLockSeed,
    updateEnhancementModel,
    setReferenceMetadata,
    // Advanced SDXL Settings Actions
    setNumImages,
    setSteps,
    setGuidanceScale,
    setNegativePrompt,
    setCompelEnabled,
    setCompelWeights,
    setSeed,
    // Debug controls
    bypassEnhancement,
    setBypassEnhancement,
    hardOverride,
    setHardOverride,
    // URL Management
    registerAssetRef,
    signedUrls,
    isUrlLoading
  } = useLibraryFirstWorkspace();

  // Honor URL param mode - stable sync
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if ((urlMode === 'video' || urlMode === 'image') && urlMode !== mode) {
      updateMode(urlMode);
    }
  }, [location.search, mode, updateMode]);

  // Handle incoming reference image from library - prevent re-processing
  useEffect(() => {
    console.log('🖼️ Workspace: Checking location.state:', location.state);
    const state = location.state as any;
    if (state?.referenceUrl && state?.prompt && !processedRef.current) {
      console.log('🖼️ Setting reference image from library:', state);
      processedRef.current = true;
      
      // Set the prompt from the reference asset
      setPrompt(state.prompt);
      
      // Convert the signed URL to a File object for the reference image
      const setReferenceFromUrl = async () => {
        try {
          const response = await fetch(state.referenceUrl);
          const blob = await response.blob();
          const file = new File([blob], `reference.${blob.type.split('/')[1]}`, {
            type: blob.type
          });
          setReferenceImage(file);
          
          // Set reference strength for modify mode (default from library)
          setReferenceStrength(0.6);
          
          // Explicitly set modify mode for library references
          setExactCopyMode(false);
          
          // Ensure image mode is active
          updateMode('image');
          
          toast({ title: "Reference image loaded from library" });
        } catch (error) {
          console.error('Failed to load reference image:', error);
          toast({ title: "Failed to load reference image", variant: "destructive" });
        }
      };

      setReferenceFromUrl();
      
      // Clear the navigation state properly for React Router
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location.state, setPrompt, setReferenceImage, setReferenceMetadata, setExactCopyMode, toast, navigate, location.pathname, location.search, updateMode, setReferenceStrength]);

  // Convert workspace assets to shared format - use proper URL signing approach
  const sharedAssets = useMemo(() => {
    return workspaceAssets.map(toSharedFromWorkspace);
  }, [workspaceAssets]);

  // Use established URL signing approach: sign thumbnails (SDXL), lazy-sign originals (RV5.1)
  const { signedAssets } = useSignedAssets(sharedAssets, 'workspace-temp', {
    thumbTtlSec: 1800, // 30 minutes for thumbnails
    originalTtlSec: 3600 // 1 hour for originals
  });

  // Note: Signed URL generation now handled centrally in useLibraryFirstWorkspace hook

  // Auth loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Please sign in to access the workspace.</p>
      </div>
    );
  }

  // Workspace management handlers
  const handleEditItem = (item: UnifiedAsset) => {
    // Set the prompt to the item's prompt for editing
    setPrompt(item.prompt || '');
    // Load generation parameters if available
    if (item.metadata?.referenceStrength) {
      setReferenceStrength(item.metadata.referenceStrength);
    }
  };

  const handleSaveItem = async (item: UnifiedAsset) => {
    try {
      await WorkspaceAssetService.saveToLibrary(item.id);
      
      toast({
        title: "Asset saved",
        description: "Asset has been saved to your library",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['assets', true] });
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      
    } catch (error) {
      console.error('Failed to save asset:', error);
      toast({
        title: "Save failed",
        description: "Failed to save asset to library",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (item: UnifiedAsset) => {
    // Use hook-provided action with optimistic removal
    await deleteItem(item.id, item.type);
  };

  const handleClearItem = async (item: UnifiedAsset) => {
    // Use hook-provided action with optimistic removal  
    await clearItem(item.id, item.type);
  };

  const handleViewItem = (item: UnifiedAsset) => {
    const index = workspaceAssets.findIndex(asset => asset.id === item.id);
    if (index !== -1) {
      setLightboxIndex(index);
    }
  };

  const handleDownloadItem = async (item: UnifiedAsset) => {
    try {
      // Use item.url which now includes signed URL from hook
      const downloadUrl = item.url;
      
      if (!downloadUrl) {
        console.error('Asset URL not available for download');
        toast({
          title: "Download failed",
          description: "Asset URL not available",
          variant: "destructive",
        });
        return;
      }
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${item.prompt?.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${item.type === 'video' ? 'mp4' : 'png'}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download asset:', error);
      toast({
        title: "Download failed",
        description: "Failed to download asset",
        variant: "destructive",
      });
    }
  };

  const handleUseAsReference = async (item: UnifiedAsset) => {
    try {
      // Sign the original image to get the proper URL
      let originalUrl = item.url;
      if ((item as any).signOriginal) {
        originalUrl = await (item as any).signOriginal();
      }
      
      if (!originalUrl) {
        toast({
          title: "Error",
          description: "Could not find image URL for reference",
          variant: "destructive",
        });
        return;
      }

      // Set as reference URL (modify mode by default)
      setReferenceImageUrl(originalUrl);
      setReferenceImage(null);
      
      // Explicitly set modify mode (not exact copy)
      setExactCopyMode(false);
      setLockSeed(false);
      setReferenceStrength(0.6);
      
      // Apply parameters for modify mode
      applyAssetParamsFromItem(item);
      
      console.log('🎯 LIGHTBOX USE AS REF: Applied modify parameters', {
        exactCopyMode: false,
        lockSeed: false,
        referenceStrength: 0.6,
        originalUrl,
        entryPath: 'lightbox_use_as_ref'
      });
      
      toast({
        title: "Reference set",
        description: "Asset added to reference box (modify mode)",
      });
    } catch (error) {
      console.error('Failed to use item as reference:', error);
      toast({
        title: "Reference failed",
        description: "Failed to set asset as reference",
        variant: "destructive",
      });
    }
  };

  // New handler for sending to ref box (modify mode)
  const handleSendToRef = async (item: UnifiedAsset) => {
    try {
      // Sign the original image to get the proper URL
      let originalUrl = item.url;
      if ((item as any).signOriginal) {
        originalUrl = await (item as any).signOriginal();
      }
      
      if (originalUrl) {
        setReferenceImageUrl(originalUrl);
        setReferenceImage(null);
        
        // Explicitly set modify mode (not exact copy)
        setExactCopyMode(false);
        setLockSeed(false);
        setReferenceStrength(0.6);
        
        // Apply parameters
        applyAssetParamsFromItem(item);
        
        console.log('🎯 SEND TO REF: Applied modify parameters', {
          exactCopyMode: false,
          lockSeed: false,
          referenceStrength: 0.6,
          originalUrl,
          entryPath: 'tile_add_to_ref'
        });
        
        toast({
          title: "Reference set",
          description: "Asset added to reference box (modify mode)",
        });
      }
    } catch (error) {
      console.error('Failed to set reference:', error);
      toast({
        title: "Error",
        description: "Failed to set reference image",
        variant: "destructive",
      });
    }
  };

  const handleUseSeed = (item: UnifiedAsset) => {
    if (item.metadata?.seed) {
      // Apply seed and enable lock (stay in current mode)
      setLockSeed(true);
      applyAssetParamsFromItem(item);
      
      console.log('🎯 USE SEED: Applied seed lock', {
        seed: item.metadata.seed,
        lockSeed: true,
        exactCopyMode: exactCopyMode, // Keep current mode
        entryPath: 'use_seed'
      });
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <WorkspaceHeader 
          onClearWorkspace={clearWorkspace}
          onDeleteAllWorkspace={deleteAllWorkspace}
        />
        
        {/* Main content area with bottom padding for fixed control bar */}
        <main className="flex-1 pb-32">
          <div className="container mx-auto px-4 py-6">
            <SharedGrid
          assets={signedAssets}
          onPreview={(asset) => {
            const index = workspaceAssets.findIndex(a => a.id === asset.id);
            if (index !== -1) setLightboxIndex(index);
          }}
          actions={{
            onSaveToLibrary: (asset: any) => handleSaveItem(asset as UnifiedAsset),
            onDiscard: (asset: any) => handleDeleteItem(asset as UnifiedAsset),
            onSendToRef: (asset: any) => handleSendToRef(asset as UnifiedAsset),
            onDownload: (asset: any) => handleDownloadItem(asset as UnifiedAsset),
            onUseAsReference: (asset: any) => handleUseAsReference(asset as UnifiedAsset)
          }}
          isLoading={false}
            />
          </div>
        </main>

        {/* Fixed bottom control bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40">
            <SimplePromptInput
              prompt={prompt}
              onPromptChange={setPrompt}
              mode={mode}
              onModeChange={updateMode}
              contentType={contentType}
              onContentTypeChange={setContentType}
              quality={quality}
              onQualityChange={setQuality}
              isGenerating={isGenerating}
              onGenerate={generate}
              referenceImage={referenceImage}
              onReferenceImageChange={setReferenceImage}
              referenceImageUrl={referenceImageUrl}
              onReferenceImageUrlChange={setReferenceImageUrl}
              referenceStrength={referenceStrength}
              onReferenceStrengthChange={setReferenceStrength}
            beginningRefImage={beginningRefImage}
            onBeginningRefImageChange={setBeginningRefImage}
            endingRefImage={endingRefImage}
            onEndingRefImageChange={setEndingRefImage}
            videoDuration={videoDuration}
            onVideoDurationChange={setVideoDuration}
            motionIntensity={motionIntensity}
            onMotionIntensityChange={setMotionIntensity}
            soundEnabled={soundEnabled}
            onSoundToggle={setSoundEnabled}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            shotType={shotType}
            onShotTypeChange={setShotType}
            cameraAngle={cameraAngle}
            onCameraAngleChange={setCameraAngle}
            style={style}
            onStyleChange={setStyle}
            styleRef={styleRef}
            onStyleRefChange={setStyleRef}
            enhancementModel={enhancementModel}
            onEnhancementModelChange={setEnhancementModel}
            selectedModel={selectedModel}
            onSelectedModelChange={setSelectedModel}
            exactCopyMode={exactCopyMode}
            onExactCopyModeChange={setExactCopyMode}
            useOriginalParams={useOriginalParams}
            onUseOriginalParamsChange={setUseOriginalParams}
            lockSeed={lockSeed}
            onLockSeedChange={setLockSeed}
            referenceMetadata={referenceMetadata}
            onReferenceMetadataChange={setReferenceMetadata}
            workspaceAssets={workspaceAssets}
            numImages={numImages}
            onNumImagesChange={setNumImages}
            steps={steps}
            onStepsChange={setSteps}
            guidanceScale={guidanceScale}
            onGuidanceScaleChange={setGuidanceScale}
            negativePrompt={negativePrompt}
            onNegativePromptChange={setNegativePrompt}
            referenceType={referenceType}
            onReferenceTypeChange={setReferenceType}
            compelEnabled={compelEnabled}
            onCompelEnabledChange={setCompelEnabled}
            compelWeights={compelWeights}
            onCompelWeightsChange={setCompelWeights}
            seed={seed}
            onSeedChange={setSeed}
            onBypassEnhancement={bypassEnhancement}
            onBypassEnhancementChange={setBypassEnhancement}
            onHardOverride={hardOverride}
            onHardOverrideChange={setHardOverride}
          />
        </div>
      </div>
      
      {/* Lightbox */}
      {lightboxIndex !== null && signedAssets.length > 0 && (
        <SharedLightbox
          assets={signedAssets}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onRequireOriginalUrl={async (asset: any) => {
            // Use signOriginal function if available, otherwise fallback to url
            if ((asset as any).signOriginal) {
              return (asset as any).signOriginal();
            }
            return (asset as any).url || asset.url;
          }}
          actionsSlot={(asset: any) => (
            <WorkspaceAssetActions
              asset={asset}
              onSave={() => handleSaveItem(asset as UnifiedAsset)}
              onDiscard={() => handleDeleteItem(asset as UnifiedAsset)}
              onDownload={() => handleDownloadItem(asset as UnifiedAsset)}
              onUseAsReference={() => handleUseAsReference(asset as UnifiedAsset)}
            />
          )}
        />
      )}
    </>
  );
};


// Make it the default export to maintain compatibility
export default SimplifiedWorkspace;