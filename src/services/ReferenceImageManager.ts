import { supabase } from '@/integrations/supabase/client';

export interface ReferenceImage {
  id: string;
  characterId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  metadata: {
    consistency_score?: number;
    generation_params?: any;
    created_at: string;
    tags?: string[];
    description?: string;
  };
}

export interface ReferenceImageUpload {
  characterId: string;
  file: File;
  description?: string;
  tags?: string[];
}

class ReferenceImageManager {
  private supabase = supabase;

  /**
   * Upload a reference image for a character
   */
  async uploadReferenceImage(upload: ReferenceImageUpload): Promise<ReferenceImage> {
    const fileName = `reference_${upload.characterId}_${Date.now()}.png`;
    const filePath = `characters/${upload.characterId}/references/${fileName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('user-library')
      .upload(filePath, upload.file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from('user-library')
      .getPublicUrl(filePath);

    // Create thumbnail
    const thumbnailUrl = await this.createThumbnail(urlData.publicUrl);

    // Save metadata to database
    const { data: dbData, error: dbError } = await this.supabase
      .from('user_library')
      .insert({
        user_id: (await this.supabase.auth.getUser()).data.user?.id,
        file_path: filePath,
        file_name: fileName,
        file_type: 'image',
        content_category: 'roleplay_reference',
        roleplay_metadata: {
          character_id: upload.characterId,
          description: upload.description,
          tags: upload.tags || [],
          reference_type: 'character_reference',
          consistency_score: 1.0
        }
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return {
      id: dbData.id,
      characterId: upload.characterId,
      imageUrl: urlData.publicUrl,
      thumbnailUrl,
      metadata: {
        consistency_score: 1.0,
        created_at: new Date().toISOString(),
        tags: upload.tags || [],
        description: upload.description
      }
    };
  }

  /**
   * Get reference images for a character
   */
  async getReferenceImages(characterId: string): Promise<ReferenceImage[]> {
    const { data, error } = await this.supabase
      .from('user_library')
      .select('*')
      .eq('content_category', 'roleplay_reference')
      .eq('roleplay_metadata->character_id', characterId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      characterId,
      imageUrl: item.file_url || '',
      thumbnailUrl: item.thumbnail_url,
      metadata: {
        consistency_score: item.roleplay_metadata?.consistency_score,
        generation_params: item.roleplay_metadata?.generation_params,
        created_at: item.created_at,
        tags: item.roleplay_metadata?.tags || [],
        description: item.roleplay_metadata?.description
      }
    }));
  }

  /**
   * Get the best reference image for a character
   */
  async getBestReferenceImage(characterId: string): Promise<ReferenceImage | null> {
    const references = await this.getReferenceImages(characterId);
    
    if (references.length === 0) return null;

    // Return the reference with the highest consistency score
    return references.reduce((best, current) => 
      (current.metadata.consistency_score || 0) > (best.metadata.consistency_score || 0) ? current : best
    );
  }

  /**
   * Delete a reference image
   */
  async deleteReferenceImage(imageId: string): Promise<void> {
    // Get the image data first
    const { data, error: fetchError } = await this.supabase
      .from('user_library')
      .select('file_path')
      .eq('id', imageId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (data.file_path) {
      const { error: storageError } = await this.supabase.storage
        .from('user-library')
        .remove([data.file_path]);

      if (storageError) throw storageError;
    }

    // Delete from database
    const { error: dbError } = await this.supabase
      .from('user_library')
      .delete()
      .eq('id', imageId);

    if (dbError) throw dbError;
  }

  /**
   * Update reference image metadata
   */
  async updateReferenceMetadata(imageId: string, metadata: Partial<ReferenceImage['metadata']>): Promise<void> {
    const { error } = await this.supabase
      .from('user_library')
      .update({
        roleplay_metadata: metadata
      })
      .eq('id', imageId);

    if (error) throw error;
  }

  /**
   * Create a thumbnail for an image
   */
  private async createThumbnail(imageUrl: string): Promise<string> {
    // TODO: Implement thumbnail creation
    // This could use a serverless function or image processing service
    return imageUrl; // For now, return the original URL
  }

  /**
   * Calculate consistency score between two images
   */
  async calculateConsistencyScore(image1Url: string, image2Url: string): Promise<number> {
    // TODO: Implement actual image similarity calculation
    // This could use:
    // - Perceptual hashing
    // - Feature matching
    // - AI-based similarity models
    
    // Placeholder implementation
    return Math.random() * 0.3 + 0.7; // Return 70-100%
  }

  /**
   * Get reference image statistics for a character
   */
  async getReferenceStats(characterId: string): Promise<{
    totalReferences: number;
    averageConsistencyScore: number;
    bestConsistencyScore: number;
    lastUpdated: string;
  }> {
    const references = await this.getReferenceImages(characterId);
    
    if (references.length === 0) {
      return {
        totalReferences: 0,
        averageConsistencyScore: 0,
        bestConsistencyScore: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    const scores = references.map(r => r.metadata.consistency_score || 0);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const bestScore = Math.max(...scores);
    const lastUpdated = references[0].metadata.created_at;

    return {
      totalReferences: references.length,
      averageConsistencyScore: averageScore,
      bestConsistencyScore: bestScore,
      lastUpdated
    };
  }
}

export const referenceImageManager = new ReferenceImageManager();
