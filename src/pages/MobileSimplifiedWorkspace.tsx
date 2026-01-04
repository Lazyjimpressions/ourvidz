
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLibraryFirstWorkspace } from '@/hooks/useLibraryFirstWorkspace';
import { extractReferenceMetadata } from '@/utils/extractReferenceMetadata';
import { MobileSimplePromptInput } from '@/components/workspace/MobileSimplePromptInput';
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
    console.log('🖼️ MOBILE: Setting reference image:', type, file.name);
    
    switch (type) {
      case 'single':
        setReferenceImage(file);
        break;
      case 'start':
        setBeginningRefImage(file);
        break;
      case 'end':
        setEndingRefImage(file);
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

  const handleGenerate = async (inputPrompt: string, options?: any) => {
    console.log('📸 MOBILE WORKSPACE: Starting generation with prompt:', inputPrompt);
    console.log('📸 MOBILE WORKSPACE: Generation options:', options);
    console.log('📸 MOBILE WORKSPACE: Selected model:', selectedModel);
    console.log('📸 MOBILE WORKSPACE: Quality:', quality);
    
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
              onDiscard: handleDiscard
            }}
            isLoading={isGenerating || isUrlLoading}
            registerAssetRef={(element, assetId) => registerAssetRef(assetId, element)}
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
