import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLibraryFirstWorkspace } from '@/hooks/useLibraryFirstWorkspace';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { SimplePromptInput } from '@/components/workspace/SimplePromptInput';
import { WorkspaceGrid } from '@/components/workspace/WorkspaceGrid';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { SimpleLightbox } from '@/components/workspace/SimpleLightbox';
import { uploadReferenceImage as uploadReferenceFile, getReferenceImageUrl } from '@/lib/storage';
import { extractReferenceMetadata } from '@/utils/extractReferenceMetadata';

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
    deleteItem,
    dismissItem,
    setLightboxIndex,
    selectJob,
    deleteJob,
    dismissJob,
    useJobAsReference,
    applyAssetParamsFromItem,
    setExactCopyMode,
    setUseOriginalParams,
    setLockSeed,
    setReferenceMetadata
  } = useLibraryFirstWorkspace();

  // Honor URL param mode
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'video' || urlMode === 'image') {
      updateMode(urlMode);
    }
  }, [searchParams, updateMode]);

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
    // For library-first approach, items are already in library
    // This could trigger a collection organization flow in the future
    console.log('Save item (already in library):', item.id);
  };

  const handleViewItem = (item: UnifiedAsset) => {
    const index = workspaceAssets.findIndex(asset => asset.id === item.id);
    if (index !== -1) {
      setLightboxIndex(index);
    }
  };

  const handleDownloadItem = async (item: UnifiedAsset) => {
    try {
      if (!item.url) {
        console.error('Asset URL not available for download');
        return;
      }
      
      const link = document.createElement('a');
      link.href = item.url;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${item.prompt?.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${item.type === 'video' ? 'mp4' : 'png'}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download asset:', error);
    }
  };

  const handleUseAsReference = async (item: UnifiedAsset) => {
    try {
      if (!item.url) {
        console.error('Asset URL not available for reference');
        return;
      }

      // Convert item to blob and create File object
      const response = await fetch(item.url);
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
    } catch (error) {
      console.error('Failed to use item as reference:', error);
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
              onDelete={(item) => deleteItem(item.id, item.type)}
              onDismiss={(item) => dismissItem(item.id, item.type)}
              onView={handleViewItem}
              onUseAsReference={handleUseAsReference}
              onUseSeed={handleUseSeed}
              // Job actions
              onDeleteJob={deleteJob}
              onDismissJob={dismissJob}
              isDeleting={new Set()} // TODO: Track deleting state
              activeJobId={activeJobId}
              onJobSelect={selectJob}
            />
          </div>
        </main>

        {/* Fixed bottom control bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40">
          <div className="container mx-auto px-4 py-4">
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
            />
          </div>
        </div>
      </div>
      
      {/* Lightbox */}
      {lightboxIndex !== null && workspaceAssets.length > 0 && (
        <SimpleLightbox
          items={workspaceAssets.map(asset => ({
            id: asset.id,
            url: asset.url,
            prompt: asset.prompt,
            enhancedPrompt: asset.metadata?.enhancedPrompt,
            type: asset.type,
            quality: asset.metadata?.quality || 'fast',
            aspectRatio: asset.metadata?.aspectRatio,
            modelType: asset.metadata?.modelType,
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