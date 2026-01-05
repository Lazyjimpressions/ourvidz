
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLibraryFirstWorkspace } from '@/hooks/useLibraryFirstWorkspace';
import { extractReferenceMetadata } from '@/utils/extractReferenceMetadata';
import { MobileSimplePromptInput } from '@/components/workspace/MobileSimplePromptInput';
import { MobileDebugPanel } from '@/components/workspace/MobileDebugPanel';
import { SharedGrid } from '@/components/shared/SharedGrid';
import { SharedLightbox, WorkspaceAssetActions } from '@/components/shared/SharedLightbox';
import { GenerationProgressIndicator } from '@/components/GenerationProgressIndicator';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { toast } from 'sonner';
import { toSharedFromWorkspace } from '@/lib/services/AssetMappers';
import { useImageModels } from '@/hooks/useApiModels';


const MobileSimplifiedWorkspace = () => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const processedRef = useRef(false);
  const { data: imageModels, isLoading: modelsLoading } = useImageModels();
  
  // Use the proper library-first workspace hook with RV5.1 routing
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
    beginningRefImage, // NEW: Get beginning ref image state
    endingRefImage, // NEW: Get ending ref image state
    // Actions
    updateMode,
    setPrompt,
    setQuality,
    setSelectedModel,
    setContentType,
    setAspectRatio,
    setReferenceImage,
    setReferenceMetadata,
    setExactCopyMode,
    setBeginningRefImage,
    setEndingRefImage,
    generate,
    deleteItem,
    clearItem,
    setLightboxIndex: setWorkspaceLightboxIndex,
    // URL Management
    signedUrls,
    isUrlLoading,
    registerAssetRef
  } = useLibraryFirstWorkspace();

  const handleReferenceImageSet = useCallback((file: File, type: 'single' | 'start' | 'end') => {
    console.log('🖼️ MOBILE: Setting reference image:', type, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified,
      isValidImage: file.type.startsWith('image/')
    });
    
    // Additional validation
    if (!file.type.startsWith('image/')) {
      console.error('❌ MOBILE: Invalid file type, not an image:', file.type);
      toast.error('Selected file is not an image');
      return;
    }
    
    if (file.size === 0) {
      console.error('❌ MOBILE: File is empty');
      toast.error('Selected image file is empty');
      return;
    }
    
    switch (type) {
      case 'single':
        setReferenceImage(file);
        console.log('✅ MOBILE: Reference image File set in hook state');
        break;
      case 'start':
        setBeginningRefImage(file);
        console.log('✅ MOBILE: Beginning reference image File set in hook state');
        break;
      case 'end':
        setEndingRefImage(file);
        console.log('✅ MOBILE: Ending reference image File set in hook state');
        break;
    }
  }, [setReferenceImage, setBeginningRefImage, setEndingRefImage]);

  const handleReferenceImageRemove = useCallback((type: 'single' | 'start' | 'end') => {
    console.log('🖼️ MOBILE: Removing reference image:', type);
    
    switch (type) {
      case 'single':
        setReferenceImage(null);
        setReferenceMetadata(null);
        setExactCopyMode(false);
        break;
      case 'start':
        setBeginningRefImage(null);
        break;
      case 'end':
        setEndingRefImage(null);
        break;
    }
  }, [setReferenceImage, setBeginningRefImage, setEndingRefImage, setReferenceMetadata, setExactCopyMode]);

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
    
    // CRITICAL: Check if this is an I2I-capable model
    // Seedream edit models require a reference image
    // Check both model ID and display name for Seedream edit models
    const modelIdLower = (selectedModel?.id || '').toLowerCase();
    const modelDisplayNameLower = (selectedModel?.display_name || '').toLowerCase();
    const isI2IModel = selectedModel?.type === 'fal' && 
                       mode === 'image' && 
                       (modelIdLower.includes('seedream') || 
                        modelDisplayNameLower.includes('seedream') ||
                        modelDisplayNameLower.includes('edit'));
    
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

  const handleModeToggle = (mode: 'image' | 'video') => {
    console.log('🔄 MOBILE WORKSPACE: Mode changed to:', mode);
    updateMode(mode);
  };

  const handleModelChange = (model: { id: string; type: 'sdxl' | 'replicate' | 'fal'; display_name: string }) => {
    console.log('🔄 MOBILE WORKSPACE: Model changed to:', model);
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

  // Process workspace assets through proper mappers - use centralized signing
  const sharedAssets = useMemo(() => {
    const mapped = workspaceAssets.map(toSharedFromWorkspace);
    // Build compatible asset array using centralized signedUrls Map
    return mapped.map(asset => {
      const signedOriginal = signedUrls.get(asset.id);
      return {
        ...asset,
        url: signedOriginal || null,
        thumbUrl: signedOriginal || null, // Use original for both thumb and full
        signOriginal: async () => {
          const existing = signedUrls.get(asset.id);
          if (existing) return existing;
          // Fallback - should rarely be needed with proper lazy loading
          return asset.originalPath || '';
        }
      };
    });
  }, [workspaceAssets, signedUrls]);

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
      
      // Get signed URL for the asset
      let referenceUrl: string | null = null;
      
      if (asset.url) {
        referenceUrl = asset.url;
      } else if (typeof asset.signOriginal === 'function') {
        referenceUrl = await asset.signOriginal();
      } else if (asset.originalPath) {
        // Fallback: sign the URL directly
        const signed = signedUrls.get(asset.id);
        if (signed) {
          referenceUrl = signed;
        }
      }
      
      if (!referenceUrl) {
        console.error('❌ MOBILE: No reference URL available for asset:', asset);
        toast.error('Could not get URL for this asset');
        return;
      }
      
      console.log('✅ MOBILE: Got reference URL, converting to File...');
      
      // Convert URL to File object (like desktop does)
      const response = await fetch(referenceUrl);
      const blob = await response.blob();
      const file = new File([blob], `reference-${asset.id}.${blob.type.split('/')[1] || 'jpg'}`, {
        type: blob.type || 'image/jpeg'
      });
      
      console.log('✅ MOBILE: File created from workspace image:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      // Set as reference image - use both file and URL for maximum compatibility
      console.log('📝 MOBILE: Setting reference image from workspace asset');
      setReferenceImage(file);
      setReferenceImageUrl(referenceUrl);
      
      // Clear any existing metadata to start fresh
      setReferenceMetadata(null);
      setExactCopyMode(false);
      
      // Set prompt if available
      if (asset.prompt) {
        setPrompt(asset.prompt);
      }
      
      // Verify state was set (React batches updates, so check in next tick)
      setTimeout(() => {
        console.log('✅ MOBILE: Reference image should be set now');
      }, 0);
      
      toast.success('Workspace image set as reference');
    } catch (error) {
      console.error('❌ MOBILE: Failed to use workspace image as reference:', error);
      toast.error('Failed to use image as reference');
    }
  }, [setReferenceImage, setReferenceImageUrl, setPrompt, signedUrls]);

  // Workspace actions
  const handleSaveToLibrary = useCallback(async (asset: any) => {
    try {
      // Use the clearItem function which saves to library
      await clearItem(asset.id, asset.type);
      toast.success('Saved to library');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save to library');
    }
  }, [clearItem]);

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

  return (
    <OurVidzDashboardLayout>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Main Content */}
        <div className={`flex-1 p-2 ${isControlsExpanded ? 'pb-80' : 'pb-32'}`}>
          {/* Progress Indicator */}
          {isGenerating && (
            <div className="mb-4">
              <GenerationProgressIndicator 
                status="processing"
                progress={0}
              />
            </div>
          )}

          {/* Content Grid */}
          <SharedGrid
            assets={sharedAssets}
            onPreview={handlePreview}
            actions={{
              onSaveToLibrary: handleSaveToLibrary,
              onDiscard: handleDiscard,
              onUseAsReference: (asset) => {
                // Allow using workspace images as reference (like desktop)
                if (asset.type === 'image') {
                  handleUseAsReference(asset);
                } else {
                  toast.error('Only images can be used as reference');
                }
              },
              onSendToRef: (asset) => {
                // Also support onSendToRef for workspace compatibility
                if (asset.type === 'image') {
                  handleUseAsReference(asset);
                } else {
                  toast.error('Only images can be used as reference');
                }
              }
            }}
            isLoading={isGenerating || isUrlLoading}
            registerAssetRef={(element, assetId) => registerAssetRef(assetId, element)}
          />
        </div>

                {/* Debug Panel - Collapsed by default, can be expanded */}
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
          onReferenceImageRemove={handleReferenceImageRemove}
          referenceImage={referenceImage}
          beginningRefImage={beginningRefImage}
          endingRefImage={endingRefImage}
          contentType={contentType}
          onContentTypeChange={setContentType}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          onCollapsedChange={setIsControlsExpanded}
        />

        {/* Lightbox */}
        {lightboxIndex !== null && (sharedAssets.length || 0) > 0 && (
          <SharedLightbox
            assets={sharedAssets}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onRequireOriginalUrl={async (asset) => {
              // Use signOriginal if available, otherwise fallback to url
              if ((asset as any).signOriginal) {
                return (asset as any).signOriginal();
              }
              return (asset as any).thumbUrl || (asset as any).originalPath || '';
            }}
            actionsSlot={(asset) => (
              <WorkspaceAssetActions
                asset={asset}
                onSave={() => handleSaveToLibrary(asset)}
                onDiscard={() => handleDiscard(asset)}
                onUseAsReference={() => handleUseAsReference(asset)}
                onDownload={async () => {
                  try {
                    // Use the same logic as onRequireOriginalUrl
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
            )}
          />
        )}
      </div>
    </OurVidzDashboardLayout>
  );
};

export default MobileSimplifiedWorkspace;
