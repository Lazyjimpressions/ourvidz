import { useEffect } from 'react';
import { toast } from 'sonner';

interface UseGenerationWorkspaceProps {
  addToWorkspace: (assetIds: string[]) => void;
  isEnabled: boolean;
}

/**
 * Enhanced auto-add hook for immediate workspace updates
 * Handles both single images and SDXL 6-image arrays
 */
export const useGenerationWorkspace = ({ addToWorkspace, isEnabled }: UseGenerationWorkspaceProps) => {
  // Listen for generation completion events and add new assets to workspace
  useEffect(() => {
    if (!isEnabled) return;

    const handleGenerationComplete = (event: CustomEvent) => {
      const { assetId, type, jobId } = event.detail || {};
      
      console.log('🎯 Generation completion event received:', { 
        assetId, 
        type, 
        jobId,
        isEnabled 
      });
      
      if (!assetId) {
        console.warn('⚠️ Generation complete event missing assetId');
        return;
      }

      console.log('🚀 Adding asset to workspace immediately:', { assetId, type });
      
      // Immediately add asset to workspace
      addToWorkspace([assetId]);
      
      // Enhanced notification based on asset type
      if (type === 'image') {
        // SDXL generates 6 images, WAN generates 1
        toast.success('New images added to workspace!', {
          description: 'Your generated images are now available in the workspace'
        });
      } else {
        toast.success('New video added to workspace!', {
          description: 'Your generated video is now available in the workspace'
        });
      }
      
      console.log('✅ Asset successfully added to workspace');
    };

    console.log('🔗 Setting up generation completion event listener');
    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    
    return () => {
      console.log('🔌 Removing generation completion event listener');
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
    };
  }, [addToWorkspace, isEnabled]);
};