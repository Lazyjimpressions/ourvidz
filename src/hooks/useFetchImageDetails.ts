
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageDetails {
  seed?: number;
  generationTime?: number;
  negativePrompt?: string;
  modelType?: string;
  referenceStrength?: number;
}

export const useFetchImageDetails = () => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<ImageDetails | null>(null);

  const fetchDetails = async (imageId: string) => {
    console.log('🔍 FETCHING IMAGE DETAILS:', { imageId });
    
    if (!imageId) {
      console.error('❌ No imageId provided to fetchDetails');
      toast.error('No image ID available');
      return;
    }

    setLoading(true);
    try {
      console.log('📡 Making database query for imageId:', imageId);
      
      const { data, error } = await supabase
        .from('images')
        .select('metadata')
        .eq('id', imageId)
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
        };

        console.log('✅ Parsed details:', parsedDetails);
        setDetails(parsedDetails);
        toast.success('Generation details loaded successfully');
      } else {
        console.log('⚠️ No metadata found for image:', imageId);
        toast.info('No generation details found for this image');
        setDetails(null);
      }
    } catch (error) {
      console.error('💥 Error fetching image details:', error);
      toast.error('Failed to load generation details');
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    console.log('🔄 Resetting image details');
    setDetails(null);
  };

  return { fetchDetails, loading, details, reset };
};
