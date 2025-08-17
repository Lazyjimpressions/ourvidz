import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLibraryFirstWorkspace } from '@/hooks/useLibraryFirstWorkspace';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { MobileSimplePromptInput } from '@/components/workspace/MobileSimplePromptInput';
import { WorkspaceGrid } from '@/components/workspace/WorkspaceGrid';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';

export const MobileSimplifiedWorkspace: React.FC = () => {
  const { user, loading } = useAuth();
  const { isMobile, isTouchDevice } = useMobileDetection();
  
  // Use library-first workspace state
  const {
    // Core State
    mode,
    prompt,
    referenceImage,
    referenceStrength,
    contentType,
    quality,
    
    // Video-specific parameters
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
    
    // Enhancement Model        
    enhancementModel,
    
    // UI State
    isGenerating,
    workspaceAssets,
    lightboxIndex,
    
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
    deleteJob,
    clearJob,
    setLightboxIndex,
    // URL Management
    registerAssetRef
  } = useLibraryFirstWorkspace();

  // Workspace management handlers
  const handleEditItem = (item: UnifiedAsset) => {
    // Set the prompt to the item's prompt for editing
    setPrompt(item.prompt || '');
    // Load generation parameters if available
    if (item.metadata?.referenceStrength) {
      setReferenceStrength(item.metadata.referenceStrength);
    }
    console.log('Edit item:', item);
  };

  const handleSaveItem = (item: UnifiedAsset) => {
    // No-op for library-first - items are auto-saved
    console.log('Save item (auto-saved):', item);
  };

  const handleViewItem = (item: UnifiedAsset) => {
    // Find the item index and open lightbox
    const index = workspaceAssets.findIndex(i => i.id === item.id);
    setLightboxIndex(index >= 0 ? index : 0);
  };

  const handleDownload = async (item: UnifiedAsset) => {
    try {
      const link = document.createElement('a');
      link.href = item.url || '';
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${item.prompt?.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${item.format || 'png'}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleUseAsReference = (item: UnifiedAsset) => {
    // Set as reference image using URL
    if (item.url) {
      setReferenceImage(null); // Clear file reference
      // Note: Would need to add setReferenceImageUrl to the hook
      console.log('Use as reference:', item.url);
    }
  };

  const handleUseSeed = (item: UnifiedAsset) => {
    // Use seed for character reproduction
    if (item.metadata?.seed) {
      console.log('Use seed:', item.metadata.seed);
    }
  };

  const handleCloseLightbox = () => {
    setLightboxIndex(null);
  };

  const handleLightboxIndexChange = (index: number) => {
    setLightboxIndex(index);
  };

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return null; // Auth context will handle redirect
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Fixed Header */}
      <WorkspaceHeader 
        onClearWorkspace={clearWorkspace}
        onDeleteAllWorkspace={deleteAllWorkspace}
      />
      
      {/* Main Content Area */}
      <div className="pt-header">
        {/* Workspace Grid */}
        <div className="container mx-auto px-4 py-8">
          <WorkspaceGrid
            items={workspaceAssets}
            activeJobId={null}
            onJobSelect={() => {}}
            onDeleteJob={(jobId) => deleteJob(jobId)}
            onDismissJob={(jobId) => clearJob(jobId)}
            onIterateFromItem={handleUseAsReference}
            onRegenerateJob={() => Promise.resolve()}
            onCreateVideo={handleUseAsReference}
            onDownload={handleDownload}
            onExpand={handleViewItem}
            onEdit={handleEditItem}
            onSave={handleSaveItem}
            onView={handleViewItem}
            onUseAsReference={handleUseAsReference}
            onUseSeed={handleUseSeed}
            onDelete={(item) => deleteItem(item.id, item.type)}
            onDismiss={(item) => clearItem(item.id, item.type)}
            isDeleting={new Set()}
            registerAssetRef={registerAssetRef}
          />
        </div>
      </div>

      {/* Mobile Simple Prompt Input */}
      <MobileSimplePromptInput
        prompt={prompt}
        onPromptChange={setPrompt}
        mode={mode}
        contentType={contentType}
        quality={quality}
        onQualityChange={setQuality}
        isGenerating={isGenerating}
        onGenerate={generate}
        referenceImage={referenceImage}
        onReferenceImageChange={setReferenceImage}
        referenceStrength={referenceStrength}
        onReferenceStrengthChange={setReferenceStrength}
        onModeChange={updateMode}
        onContentTypeChange={setContentType}
        beginningRefImage={beginningRefImage}
        endingRefImage={endingRefImage}
        onBeginningRefImageChange={setBeginningRefImage}
        onEndingRefImageChange={setEndingRefImage}
        videoDuration={videoDuration}
        onVideoDurationChange={setVideoDuration}
        motionIntensity={motionIntensity}
        onMotionIntensityChange={setMotionIntensity}
        soundEnabled={soundEnabled}
        onSoundEnabledChange={setSoundEnabled}
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
      />

      {/* Lightbox for viewing images */}
      {lightboxIndex !== null && workspaceAssets[lightboxIndex] && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={handleCloseLightbox}
              className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
            >
              ×
            </button>
            <img
              src={workspaceAssets[lightboxIndex].url}
              alt={workspaceAssets[lightboxIndex].prompt}
              className="max-w-full max-h-full object-contain"
            />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-sm">{workspaceAssets[lightboxIndex].prompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileSimplifiedWorkspace; 