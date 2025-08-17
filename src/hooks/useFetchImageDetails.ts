
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ImageDetails {
  originalPrompt?: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  seed?: number;
  generationTime?: number;
  referenceStrength?: number;
  templateName?: string;
}

export const useFetchImageDetails = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [details, setDetails] = useState<ImageDetails | null>(null);

  const fetchDetails = useCallback(async (imageId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Fetching details for image: ${imageId}`);
      
      // Fetch workspace asset details
      const { data: workspaceAsset, error: workspaceError } = await supabase
        .from('workspace_assets')
        .select('*')
        .eq('id', imageId)
        .single();

      if (workspaceError && workspaceError.code !== 'PGRST116') {
        console.error('Error fetching workspace asset:', workspaceError);
        throw workspaceError;
      }

      if (workspaceAsset) {
        console.log('✅ Found workspace asset:', workspaceAsset);
        const settings = workspaceAsset.generation_settings as any;
        setDetails({
          originalPrompt: workspaceAsset.original_prompt,
          enhancedPrompt: settings?.enhancedPrompt,
          negativePrompt: settings?.negativePrompt,
          seed: settings?.seed,
          generationTime: settings?.generationTime,
          referenceStrength: settings?.referenceStrength,
          templateName: settings?.templateName
        });
        return;
      }

      // If not found in workspace, try user library
      const { data: libraryAsset, error: libraryError } = await supabase
        .from('user_library')
        .select('*')
        .eq('id', imageId)
        .single();

      if (libraryError && libraryError.code !== 'PGRST116') {
        console.error('Error fetching library asset:', libraryError);
        throw libraryError;
      }

      if (libraryAsset) {
        console.log('✅ Found library asset:', libraryAsset);
        
        // Extract template name from tags (format: tmpl:<template_name>)
        const templateTag = libraryAsset.tags?.find((tag: string) => tag.startsWith('tmpl:'));
        const templateName = templateTag ? templateTag.replace('tmpl:', '') : undefined;
        
        setDetails({
          originalPrompt: libraryAsset.original_prompt,
          enhancedPrompt: undefined, // Library doesn't store enhanced prompt
          negativePrompt: undefined, // Library doesn't store negative prompt
          seed: libraryAsset.generation_seed,
          generationTime: undefined, // Library doesn't store generation time  
          referenceStrength: undefined, // Library doesn't store reference strength
          templateName
        });
        return;
      }

      console.warn(`⚠️ Asset not found in either workspace or library: ${imageId}`);
      setDetails(null);
      
    } catch (error) {
      console.error('Failed to fetch image details:', error);
      setError(error as Error);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchDetails, loading, error, details };
};
