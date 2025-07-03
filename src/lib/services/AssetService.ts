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
  modelType?: string;
  isSDXL?: boolean;
  // Array of signed URLs for 6-image generations
  signedUrls?: string[];
}

export class AssetService {
  private static determineImageBucket(imageData: Partial<ImageRecord>, jobData?: any): string {
    // Check if this is an SDXL image from metadata or job data
    const metadata = imageData.metadata as any;
    const isSDXL = metadata?.is_sdxl || 
                   metadata?.model_type === 'sdxl' || 
                   jobData?.job_type?.startsWith('sdxl_') ||
                   jobData?.model_type?.includes('sdxl_image') ||
                   metadata?.bucket?.includes('sdxl');
    
    const quality = imageData.quality || jobData?.quality || 'fast';
    
    // Enhanced bucket determination with legacy name mapping
    let bucket: string;
    
    // First try to use bucket from metadata if it exists
    if (metadata?.bucket && typeof metadata.bucket === 'string') {
      bucket = metadata.bucket;
      
      // Map legacy bucket names to correct ones
      if (bucket === 'sdxl_fast') {
        bucket = 'sdxl_image_fast';
        console.log('🔄 Mapped legacy bucket: sdxl_fast → sdxl_image_fast');
      } else if (bucket === 'sdxl_high') {
        bucket = 'sdxl_image_high';
        console.log('🔄 Mapped legacy bucket: sdxl_high → sdxl_image_high');
      }
      
      console.log('🔍 Using bucket from metadata:', bucket);
    } else if (isSDXL) {
      bucket = quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
      console.log('🔍 Determined SDXL bucket:', bucket);
    } else {
      bucket = quality === 'high' ? 'image_high' : 'image_fast';
      console.log('🔍 Determined WAN bucket:', bucket);
    }
    
    console.log('🔍 Final bucket determination:', {
      imageId: imageData.id,
      quality,
      isSDXL,
      finalBucket: bucket
    });
    
    return bucket;
  }

  private static determineVideoBucket(jobData?: any): string {
    const quality = jobData?.quality || 'fast';
    return quality === 'high' ? 'video_high' : 'video_fast';
  }

