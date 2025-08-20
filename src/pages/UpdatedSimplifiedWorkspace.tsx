import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
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
import { supabase } from '@/integrations/supabase/client';

/**
 * Updated workspace using shared components and new asset mapping
 */
export const UpdatedSimplifiedWorkspace: React.FC = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [beginningRefImageUrl, setBeginningRefImageUrl] = useState<string | null>(null);
  const [endingRefImageUrl, setEndingRefImageUrl] = useState<string | null>(null);

  // Get workspace state from existing hook with URL optimization disabled
  const {
    mode,
    prompt,
    referenceImage,
    referenceStrength,
    contentType,
    quality,
    modelType,
    isGenerating,
    updateMode,
    setPrompt,
    setReferenceImage,
    setReferenceStrength,
    setContentType,
    setQuality,
    setModelType,
    generate,
    clearWorkspace,
    deleteAllWorkspace,
    // ... other workspace state
  } = useLibraryFirstWorkspace({ disableUrlOptimization: true });

  // Fetch workspace assets and convert to shared format
  const { data: rawAssets = [], isLoading, error } = useWorkspaceAssets();
  
  // Map to shared format for consistent handling
  const sharedAssets = useMemo(() => {
    const mapped = rawAssets.map(toSharedFromWorkspace);
    
    // One-time diagnostic for first asset to verify mapping
    if (mapped.length > 0 && Math.random() < 0.2) { // 20% chance to log
      const firstAsset = mapped[0];
      console.log('🔍 Workspace asset mapping check:', {
        id: firstAsset.id,
        originalPath: firstAsset.originalPath,
        thumbPath: firstAsset.thumbPath,
        type: firstAsset.type,
        hasOriginalPath: !!firstAsset.originalPath,
        hasThumbPath: !!firstAsset.thumbPath,
        pathSample: firstAsset.originalPath?.substring(0, 50) + '...'
      });
    }
    
    return mapped;
  }, [rawAssets]);
  
  // Get signed URLs for assets
  const { signedAssets, isSigning } = useSignedAssets(sharedAssets, 'workspace-temp', {
    thumbTtlSec: 15 * 60, // 15 minutes for workspace
    enabled: !loading && !!user
  });

  // Honor URL param mode and navigation state for "Use as Reference"
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'video' || urlMode === 'image') {
      updateMode(urlMode);
    }

    // Handle navigation state for "Use as Reference"
    const navState = location.state as any;
    if (navState?.referenceUrl) {
      // We received a signed URL from the library page
      setReferenceImage(null); // Ensure file state is cleared
      setReferenceImageUrl(navState.referenceUrl);
      toast({
        title: 'Reference set',
        description: navState.prompt ? `Using "${navState.prompt.slice(0, 50)}..." as reference` : 'Reference image set',
      });
      // Clear the navigation state to prevent re-triggering on refresh
      window.history.replaceState({}, '');
    } else if (navState?.referenceAsset?.storagePath) {
      // Fallback: if only storagePath was provided (older flow), just notify
      setReferenceImage(null);
      toast({ title: 'Reference detected', description: 'Open the image again if not visible.' });
      window.history.replaceState({}, '');
    }
  }, [searchParams, location.state, updateMode, setReferenceImage, toast]);

  // Enhanced real-time subscriptions for automatic workspace updates
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up enhanced real-time subscriptions for workspace updates');

    // Main workspace subscription - listen to all changes
    const workspaceChannel = supabase
      .channel('workspace-updates-main')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'workspace_assets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Add proper type guards for payload data
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          console.log('🆕 Workspace asset change detected:', {
            event: payload.eventType,
            assetId: newRecord?.id || oldRecord?.id || 'unknown',
            assetType: newRecord?.asset_type || oldRecord?.asset_type || 'unknown'
          });
          
          // Invalidate workspace assets query for any change
          queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
          
          // Show appropriate notification based on event type
          if (payload.eventType === 'INSERT' && newRecord) {
            const assetType = newRecord.asset_type;
            const typeText = assetType === 'video' ? 'video' : 'image';
            toast({
              title: "New asset ready",
              description: `Your ${typeText} has been added to the workspace`,
            });
          } else if (payload.eventType === 'DELETE') {
            toast({
              title: "Asset removed",
              description: "Asset has been removed from workspace",
            });
          }
        }
      )
      .subscribe();

    // Jobs subscription for completion status
    const jobsChannel = supabase
      .channel('workspace-jobs-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const job = payload.new as any;
          if (!job) return;
          
          console.log('🔄 Job status update:', {
            jobId: job.id,
            status: job.status,
            jobType: job.job_type
          });
          
          if (job.status === 'completed') {
            console.log('✅ Job completed, refreshing workspace assets');
            queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
            
            // Additional fallback refresh after 2 seconds to handle any delays
            setTimeout(() => {
              console.log('🔄 Fallback refresh for completed job');
              queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
            }, 2000);
          } else if (job.status === 'failed') {
            toast({
              title: "Generation failed",
              description: job.error_message || "Unknown error occurred",
              variant: "destructive",
            });
          } else if (job.status === 'processing') {
            console.log('⚙️ Job is processing:', job.id);
            // Periodic refresh while job is processing
            const refreshInterval = setInterval(() => {
              queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
            }, 3000);
            
            // Clear interval after 30 seconds
            setTimeout(() => {
              clearInterval(refreshInterval);
            }, 30000);
          }
        }
      )
      .subscribe();

    // Log subscription status
    console.log('📡 Real-time subscriptions established:', {
      workspaceChannel: workspaceChannel.state,
      jobsChannel: jobsChannel.state
    });

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🧹 Cleaning up workspace real-time subscriptions');
      supabase.removeChannel(workspaceChannel);
      supabase.removeChannel(jobsChannel);
    };
  }, [user, queryClient, toast]);

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
      queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
    } catch (error) {
      console.error('Failed to discard asset:', error);
      toast({
        title: "Discard failed",
        description: "Failed to remove asset",
        variant: "destructive",
      });
    }
  }, [toast, queryClient]);

  const handlePreview = useCallback((asset: any) => {
    const index = signedAssets.findIndex(a => a.id === asset.id);
    if (index !== -1) {
      setLightboxIndex(index);
    }
  }, [signedAssets]);

  // Handle requiring original URL for lightbox with validation
  const handleRequireOriginalUrl = useCallback(async (asset: any) => {
    if (!asset.originalPath) {
      console.warn('🚫 Cannot load original URL - no originalPath for asset:', asset.id);
      return null;
    }
    
    console.log('📸 Requesting original URL for asset:', {
      id: asset.id,
      originalPath: asset.originalPath,
      bucket: asset.metadata?.bucket || 'workspace-temp'
    });
    
    // Use the signOriginal function added by useSignedAssets
    if ((asset as any).signOriginal) {
      try {
        return await (asset as any).signOriginal();
      } catch (error) {
        console.error('❌ Failed to sign original URL in lightbox:', error, { assetId: asset.id });
        throw error;
      }
    }
    throw new Error('Original URL signing not available');
  }, []);

  // Handle sending asset to reference box
  const handleSendToRef = useCallback(async (asset: any) => {
    try {
      // Get signed original URL
      let signedUrl: string | null = null;
      if (typeof asset.signOriginal === 'function') {
        signedUrl = await asset.signOriginal();
      }
      
      if (!signedUrl) {
        toast({
          title: "Reference failed",
          description: "Could not get URL for reference",
          variant: "destructive",
        });
        return;
      }

      // Set reference based on current mode and asset type
      if (mode === 'image' || asset.type === 'image') {
        setReferenceImageUrl(signedUrl);
        setReferenceImage(null); // Clear file state
        toast({
          title: "Reference set",
          description: "Image sent to reference box",
        });
      } else if (mode === 'video') {
        // For video mode, use as beginning reference
        setBeginningRefImageUrl(signedUrl);
        toast({
          title: "Reference set", 
          description: "Image sent to beginning reference",
        });
      }
    } catch (error) {
      console.error('Failed to send to reference:', error);
      toast({
        title: "Reference failed",
        description: "Failed to send to reference",
        variant: "destructive",
      });
    }
  }, [mode, setReferenceImage, toast]);

  // Generate wrapper to include reference URLs when present
  const handleGenerate = useCallback(() => {
    if (mode === 'image') {
      generate(referenceImageUrl);
    } else {
      generate(referenceImageUrl, beginningRefImageUrl, endingRefImageUrl);
    }
  }, [generate, referenceImageUrl, beginningRefImageUrl, endingRefImageUrl, mode]);

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
                onDiscard: handleDiscardAsset,
                onSendToRef: handleSendToRef,
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
            onGenerate={handleGenerate}
            referenceImage={referenceImage}
            onReferenceImageChange={setReferenceImage}
            referenceImageUrl={referenceImageUrl}
          onReferenceImageUrlChange={setReferenceImageUrl}
          modelType={modelType}
          onModelTypeChange={setModelType}
            beginningRefImageUrl={beginningRefImageUrl}
            onBeginningRefImageUrlChange={setBeginningRefImageUrl}
            endingRefImageUrl={endingRefImageUrl}
            onEndingRefImageUrlChange={setEndingRefImageUrl}
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
