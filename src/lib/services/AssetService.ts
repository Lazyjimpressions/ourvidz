import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl, deleteFile } from '@/lib/storage';
import type { Tables } from '@/integrations/supabase/types';

type ImageRecord = Tables<'images'>;
type VideoRecord = Tables<'videos'>;

export interface UnifiedAsset {
  id: string;
  type: 'image' | 'video';
  title?: string;
  prompt: string;
  thumbnailUrl?: string;
  url?: string;
  status: string;
  quality?: string;
  format?: string;
  createdAt: Date;
  projectId?: string;
  projectTitle?: string;
  duration?: number;
  resolution?: string;
  error?: string;
}

export class AssetService {
  static async getUserAssets(): Promise<UnifiedAsset[]> {
    console.log('🔍 Fetching user assets...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Fetch images and videos in parallel
    const [imagesResult, videosResult] = await Promise.all([
      supabase
        .from('images')
        .select(`
          *,
          project:projects(title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('videos')
        .select(`
          *,
          project:projects(title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    ]);

    if (imagesResult.error) {
      console.error('❌ Error fetching images:', imagesResult.error);
      throw imagesResult.error;
    }

    if (videosResult.error) {
      console.error('❌ Error fetching videos:', videosResult.error);
      throw videosResult.error;
    }

    console.log('📊 Raw data - Images:', imagesResult.data?.length, 'Videos:', videosResult.data?.length);

    // Transform and combine assets
    const imageAssets: UnifiedAsset[] = await Promise.all(
      (imagesResult.data || []).map(async (image) => {
        let thumbnailUrl: string | undefined;
        let url: string | undefined;
        let error: string | undefined;

        // Generate signed URLs for completed images
        if (image.status === 'completed' && image.image_url) {
          try {
            const bucket = image.quality === 'high' ? 'image_high' : 'image_fast';
            const { data: signedUrlData, error: urlError } = await getSignedUrl(
              bucket as any,
              image.image_url,
              3600
            );

            if (!urlError && signedUrlData?.signedUrl) {
              thumbnailUrl = signedUrlData.signedUrl;
              url = signedUrlData.signedUrl;
            } else {
              error = urlError?.message || 'Failed to generate image URL';
            }
          } catch (urlError) {
            console.error('Error generating image URL:', urlError);
            error = 'Failed to load image';
          }
        }

        return {
          id: image.id,
          type: 'image' as const,
          title: image.title || undefined,
          prompt: image.prompt,
          thumbnailUrl,
          url,
          status: image.status,
          quality: image.quality || undefined,
          format: image.format || undefined,
          createdAt: new Date(image.created_at),
          projectId: image.project_id || undefined,
          projectTitle: (image.project as any)?.title,
          error
        };
      })
    );

    const videoAssets: UnifiedAsset[] = await Promise.all(
      (videosResult.data || []).map(async (video) => {
        let thumbnailUrl: string | undefined;
        let url: string | undefined;
        let error: string | undefined;

        // Generate signed URLs for completed videos
        if (video.status === 'completed' && video.video_url) {
          try {
            // Determine quality from job data or default to fast
            const { data: jobData } = await supabase
              .from('jobs')
              .select('quality, job_type')
              .eq('video_id', video.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            let videoQuality = 'fast';
            if (jobData?.quality) {
              videoQuality = jobData.quality;
            } else if (jobData?.job_type) {
              const qualityFromJobType = jobData.job_type.split('_')[1];
              if (qualityFromJobType === 'high' || qualityFromJobType === 'fast') {
                videoQuality = qualityFromJobType;
              }
            }

            const bucket = videoQuality === 'high' ? 'video_high' : 'video_fast';
            const { data: signedUrlData, error: urlError } = await getSignedUrl(
              bucket as any,
              video.video_url,
              7200
            );

            if (!urlError && signedUrlData?.signedUrl) {
              url = signedUrlData.signedUrl;
            } else {
              error = urlError?.message || 'Failed to generate video URL';
            }

            // Use thumbnail URL if available
            if (video.thumbnail_url) {
              const { data: thumbSignedUrlData } = await getSignedUrl(
                'image_fast' as any,
                video.thumbnail_url,
                3600
              );
              if (thumbSignedUrlData?.signedUrl) {
                thumbnailUrl = thumbSignedUrlData.signedUrl;
              }
            }
          } catch (urlError) {
            console.error('Error generating video URL:', urlError);
            error = 'Failed to load video';
          }
        }

        return {
          id: video.id,
          type: 'video' as const,
          prompt: (video.project as any)?.title || 'Untitled Video',
          thumbnailUrl: thumbnailUrl || video.thumbnail_url || undefined,
          url,
          status: video.status || 'draft',
          format: video.format || undefined,
          createdAt: new Date(video.created_at!),
          projectId: video.project_id || undefined,
          projectTitle: (video.project as any)?.title,
          duration: video.duration || undefined,
          resolution: video.resolution || undefined,
          error
        };
      })
    );

    // Combine and sort by creation date
    const allAssets = [...imageAssets, ...videoAssets];
    allAssets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log('✅ Combined assets:', allAssets.length);
    return allAssets;
  }

  static async deleteAsset(assetId: string, assetType: 'image' | 'video'): Promise<void> {
    console.log('🗑️ Deleting asset:', assetId, assetType);
    
    // Get asset details before deletion to clean up storage
    let assetData: any = null;
    
    if (assetType === 'image') {
      const { data } = await supabase
        .from('images')
        .select('image_url, quality')
        .eq('id', assetId)
        .single();
      assetData = data;
    } else {
      const { data } = await supabase
        .from('videos')
        .select('video_url, thumbnail_url')
        .eq('id', assetId)
        .single();
      assetData = data;
    }

    // Delete from database first
    if (assetType === 'image') {
      const { error } = await supabase
        .from('images')
        .delete()
        .eq('id', assetId);
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', assetId);
      
      if (error) throw error;
    }

    // Clean up storage files
    if (assetData) {
      try {
        if (assetType === 'image' && assetData.image_url) {
          const bucket = assetData.quality === 'high' ? 'image_high' : 'image_fast';
          await deleteFile(bucket as any, assetData.image_url);
        } else if (assetType === 'video') {
          if (assetData.video_url) {
            // Determine quality from job data
            const { data: jobData } = await supabase
              .from('jobs')
              .select('quality, job_type')
              .eq('video_id', assetId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            let videoQuality = 'fast';
            if (jobData?.quality) {
              videoQuality = jobData.quality;
            } else if (jobData?.job_type) {
              const qualityFromJobType = jobData.job_type.split('_')[1];
              if (qualityFromJobType === 'high' || qualityFromJobType === 'fast') {
                videoQuality = qualityFromJobType;
              }
            }

            const bucket = videoQuality === 'high' ? 'video_high' : 'video_fast';
            await deleteFile(bucket as any, assetData.video_url);
          }
          
          if (assetData.thumbnail_url) {
            await deleteFile('image_fast' as any, assetData.thumbnail_url);
          }
        }
      } catch (storageError) {
        console.warn('⚠️ Storage cleanup failed (file may not exist):', storageError);
        // Don't throw error - database deletion succeeded
      }
    }
    
    console.log('✅ Asset and storage files deleted successfully');
  }

  static async bulkDeleteAssets(assets: { id: string; type: 'image' | 'video' }[]): Promise<void> {
    console.log('🗑️ Bulk deleting assets:', assets.length);
    
    // Delete each asset individually to ensure proper storage cleanup
    const deletePromises = assets.map(asset => 
      this.deleteAsset(asset.id, asset.type)
    );

    await Promise.all(deletePromises);
    console.log('✅ Bulk delete completed successfully');
  }

  static async cleanupOrphanedAssets(): Promise<{ cleaned: number; errors: string[] }> {
    console.log('🧹 Starting orphaned asset cleanup...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const errors: string[] = [];
    let cleanedCount = 0;

    try {
      // Get all user images
      const { data: images } = await supabase
        .from('images')
        .select('id, image_url, quality')
        .eq('user_id', user.id);

      // Get all user videos
      const { data: videos } = await supabase
        .from('videos')
        .select('id, video_url, thumbnail_url')
        .eq('user_id', user.id);

      // Check images for orphaned database records
      if (images) {
        for (const image of images) {
          if (image.image_url) {
            try {
              const bucket = image.quality === 'high' ? 'image_high' : 'image_fast';
              const { data } = await getSignedUrl(bucket as any, image.image_url, 60);
              
              if (!data?.signedUrl) {
                // File doesn't exist in storage, remove database record
                await supabase.from('images').delete().eq('id', image.id);
                cleanedCount++;
                console.log('🗑️ Cleaned orphaned image record:', image.id);
              }
            } catch (error) {
              errors.push(`Image ${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }

      // Check videos for orphaned database records
      if (videos) {
        for (const video of videos) {
          if (video.video_url) {
            try {
              // Get quality from jobs table
              const { data: jobData } = await supabase
                .from('jobs')
                .select('quality, job_type')
                .eq('video_id', video.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              let videoQuality = 'fast';
              if (jobData?.quality) {
                videoQuality = jobData.quality;
              }

              const bucket = videoQuality === 'high' ? 'video_high' : 'video_fast';
              const { data } = await getSignedUrl(bucket as any, video.video_url, 60);
              
              if (!data?.signedUrl) {
                // File doesn't exist in storage, remove database record
                await supabase.from('videos').delete().eq('id', video.id);
                cleanedCount++;
                console.log('🗑️ Cleaned orphaned video record:', video.id);
              }
            } catch (error) {
              errors.push(`Video ${video.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }

      console.log(`✅ Cleanup completed: ${cleanedCount} orphaned records removed`);
      return { cleaned: cleanedCount, errors };
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }
}
