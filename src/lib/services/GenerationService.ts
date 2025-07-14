import { supabase } from '@/integrations/supabase/client';
import { GenerationRequest, GenerationFormat, GENERATION_CONFIGS } from '@/types/generation';
import { videoAPI, imageAPI, usageAPI } from '@/lib/database';

export class GenerationService {
  static async queueGeneration(request: GenerationRequest): Promise<string> {
    console.log('🎬 GenerationService.queueGeneration called with enhanced SDXL tracking:', {
      request,
      timestamp: new Date().toISOString()
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to generate content');
    }

    const config = GENERATION_CONFIGS[request.format];
    if (!config) {
      throw new Error(`Unknown generation format: ${request.format}`);
    }

    console.log('🔧 Enhanced generation config with model tracking:', {
      format: request.format,
      isSDXL: config.isSDXL,
      isVideo: config.isVideo,
      queue: config.queue,
      bucket: config.bucket,
      estimatedTime: config.estimatedTime
    });

    try {
      // Create record in appropriate table with enhanced model tracking
      let videoId: string | undefined;
      let imageId: string | undefined;

      if (config.isVideo) {
        console.log('📹 Creating video record...');
        const video = await videoAPI.create({
          user_id: user.id,
          project_id: request.projectId,
          status: 'queued',
          format: 'mp4',
          resolution: config.format.includes('high') ? '1280x720' : '832x480'
        });
        videoId = video.id;
        console.log('✅ Video record created:', { videoId, resolution: video.resolution });
      } else {
        console.log('🖼️ Creating image record(s) with SDXL model tracking...');
        
        // For SDXL jobs, create N image records based on num_images
        if (config.isSDXL) {
          const numImages = request.metadata?.num_images || 1;
          console.log(`📸 Creating ${numImages} SDXL image records...`);
          
          const imageRecords = [];
          for (let i = 0; i < numImages; i++) {
            const image = await imageAPI.create({
              user_id: user.id,
              project_id: request.projectId,
              prompt: request.prompt,
              generation_mode: 'standalone',
              status: 'queued',
              format: 'png',
              quality: config.format.includes('high') ? 'high' : 'fast',
              image_index: i,
              metadata: {
                model_type: 'sdxl',
                is_sdxl: true,
                bucket: config.bucket,
                job_format: request.format,
                generation_timestamp: new Date().toISOString()
              }
            });
            imageRecords.push(image);
            console.log(`✅ SDXL image record ${i + 1}/${numImages} created:`, {
              imageId: image.id,
              imageIndex: i,
              quality: image.quality
            });
          }
          
          // Use the first image ID for job linking
          imageId = imageRecords[0].id;
          console.log('✅ All SDXL image records created:', {
            totalRecords: numImages,
            firstImageId: imageId,
            bucket: config.bucket
          });
        } else {
          // Non-SDXL jobs: create single image record (existing behavior)
          const image = await imageAPI.create({
            user_id: user.id,
            project_id: request.projectId,
            prompt: request.prompt,
            generation_mode: 'standalone',
            status: 'queued',
            format: 'png',
            quality: config.format.includes('high') ? 'high' : 'fast',
            metadata: {
              model_type: 'wan',
              is_sdxl: false,
              bucket: config.bucket,
              job_format: request.format,
              generation_timestamp: new Date().toISOString()
            }
          });
          imageId = image.id;
          console.log('✅ Single image record created:', {
            imageId,
            quality: image.quality,
            modelType: 'wan',
            bucket: config.bucket
          });
        }
      }

      // Queue the job with enhanced metadata
      console.log('📤 Queueing job with enhanced SDXL model tracking...');
      const jobBody = {
        jobType: request.format,
        metadata: {
          ...request.metadata,
          credits: config.credits * (request.batchCount || 1),
          model_variant: config.isSDXL ? 'lustify_sdxl' : 'wan_2_1_1_3b',
          model_type: config.isSDXL ? 'sdxl' : 'wan',
          is_sdxl: config.isSDXL,
          prompt: request.prompt,
          queue: config.queue,
          bucket: config.bucket,
          enhanced_tracking: true,
          generation_format: request.format,
          client_timestamp: new Date().toISOString(),
          batch_count: request.batchCount || 1,
          reference_image_url: request.referenceImageUrl
        },
        projectId: request.projectId,
        videoId,
        imageId,
        // Pass prompt_test_id if this is a test generation
        ...(request.metadata?.prompt_test_metadata && {
          prompt_test_id: request.metadata.prompt_test_id
        })
      };

      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: jobBody
      });

      if (error) {
        console.error('❌ Edge function error:', { error, request });
        throw new Error(`Failed to queue generation: ${error.message}`);
      }

      if (!data?.success) {
        console.error('❌ Edge function returned failure:', { data, request });
        throw new Error(data?.error || 'Failed to queue generation');
      }

      console.log('✅ Job queued successfully with enhanced SDXL tracking:', {
        jobId: data.job?.id,
        queueLength: data.queueLength,
        modelVariant: data.modelVariant,
        isSDXL: data.isSDXL,
        queue: data.queue,
        bucket: config.bucket
      });

      // Update SDXL image records with the actual job_id
      if (config.isSDXL && imageId && data.job?.id) {
        console.log('🔗 Updating SDXL image records with job_id:', data.job.id);
        const { error: updateError } = await supabase
          .from('images')
          .update({ job_id: data.job.id })
          .eq('user_id', user.id)
          .eq('status', 'queued')
          .eq('prompt', request.prompt)
          .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Within last minute
        
        if (updateError) {
          console.error('❌ Failed to update SDXL image records with job_id:', updateError);
        } else {
          console.log('✅ SDXL image records updated with job_id');
        }
      }
      
      // Log usage with enhanced metadata
      await usageAPI.logAction(request.format, config.credits, {
        format: config.isVideo ? 'video' : 'image',
        quality: config.format.includes('high') ? 'high' : 'fast',
        model_type: config.isSDXL ? 'sdxl' : 'wan',
        is_sdxl: config.isSDXL,
        bucket: config.bucket,
        job_id: data.job?.id,
        enhanced_tracking: true,
        generation_timestamp: new Date().toISOString()
      });

      return data.job?.id || 'unknown';
    } catch (error) {
      console.error('❌ GenerationService.queueGeneration failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  static async getGenerationStatus(jobId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      throw new Error(`Failed to get job status: ${error.message}`);
    }

    return data;
  }

  static async cancelGeneration(jobId: string) {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to cancel generation: ${error.message}`);
    }
  }
}
