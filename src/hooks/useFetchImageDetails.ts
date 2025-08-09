
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageDetails {
  seed?: number;
  generationTime?: number;
  negativePrompt?: string;
  modelType?: string;
  referenceStrength?: number;
  templateName?: string;
  originalPrompt?: string;
  tokenCount?: number;
}

// Simple cache to prevent redundant requests
const detailsCache = new Map<string, { data: ImageDetails | null; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

export const useFetchImageDetails = () => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<ImageDetails | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRequestRef = useRef<string | null>(null);

  const fetchDetails = useCallback(async (imageId: string) => {
    console.log('🔍 FETCHING IMAGE DETAILS:', { imageId });
    
    if (!imageId) {
      console.error('❌ No imageId provided to fetchDetails');
      toast.error('No image ID available');
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check if this is a duplicate request
    if (currentRequestRef.current === imageId) {
      console.log('🔄 Request already in progress for:', imageId);
      return;
    }

    // Check cache first
    const cached = detailsCache.get(imageId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('💾 Using cached details for:', imageId);
      setDetails(cached.data);
      return;
    }

    // Set up new request
    currentRequestRef.current = imageId;
    abortControllerRef.current = new AbortController();
    setLoading(true);

    try {
      console.log('📡 Making database query for imageId:', imageId);
      
      const { data, error } = await supabase
        .from('images')
        .select('metadata, original_prompt')
        .eq('id', imageId)
        .abortSignal(abortControllerRef.current.signal)
        .single();

      console.log('📊 Database response:', { data, error });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      if (data?.metadata) {
        console.log('📋 Raw metadata:', data.metadata);
        
        const metadata = data.metadata as any;
        
        // Parse seed - handles both integers and scientific notation
        let seed: number | undefined;
        if (metadata.seed !== undefined && metadata.seed !== null) {
          seed = parseFloat(metadata.seed.toString());
          console.log('🎯 Parsed seed:', { original: metadata.seed, parsed: seed });
        }

        const parsedDetails: ImageDetails = {
          seed,
          generationTime: metadata.generation_time ? parseFloat(metadata.generation_time.toString()) : undefined,
          negativePrompt: metadata.negative_prompt || undefined,
          modelType: metadata.model_type || metadata.job_type || undefined,
          referenceStrength: metadata.reference_strength ? parseFloat(metadata.reference_strength.toString()) : undefined,
          templateName: metadata.template_name || metadata.enhancement_strategy || undefined,
          originalPrompt: data.original_prompt || metadata.original_prompt || undefined,
          tokenCount: metadata.token_count ? parseInt(metadata.token_count.toString()) : undefined,
        };

        console.log('✅ Parsed details:', parsedDetails);
        setDetails(parsedDetails);
        
        // Cache the result
        detailsCache.set(imageId, { data: parsedDetails, timestamp: Date.now() });
        
        toast.success('Generation details loaded successfully');
      } else {
        console.log('⚠️ No metadata found for image:', imageId);
        setDetails(null);
        
        // Cache null result to prevent repeated queries
        detailsCache.set(imageId, { data: null, timestamp: Date.now() });
        
        toast.info('No generation details found for this image');
      }
    } catch (error: any) {
      // Don't show error for aborted requests
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        console.log('🛑 Request aborted for:', imageId);
        return;
      }
      
      console.error('💥 Error fetching image details:', error);
      toast.error('Failed to load generation details');
      setDetails(null);
    } finally {
      currentRequestRef.current = null;
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    console.log('🔄 Resetting image details');
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    currentRequestRef.current = null;
    setDetails(null);
  }, []);

  return { fetchDetails, loading, details, reset };
};
