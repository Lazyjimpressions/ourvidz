import { useEffect } from 'react';

/**
 * Test hook to verify the enhanced workspace event system is working correctly
 * Remove this after testing is complete
 */
export const useWorkspaceEventTest = () => {
  useEffect(() => {
    console.log('🧪 WORKSPACE EVENT TEST: Setting up test listeners...');
    
    const testGenerationComplete = (event: CustomEvent) => {
      console.log('🧪 TEST: generation-completed event:', event.detail);
    };
    
    const testBatchGenerationComplete = (event: CustomEvent) => {
      console.log('🧪 TEST: generation-batch-completed event:', event.detail);
    };
    
    const testJobStatusUpdate = (event: CustomEvent) => {
      console.log('🧪 TEST: job-status-update event:', event.detail);
    };
    
    window.addEventListener('generation-completed', testGenerationComplete as EventListener);
    window.addEventListener('generation-batch-completed', testBatchGenerationComplete as EventListener);
    window.addEventListener('job-status-update', testJobStatusUpdate as EventListener);
    
    return () => {
      console.log('🧪 WORKSPACE EVENT TEST: Cleaning up test listeners...');
      window.removeEventListener('generation-completed', testGenerationComplete as EventListener);
      window.removeEventListener('generation-batch-completed', testBatchGenerationComplete as EventListener);
      window.removeEventListener('job-status-update', testJobStatusUpdate as EventListener);
    };
  }, []);
};