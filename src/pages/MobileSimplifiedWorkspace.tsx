
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLibraryFirstWorkspace } from '@/hooks/useLibraryFirstWorkspace';
import { extractReferenceMetadata } from '@/utils/extractReferenceMetadata';
import { looksLikeImage } from '@/utils/imageTypeDetection';
import { MobileSimplePromptInput } from '@/components/workspace/MobileSimplePromptInput';
import { MobileDebugPanel } from '@/components/workspace/MobileDebugPanel';
import { SharedGrid } from '@/components/shared/SharedGrid';
import { WorkspaceAssetActions } from '@/components/shared/LightboxActions';
import { UnifiedLightbox, LightboxItem } from '@/components/shared/UnifiedLightbox';
import { GenerationProgressIndicator } from '@/components/GenerationProgressIndicator';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { toast } from 'sonner';
import { toSharedFromWorkspace } from '@/lib/services/AssetMappers';
import { useImageModels } from '@/hooks/useApiModels';
import { useSmartModelDefaults } from '@/hooks/useSmartModelDefaults';
import { useSignedAssets } from '@/lib/hooks/useSignedAssets';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';


const MobileSimplifiedWorkspace = () => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [batchSize, setBatchSize] = useState(1);
  const [userOverrodeModel, setUserOverrodeModel] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const processedRef = useRef(false);
  const { data: imageModels, isLoading: modelsLoading } = useImageModels();
  const { getDefault } = useSmartModelDefaults();
  
  // Use the proper library-first workspace hook with RV5.1 routing
  // Disable URL optimization - we use useSignedAssets for immediate signing instead
  const {
    // Core State
    mode,
    prompt,
    isGenerating,
    workspaceAssets,
    activeJobId,
    quality,
    selectedModel,
    contentType,
    aspectRatio,
    referenceImage, // NEW: Get reference image state from hook
    referenceImageUrl, // NEW: Get reference image URL state from hook
    referenceStrength, // Get reference strength from hook
    beginningRefImage, // NEW: Get beginning ref image state
    beginningRefImageUrl, // NEW: Get beginning ref image URL state
    endingRefImage, // NEW: Get ending ref image state
    endingRefImageUrl, // NEW: Get ending ref image URL state
    // Actions
    updateMode,
    setPrompt,
    setQuality,
    setSelectedModel,
    setContentType,
    setAspectRatio,
    setReferenceImage,
    setReferenceImageUrl,
    setReferenceStrength,
    setReferenceMetadata,
    exactCopyMode,
    setExactCopyMode,
    setBeginningRefImage,
    setBeginningRefImageUrl,
    setEndingRefImage,
    setEndingRefImageUrl,
    generate,
    deleteItem,
    clearItem,
    clearWorkspace,
    deleteAllWorkspace,
    setLightboxIndex: setWorkspaceLightboxIndex,
    // Video Extend settings
    extendStrength,
    setExtendStrength,
    extendReverseVideo,
    setExtendReverseVideo,
    // Creative Direction
    shotType,
    setShotType,
    cameraAngle,
    setCameraAngle,
    style,
    setStyle,
    enhancementModel,
    setEnhancementModel,
    // Video Controls
    videoDuration,
    setVideoDuration,
    motionIntensity,
    setMotionIntensity,
    // URL Management (not used - we use useSignedAssets instead for immediate signing)
    // signedUrls, isUrlLoading, registerAssetRef - removed to avoid lazy loading overhead
  } = useLibraryFirstWorkspace({ disableUrlOptimization: true });

  // Ref 2 for image mode (i2i_multi) - managed locally since hook doesn't have this
  const [referenceImage2, setReferenceImage2] = useState<File | null>(null);
  const [referenceImage2Url, setReferenceImage2Url] = useState<string | null>(null);

  // Smart model auto-switching helper
  const applySmartDefault = useCallback((task: 't2i' | 'i2i' | 'i2i_multi' | 't2v' | 'i2v' | 'extend' | 'multi') => {
    if (userOverrodeModel) return;
    const defaultModel = getDefault(task as any);
    if (!defaultModel) return;
    const providerName = (defaultModel as any).api_providers?.name || 'fal';
    const modelType = providerName === 'replicate' ? 'replicate' : providerName === 'fal' ? 'fal' : 'sdxl';
    setSelectedModel({ id: defaultModel.id, type: modelType as any, display_name: defaultModel.display_name });
    toast.info(`Switched to ${defaultModel.display_name}`, { duration: 2000 });
  }, [userOverrodeModel, getDefault, setSelectedModel]);

  // Handle signed URL from immediate upload (preferred workflow)
  const handleReferenceImageUrlSet = useCallback((url: string, type: 'single' | 'start' | 'end') => {
    console.log('🖼️ MOBILE: Setting reference image URL (from immediate upload):', type, {
      url: url.substring(0, 60) + '...',
      isValidUrl: url.startsWith('http://') || url.startsWith('https://')
    });
    
    switch (type) {
      case 'single':
        setReferenceImage(null);
        setReferenceImageUrl(url);
        // Auto-switch: check if ref2 also exists for i2i_multi
        if (mode === 'image') {
          applySmartDefault(referenceImage2Url ? 'i2i_multi' : 'i2i');
        } else {
          applySmartDefault('i2v');
        }
        break;
      case 'start':
        setBeginningRefImage(null);
        setBeginningRefImageUrl(url);
        // Check if ending ref exists for multi
        if (endingRefImageUrl) {
          applySmartDefault('multi');
        } else {
          applySmartDefault('i2v');
        }
        break;
      case 'end':
        setEndingRefImage(null);
        setEndingRefImageUrl(url);
        // Start + end = multi
        if (beginningRefImageUrl) {
          applySmartDefault('multi');
        }
        break;
    }
  }, [setReferenceImageUrl, setBeginningRefImageUrl, setEndingRefImageUrl, setReferenceImage, setBeginningRefImage, setEndingRefImage, mode, applySmartDefault, referenceImage2Url, endingRefImageUrl, beginningRefImageUrl]);

  // Handle ref2 URL set (image mode only, for i2i_multi)
  const handleReferenceImage2UrlSet = useCallback((url: string) => {
    setReferenceImage2(null);
    setReferenceImage2Url(url);
    // If ref1 also exists, switch to i2i_multi
    if (referenceImageUrl) {
      applySmartDefault('i2i_multi');
    }
  }, [referenceImageUrl, applySmartDefault]);

  const handleReferenceImage2Remove = useCallback(() => {
    setReferenceImage2(null);
    setReferenceImage2Url(null);
    // Revert: if ref1 still exists, go back to i2i
    if (referenceImageUrl) {
      applySmartDefault('i2i');
    }
  }, [referenceImageUrl, applySmartDefault]);

  // LEGACY: Handle File object (fallback for backward compatibility)
  const handleReferenceImageSet = useCallback((file: File, type: 'single' | 'start' | 'end') => {
    // Use robust validation that handles empty file.type on iOS
    const isValidImage = file.type.startsWith('image/') || looksLikeImage(file);
    
    console.log('🖼️ MOBILE: Setting reference image File (legacy):', type, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified,
      isValidImage
    });
    
    // Robust validation - accept if type is image/* OR looks like image by extension
    if (!isValidImage) {
      console.error('❌ MOBILE: Invalid file type, not an image:', file.type, file.name);
      toast.error('Selected file is not an image');
      return;
    }
    
    if (file.size === 0) {
      console.error('❌ MOBILE: File is empty');
      toast.error('Selected image file is empty');
      return;
    }
    
    // LEGACY: Store File object (will be uploaded during generate)
    // This is a fallback - new workflow should use handleReferenceImageUrlSet
    console.warn('⚠️ MOBILE: Using legacy File object workflow (should use immediate upload)');
    switch (type) {
      case 'single':
        setReferenceImage(file);
        console.log('✅ MOBILE: Reference image File set in hook state (legacy)');
        break;
      case 'start':
        setBeginningRefImage(file);
        console.log('✅ MOBILE: Beginning reference image File set in hook state (legacy)');
        break;
      case 'end':
        setEndingRefImage(file);
        console.log('✅ MOBILE: Ending reference image File set in hook state (legacy)');
        break;
    }
  }, [setReferenceImage, setBeginningRefImage, setEndingRefImage]);

  const handleReferenceImageRemove = useCallback((type: 'single' | 'start' | 'end') => {
    console.log('🖼️ MOBILE: Removing reference image:', type);
    
    switch (type) {
      case 'single':
        setReferenceImage(null);
        setReferenceImageUrl(null);
        setReferenceMetadata(null);
        setExactCopyMode(false);
        setBeginningRefImage(null);
        setBeginningRefImageUrl(null);
        // Revert: check if ref2 exists (shouldn't without ref1, but clear it too)
        setReferenceImage2(null);
        setReferenceImage2Url(null);
        if (mode === 'image') applySmartDefault('t2i');
        else applySmartDefault('t2v');
        break;
      case 'start':
        setBeginningRefImage(null);
        setBeginningRefImageUrl(null);
        setReferenceImage(null);
        setReferenceImageUrl(null);
        setReferenceMetadata(null);
        setExactCopyMode(false);
        applySmartDefault('t2v');
        break;
      case 'end':
        setEndingRefImage(null);
        setEndingRefImageUrl(null);
        // If start still exists, revert to i2v
        if (beginningRefImageUrl) {
          applySmartDefault('i2v');
        }
        break;
    }
  }, [setReferenceImage, setReferenceImageUrl, setBeginningRefImage, setBeginningRefImageUrl, setEndingRefImage, setEndingRefImageUrl, setReferenceMetadata, setExactCopyMode, mode, applySmartDefault, beginningRefImageUrl]);

  // DEBUG: Track reference image state changes
  useEffect(() => {
    console.log('🔄 MOBILE WORKSPACE: Reference image state changed:', {
      hasReferenceImage: !!referenceImage,
      referenceImageName: referenceImage?.name,
      referenceImageSize: referenceImage?.size,
      referenceImageType: referenceImage?.type,
      hasReferenceImageUrl: !!referenceImageUrl,
      referenceImageUrlPreview: referenceImageUrl ? `${referenceImageUrl.substring(0, 50)}...` : 'none'
    });
  }, [referenceImage, referenceImageUrl]);

  const handleGenerate = async (inputPrompt: string, options?: any) => {
    console.log('📸 MOBILE WORKSPACE: Starting generation with prompt:', inputPrompt);
    console.log('📸 MOBILE WORKSPACE: Generation options:', options);
    console.log('📸 MOBILE WORKSPACE: Selected model:', selectedModel);
    console.log('📸 MOBILE WORKSPACE: Quality:', quality);
    console.log('🖼️ MOBILE WORKSPACE: Reference image state:', {
      hasReferenceImage: !!referenceImage,
      hasReferenceImageUrl: !!referenceImageUrl,
      referenceImageName: referenceImage?.name,
      referenceImageSize: referenceImage?.size,
      referenceImageType: referenceImage?.type,
      referenceImageIsFile: referenceImage instanceof File,
      referenceImageIsValid: referenceImage && referenceImage.size > 0 && referenceImage.type.startsWith('image/'),
      referenceImageUrlPreview: referenceImageUrl ? `${referenceImageUrl.substring(0, 50)}...` : 'none'
    });
    
    // CRITICAL: Check if this is an I2I-capable model using capabilities (no hard-coded checks)
    // Query model capabilities from database or use from imageModels hook
    let isI2IModel = false;
    if (selectedModel?.id && selectedModel.id !== 'sdxl') {
      // For API models, check capabilities from imageModels hook
      const modelData = imageModels?.find(m => m.id === selectedModel.id);
      const capabilities = (modelData as any)?.capabilities;
      if (capabilities) {
        isI2IModel = capabilities.supports_i2i === true || 
                     capabilities.reference_images === true;
      }
    } else if (selectedModel?.id === 'sdxl') {
      // Local SDXL always supports I2I
      isI2IModel = true;
    }
    
    console.log('🔍 MOBILE WORKSPACE: I2I model detection:', {
      selectedModelId: selectedModel?.id,
      selectedModelDisplayName: selectedModel?.display_name,
      selectedModelType: selectedModel?.type,
      mode,
      isI2IModel,
      hasReferenceImage: !!referenceImage,
      hasReferenceImageUrl: !!referenceImageUrl,
      referenceImageName: referenceImage?.name
    });
    
    // Validate reference image if I2I model is selected
    // Check BOTH file and URL - file will be uploaded, URL is already signed
    if (isI2IModel && !referenceImage && !referenceImageUrl) {
      console.error('❌ MOBILE WORKSPACE: I2I model selected but no reference image file or URL');
      console.error('❌ MOBILE WORKSPACE: Model details:', {
        id: selectedModel?.id,
        displayName: selectedModel?.display_name,
        type: selectedModel?.type
      });
      toast.error('Please select a reference image for I2I generation. The image preview should appear after selection.');
      return;
    }
    
    // Set the prompt first, then generate
    setPrompt(inputPrompt);
    await generate();
  };




  const handleModeToggle = (newMode: 'image' | 'video') => {
    console.log('🔄 MOBILE WORKSPACE: Mode changed to:', newMode);
    updateMode(newMode);
    setUserOverrodeModel(false);
    applySmartDefault(newMode === 'image' ? 't2i' : 't2v');
  };

  const handleModelChange = (model: { id: string; type: 'sdxl' | 'replicate' | 'fal'; display_name: string }) => {
    console.log('🔄 MOBILE WORKSPACE: Model changed to:', model);
    setUserOverrodeModel(true);
    setSelectedModel(model);
  };

  // Auto-upgrade legacy model selections
  useEffect(() => {
    if (!modelsLoading && imageModels && selectedModel?.id === 'legacy-rv51') {
      console.log('🔄 MOBILE: Upgrading legacy RV5.1 selection to real model');
      const replicateModels = imageModels.filter(m => m.api_providers.name === 'replicate');
      const defaultReplicate = replicateModels.find(m => m.is_default) || replicateModels[0];
      
      if (defaultReplicate) {
        setSelectedModel({
          id: defaultReplicate.id,
          type: 'replicate',
          display_name: defaultReplicate.display_name
        });
        toast.success(`Upgraded to ${defaultReplicate.display_name}`);
      } else {
        setSelectedModel({ id: 'sdxl', type: 'sdxl', display_name: 'SDXL' });
        toast.error('No Replicate models available, switched to SDXL');
      }
    }
  }, [modelsLoading, imageModels, selectedModel, setSelectedModel]);

  // Handle incoming reference image from library - prevent re-processing
  useEffect(() => {
    const state = location.state as any;
    if (state?.referenceUrl && state?.prompt && !processedRef.current) {
      console.log('🖼️ MOBILE: Setting reference image from library:', state);
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
          
          // If we have reference asset metadata, extract it
          if (state.referenceAsset?.id) {
            const metadata = await extractReferenceMetadata(state.referenceAsset.id);
            if (metadata) {
              setReferenceMetadata(metadata);
              setExactCopyMode(true);
            }
          }
          
          toast.success('Reference image loaded from library');
        } catch (error) {
          console.error('Failed to load reference image:', error);
          toast.error('Failed to load reference image');
        }
      };

      setReferenceFromUrl();
      
      // Clear the navigation state properly for React Router
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location.state, setPrompt, setReferenceImage, setReferenceMetadata, setExactCopyMode, navigate, location.pathname, location.search]);

  // Step 1: Map workspace assets to SharedAsset format
  const mappedAssets = useMemo(() => {
    return workspaceAssets.map(toSharedFromWorkspace);
  }, [workspaceAssets]);

  // Step 2: Use immediate signing hook (same as desktop) - no lazy loading!
  // This signs ALL thumbnails immediately on mount, avoiding the IntersectionObserver overhead
  const { signedAssets: sharedAssets, isSigning } = useSignedAssets(
    mappedAssets,
    'workspace-temp',
    {
      thumbTtlSec: 1800,   // 30 min for mobile thumbnails
      originalTtlSec: 3600 // 1 hour for full resolution
    }
  );

  // Preview handler for SharedGrid
  const handlePreview = useCallback((asset: any) => {
    const index = sharedAssets.findIndex(a => a.id === asset.id);
    if (index !== -1) {
      setLightboxIndex(index);
      setWorkspaceLightboxIndex(index);
    }
  }, [sharedAssets, setWorkspaceLightboxIndex]);

  // Use workspace image as reference (like desktop)
  const handleUseAsReference = useCallback(async (asset: any) => {
    try {
      console.log('🖼️ MOBILE: Use as Reference clicked for asset:', asset);
      const isVideo = asset.type === 'video';
      
      // Get signed URL for the asset
      let referenceUrl: string | null = null;
      
      if (asset.url) {
        referenceUrl = asset.url;
      } else if (typeof asset.signOriginal === 'function') {
        referenceUrl = await asset.signOriginal();
      } else if (asset.thumbUrl) {
        referenceUrl = asset.thumbUrl;
      }
      
      if (!referenceUrl) {
        console.error('❌ MOBILE: No reference URL available for asset:', asset);
        toast.error('Could not get URL for this asset');
        return;
      }
      
      console.log('✅ MOBILE: Got reference URL, converting to File...');
      
      // Convert URL to File object
      const response = await fetch(referenceUrl);
      const blob = await response.blob();
      const ext = isVideo ? 'mp4' : (blob.type.split('/')[1] || 'jpg');
      const mimeType = isVideo ? 'video/mp4' : (blob.type || 'image/jpeg');
      const file = new File([blob], `reference-${asset.id}.${ext}`, { type: mimeType });
      
      console.log('✅ MOBILE: File created:', { fileName: file.name, fileSize: file.size, fileType: file.type });
      
      if (isVideo) {
        // Video → set as start frame ref, switch to video mode + extend model
        if (mode !== 'video') {
          updateMode('video');
        }
        setBeginningRefImage(file);
        setBeginningRefImageUrl(referenceUrl);
        applySmartDefault('extend');
        toast.success('Video set as reference for extension');
      } else {
        // Image → existing behavior
        setReferenceImage(file);
        setReferenceImageUrl(referenceUrl);
        setReferenceMetadata(null);
        setExactCopyMode(false);
        
        if (asset.prompt) {
          setPrompt(asset.prompt);
        }
        
        toast.success('Workspace image set as reference');
      }
    } catch (error) {
      console.error('❌ MOBILE: Failed to use asset as reference:', error);
      toast.error('Failed to use as reference');
    }
  }, [setReferenceImage, setReferenceImageUrl, setPrompt, setBeginningRefImage, setBeginningRefImageUrl, mode, updateMode, applySmartDefault, setReferenceMetadata, setExactCopyMode]);

  // Workspace actions - Save to library WITHOUT removing from workspace
  const handleSaveToLibrary = useCallback(async (asset: any) => {
    try {
      // Use WorkspaceAssetService.saveToLibrary which only saves, doesn't remove
      await WorkspaceAssetService.saveToLibrary(asset.id);
      toast.success('Saved to library');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save to library');
    }
  }, []);

  const handleDiscard = useCallback(async (asset: any) => {
    try {
      // Use the deleteItem function which removes from workspace
      await deleteItem(asset.id, asset.type);
      toast.success('Discarded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to discard');
    }
  }, [deleteItem]);

  // Keyboard visibility detection for mobile
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Enhanced keyboard detection for iOS Safari
      // More accurate detection for iOS (keyboard behavior differs from Android)
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        // More accurate threshold for iOS (keyboard typically reduces viewport by 50-60%)
        const isKeyboardVisible = viewportHeight < windowHeight * 0.7;
        setKeyboardVisible(isKeyboardVisible);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      // Also check on initial load
      handleResize();
      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  return (
    <OurVidzDashboardLayout>
      <div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
        {/* Main Content */}
        <div className={`
          flex-1 overflow-y-auto overflow-x-hidden p-4
          overscroll-behavior-contain
          -webkit-overflow-scrolling-touch
          pb-safe
          ${keyboardVisible ? '' : isControlsExpanded ? 'pb-80' : 'pb-32'}
          pt-[env(safe-area-inset-top)]
        `}>
          {/* Progress Indicator - dynamically derives status from workspace assets */}
          {isGenerating && (() => {
            // Derive actual job status from workspace assets
            const processingAssets = workspaceAssets.filter(a => a.status === 'processing' || a.status === 'queued');
            const hasProcessing = processingAssets.some(a => a.status === 'processing');
            const hasQueued = processingAssets.some(a => a.status === 'queued');
            const dynamicStatus = hasProcessing ? 'processing' : hasQueued ? 'queued' : 'processing';
            
            return (
              <div className="mb-4">
                <GenerationProgressIndicator 
                  status={dynamicStatus}
                  progress={hasProcessing ? 50 : 10}
                />
              </div>
            );
          })()}

          {/* Content Grid */}
          <SharedGrid
            assets={sharedAssets}
            onPreview={handlePreview}
            actions={{
              onSaveToLibrary: handleSaveToLibrary,
              onDiscard: handleDiscard,
              onUseAsReference: (asset) => {
                if (asset.type === 'image' || asset.type === 'video') {
                  handleUseAsReference(asset);
                } else {
                  toast.error('Only images and videos can be used as reference');
                }
              },
              onSendToRef: (asset) => {
                if (asset.type === 'image' || asset.type === 'video') {
                  handleUseAsReference(asset);
                } else {
                  toast.error('Only images and videos can be used as reference');
                }
              }
            }}
            isLoading={isGenerating && sharedAssets.length === 0}
          />
        </div>

                {/* Debug Panel - Only show in development mode */}
                {import.meta.env.DEV && (
                  <div className="p-1 border-t bg-muted/20">
                    <MobileDebugPanel
                      referenceImage={referenceImage}
                      referenceImageUrl={referenceImageUrl || null}
                      selectedModel={selectedModel}
                      mode={mode}
                      isOpen={showDebugPanel}
                      onToggle={() => setShowDebugPanel(!showDebugPanel)}
                    />
                  </div>
                )}

                {/* Fixed Bottom Input */}
                <MobileSimplePromptInput
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          currentMode={mode}
          onModeToggle={handleModeToggle}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          quality={quality}
          onQualityChange={setQuality}
          onReferenceImageSet={handleReferenceImageSet}
          onReferenceImageUrlSet={handleReferenceImageUrlSet}
          onReferenceImageRemove={handleReferenceImageRemove}
          referenceImage={referenceImage}
          referenceImageUrl={referenceImageUrl}
          beginningRefImage={beginningRefImage}
          beginningRefImageUrl={beginningRefImageUrl}
          endingRefImage={endingRefImage}
          endingRefImageUrl={endingRefImageUrl}
          contentType={contentType}
          onContentTypeChange={setContentType}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          onCollapsedChange={setIsControlsExpanded}
          exactCopyMode={exactCopyMode}
          onExactCopyModeChange={setExactCopyMode}
          referenceStrength={referenceStrength}
          onReferenceStrengthChange={setReferenceStrength}
          onClearWorkspace={clearWorkspace}
          onDeleteAllWorkspace={deleteAllWorkspace}
          extendStrength={extendStrength}
          onExtendStrengthChange={setExtendStrength}
          extendReverseVideo={extendReverseVideo}
          onExtendReverseVideoChange={setExtendReverseVideo}
          batchSize={batchSize}
          onBatchSizeChange={setBatchSize}
          shotType={shotType}
          onShotTypeChange={setShotType}
          cameraAngle={cameraAngle}
          onCameraAngleChange={setCameraAngle}
          style={style}
          onStyleChange={setStyle}
          enhancementModel={enhancementModel}
          onEnhancementModelChange={setEnhancementModel}
          videoDuration={videoDuration}
          onVideoDurationChange={setVideoDuration}
          motionIntensity={motionIntensity}
          onMotionIntensityChange={setMotionIntensity}
          referenceImage2={referenceImage2}
          referenceImage2Url={referenceImage2Url}
          onReferenceImage2UrlSet={handleReferenceImage2UrlSet}
          onReferenceImage2Remove={handleReferenceImage2Remove}
        />

        {/* Lightbox */}
        {lightboxIndex !== null && (sharedAssets.length || 0) > 0 && (
          <UnifiedLightbox
            items={sharedAssets.map((a: any) => ({
              id: a.id,
              url: a.thumbUrl || a.url || '',
              type: a.type || 'image',
              title: a.title,
              prompt: a.prompt,
              originalPath: a.originalPath,
              metadata: a.metadata,
              width: a.width,
              height: a.height,
              modelType: a.modelType,
              mimeType: a.mimeType,
            } as LightboxItem))}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onRequireOriginalUrl={async (item) => {
              const asset = sharedAssets.find((a: any) => a.id === item.id);
              if (asset && (asset as any).signOriginal) {
                return (asset as any).signOriginal();
              }
              return (asset as any)?.thumbUrl || item.url;
            }}
            actionsSlot={(item) => {
              const asset = sharedAssets.find((a: any) => a.id === item.id);
              if (!asset) return null;
              return (
                <WorkspaceAssetActions
                  asset={asset as any}
                  onSave={() => handleSaveToLibrary(asset)}
                  onDiscard={() => handleDiscard(asset)}
                  onUseAsReference={() => handleUseAsReference(asset)}
                  onDownload={async () => {
                    try {
                      let url: string;
                      if ((asset as any).signOriginal) {
                        url = await (asset as any).signOriginal();
                      } else {
                        url = (asset as any).thumbUrl || (asset as any).originalPath || '';
                      }
                      const res = await fetch(url);
                      const blob = await res.blob();
                      const objectUrl = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = objectUrl;
                      a.download = `${asset.title || asset.id}.${asset.format === 'video' ? 'mp4' : 'jpg'}`;
                      document.body.appendChild(a);
                      a.click();
                      URL.revokeObjectURL(objectUrl);
                      document.body.removeChild(a);
                      toast.success('Download started');
                    } catch (e) {
                      console.error('Download failed:', e);
                      toast.error('Download failed');
                    }
                  }}
                />
              );
            }}
          />
        )}
      </div>
    </OurVidzDashboardLayout>
  );
};

export default MobileSimplifiedWorkspace;
