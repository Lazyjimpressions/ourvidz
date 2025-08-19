import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceAssets } from '@/hooks/useWorkspaceAssets';
import { toSharedFromWorkspace } from '@/lib/services/AssetMappers';
import { useSignedAssets } from '@/lib/hooks/useSignedAssets';
import { SharedGrid } from '@/components/shared/SharedGrid';
import { SharedLightbox, WorkspaceAssetActions } from '@/components/shared/SharedLightbox';
import { SimplePromptInput } from '@/components/workspace/SimplePromptInput';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';
import { useLibraryFirstWorkspace } from '@/hooks/useLibraryFirstWorkspace';

/**
 * Updated workspace using shared components and new asset mapping
 */
export const UpdatedSimplifiedWorkspace: React.FC = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // Get workspace state from existing hook
  const {
    mode,
    prompt,
    referenceImage,
    referenceStrength,
    contentType,
    quality,
    isGenerating,
    updateMode,
    setPrompt,
    setReferenceImage,
    setReferenceStrength,
    setContentType,
    setQuality,
    generate,
    clearWorkspace,
    deleteAllWorkspace,
    // ... other workspace state
  } = useLibraryFirstWorkspace();

  // Fetch workspace assets
  const { data: rawWorkspaceAssets = [], refetch } = useWorkspaceAssets();

  // Convert to shared asset format
  const sharedAssets = React.useMemo(() => 
    rawWorkspaceAssets.map(toSharedFromWorkspace), 
    [rawWorkspaceAssets]
  );

  // Get signed URLs for thumbnails
  const { signedAssets, isSigning } = useSignedAssets(sharedAssets, 'workspace-temp', {
    thumbTtlSec: 15 * 60, // 15 minutes for workspace
    enabled: !loading && !!user
  });

  // Honor URL param mode
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'video' || urlMode === 'image') {
      updateMode(urlMode);
    }
  }, [searchParams, updateMode]);

  // Selection handlers
  const handleToggleSelection = useCallback((assetId: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);

  // Asset actions
  const handleSaveToLibrary = useCallback(async (asset: any) => {
    try {
      await WorkspaceAssetService.saveToLibrary(asset.id);
      toast({
        title: "Asset saved",
        description: "Asset has been saved to your library",
      });
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
    } catch (error) {
      console.error('Failed to save asset:', error);
      toast({
        title: "Save failed",
        description: "Failed to save asset to library",
        variant: "destructive",
      });
    }
  }, [toast, queryClient]);

  const handleDiscardAsset = useCallback(async (asset: any) => {
    try {
      await WorkspaceAssetService.discardAsset(asset.id);
      toast({
        title: "Asset discarded",
        description: "Asset has been removed from workspace",
      });
      
      // Refresh workspace
      refetch();
    } catch (error) {
      console.error('Failed to discard asset:', error);
      toast({
        title: "Discard failed",
        description: "Failed to remove asset",
        variant: "destructive",
      });
    }
  }, [toast, refetch]);

  const handlePreview = useCallback((asset: any) => {
    const index = signedAssets.findIndex(a => a.id === asset.id);
    if (index !== -1) {
      setLightboxIndex(index);
    }
  }, [signedAssets]);

  // Sign original URL on demand for lightbox
  const handleRequireOriginalUrl = useCallback(async (asset: any) => {
    // Use the signOriginal function added by useSignedAssets
    if ((asset as any).signOriginal) {
      return (asset as any).signOriginal();
    }
    throw new Error('Original URL signing not available');
  }, []);

  // Auth loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Please sign in to access the workspace.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <WorkspaceHeader 
          onClearWorkspace={clearWorkspace}
          onDeleteAllWorkspace={deleteAllWorkspace}
        />
        
        {/* Main content area with bottom padding for fixed control bar */}
        <main className="flex-1 pb-32">
          <div className="container mx-auto px-4 py-6">
            <SharedGrid
              assets={signedAssets}
              onPreview={handlePreview}
              selection={{
                enabled: true,
                selectedIds: selectedAssets,
                onToggle: handleToggleSelection
              }}
              actions={{
                onSaveToLibrary: handleSaveToLibrary,
                onDiscard: handleDiscardAsset
              }}
              isLoading={isSigning}
              emptyState={
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">Your workspace is empty</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Generate images or videos to see them here
                  </p>
                </div>
              }
            />
          </div>
        </main>

        {/* Fixed bottom control bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40">
          <SimplePromptInput
            prompt={prompt}
            onPromptChange={setPrompt}
            mode={mode}
            onModeChange={updateMode}
            contentType={contentType}
            onContentTypeChange={setContentType}
            quality={quality}
            onQualityChange={setQuality}
            isGenerating={isGenerating}
            onGenerate={generate}
            referenceImage={referenceImage}
            onReferenceImageChange={setReferenceImage}
            referenceStrength={referenceStrength}
            onReferenceStrengthChange={setReferenceStrength}
            // ... other prompt input props (truncated for brevity)
          />
        </div>
      </div>
      
      {/* Lightbox */}
      {lightboxIndex !== null && signedAssets.length > 0 && (
        <SharedLightbox
          assets={signedAssets}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onRequireOriginalUrl={handleRequireOriginalUrl}
          actionsSlot={(asset) => (
            <WorkspaceAssetActions
              asset={asset}
              onSave={() => handleSaveToLibrary(asset)}
              onDiscard={() => handleDiscardAsset(asset)}
              onDownload={() => {
                // TODO: Add download functionality
                toast({
                  title: "Download",
                  description: "Download functionality coming soon",
                });
              }}
            />
          )}
        />
      )}
    </>
  );
};
