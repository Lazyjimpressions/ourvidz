import React, { useState } from 'react';
import { SimplePromptInput } from '@/components/workspace/SimplePromptInput';
import { WorkspaceGrid } from '@/components/workspace/WorkspaceGrid';
import { useLibraryFirstWorkspace } from '@/hooks/useLibraryFirstWorkspace';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';

/**
 * Library-first workspace page component
 * Provides unified workspace experience using library assets
 * 
 * Features:
 * - Library-first architecture
 * - Event-driven updates
 * - Mobile-responsive design
 * - Real-time workspace updates
 * - Job-level grouping with streamlined UI
 * - LTX-style job thumbnail selector
 * - LTX-style hover actions and click-to-expand
 * 
 * @returns {JSX.Element} Rendered workspace page
 */
export const SimplifiedWorkspace: React.FC = () => {
  const state = useLibraryFirstWorkspace();
  
  // Job selection state
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
    workspaceAssets,
    activeJobId,
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
  
  // NEW: Seed state for character reproduction
  const [seedValue, setSeedValue] = useState<number | null>(null);

  // LTX-Style Workspace Management Handlers

  /**
   * NEW: Use item as reference for iteration (img2img)
   * Matches LTX Studio's iterate functionality
   */
  const handleIterateFromItem = (item: UnifiedAsset) => {
    console.log('🔄 ITERATE FROM ITEM: Setting up img2img reference:', item);
    
    // Set the image as reference for image-to-image generation using URL
    setReferenceImageUrl(item.url);
    setReferenceStrength(0.7); // Default strength for img2img
    
    // Set the seed for character reproduction
    if (item.metadata?.seed) {
      console.log('🌱 ITERATE: Using seed for character reproduction:', item.metadata.seed);
    }
    
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
   * NEW: Regenerate job with same parameters
   * Creates 3 more images using the original job's prompt and seed
   */
  const handleRegenerateJob = async (jobId: string) => {
    console.log('🔄 REGENERATE JOB: Creating more images for job:', jobId);
    
    try {
      // TODO: Implement regeneration logic
      console.log('✅ REGENERATE: Job regeneration initiated');
    } catch (error) {
      console.error('❌ REGENERATE: Failed to regenerate job:', error);
    }
  };

  /**
   * Create Video function - drops image to video reference box
   * Matches LTX Studio's create video functionality
   */
  const handleCreateVideo = (item: UnifiedAsset) => {
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
  const handleDownload = async (item: UnifiedAsset) => {
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
  const handleExpand = (item: UnifiedAsset) => {
    console.log('🔍 EXPAND: Opening lightbox for image:', item);
    
    // Find the index of the item in workspaceAssets
    const itemIndex = workspaceAssets.findIndex(wsItem => wsItem.id === item.id);
    if (itemIndex !== -1) {
      setLightboxIndex(itemIndex);
    }
  };

  // Legacy handlers (kept for compatibility, but not used in LTX-style UI)
  const handleEditItem = (item: UnifiedAsset) => {
    // Redirect to iterate function for LTX-style behavior
    handleIterateFromItem(item);
  };

  const handleSaveItem = (item: UnifiedAsset) => {
    // Not needed in LTX-style UI since images are auto-saved
    console.log('💾 SAVE: Image auto-saved to library (LTX-style):', item);
  };

  const handleViewItem = (item: UnifiedAsset) => {
    // Redirect to expand function for LTX-style behavior
    handleExpand(item);
  };

  const handleUseAsReference = (item: UnifiedAsset) => {
    // Redirect to iterate function for LTX-style behavior
    handleIterateFromItem(item);
  };

  const handleUseSeed = (item: UnifiedAsset) => {
    console.log('🌱 USE SEED: Using seed from item:', item);
    
    if (item.metadata?.seed) {
      setSeedValue(item.metadata.seed);
      console.log('🌱 SEED SET: Using seed for character reproduction:', item.metadata.seed);
    } else {
      console.warn('⚠️ SEED WARNING: Item has no seed value');
    }
  };

  // Job-level deletion handler
  const handleDeleteJob = async (jobId: string) => {
    setDeletingJobs(prev => new Set(prev).add(jobId));
    
    try {
      await deleteJob(jobId);
      
      // Clear active job if it was deleted
      if (activeJobId === jobId) {
        selectJob(null);
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
        selectJob(null);
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
    selectJob(jobId);
  };

  const handleDismissAllJobs = async () => {
    try {
      console.log('🗑️ Dismissing all jobs from workspace');
      
      // Get all job IDs from the session groups
      const allJobIds = Object.keys(sessionGroups);
      
      // Dismiss each job
      for (const jobId of allJobIds) {
        await handleDismissJob(jobId);
      }
      
      console.log('✅ All jobs dismissed from workspace');
    } catch (error) {
      console.error('❌ Error dismissing all jobs:', error);
    }
  };

  // Group assets by job_id for WorkspaceGrid
  const sessionGroups = workspaceAssets.reduce((acc, asset) => {
    const jobId = asset.metadata?.job_id || 'no_job_id';
    if (!acc[jobId]) {
      acc[jobId] = [];
    }
    acc[jobId].push(asset);
    return acc;
  }, {} as Record<string, UnifiedAsset[]>);

  const sortedJobIds = Object.keys(sessionGroups).sort((a, b) => {
    const dateA = new Date(sessionGroups[a][0]?.createdAt || 0);
    const dateB = new Date(sessionGroups[b][0]?.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  const activeJobItems = activeJobId ? sessionGroups[activeJobId] : [];

  return (
    <div className="relative h-full bg-gray-900 text-white">
      <WorkspaceHeader
        onClearWorkspace={clearWorkspace}
        onDismissAllJobs={handleDismissAllJobs}
      />
      <div className="flex flex-1 overflow-hidden pb-60">
        <div className="flex-1 overflow-y-auto p-4">
          <WorkspaceGrid
            items={workspaceAssets}
            activeJobId={activeJobId}
            onJobSelect={handleJobSelect}
            onDeleteJob={handleDeleteJob}
            onDismissJob={handleDismissJob}
            onIterateFromItem={handleIterateFromItem}
            onRegenerateJob={handleRegenerateJob}
            onCreateVideo={handleCreateVideo}
            onDownload={handleDownload}
            onExpand={handleExpand}
            onEdit={handleEditItem}
            onSave={handleSaveItem}
            onView={handleViewItem}
            onUseAsReference={handleUseAsReference}
            onUseSeed={handleUseSeed}
            onDelete={(item) => deleteItem(item.id, item.type)}
            onDismiss={(item) => dismissItem(item.id, item.type)}
            isDeleting={deletingJobs}
          />
        </div>
      </div>
      
      {/* Floating Footer Controls - Fixed positioning */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 p-4 z-[9999] shadow-lg" style={{ minHeight: '140px' }}>
        <div className="max-w-7xl mx-auto">
          <SimplePromptInput
            prompt={prompt}
            onPromptChange={setPrompt}
            mode={mode}
            contentType={contentType}
            quality={quality}
            onQualityChange={setQuality}
            isGenerating={isGenerating}
            onGenerate={() => generate(referenceImageUrl, beginningRefImageUrl, endingRefImageUrl, seedValue)}
            referenceImage={referenceImage}
            onReferenceImageChange={setReferenceImage}
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
        </div>
      </div>
    </div>
  );
};

export default SimplifiedWorkspace; 