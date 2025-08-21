
import React, { useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { SimplePromptInput } from '@/components/workspace/SimplePromptInput';
import { WorkspaceGridVirtualized } from '@/components/workspace/WorkspaceGridVirtualized';
import { SimpleLightbox } from '@/components/workspace/SimpleLightbox';
import { OptimizedDeleteModal } from '@/components/workspace/OptimizedDeleteModal';
import { GenerationProgressIndicator } from '@/components/GenerationProgressIndicator';

import { useOptimizedWorkspace } from '@/hooks/useOptimizedWorkspace';
import { useGenerationWorkspace } from '@/hooks/useGenerationWorkspace';

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
    <OurVidzDashboardLayout>
      <div className="flex flex-col h-screen bg-background">
        {/* Header Section */}
        <div className="flex-none border-b bg-card">
          <div className="p-6 pb-4">
            <SimplePromptInput
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              currentMode={currentMode}
              onModeToggle={handleModeChange}
            />
          </div>
          
          {/* Progress Indicator */}
          {isGenerating && (
            <div className="px-6 pb-4">
              <GenerationProgressIndicator 
                status={currentJob?.status || 'queued'}
                progress={progress}
              />
            </div>
          )}

          {/* Bulk Actions Bar */}
          {selectedAssets.length > 0 && (
            <div className="px-6 pb-4">
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
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-hidden">
          <WorkspaceGridVirtualized
            assets={assets}
            isLoading={isLoading}
            onLoadMore={loadMore}
            hasMore={hasMore}
            onRefresh={refreshAssets}
            onDelete={handleDeleteSingle}
            onAssetClick={handleAssetClick}
            selectedAssets={selectedAssets}
            onSelectAsset={handleSelectAsset}
          />
        </div>

        {/* Lightbox Modal */}
        {selectedAsset && (
          <SimpleLightbox
            asset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
            onDelete={() => handleDeleteSingle(selectedAsset.id)}
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
    </OurVidzDashboardLayout>
  );
};
