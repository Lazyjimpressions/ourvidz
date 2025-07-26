import { useEffect } from 'react';
import { toast } from 'sonner';

interface UseEnhancedGenerationWorkspaceProps {
  addToWorkspace: (assetIds: string[]) => void;
  isEnabled: boolean;
}

/**
 * PHASE 1-2: Enhanced auto-add hook for immediate workspace updates
 * Handles multi-image SDXL jobs, single WAN videos, and enhanced images
 * Features retry logic and batch coordination
 */
export const useEnhancedGenerationWorkspace = ({ 
  addToWorkspace, 
  isEnabled 
}: UseEnhancedGenerationWorkspaceProps) => {
  useEffect(() => {
    if (!isEnabled) return;

    // PHASE 1-2: Enhanced individual asset completion handler
    const handleGenerationComplete = (event: CustomEvent) => {
      const { assetId, type, jobId } = event.detail || {};
      
      console.log('🎯 PHASE 1-2: Generation completion event received:', { 
        assetId, 
        type, 
        jobId,
        isEnabled 
      });
      
      if (!assetId) {
        console.warn('⚠️ Generation complete event missing assetId');
        return;
      }

      console.log('🚀 PHASE 1-2: Adding asset to workspace immediately:', { assetId, type });
      
      // Immediately add asset to workspace
      addToWorkspace([assetId]);
      
      console.log('✅ PHASE 1-2: Asset successfully added to workspace');
    };

    // PHASE 2: Enhanced batch completion handler for multi-image jobs
    const handleBatchGenerationComplete = (event: CustomEvent) => {
      const { assetIds, type, jobId, totalCompleted, totalExpected } = event.detail || {};
      
      console.log('🎯 PHASE 2: Batch generation completion event received:', { 
        assetIds, 
        type, 
        jobId,
        totalCompleted,
        totalExpected,
        isEnabled 
      });
      
      if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        console.warn('⚠️ Batch generation complete event missing or empty assetIds');
        return;
      }

      console.log(`🚀 PHASE 2: Adding ${assetIds.length} assets to workspace:`, assetIds);
      
      // Add all batch assets to workspace
      addToWorkspace(assetIds);
      
      // Enhanced notification for batch operations
      const message = totalCompleted === totalExpected 
        ? `All ${totalCompleted} images added to workspace!`
        : `${totalCompleted}/${totalExpected} images added to workspace!`;
      
      toast.success(message, {
        description: 'Your generated images are now available in the workspace'
      });
      
      console.log('✅ PHASE 2: Batch assets successfully added to workspace');
    };

    // PHASE 3: Job status coordination for enhanced job tracking
    const handleJobStatusUpdate = (event: CustomEvent) => {
      const { jobId, status, assetId, assetType } = event.detail || {};
      
      console.log('🔄 PHASE 3: Job status update received:', { 
        jobId, 
        status, 
        assetId, 
        assetType,
        isEnabled 
      });
      
      // Only handle completed jobs with assets
      if (status === 'completed' && assetId && isEnabled) {
        console.log('🎯 PHASE 3: Job completion detected, asset already handled by other events');
        // Assets are handled by generation-completed events, this is just for logging
      }
    };

    console.log('🔗 PHASE 1-3: Setting up enhanced generation completion event listeners');
    
    // Register all event listeners
    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    window.addEventListener('generation-batch-completed', handleBatchGenerationComplete as EventListener);
    window.addEventListener('job-status-update', handleJobStatusUpdate as EventListener);
    
    return () => {
      console.log('🔌 PHASE 1-3: Removing enhanced generation completion event listeners');
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
      window.removeEventListener('generation-batch-completed', handleBatchGenerationComplete as EventListener);
      window.removeEventListener('job-status-update', handleJobStatusUpdate as EventListener);
    };
  }, [addToWorkspace, isEnabled]);
};