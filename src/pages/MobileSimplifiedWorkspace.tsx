
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { useSignedAssets } from '@/lib/hooks/useSignedAssets';

const MobileSimplifiedWorkspace = () => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const processedRef = useRef(false);
  
  // Use the proper library-first workspace hook with RV5.1 routing
  const {
    // Core State
    mode,
    prompt,
    isGenerating,
    workspaceAssets,
    activeJobId,
    // Actions
    updateMode,
    setPrompt,
    setReferenceImage,
    setReferenceMetadata,
    setExactCopyMode,
    generate,
    deleteItem,
    clearItem,
    setLightboxIndex: setWorkspaceLightboxIndex
  } = useLibraryFirstWorkspace();

  const handleGenerate = async (prompt: string, options?: any) => {
    console.log('📸 MOBILE WORKSPACE: Starting generation with prompt:', prompt);
    console.log('📸 MOBILE WORKSPACE: Generation options:', options);
    
    // Use the proper generate function from useLibraryFirstWorkspace
    await generate();
  };

  const handleModeToggle = (mode: 'image' | 'video') => {
    console.log('🔄 MOBILE WORKSPACE: Mode changed to:', mode);
    updateMode(mode);
  };

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

  // Process workspace assets through proper mappers and signing
  const sharedAssets = workspaceAssets.map(toSharedFromWorkspace);
  const { signedAssets, isSigning } = useSignedAssets(sharedAssets, 'workspace-temp');

  // Preview handler for SharedGrid
  const handlePreview = useCallback((asset: any) => {
    const index = signedAssets.findIndex(a => a.id === asset.id);
    if (index !== -1) {
      setLightboxIndex(index);
      setWorkspaceLightboxIndex(index);
    }
  }, [signedAssets, setWorkspaceLightboxIndex]);

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
        <div className="flex-1 p-4 pb-32">
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
            assets={signedAssets}
            onPreview={handlePreview}
            actions={{
              onSaveToLibrary: handleSaveToLibrary as any,
              onDiscard: handleDiscard as any
            }}
            isLoading={isSigning}
          />
        </div>

        {/* Fixed Bottom Input */}
        <MobileSimplePromptInput
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          currentMode={mode}
          onModeToggle={handleModeToggle}
        />

        {/* Lightbox */}
        {lightboxIndex !== null && (signedAssets.length || 0) > 0 && (
          <SharedLightbox
            assets={signedAssets}
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
