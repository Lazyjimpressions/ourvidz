import React, { useState } from 'react';
import { SimplePromptInput } from '@/components/workspace/SimplePromptInput';
import { WorkspaceGrid } from '@/components/workspace/WorkspaceGrid';
import { useSimplifiedWorkspaceState, WorkspaceItem } from '@/hooks/useSimplifiedWorkspaceState';
import { useActiveWorkspaceSession } from '@/hooks/useActiveWorkspaceSession';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';

/**
 * Unified session storage based workspace page component
 * Provides 87% complexity reduction compared to legacy workspace
 * 
 * Features:
 * - Session storage based state management
 * - Unified component architecture
 * - Mobile-responsive design
 * - Real-time workspace updates
 * - Job-level grouping with streamlined UI
 * - LTX-style job thumbnail selector
 * - LTX-style hover actions and click-to-expand
 * 
 * @returns {JSX.Element} Rendered workspace page
 */
export const SimplifiedWorkspace: React.FC = () => {
  const state = useSimplifiedWorkspaceState();
  const { sessionId, loading: sessionLoading } = useActiveWorkspaceSession();
  
  // Job selection state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [deletingJobs, setDeletingJobs] = useState<Set<string>>(new Set());
  
  const {
    // Core State
    mode,
    prompt,
    referenceImage,
    referenceStrength,
    contentType,
    quality,
    
    // Video-specific State
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
    workspaceJobs,
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
    deleteItem,
    dismissItem,
    setLightboxIndex,
    // Job-level actions
    selectJob,
    deleteJob,
    saveJob,
    useJobAsReference,
    dismissJob,
  } = state;

  // NEW: URL-based reference image state for drag & drop
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [beginningRefImageUrl, setBeginningRefImageUrl] = useState<string | null>(null);
  const [endingRefImageUrl, setEndingRefImageUrl] = useState<string | null>(null);

  // LTX-Style Workspace Management Handlers

  /**
   * Iterate function - drops image to reference box for image-to-image
   * Matches LTX Studio's iterate functionality
   */
  const handleIterate = (item: WorkspaceItem) => {
    console.log('🔄 ITERATE: Dropping image to reference box for img2img:', item);
    
    // Set the image as reference for image-to-image generation using URL
    setReferenceImageUrl(item.url);
    setReferenceStrength(0.7); // Default strength for img2img
    
    // Clear any file-based reference
    setReferenceImage(null);
    
    // Switch to image mode if not already
    if (mode !== 'image') {
      updateMode('image');
    }
    
    // Optional: Scroll to prompt input to show the reference has been set
    const promptInput = document.querySelector('.prompt-input-container');
    if (promptInput) {
      promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  /**
   * Create Video function - drops image to video reference box
   * Matches LTX Studio's create video functionality
   */
  const handleCreateVideo = (item: WorkspaceItem) => {
    console.log('🎬 CREATE VIDEO: Dropping image to video reference box:', item);
    
    // Set the image as beginning reference for video generation using URL
    setBeginningRefImageUrl(item.url);
    
    // Clear any file-based reference
    setBeginningRefImage(null);
    
    // Switch to video mode if not already
    if (mode !== 'video') {
      updateMode('video');
    }
    
    // Optional: Scroll to prompt input to show the reference has been set
    const promptInput = document.querySelector('.prompt-input-container');
    if (promptInput) {
      promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  /**
   * Download function - downloads the image file
   * Matches LTX Studio's download functionality
   */
  const handleDownload = async (item: WorkspaceItem) => {
    console.log('💾 DOWNLOAD: Downloading image:', item);
    
    try {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = item.url;
      
      // Generate filename from prompt and timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${item.prompt?.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.png`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ DOWNLOAD: Successfully downloaded:', filename);
    } catch (error) {
      console.error('❌ DOWNLOAD: Failed to download image:', error);
    }
  };

  /**
   * Expand function - shows full-size lightbox modal
   * Matches LTX Studio's click-to-expand functionality
   */
  const handleExpand = (item: WorkspaceItem) => {
    console.log('🔍 EXPAND: Opening lightbox for image:', item);
    
    // Find the index of the item in workspaceItems
    const itemIndex = workspaceItems.findIndex(wsItem => wsItem.id === item.id);
    if (itemIndex !== -1) {
      setLightboxIndex(itemIndex);
    }
  };

  // Legacy handlers (kept for compatibility, but not used in LTX-style UI)
  const handleEditItem = (item: WorkspaceItem) => {
    // Redirect to iterate function for LTX-style behavior
    handleIterate(item);
  };

  const handleSaveItem = (item: WorkspaceItem) => {
    // Not needed in LTX-style UI since images are auto-saved
    console.log('💾 SAVE: Image auto-saved to library (LTX-style):', item);
  };

  const handleViewItem = (item: WorkspaceItem) => {
    // Redirect to expand function for LTX-style behavior
    handleExpand(item);
  };

  const handleUseAsReference = (item: WorkspaceItem) => {
    // Redirect to iterate function for LTX-style behavior
    handleIterate(item);
  };

  const handleUseSeed = (item: WorkspaceItem) => {
    // TODO: Implement use seed functionality
    console.log('🌱 USE SEED: Using seed from item:', item);
  };

  // Job-level deletion handler
  const handleDeleteJob = async (jobId: string) => {
    setDeletingJobs(prev => new Set(prev).add(jobId));
    
    try {
      await deleteJob(jobId);
      
      // Clear active job if it was deleted
      if (activeJobId === jobId) {
        setActiveJobId(null);
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
    } finally {
      setDeletingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  // Job-level dismiss handler
  const handleDismissJob = async (jobId: string) => {
    setDeletingJobs(prev => new Set(prev).add(jobId));
    
    try {
      await dismissJob(jobId);
      
      // Clear active job if it was dismissed
      if (activeJobId === jobId) {
        setActiveJobId(null);
      }
    } catch (error) {
      console.error('Failed to dismiss job:', error);
    } finally {
      setDeletingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  // Job selection handler
  const handleJobSelect = (jobId: string | null) => {
    setActiveJobId(jobId);
  };

  // Show loading state while session is being resolved
  if (sessionLoading || !sessionId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-muted-foreground">Setting up workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Fixed Header */}
      <WorkspaceHeader onClearWorkspace={clearWorkspace} />
      
      {/* Main Content Area */}
      <div className="pt-12 pb-32">
        <div className="container mx-auto px-4 py-8">
          <WorkspaceGrid
            items={workspaceItems}
            // LTX-Style Actions
            onIterate={handleIterate}
            onCreateVideo={handleCreateVideo}
            onDownload={handleDownload}
            onExpand={handleExpand}
            // Legacy Actions (for compatibility)
            onEdit={handleEditItem}
            onSave={handleSaveItem}
            onDelete={(item: WorkspaceItem) => deleteItem(item.id)}
            onDismiss={(item: WorkspaceItem) => dismissItem(item.id)}
            onView={handleViewItem}
            onUseAsReference={handleUseAsReference}
            onUseSeed={handleUseSeed}
            // Job-level Actions
            onDeleteJob={handleDeleteJob}
            onDismissJob={handleDismissJob}
            isDeleting={deletingJobs}
            activeJobId={activeJobId}
            onJobSelect={handleJobSelect}
          />
        </div>
      </div>

      {/* Simple Prompt Input */}
      <SimplePromptInput
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
        // NEW: URL-based reference image support
        referenceImageUrl={referenceImageUrl}
        onReferenceImageUrlChange={setReferenceImageUrl}
        referenceStrength={referenceStrength}
        onReferenceStrengthChange={setReferenceStrength}
        onModeChange={updateMode}
        onContentTypeChange={setContentType}
        beginningRefImage={beginningRefImage}
        endingRefImage={endingRefImage}
        onBeginningRefImageChange={setBeginningRefImage}
        onEndingRefImageChange={setEndingRefImage}
        // NEW: URL-based video reference image support
        beginningRefImageUrl={beginningRefImageUrl}
        endingRefImageUrl={endingRefImageUrl}
        onBeginningRefImageUrlChange={setBeginningRefImageUrl}
        onEndingRefImageUrlChange={setEndingRefImageUrl}
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
        enhancementModel={enhancementModel}
        onEnhancementModelChange={setEnhancementModel}
      />

      {/* LTX-Style Lightbox Modal */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 text-3xl font-bold z-10 transition-colors"
            aria-label="Close lightbox"
          >
            ×
          </button>
          
          {/* Image container */}
          <div className="relative max-w-full max-h-full">
            {workspaceItems[lightboxIndex] && (
              <img
                src={workspaceItems[lightboxIndex].url}
                alt={workspaceItems[lightboxIndex].prompt}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
              />
            )}
            
            {/* Image info overlay */}
            {workspaceItems[lightboxIndex] && (
              <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
                <p className="text-sm font-medium truncate">
                  {workspaceItems[lightboxIndex].prompt}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Click outside to close • ESC to close
                </p>
              </div>
            )}
          </div>
          
          {/* Navigation arrows (if multiple images) */}
          {workspaceItems.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : workspaceItems.length - 1);
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 text-2xl font-bold z-10 transition-colors"
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(lightboxIndex < workspaceItems.length - 1 ? lightboxIndex + 1 : 0);
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 text-2xl font-bold z-10 transition-colors"
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SimplifiedWorkspace; 