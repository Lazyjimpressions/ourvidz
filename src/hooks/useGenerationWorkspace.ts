import { useEffect } from 'react';
import { toast } from 'sonner';

interface UseGenerationWorkspaceProps {
  addToWorkspace: (assetIds: string[]) => void;
  isEnabled: boolean;
}

/**
 * Phase 2: Simplified auto-add hook without cache dependency
 * Directly adds assets to workspace when generation completes
 */
export const useGenerationWorkspace = ({ addToWorkspace, isEnabled }: UseGenerationWorkspaceProps) => {
  // Listen for generation completion events and add new assets to workspace
  useEffect(() => {
    if (!isEnabled) return;

    const handleGenerationComplete = (event: CustomEvent) => {
      const { assetId, type, jobId } = event.detail || {};
      
      console.log('🎯 Phase 2: Generation completion event received:', { 
        assetId, 
        type, 
        jobId,
        isEnabled 
      });
      
      if (!assetId) {
        console.warn('⚠️ Phase 2: Generation complete event missing assetId, falling back to jobId logic');
        return;
      }

      console.log('🚀 Phase 2: Adding asset to workspace immediately:', { assetId, type });
      
      // Phase 2: Direct asset addition without cache validation
      // Trust that the completed job has a valid asset
      addToWorkspace([assetId]);
      
      // Determine notification message based on asset type
      const itemType = type === 'image' ? 'image' : 'video';
      const message = type === 'image' ? 
        'New images added to workspace!' : 
        'New video added to workspace!';
      
      toast.success(message);
      
      console.log('✅ Phase 2: Asset successfully added to workspace filter');
    };

    console.log('🔗 Phase 2: Setting up generation completion event listener');
    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    
    return () => {
      console.log('🔌 Phase 2: Removing generation completion event listener');
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
    };
  }, [addToWorkspace, isEnabled]);
};