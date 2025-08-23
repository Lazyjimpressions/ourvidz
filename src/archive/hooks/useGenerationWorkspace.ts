
import { useState, useCallback } from 'react';
import { useGeneratedMediaContext } from '@/contexts/GeneratedMediaContext';

/**
 * Hook for generation functionality in workspace context
 */
export const useGenerationWorkspace = () => {
  const [progress, setProgress] = useState(0);
  
  // Safely get context - add safety check
  const context = useGeneratedMediaContext();
  if (!context) {
    console.error('🚨 useGenerationWorkspace: Context not available - ensure component is wrapped with GeneratedMediaProvider');
    throw new Error('useGenerationWorkspace must be used within a GeneratedMediaProvider');
  }
  
  const { 
    isGenerating, 
    generateContent: contextGenerateContent,
    currentJob 
  } = context;

  const generateContent = useCallback(async (prompt: string, options?: any) => {
    console.log('🎯 GENERATION WORKSPACE: Starting generation with prompt:', prompt);
    console.log('🎯 GENERATION WORKSPACE: Generation options:', options);
    
    try {
      await contextGenerateContent(prompt, options);
    } catch (error) {
      console.error('🚨 GENERATION WORKSPACE: Generation failed:', error);
      throw error;
    }
  }, [contextGenerateContent]);

  return {
    isGenerating,
    generateContent,
    currentJob,
    progress
  };
};
