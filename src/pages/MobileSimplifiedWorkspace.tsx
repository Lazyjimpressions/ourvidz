
import React, { useMemo, useState, useCallback } from 'react';
import { useOptimizedWorkspace } from '@/hooks/useOptimizedWorkspace';
import { useGenerationWorkspace } from '@/hooks/useGenerationWorkspace';
import { MobileSimplePromptInput } from '@/components/workspace/MobileSimplePromptInput';
import { SharedGrid } from '@/components/shared/SharedGrid';
import { SharedLightbox, WorkspaceAssetActions } from '@/components/shared/SharedLightbox';
import { GenerationProgressIndicator } from '@/components/GenerationProgressIndicator';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { useWorkspaceAssets } from '@/hooks/useWorkspaceAssets';
import { toSharedFromWorkspace } from '@/lib/services/AssetMappers';
import { useSignedAssets } from '@/lib/hooks/useSignedAssets';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';
import { toast } from 'sonner';

const MobileSimplifiedWorkspace = () => {
  const [currentMode, setCurrentMode] = useState<'image' | 'video'>('image');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  const { assets, isLoading, loadMore, hasMore, refreshAssets, deleteAsset } = useOptimizedWorkspace();
  const { 
    isGenerating, 
    generateContent, 
    currentJob,
    progress 
  } = useGenerationWorkspace();

  // Workspace assets for shared components
  const { data: rawAssets = [], isLoading: isLoadingRaw, refetch } = useWorkspaceAssets();

  // Map to shared format and sign thumbnails
  const sharedAssets = useMemo(() => rawAssets.map(toSharedFromWorkspace), [rawAssets]);
  const { signedAssets, isSigning } = useSignedAssets(sharedAssets, 'workspace-temp', {
    thumbTtlSec: 15 * 60,
    enabled: true
  });

  const handleGenerate = async (prompt: string, options?: any) => {
    console.log('📸 MOBILE WORKSPACE: Starting generation with prompt:', prompt);
    console.log('📸 MOBILE WORKSPACE: Generation options:', options);
    
    await generateContent(prompt, options);
  };

  const handleModeToggle = (mode: 'image' | 'video') => {
    console.log('🔄 MOBILE WORKSPACE: Mode changed to:', mode);
    setCurrentMode(mode);
  };

  // Preview handler for SharedGrid
  const handlePreview = useCallback((asset: any) => {
    const index = signedAssets.findIndex(a => a.id === asset.id);
    if (index !== -1) setLightboxIndex(index);
  }, [signedAssets]);

  // Require original URL on demand
  const handleRequireOriginalUrl = useCallback(async (asset: any) => {
    if (typeof (asset as any).signOriginal === 'function') {
      return (asset as any).signOriginal();
    }
    throw new Error('Original URL signing not available');
  }, []);

  // Workspace actions
  const handleSaveToLibrary = useCallback(async (asset: any) => {
    try {
      await WorkspaceAssetService.saveToLibrary(asset.id);
      toast.success('Saved to library');
      refetch();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save to library');
    }
  }, [refetch]);

  const handleDiscard = useCallback(async (asset: any) => {
    try {
      await WorkspaceAssetService.discardAsset(asset.id);
      toast.success('Discarded');
      refetch();
    } catch (e) {
      console.error(e);
      toast.error('Failed to discard');
    }
  }, [refetch]);

  return (
    <OurVidzDashboardLayout>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Main Content */}
        <div className="flex-1 p-4 pb-32">
          {/* Progress Indicator */}
          {isGenerating && (
            <div className="mb-4">
              <GenerationProgressIndicator 
                status={currentJob?.status || 'queued'}
                progress={progress}
              />
            </div>
          )}

          {/* Content Grid */}
          <SharedGrid
            assets={signedAssets as any}
            onPreview={handlePreview}
            actions={{
              onSaveToLibrary: handleSaveToLibrary as any,
              onDiscard: handleDiscard as any
            }}
            isLoading={isLoadingRaw || isSigning}
          />
        </div>

        {/* Fixed Bottom Input */}
        <MobileSimplePromptInput
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          currentMode={currentMode}
          onModeToggle={handleModeToggle}
        />

        {/* Lightbox */}
        {lightboxIndex !== null && (signedAssets?.length || 0) > 0 && (
          <SharedLightbox
            assets={signedAssets as any}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onRequireOriginalUrl={handleRequireOriginalUrl}
            actionsSlot={(asset) => (
              <WorkspaceAssetActions
                asset={asset}
                onSave={() => handleSaveToLibrary(asset)}
                onDiscard={() => handleDiscard(asset)}
                onDownload={async () => {
                  try {
                    const url = await handleRequireOriginalUrl(asset);
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
