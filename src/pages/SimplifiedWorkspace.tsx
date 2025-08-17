import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLibraryFirstWorkspace } from '@/hooks/useLibraryFirstWorkspace';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';
import { SimplePromptInput } from '@/components/workspace/SimplePromptInput';
import { WorkspaceGrid } from '@/components/workspace';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { SimpleLightbox } from '@/components/workspace/SimpleLightbox';
import { uploadReferenceImage as uploadReferenceFile, getReferenceImageUrl } from '@/lib/storage';
import { extractReferenceMetadata } from '@/utils/extractReferenceMetadata';
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
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Note: Signed URLs now handled centrally in useLibraryFirstWorkspace hook

  // Library-first workspace state
  const {
    // Core State
    mode,
    prompt,
    referenceImage,
    referenceStrength,
    contentType,
    quality,
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
    setReferenceStrength,
    setContentType,
    setQuality,
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
    setSeed
  } = useLibraryFirstWorkspace();

  // Honor URL param mode
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'video' || urlMode === 'image') {
      updateMode(urlMode);
    }
  }, [searchParams, updateMode]);

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
      queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
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
    try {
      await WorkspaceAssetService.discardAsset(item.id);
      
      toast({
        title: "Asset deleted",
        description: "Asset has been permanently deleted",
      });
      
      // Note: Signed URLs cache now managed centrally in hook
      
      // Invalidate workspace query
      queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
      
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete asset",
        variant: "destructive",
      });
    }
  };

  const handleClearItem = async (item: UnifiedAsset) => {
    try {
      await WorkspaceAssetService.clearAsset(item.id);
      
      toast({
        title: "Asset cleared",
        description: "Asset saved to library and removed from workspace",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      
    } catch (error) {
      console.error('Failed to clear asset:', error);
      toast({
        title: "Clear failed",
        description: "Failed to clear asset",
        variant: "destructive",
      });
    }
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
      // Use item.url which now includes signed URL from hook
      const referenceUrl = item.url;
      
      if (!referenceUrl) {
        console.error('Asset URL not available for reference');
        toast({
          title: "Reference failed",
          description: "Asset URL not available",
          variant: "destructive",
        });
        return;
      }

      // Convert item to blob and create File object
      const response = await fetch(referenceUrl);
      const blob = await response.blob();
      const file = new File([blob], `reference_${item.id}.${item.type === 'video' ? 'mp4' : 'png'}`, {
        type: item.type === 'video' ? 'video/mp4' : 'image/png'
      });

      // Set as reference image
      setReferenceImage(file);

      // Extract and apply metadata for exact copy
      if (item.metadata) {
        const metadata = await extractReferenceMetadata(item.id);
        setReferenceMetadata(metadata);
        setExactCopyMode(true);
        
        // Apply asset parameters
        applyAssetParamsFromItem(item);
      }
      
      toast({
        title: "Reference set",
        description: "Asset is now being used as reference",
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

  const handleUseSeed = (item: UnifiedAsset) => {
    if (item.metadata?.seed) {
      // Apply seed and enable lock
      setLockSeed(true);
      setExactCopyMode(true);
      applyAssetParamsFromItem(item);
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
            <WorkspaceGrid
              items={workspaceAssets}
              // Grid actions
              onDownload={handleDownloadItem}
              onEdit={handleEditItem}
              onSave={handleSaveItem}
            onDelete={handleDeleteItem}
            onDismiss={handleClearItem}
              onView={handleViewItem}
              onUseAsReference={handleUseAsReference}
              onUseSeed={handleUseSeed}
            // Job actions
            onDeleteJob={deleteJob}
            onDismissJob={clearJob}
              isDeleting={new Set()} // TODO: Track deleting state
              activeJobId={activeJobId}
              onJobSelect={selectJob}
            />
          </div>
        </main>

        {/* Fixed bottom control bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40">
          <SimplePromptInput
            // Core props
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
            // Reference images
            referenceImage={referenceImage}
            onReferenceImageChange={setReferenceImage}
            referenceStrength={referenceStrength}
            onReferenceStrengthChange={setReferenceStrength}
            // Video controls
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
            // Control parameters
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
            // Enhancement
            enhancementModel={enhancementModel}
            onEnhancementModelChange={setEnhancementModel}
            // Exact copy workflow
            exactCopyMode={exactCopyMode}
            onExactCopyModeChange={setExactCopyMode}
            useOriginalParams={useOriginalParams}
            onUseOriginalParamsChange={setUseOriginalParams}
            lockSeed={lockSeed}
            onLockSeedChange={setLockSeed}
            referenceMetadata={referenceMetadata}
            onReferenceMetadataChange={setReferenceMetadata}
            workspaceAssets={workspaceAssets}
            // Advanced SDXL settings
            numImages={numImages}
            onNumImagesChange={setNumImages}
            steps={steps}
            onStepsChange={setSteps}
            guidanceScale={guidanceScale}
            onGuidanceScaleChange={setGuidanceScale}
            negativePrompt={negativePrompt}
            onNegativePromptChange={setNegativePrompt}
            compelEnabled={compelEnabled}
            onCompelEnabledChange={setCompelEnabled}
            compelWeights={compelWeights}
            onCompelWeightsChange={setCompelWeights}
            seed={seed}
            onSeedChange={setSeed}
          />
        </div>
      </div>
      
      {/* Lightbox */}
      {lightboxIndex !== null && workspaceAssets.length > 0 && (
        <SimpleLightbox
          items={workspaceAssets.map(asset => ({
            id: asset.id,
            url: asset.url,
            prompt: asset.prompt,
            enhancedPrompt: asset.metadata?.enhancedPrompt || asset.metadata?.enhanced_prompt,
            type: asset.type,
            quality: asset.metadata?.quality || 'fast',
            aspectRatio: asset.metadata?.aspectRatio || asset.metadata?.aspect_ratio,
            modelType: asset.modelType,
            timestamp: asset.createdAt.toISOString(),
            originalAssetId: asset.id,
            seed: asset.metadata?.seed?.toString(),
            metadata: asset.metadata
          }))}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onEdit={(item) => {
            const asset = workspaceAssets.find(a => a.id === item.id);
            if (asset) handleEditItem(asset);
          }}
          onDownload={(item) => {
            const asset = workspaceAssets.find(a => a.id === item.id);
            if (asset) handleDownloadItem(asset);
          }}
        />
      )}
    </>
  );
};


// Make it the default export to maintain compatibility
export default SimplifiedWorkspace;