import { useEffect } from 'react';

/**
 * Hook to handle workspace integration from the library page
 * Listens for custom events to add assets to workspace
 */
export const useWorkspaceIntegration = () => {
  useEffect(() => {
    const handleAddToWorkspace = (event: CustomEvent) => {
      const { assetIds } = event.detail;
      
      // Dispatch to workspace components
      window.dispatchEvent(new CustomEvent('library-add-to-workspace', {
        detail: { assetIds }
      }));
    };

    // Listen for add-to-workspace events from library
    window.addEventListener('add-to-workspace', handleAddToWorkspace as EventListener);
    
    return () => {
      window.removeEventListener('add-to-workspace', handleAddToWorkspace as EventListener);
    };
  }, []);
}; 