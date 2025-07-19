
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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('images')
        .select('metadata')
        .eq('id', imageId)
        .single();

      if (error) throw error;

      if (data?.metadata) {
        const metadata = data.metadata;
        
        // Parse seed - handles both integers and scientific notation
        let seed: number | undefined;
        if (metadata.seed !== undefined && metadata.seed !== null) {
          seed = parseFloat(metadata.seed.toString());
        }

        const parsedDetails: ImageDetails = {
          seed,
          generationTime: metadata.generation_time ? parseFloat(metadata.generation_time.toString()) : undefined,
          negativePrompt: metadata.negative_prompt || undefined,
          modelType: metadata.model_type || undefined,
          referenceStrength: metadata.reference_strength ? parseFloat(metadata.reference_strength.toString()) : undefined,
        };

        setDetails(parsedDetails);
        toast.success('Generation details loaded successfully');
      } else {
        toast.info('No generation details found for this image');
      }
    } catch (error) {
      console.error('Error fetching image details:', error);
      toast.error('Failed to load generation details');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setDetails(null);
  };

  return { fetchDetails, loading, details, reset };
};
