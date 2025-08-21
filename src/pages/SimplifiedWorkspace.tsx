
import React, { useState } from 'react';
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
import { GeneratedMediaProvider } from '@/contexts/GeneratedMediaContext';

interface ContentItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  prompt?: string;
  created_at?: string;
  metadata?: any;
}

const SimplifiedWorkspace = () => {
  console.log('📱 SIMPLIFIED WORKSPACE: Component initializing...');
  
  const [selectedAsset, setSelectedAsset] = useState<ContentItem | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentMode, setCurrentMode] = useState<'image' | 'video'>('image');

  const { 
    assets, 
    isLoading, 
    loadMore, 
    hasMore, 
    refreshAssets, 
    deleteAsset, 
    deleteMultipleAssets 
  } = useOptimizedWorkspace();

  const { 
    isGenerating, 
    generateContent, 
    currentJob,
    progress 
  } = useGenerationWorkspace();

  console.log('📱 SIMPLIFIED WORKSPACE: Workspace state:', {
    assetsCount: assets?.length || 0,
    isLoading,
    hasMore,
    isGenerating,
    currentMode
  });

  const handleGenerate = async (prompt: string, options?: any) => {
    console.log('🎯 SIMPLIFIED WORKSPACE: Starting generation with prompt:', prompt);
    console.log('🎯 SIMPLIFIED WORKSPACE: Generation options:', options);
    
    await generateContent(prompt, options);
  };

  const handleModeChange = (mode: 'image' | 'video') => {
    console.log('🔄 SIMPLIFIED WORKSPACE: Mode changed to:', mode);
    setCurrentMode(mode);
  };

  const handleAssetClick = (asset: ContentItem) => {
    console.log('🖼️ SIMPLIFIED WORKSPACE: Asset clicked:', asset.id);
    setSelectedAsset(asset);
  };

  const handleDeleteSelected = async () => {
    if (selectedAssets.length === 0) return;
    
    try {
      await deleteMultipleAssets(selectedAssets);
      setSelectedAssets([]);
      toast.success(`Deleted ${selectedAssets.length} items`);
    } catch (error) {
      console.error('Error deleting assets:', error);
      toast.error('Failed to delete selected items');
    }
  };

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  return (
    <GeneratedMediaProvider>
      <OurVidzDashboardLayout>
        <div className="flex flex-col h-screen bg-background">
          {/* Header with Prompt Input */}
          <div className="flex-none p-6 border-b bg-card">
            <SimplePromptInput
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              currentMode={currentMode}
              onModeToggle={handleModeChange}
            />
            
            {/* Progress Indicator */}
            {isGenerating && (
              <div className="mt-4">
                <GenerationProgressIndicator 
                  status={currentJob?.status || 'queued'}
                  progress={progress}
                />
              </div>
            )}

            {/* Bulk Actions */}
            {selectedAssets.length > 0 && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedAssets.length} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAssets([])}
                >
                  Clear Selection
                </Button>
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
              onDelete={deleteAsset}
              onAssetClick={handleAssetClick}
              selectedAssets={selectedAssets}
              onSelectAsset={handleSelectAsset}
            />
          </div>

          {/* Lightbox */}
          {selectedAsset && (
            <SimpleLightbox
              asset={selectedAsset}
              onClose={() => setSelectedAsset(null)}
              onDelete={() => {
                deleteAsset(selectedAsset.id);
                setSelectedAsset(null);
              }}
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
    </GeneratedMediaProvider>
  );
};

export default SimplifiedWorkspace;
