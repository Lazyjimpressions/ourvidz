import { useEffect } from 'react';
import { useAssets } from '@/hooks/useAssets';
import { toast } from 'sonner';

interface UseGenerationWorkspaceProps {
  addToWorkspace: (assetIds: string[]) => void;
  isEnabled: boolean;
}

/**
 * Hook to handle automatically adding newly generated content to workspace
 * This is separate from the main workspace management to avoid conflicts
 */
export const useGenerationWorkspace = ({ addToWorkspace, isEnabled }: UseGenerationWorkspaceProps) => {
  const { data: assets = [] } = useAssets(true);

  // Listen for generation completion events and add new assets to workspace
  useEffect(() => {
    if (!isEnabled) return;

    const handleGenerationComplete = (event: CustomEvent) => {
      const { assetId, type } = event.detail || {};
      
      if (!assetId) {
        console.log('⚠️ Generation complete event missing assetId');
        return;
      }

      console.log('🎉 Generation completed, adding to workspace:', { assetId, type });
      
      // Find the completed asset in the cache
      const completedAsset = assets.find(asset => 
        asset.id === assetId && 
        asset.status === 'completed' && 
        asset.url
      );

      if (completedAsset) {
        addToWorkspace([assetId]);
        
        // Determine notification message based on asset type and content
        const isMultiImage = completedAsset.type === 'image' && 
          completedAsset.signedUrls && 
          completedAsset.signedUrls.length > 1;
        
        const itemCount = isMultiImage ? completedAsset.signedUrls.length : 1;
        const itemType = completedAsset.type === 'image' ? 'image' : 'video';
        const itemLabel = itemCount === 1 ? itemType : `${itemType}s`;
        
        toast.success(`${itemCount} new ${itemLabel} added to workspace!`);
      } else {
        console.log('⚠️ Completed asset not found in cache, will retry on next refetch');
      }
    };

    // Listen for custom generation completion events
    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    
    return () => {
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
    };
  }, [assets, addToWorkspace, isEnabled]);
};