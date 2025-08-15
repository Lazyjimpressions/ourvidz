import { supabase } from '@/integrations/supabase/client';
import { GenerationRequest, GenerationFormat, GENERATION_CONFIGS } from '@/types/generation';
import { videoAPI, imageAPI, usageAPI } from '@/lib/database';

export class GenerationService {
/**
 * Queue generation
 * @param {GenerationRequest} request - request parameter
 * @returns {Promise<string>} Promise that resolves to the result
 */
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

    // Sanitize request to remove circular references
    const sanitizeRequest = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;
      
      // Remove File objects and DOM elements
      if (obj instanceof File || obj instanceof HTMLElement || obj.constructor?.name?.includes('HTML')) {
        return undefined;
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeRequest(item)).filter(item => item !== undefined);
      }
      
      // Handle regular objects
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedValue = sanitizeRequest(value);
        if (sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue;
        }
      }
      return sanitized;
    };

    try {
      // Test JSON serialization to catch circular references early
      try {
        JSON.stringify(request);
      } catch (jsonError) {
        console.error('❌ Circular reference detected in request:', jsonError);
        throw new Error('Request contains circular references that cannot be serialized');
      }

      // Phase 1: Create job first, then records with job_id (like videos)
      let videoId: string | undefined;
      let imageId: string | undefined;

      // Queue the job FIRST to get job_id
      console.log('📤 Creating job first (video table pattern)...');
      const jobBody = {
        jobType: request.format,
        metadata: sanitizeRequest({
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
          // FIXED: Reference image data now handled in metadata.reference_url for consistency
          start_reference_url: request.metadata?.start_reference_url,
          end_reference_url: request.metadata?.end_reference_url
        }),
        projectId: request.projectId,
        // Pass prompt_test_id if this is a test generation
        ...(request.metadata?.prompt_test_metadata && {
          prompt_test_id: request.metadata.prompt_test_id
        })
      };

      const sanitizedBody = sanitizeRequest({
        ...jobBody,
        // CRITICAL FIX: Ensure originalPrompt is sent correctly
        originalPrompt: request.originalPrompt || request.prompt,
        enhancedPrompt: request.enhancedPrompt,
        isPromptEnhanced: request.isPromptEnhanced,
        enhancementMetadata: sanitizeRequest(request.enhancementMetadata),
        selectedPresets: request.selectedPresets,
        // Pass enhancement parameters as top-level for proper routing
        contentType: request.metadata?.contentType || 'sfw',
        enhancementModel: request.metadata?.enhancement_model || 'qwen_instruct',
        // Pass exact copy mode for enhancement bypass
        metadata: {
          ...sanitizeRequest(request.metadata),
          // CRITICAL FIX: Ensure prompt is also in metadata as fallback
          prompt: request.originalPrompt || request.prompt,
          exact_copy_mode: request.metadata?.exact_copy_mode
        }
      });

      // Final validation before sending
      try {
        JSON.stringify(sanitizedBody);
      } catch (jsonError) {
        console.error('❌ Sanitized request still contains circular references:', jsonError);
        throw new Error('Unable to sanitize request for serialization');
      }

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          prompt: request.originalPrompt || request.prompt,
          model: config.isSDXL ? 'sdxl' : 'wan',
          quantity: request.batchCount || 1,
          enhance_prompt: !request.metadata?.exact_copy_mode,
          metadata: sanitizedBody.metadata,
          quality: config.format.includes('high') ? 'high' : 'fast',
          format: request.format
        }
      });

      if (error) {
        console.error('❌ Edge function error:', { error, request });
        throw new Error(`Failed to queue generation: ${error.message}`);
      }

      if (!data?.success) {
        console.error('❌ Edge function returned failure:', { data, request });
        throw new Error(data?.error || 'Failed to queue generation');
      }

      const jobId = data.job?.id;
      if (!jobId) {
        throw new Error('No job ID returned from queue-job');
      }

      console.log('✅ Job created successfully:', {
        jobId,
        queueLength: data.queueLength,
        modelVariant: data.modelVariant,
        isSDXL: data.isSDXL,
        queue: data.queue,
        bucket: config.bucket
      });

      // Phase 2: Create records with job_id directly (like videos)
      if (config.isVideo) {
        console.log('📹 Creating video record with job_id...');
        const video = await videoAPI.create({
          user_id: user.id,
          project_id: request.projectId,
          status: 'queued',
          format: 'mp4',
          resolution: config.format.includes('high') ? '1280x720' : '832x480'
        });
        videoId = video.id;
        
        // Update job with video_id
        await supabase.from('jobs').update({ video_id: video.id }).eq('id', jobId);
        console.log('✅ Video record created and linked:', { videoId, jobId });
      } else {
        console.log('🖼️ Creating image record(s) with job_id directly...');
        
        if (config.isSDXL) {
          const numImages = request.metadata?.num_images || 1;
          console.log(`📸 Creating ${numImages} SDXL image records with job_id...`);
          
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
              job_id: jobId, // Direct assignment, no update needed
              metadata: {
                model_type: 'sdxl',
                is_sdxl: true,
                bucket: config.bucket,
                job_format: request.format,
                generation_timestamp: new Date().toISOString()
              }
            });
            
            // Use first image as the primary for job linking
            if (i === 0) {
              imageId = image.id;
              await supabase.from('jobs').update({ image_id: image.id }).eq('id', jobId);
            }
            
            console.log(`✅ SDXL image record ${i + 1}/${numImages} created:`, {
              imageId: image.id,
              imageIndex: i,
              jobId,
              quality: image.quality
            });
          }
          
          console.log('✅ All SDXL image records created with job_id:', {
            totalRecords: numImages,
            firstImageId: imageId,
            jobId,
            bucket: config.bucket
          });
        } else {
          // Non-SDXL jobs: create single image record
          const image = await imageAPI.create({
            user_id: user.id,
            project_id: request.projectId,
            prompt: request.prompt,
            generation_mode: 'standalone',
            status: 'queued',
            format: 'png',
            quality: config.format.includes('high') ? 'high' : 'fast',
            job_id: jobId, // Direct assignment
            metadata: {
              model_type: 'wan',
              is_sdxl: false,
              bucket: config.bucket,
              job_format: request.format,
              generation_timestamp: new Date().toISOString()
            }
          });
          imageId = image.id;
          
          // Update job with image_id
          await supabase.from('jobs').update({ image_id: image.id }).eq('id', jobId);
          console.log('✅ Single image record created and linked:', {
            imageId,
            jobId,
            quality: image.quality,
            modelType: 'wan',
            bucket: config.bucket
          });
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
