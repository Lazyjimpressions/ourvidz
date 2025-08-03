import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimplifiedWorkspaceState, WorkspaceItem } from '@/hooks/useSimplifiedWorkspaceState';
import { MobileSimplePromptInput } from '@/components/workspace/MobileSimplePromptInput';
import { WorkspaceGrid } from '@/components/workspace/WorkspaceGrid';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';

export const MobileSimplifiedWorkspace: React.FC = () => {
  const { user, loading } = useAuth();
  const { isMobile, isTouchDevice } = useMobileDetection();
  
  // Use simplified state management
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
    workspaceItems,
    lightboxIndex,
    
    // Actions
    setMode, 
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
    setLightboxIndex,
    editItem,
    saveItem,
    downloadItem,
    useAsReference,
    useSeed
  } = useSimplifiedWorkspaceState();

  // Workspace management handlers
  const handleEditItem = (item: WorkspaceItem) => {
    // Set the prompt to the item's prompt for editing
    setPrompt(item.prompt);
    // Load other item parameters
    if (item.referenceImage) {
      setReferenceImage(item.referenceImage);
    }
    if (item.referenceStrength) {
      setReferenceStrength(item.referenceStrength);
    }
    if (item.seed) {
      // TODO: Add seed to state management
      console.log('Load seed:', item.seed);
    }
    console.log('Edit item:', item);
  };

  const handleSaveItem = (item: WorkspaceItem) => {
    saveItem(item);
  };

  const handleViewItem = (item: WorkspaceItem) => {
    // Find the item index and open lightbox
    const index = workspaceItems.findIndex(i => i.id === item.id);
    setLightboxIndex(index >= 0 ? index : 0);
  };

  const handleDownload = (item: WorkspaceItem) => {
    downloadItem(item);
  };

  const handleUseAsReference = (item: WorkspaceItem) => {
    useAsReference(item);
  };

  const handleUseSeed = (item: WorkspaceItem) => {
    useSeed(item);
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
      <WorkspaceHeader onClearWorkspace={clearWorkspace} />
      
      {/* Main Content Area */}
      <div className="pt-12">
        {/* Workspace Grid */}
        <div className="container mx-auto px-4 py-8">
          <WorkspaceGrid
            items={workspaceItems}
            onEdit={handleEditItem}
            onSave={handleSaveItem}
            onDelete={(item: WorkspaceItem) => deleteItem(item.id)}
            onView={handleViewItem}
            onDownload={handleDownload}
            onUseAsReference={handleUseAsReference}
            onUseSeed={handleUseSeed}
            isDeleting={new Set()} // TODO: Track deleting state
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
        onModeChange={setMode}
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
      {lightboxIndex !== null && workspaceItems[lightboxIndex] && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={handleCloseLightbox}
              className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
            >
              ×
            </button>
            <img
              src={workspaceItems[lightboxIndex].url}
              alt={workspaceItems[lightboxIndex].prompt}
              className="max-w-full max-h-full object-contain"
            />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-sm">{workspaceItems[lightboxIndex].prompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileSimplifiedWorkspace; 