  static async getUserAssets(): Promise<UnifiedAsset[]> {
    console.log('🔍 ENHANCED ASSET FETCHING with comprehensive debugging...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    console.log('👤 Fetching assets for user:', user.id);

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

    console.log('📊 ENHANCED Raw data analysis:', {
      totalImages: imagesResult.data?.length,
      totalVideos: videosResult.data?.length,
      imageStatuses: imagesResult.data?.reduce((acc, img) => {
        acc[img.status] = (acc[img.status] || 0) + 1;
        return acc;
      }, {}),
      completedImages: imagesResult.data?.filter(img => img.status === 'completed').length,
      imagesWithUrls: imagesResult.data?.filter(img => img.image_url).length
    });

    // Enhanced debugging for each image
    imagesResult.data?.forEach((image, index) => {
      console.log(`🖼️ Image ${index + 1} analysis:`, {
        id: image.id,
        status: image.status,
        quality: image.quality,
        hasImageUrl: !!image.image_url,
        imageUrl: image.image_url,
        metadata: image.metadata,
        createdAt: image.created_at
      });
    });

    // Transform and combine assets
    const imageAssets: UnifiedAsset[] = await Promise.all(
      (imagesResult.data || []).map(async (image, index) => {
        console.log(`🔄 Processing image asset ${index + 1}/${imagesResult.data?.length}:`, image.id);
        
        let thumbnailUrl: string | undefined;
        let url: string | undefined;
        let error: string | undefined;
        let jobData: any = null;
        let modelType: string | undefined;
        let isSDXL = false;

        // Get job data to determine model type and bucket
        console.log('🔍 Fetching job data for image:', image.id);
        const { data: jobResult, error: jobError } = await supabase
          .from('jobs')
          .select('quality, job_type, model_type, metadata')
          .eq('image_id', image.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (jobError) {
          console.warn('⚠️ Error fetching job data for image:', image.id, jobError);
        } else {
          jobData = jobResult;
          console.log('✅ Job data fetched:', {
            imageId: image.id,
            jobData: jobResult
          });
        }

        // Determine model type and SDXL status
        const metadata = image.metadata as any;
        isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl' || 
                 jobData?.job_type?.startsWith('sdxl_') ||
                 jobData?.model_type?.includes('sdxl');
        modelType = isSDXL ? 'SDXL' : 'WAN';

        console.log('🔧 Enhanced image processing analysis:', {
          imageId: image.id,
          status: image.status,
          quality: image.quality,
          isSDXL,
          modelType,
          jobType: jobData?.job_type,
          hasImageUrl: !!image.image_url,
          imageUrl: image.image_url,
          metadata: metadata,
          jobMetadata: jobData?.metadata
        });

        // Generate signed URLs for completed images
        if (image.status === 'completed') {
          try {
            const bucket = this.determineImageBucket(image, jobData);
            
            // Check for image_urls array (6-image generation)
            const metadata = image.metadata as any;
            if (metadata?.image_urls && Array.isArray(metadata.image_urls) && metadata.image_urls.length > 0) {
              console.log('✅ Processing image_urls array:', {
                imageId: image.id,
                bucket,
                urlCount: metadata.image_urls.length
              });
              
              // Generate signed URLs for each image in the array
              const signedUrls: string[] = [];
              for (const imagePath of metadata.image_urls) {
                const { data: signedUrlData, error: urlError } = await getSignedUrl(
                  bucket as any,
                  imagePath,
                  3600
                );
                
                if (!urlError && signedUrlData?.signedUrl) {
                  signedUrls.push(signedUrlData.signedUrl);
                } else {
                  console.error('❌ Failed to generate URL for image in array:', {
                    imageId: image.id,
                    imagePath,
                    error: urlError?.message
                  });
                }
              }
              
              if (signedUrls.length > 0) {
                // Store signed URLs in metadata for ImageGrid to use
                (metadata as any).signed_urls = signedUrls;
                thumbnailUrl = signedUrls[0]; // Use first image as thumbnail
                url = signedUrls[0]; // Use first image as main URL
                console.log('✅ Generated signed URLs for image array:', {
                  imageId: image.id,
                  bucket,
                  urlCount: signedUrls.length
                });
              } else {
                error = 'Failed to generate URLs for image array';
                console.error('❌ No signed URLs generated for image array:', image.id);
              }
            } 
            // Fallback to single image_url (legacy)
            else if (image.image_url) {
              console.log('📁 Processing single image_url:', {
                imageId: image.id,
                bucket,
                imagePath: image.image_url
              });
              
              const { data: signedUrlData, error: urlError } = await getSignedUrl(
                bucket as any,
                image.image_url,
                3600
              );

              if (!urlError && signedUrlData?.signedUrl) {
                thumbnailUrl = signedUrlData.signedUrl;
                url = signedUrlData.signedUrl;
                console.log('✅ Generated signed URL for single image:', image.id);
              } else {
                error = urlError?.message || 'Failed to generate image URL';
                console.error('❌ Failed to generate URL for single image:', {
                  imageId: image.id,
                  bucket,
                  imagePath: image.image_url,
                  error: error
                });
                
                // Try fallback buckets if primary bucket fails
                if (isSDXL) {
                  const fallbackBucket = bucket === 'sdxl_image_high' ? 'sdxl_image_fast' : 'sdxl_image_high';
                  console.log('🔄 Trying fallback bucket:', fallbackBucket);
                  const { data: fallbackData, error: fallbackError } = await getSignedUrl(
                    fallbackBucket as any,
                    image.image_url,
                    3600
                  );
                  if (!fallbackError && fallbackData?.signedUrl) {
                    thumbnailUrl = fallbackData.signedUrl;
                    url = fallbackData.signedUrl;
                    error = undefined;
                    console.log('✅ Fallback bucket worked:', fallbackBucket);
                  }
                }
              }
            } else {
              console.log('⚠️ No image_url or image_urls found:', image.id);
            }
          } catch (urlError) {
            console.error('❌ Exception generating image URL:', {
              imageId: image.id,
              error: urlError,
              stack: urlError instanceof Error ? urlError.stack : 'No stack'
            });
            error = 'Failed to load image';
          }
        } else {
          console.log('⚠️ Skipping URL generation for image:', {
            imageId: image.id,
            status: image.status,
            reason: 'not completed'
          });
        }

        const asset: UnifiedAsset = {
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
          modelType,
          isSDXL,
          error,
          // Include signed URLs array if available
          signedUrls: (metadata as any)?.signed_urls
        };

        console.log('📦 Final asset created:', {
          id: asset.id,
          hasUrl: !!asset.url,
          hasError: !!asset.error,
          modelType: asset.modelType,
          status: asset.status
        });

        return asset;
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
            // Get job data to determine quality
            const { data: jobData } = await supabase
              .from('jobs')
              .select('quality, job_type')
              .eq('video_id', video.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const bucket = this.determineVideoBucket(jobData);
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

    console.log('✅ ENHANCED Final asset summary:', {
      total: allAssets.length,
      images: imageAssets.length,
      videos: videoAssets.length,
      sdxlImages: imageAssets.filter(a => a.isSDXL).length,
      wanImages: imageAssets.filter(a => !a.isSDXL).length,
      completedImages: imageAssets.filter(a => a.status === 'completed').length,
      imagesWithUrls: imageAssets.filter(a => !!a.url).length,
      imagesWithErrors: imageAssets.filter(a => !!a.error).length,
      assetBreakdown: allAssets.map(a => ({
        id: a.id,
        type: a.type,
        status: a.status,
        hasUrl: !!a.url,
        hasError: !!a.error,
        modelType: a.modelType
      }))
    });
    
    return allAssets;
  }

  static async deleteAsset(assetId: string, assetType: 'image' | 'video'): Promise<void> {
    console.log('🗑️ Deleting asset with enhanced bucket detection:', assetId, assetType);
    
    // Get asset details before deletion to clean up storage
    let assetData: any = null;
    let jobData: any = null;
    
    if (assetType === 'image') {
      const { data } = await supabase
        .from('images')
        .select('image_url, quality, metadata')
        .eq('id', assetId)
        .single();
      assetData = data;

      // Get job data for bucket determination
      const { data: job } = await supabase
        .from('jobs')
        .select('quality, job_type, model_type')
        .eq('image_id', assetId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      jobData = job;
    } else {
      const { data } = await supabase
        .from('videos')
        .select('video_url, thumbnail_url')
        .eq('id', assetId)
        .single();
      assetData = data;

      // Get job data for video bucket determination
      const { data: job } = await supabase
        .from('jobs')
        .select('quality, job_type')
        .eq('video_id', assetId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      jobData = job;
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

    // Clean up storage files with proper bucket detection
    if (assetData) {
      try {
        if (assetType === 'image' && assetData.image_url) {
          const bucket = this.determineImageBucket(assetData, jobData);
          console.log('🗑️ Deleting from bucket:', bucket);
          await deleteFile(bucket as any, assetData.image_url);
        } else if (assetType === 'video') {
          if (assetData.video_url) {
            const bucket = this.determineVideoBucket(jobData);
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
        .select('id, image_url, quality, metadata')
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
              // Get job data for proper bucket determination
              const { data: jobData } = await supabase
                .from('jobs')
                .select('quality, job_type, model_type')
                .eq('image_id', image.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              const bucket = this.determineImageBucket(image, jobData);
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

              const bucket = this.determineVideoBucket(jobData);
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
