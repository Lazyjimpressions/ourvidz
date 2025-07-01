
import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl } from '@/lib/storage';
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
    
    console.log('✅ Asset deleted successfully');
  }

  static async bulkDeleteAssets(assets: { id: string; type: 'image' | 'video' }[]): Promise<void> {
    console.log('🗑️ Bulk deleting assets:', assets.length);
    
    const imageIds = assets.filter(a => a.type === 'image').map(a => a.id);
    const videoIds = assets.filter(a => a.type === 'video').map(a => a.id);

    const promises = [];

    if (imageIds.length > 0) {
      promises.push(
        supabase
          .from('images')
          .delete()
          .in('id', imageIds)
      );
    }

    if (videoIds.length > 0) {
      promises.push(
        supabase
          .from('videos')
          .delete()
          .in('id', videoIds)
      );
    }

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error).map(r => r.error);
    
    if (errors.length > 0) {
      throw new Error(`Failed to delete some assets: ${errors.map(e => e!.message).join(', ')}`);
    }
    
    console.log('✅ Bulk delete completed successfully');
  }
}
