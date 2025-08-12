import React, { useState } from 'react';
import { SimplePromptInput } from '@/components/workspace/SimplePromptInput';
import { WorkspaceGrid } from '@/components/workspace/WorkspaceGrid';
import { SimpleLightbox } from '@/components/workspace/SimpleLightbox';
import { useLibraryFirstWorkspace } from '@/hooks/useLibraryFirstWorkspace';
import { useOptimizedWorkspace } from '@/hooks/useOptimizedWorkspace';
import { OptimizedDeleteModal } from '@/components/workspace/OptimizedDeleteModal';
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
  const {
    deletingItems,
    deletingJobs,
    clearFromWorkspace,
    deleteItemPermanently,
    clearJobFromWorkspace,
    deleteJobPermanently,
    deleteAllWorkspace,
    clearWorkspace: optimizedClearWorkspace,
  } = useOptimizedWorkspace();
  
  // Modal state for confirmations
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmAction: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmAction: () => {},
  });
  
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
    // Exact copy workflow
    exactCopyMode,
    useOriginalParams,
    lockSeed,
    setExactCopyMode,
    setUseOriginalParams,
    setLockSeed,
    setReferenceMetadata,
    applyAssetParamsFromItem,
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
  // Listen for job-as-reference event to set URL reference centrally
  React.useEffect(() => {
    const handler = async (e: Event) => {
      const custom = e as CustomEvent<{ jobId: string; url: string; assetId: string; type: string }>;
      const { url, assetId } = custom.detail || {}; 
      if (!url) return;
      
      
      // Extract reference metadata for exact copy functionality
      const asset = workspaceAssets.find(a => a.id === assetId);
      if (asset) {
        console.log('🎯 ASSET FOUND FOR METADATA EXTRACTION:', {
          assetId,
          assetUrl: asset.url,
          assetMetadata: asset.metadata,
          assetEnhancedPrompt: asset.enhancedPrompt,
          assetPrompt: asset.prompt,
          jobId: (asset as any).job_id,
          fullAsset: asset
        });
        
        const { extractReferenceMetadata } = await import('@/utils/extractReferenceMetadata');
        const metadata = await extractReferenceMetadata(asset);
        
        console.log('🎯 METADATA EXTRACTION RESULT:', {
          extracted: !!metadata,
          metadataKeys: metadata ? Object.keys(metadata) : 'none',
          originalEnhancedPrompt: metadata?.originalEnhancedPrompt,
          originalSeed: metadata?.originalSeed
        });
        
        if (metadata) {
          setReferenceMetadata(metadata);
          setExactCopyMode(true);
          setReferenceStrength(0.9); // High strength for exact copy
          console.log('✅ USE AS REFERENCE: Exact copy mode enabled with metadata:', metadata);
        } else {
          console.error('❌ USE AS REFERENCE: Metadata extraction failed - no enhanced prompt found');
        }
      } else {
        console.warn('⚠️ ASSET NOT FOUND: Could not find asset with ID:', assetId);
      }
      
      if (mode === 'image') {
        setReferenceImageUrl(url);
        setReferenceImage(null);
        setReferenceStrength(0.7);
      } else if (mode === 'video') {
        setBeginningRefImageUrl(url);
        setBeginningRefImage(null);
      }
    };
    window.addEventListener('workspace-use-job-as-reference', handler as EventListener);
    return () => window.removeEventListener('workspace-use-job-as-reference', handler as EventListener);
  }, [mode, setReferenceStrength, workspaceAssets]);

  // NEW: Listen for drag-drop metadata extraction events - FIXED TIMING
  React.useEffect(() => {
    const handleDragDropMetadata = async (e: Event) => {
      const custom = e as CustomEvent<{ workspaceItem: any }>;
      const { workspaceItem } = custom.detail || {};
      
      console.log('🎯 DRAG-DROP EVENT RECEIVED:', {
        hasWorkspaceItem: !!workspaceItem,
        workspaceItemId: workspaceItem?.id,
        workspaceItem: workspaceItem,
        workspaceAssetsAvailable: workspaceAssets?.length || 0
      });
      
      if (!workspaceItem?.id) {
        console.warn('⚠️ DRAG-DROP: No workspace item ID found');
        return;
      }
      
      // Find asset by ID and extract metadata immediately
      const asset = workspaceAssets.find(a => a.id === workspaceItem.id);
      if (asset) {
        console.log('🎯 DRAG-DROP: Found asset for metadata extraction:', {
          assetId: asset.id,
          assetUrl: asset.url,
          assetMetadata: asset.metadata,
          assetEnhancedPrompt: asset.enhancedPrompt
        });
        
        const { extractReferenceMetadata } = await import('@/utils/extractReferenceMetadata');
        const metadata = await extractReferenceMetadata(asset);
        
        console.log('🎯 DRAG-DROP: Metadata extraction result:', {
          extracted: !!metadata,
          metadataKeys: metadata ? Object.keys(metadata) : 'none',
          originalEnhancedPrompt: metadata?.originalEnhancedPrompt
        });
        
        if (metadata) {
          setReferenceMetadata(metadata);
          setExactCopyMode(true);
          setReferenceStrength(0.9); // High strength for exact copy
          console.log('✅ DRAG-DROP: Exact copy mode enabled with metadata via drag-drop');
        } else {
          console.error('❌ DRAG-DROP: Metadata extraction failed');
        }
      } else {
        console.warn('⚠️ DRAG-DROP: Asset not found with ID:', workspaceItem.id);
      }
    };
    
    window.addEventListener('drag-drop-extract-metadata', handleDragDropMetadata as EventListener);
    return () => window.removeEventListener('drag-drop-extract-metadata', handleDragDropMetadata as EventListener);
  }, [workspaceAssets, setReferenceMetadata, setExactCopyMode, setReferenceStrength]);

  /**
   * NEW: Use item as reference for iteration (img2img)
   * Matches LTX Studio's iterate functionality
   */
  const handleIterateFromItem = async (item: UnifiedAsset) => {
    console.log('🔄 ITERATE FROM ITEM: Setting up img2img reference:', item);
    
    // 🎯 DEBUG: Check item metadata for exact copy
    console.log('🎯 ITEM METADATA FOR EXACT COPY:', {
      itemId: item.id,
      itemUrl: item.url,
      itemMetadata: item.metadata,
      itemEnhancedPrompt: item.enhancedPrompt,
      itemPrompt: item.prompt,
      itemSeed: item.metadata?.seed
    });
    
    // ✅ FIXED: Extract metadata asynchronously for exact copy functionality
    const { extractReferenceMetadata } = await import('@/utils/extractReferenceMetadata');
    const metadata = await extractReferenceMetadata(item);
    
    console.log('🎯 ITERATE METADATA EXTRACTION:', {
      extracted: !!metadata,
      metadataKeys: metadata ? Object.keys(metadata) : 'none',
      originalEnhancedPrompt: metadata?.originalEnhancedPrompt,
      originalSeed: metadata?.originalSeed
    });
    
    // Set reference metadata and enable exact copy mode
    if (metadata) {
      setReferenceMetadata(metadata);
      console.log('🎯 ITERATE: Reference metadata set for exact copy');
      
      // ✅ CRITICAL FIX: Enable exact copy mode when metadata is available
      setExactCopyMode(true);
      console.log('🎯 ITERATE: Exact copy mode enabled');
    } else {
      console.warn('⚠️ ITERATE: Failed to extract metadata for exact copy');
    }
    
    // Set the image as reference for image-to-image generation using URL
    setReferenceImageUrl(item.url);
    
    // ✅ FIXED: Use proper reference strength for exact copy (0.9 instead of 0.1)
    const referenceStrength = metadata ? 0.9 : 0.1;
    setReferenceStrength(referenceStrength);
    console.log('🎯 ITERATE: Reference strength set to:', referenceStrength);
    
    // Apply original parameters from the asset
    applyAssetParamsFromItem(item);
    
    // Set the seed for character reproduction
    if (item.metadata?.seed) {
      setLockSeed(true);
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

  // Optimized job handlers
  const handleClearJob = async (jobId: string) => {
    await clearJobFromWorkspace(jobId);
    
    // Clear active job if it was hidden
    if (activeJobId === jobId) {
      selectJob(null);
    }
  };

  const handleDeleteJob = (jobId: string) => {
    setDeleteModal({
      isOpen: true,
      title: 'Delete Job Permanently?',
      description: 'This will permanently delete all images/videos in this job and cannot be undone.',
      confirmAction: async () => {
        await deleteJobPermanently(jobId);
        
        // Clear active job if it was deleted
        if (activeJobId === jobId) {
          selectJob(null);
        }
        
        setDeleteModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Optimized item handlers
  const handleClearItem = async (item: UnifiedAsset) => {
    await clearFromWorkspace(item.id, item.type);
  };

  const handleDeleteItem = (item: UnifiedAsset) => {
    setDeleteModal({
      isOpen: true,
      title: 'Delete Permanently?',
      description: `This will permanently delete this ${item.type} and cannot be undone.`,
      confirmAction: async () => {
        await deleteItemPermanently(item.id, item.type);
        setDeleteModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Job selection handler
  const handleJobSelect = (jobId: string | null) => {
    selectJob(jobId);
  };

  const handleClearWorkspace = async () => {
    setDeleteModal({
      isOpen: true,
      title: 'Clear Workspace?',
      description: 'This will hide all items from your workspace. You can still access them in your library.',
      confirmAction: async () => {
        console.log('🧹 WORKSPACE: Starting clear workspace action');
        await optimizedClearWorkspace();
        setDeleteModal(prev => ({ ...prev, isOpen: false }));
      },
    });
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
    <div className="relative h-full bg-background text-foreground">
      <WorkspaceHeader
        onClearWorkspace={handleClearWorkspace}
        onDismissAllJobs={handleClearWorkspace}
        onDeleteAllWorkspace={deleteAllWorkspace}
      />
      <div className="flex flex-1 overflow-hidden pb-60 pt-header">
        <div className="flex-1 overflow-y-auto p-4">
          <WorkspaceGrid
            items={workspaceAssets}
            activeJobId={activeJobId}
            onJobSelect={handleJobSelect}
            onDeleteJob={handleDeleteJob}
            onDismissJob={handleClearJob}
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
            onDelete={handleDeleteItem}
            onDismiss={handleClearItem}
            isDeleting={new Set([...deletingItems, ...deletingJobs])}
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
            onEnhancementModelChange={state.updateEnhancementModel}
            exactCopyMode={exactCopyMode}
            onExactCopyModeChange={setExactCopyMode}
            useOriginalParams={useOriginalParams}
            onUseOriginalParamsChange={setUseOriginalParams}
            lockSeed={lockSeed}
            onLockSeedChange={setLockSeed}
            referenceMetadata={state.referenceMetadata}
            onReferenceMetadataChange={state.setReferenceMetadata}
            workspaceAssets={workspaceAssets}
          />
        </div>
      </div>
      
      {/* SimpleLightbox Modal */}
      {lightboxIndex !== null && workspaceAssets[lightboxIndex] && (
        <SimpleLightbox
          items={workspaceAssets.map(asset => ({
            id: asset.id,
            url: asset.url,
            prompt: asset.prompt,
            enhancedPrompt: asset.enhancedPrompt || asset.metadata?.enhanced_prompt,
            type: asset.type,
            modelType: asset.metadata?.model_type,
            quality: (asset.quality as 'fast' | 'high') || 'high',
            generationParams: asset.metadata,
            seed: asset.metadata?.seed,
            originalAssetId: asset.metadata?.original_asset_id,
            timestamp: (typeof asset.createdAt === 'string' ? asset.createdAt : asset.createdAt?.toISOString()) || new Date().toISOString()
          }))}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onEdit={(item) => {
            // Find the full asset by ID to pass to handler
            const fullAsset = workspaceAssets.find(a => a.id === item.id);
            if (fullAsset) handleEditItem(fullAsset);
          }}
          onDelete={(item) => deleteItem(item.id, item.type as 'image' | 'video')}
          onDownload={(item) => {
            // Find the full asset by ID to pass to handler
            const fullAsset = workspaceAssets.find(a => a.id === item.id);
            if (fullAsset) handleDownload(fullAsset);
          }}
          onSendToWorkspace={(item) => {
            // Set the prompt in the control box with all generation parameters
            setPrompt(item.prompt);
            // Close modal after sending
            setLightboxIndex(null);
          }}
          onRegenerateMore={async (item) => {
            // Find the full asset by ID to pass to handler
            const fullAsset = workspaceAssets.find(a => a.id === item.id);
            if (fullAsset && fullAsset.metadata?.job_id) {
              await handleRegenerateJob(fullAsset.metadata.job_id);
            }
          }}
          onCreateVideo={(item) => {
            // Find the full asset by ID to pass to handler
            const fullAsset = workspaceAssets.find(a => a.id === item.id);
            if (fullAsset) handleCreateVideo(fullAsset);
          }}
          isRegenerating={isGenerating}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      <OptimizedDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModal.confirmAction}
        title={deleteModal.title}
        description={deleteModal.description}
        confirmText="Delete"
        isLoading={deletingItems.size > 0 || deletingJobs.size > 0}
      />
    </div>
  );
};

export default SimplifiedWorkspace; 