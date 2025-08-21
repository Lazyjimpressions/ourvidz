
import React, { useState, useEffect } from 'react';
import { useOptimizedWorkspace } from '@/hooks/useOptimizedWorkspace';
import { useGenerationWorkspace } from '@/hooks/useGenerationWorkspace';
import { MobileSimplePromptInput } from '@/components/workspace/MobileSimplePromptInput';
import { WorkspaceGridVirtualized } from '@/components/workspace/WorkspaceGridVirtualized';
import { SimpleLightbox } from '@/components/workspace/SimpleLightbox';
import { GenerationProgressIndicator } from '@/components/GenerationProgressIndicator';
import { GeneratedMediaContext } from '@/contexts/GeneratedMediaContext';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';

const MobileSimplifiedWorkspace = () => {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [currentMode, setCurrentMode] = useState<'image' | 'video'>('image');
  
  const { assets, isLoading, loadMore, hasMore, refreshAssets, deleteAsset } = useOptimizedWorkspace();
  const { 
    isGenerating, 
    generateContent, 
    generatedItems, 
    currentJob,
    progress 
  } = useGenerationWorkspace();

  const handleGenerate = async (prompt: string, options?: any) => {
    console.log('📸 MOBILE WORKSPACE: Starting generation with prompt:', prompt);
    console.log('📸 MOBILE WORKSPACE: Generation options:', options);
    
    await generateContent(prompt, options);
  };

  const handleModeToggle = (mode: 'image' | 'video') => {
    console.log('🔄 MOBILE WORKSPACE: Mode changed to:', mode);
    setCurrentMode(mode);
  };

  const contextValue = {
    generatedItems,
    isGenerating,
    currentJob,
    progress
  };

  return (
    <GeneratedMediaContext.Provider value={contextValue}>
      <OurVidzDashboardLayout>
        <div className="flex flex-col min-h-screen bg-background">
          {/* Main Content */}
          <div className="flex-1 p-4 pb-32">
            {/* Progress Indicator */}
            {isGenerating && (
              <div className="mb-4">
                <GenerationProgressIndicator 
                  isGenerating={isGenerating}
                  currentJob={currentJob}
                  progress={progress}
                />
              </div>
            )}

            {/* Content Grid */}
            <WorkspaceGridVirtualized
              assets={assets}
              isLoading={isLoading}
              onLoadMore={loadMore}
              hasMore={hasMore}
              onRefresh={refreshAssets}
              onDelete={deleteAsset}
              onAssetClick={setSelectedAsset}
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
        </div>
      </OurVidzDashboardLayout>
    </GeneratedMediaContext.Provider>
  );
};

export default MobileSimplifiedWorkspace;
