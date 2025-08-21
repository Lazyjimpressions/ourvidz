
import React, { useState, useCallback, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { SharedGrid } from '@/components/shared/SharedGrid';
import { SharedLightbox, WorkspaceAssetActions } from '@/components/shared/SharedLightbox';
import { OptimizedDeleteModal } from '@/components/workspace/OptimizedDeleteModal';
import { GenerationProgressIndicator } from '@/components/GenerationProgressIndicator';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { MobileSimplePromptInput } from '@/components/workspace/MobileSimplePromptInput';

import { useOptimizedWorkspace } from '@/hooks/useOptimizedWorkspace';
import { useGenerationWorkspace } from '@/hooks/useGenerationWorkspace';
import { useWorkspaceAssets } from '@/hooks/useWorkspaceAssets';
import { toSharedFromWorkspace } from '@/lib/services/AssetMappers';
import { useSignedAssets } from '@/lib/hooks/useSignedAssets';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';

interface ContentItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  prompt?: string;
  created_at?: string;
  metadata?: any;
}

export const UpdatedSimplifiedWorkspace = () => {
  console.log('🚀 UPDATED WORKSPACE: Component initializing...');
  
  // UI State
  const [selectedAsset, setSelectedAsset] = useState<ContentItem | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentMode, setCurrentMode] = useState<'image' | 'video'>('image');

  // Workspace Hook
  const { 
    assets, 
    isLoading, 
    loadMore, 
    hasMore, 
    refreshAssets, 
    deleteAsset, 
    deleteMultipleAssets 
  } = useOptimizedWorkspace();

  // Generation Hook
  const { 
    isGenerating, 
    generateContent, 
    currentJob,
    progress 
  } = useGenerationWorkspace();

  console.log('🚀 UPDATED WORKSPACE: Current state:', {
    assetsCount: assets?.length || 0,
    isLoading,
    hasMore,
    isGenerating,
    selectedAssetsCount: selectedAssets.length,
    currentMode
  });

  // Workspace assets for shared components
  const { data: rawAssets = [], isLoading: isLoadingRaw, refetch } = useWorkspaceAssets();

  // Map to shared format and sign thumbnails
  const sharedAssets = useMemo(() => rawAssets.map(toSharedFromWorkspace), [rawAssets]);
  const { signedAssets, isSigning } = useSignedAssets(sharedAssets, 'workspace-temp', {
    thumbTtlSec: 15 * 60,
    enabled: true
  });

  // Lightbox index for SharedLightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
  const handleGenerate = useCallback(async (prompt: string, options?: any) => {
    console.log('🎯 UPDATED WORKSPACE: Starting generation with prompt:', prompt);
    console.log('🎯 UPDATED WORKSPACE: Generation options:', options);
    
    try {
      await generateContent(prompt, options);
    } catch (error) {
      console.error('🚨 UPDATED WORKSPACE: Generation failed:', error);
      toast.error('Generation failed. Please try again.');
    }
  }, [generateContent]);

  const handleModeChange = useCallback((mode: 'image' | 'video') => {
    console.log('🔄 UPDATED WORKSPACE: Mode changed to:', mode);
    setCurrentMode(mode);
  }, []);

  const handleAssetClick = useCallback((asset: ContentItem) => {
    console.log('🖼️ UPDATED WORKSPACE: Asset clicked:', asset.id);
    setSelectedAsset(asset);
  }, []);

  const handleSelectAsset = useCallback((assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedAssets.length === 0) return;
    
    console.log('🗑️ UPDATED WORKSPACE: Deleting selected assets:', selectedAssets);
    
    try {
      await deleteMultipleAssets(selectedAssets);
      setSelectedAssets([]);
      setShowDeleteModal(false);
      toast.success(`Successfully deleted ${selectedAssets.length} items`);
    } catch (error) {
      console.error('🚨 UPDATED WORKSPACE: Delete failed:', error);
      toast.error('Failed to delete selected items. Please try again.');
    }
  }, [selectedAssets, deleteMultipleAssets]);

  const handleDeleteSingle = useCallback(async (assetId: string) => {
    console.log('🗑️ UPDATED WORKSPACE: Deleting single asset:', assetId);
    
    try {
      await deleteAsset(assetId);
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(null);
      }
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('🚨 UPDATED WORKSPACE: Single delete failed:', error);
      toast.error('Failed to delete item. Please try again.');
    }
  }, [deleteAsset, selectedAsset]);

  return (
    <div className="flex flex-col h-screen bg-background">
        {/* Top Header */}
        <WorkspaceHeader />

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6 pt-16 pb-40 space-y-4">
          {/* Progress Indicator */}
          {isGenerating && (
            <GenerationProgressIndicator 
              status={currentJob?.status || 'queued'}
              progress={progress}
            />
          )}

          {/* Bulk Actions Bar */}
          {selectedAssets.length > 0 && (
            <Card>
              <CardContent className="flex items-center justify-between p-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {selectedAssets.length} item{selectedAssets.length === 1 ? '' : 's'} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete ({selectedAssets.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAssets([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grid */}
          <SharedGrid
            assets={signedAssets as any}
            onPreview={handlePreview}
            selection={{
              enabled: true,
              selectedIds: new Set(selectedAssets),
              onToggle: (id: string) => handleSelectAsset(id)
            }}
            actions={{
              onSaveToLibrary: handleSaveToLibrary as any,
              onDiscard: handleDiscard as any
            }}
            isLoading={isLoadingRaw || isSigning}
          />
        </div>

        {/* Fixed bottom control bar */}
        <MobileSimplePromptInput
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          currentMode={currentMode}
          onModeToggle={handleModeChange}
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

        {/* Delete Confirmation Modal */}
        <OptimizedDeleteModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteSelected}
          count={selectedAssets.length}
        />
      </div>
  );
};
