import { supabase } from '@/integrations/supabase/client';
import { GenerationRequest, GenerationFormat, GENERATION_CONFIGS } from '@/types/generation';
import { usageAPI } from '@/lib/database';

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

    // Route Replicate requests to new edge function
    if (request.format === 'rv51_fast' || request.format === 'rv51_high') {
      return await this.queueReplicateGeneration(request, config);
    }

    // Continue with existing logic for SDXL/WAN

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

      // Use queue-job instead of deprecated generate-content
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          prompt: request.enhancedPrompt || request.originalPrompt || request.prompt,
          original_prompt: request.originalPrompt || request.prompt,
          job_type: request.format,
          quality: config.format.includes('high') ? 'high' : 'fast',
          format: config.isVideo ? 'mp4' : 'png',
          model_type: config.isSDXL ? 'sdxl' : 'wan',
          enhanced_prompt: request.enhancedPrompt,
          num_images: request.batchCount || 1,
          reference_image_url: request.referenceImageUrl,
          reference_strength: request.metadata?.reference_strength,
          negative_prompt: request.metadata?.negative_prompt || undefined,
          metadata: {
            ...sanitizedBody.metadata,
            reference_image_url: request.referenceImageUrl,
            reference_strength: request.metadata?.reference_strength,
            user_requested_enhancement: !request.metadata?.exact_copy_mode && 
                                      request.metadata?.enhancement_model !== 'none' &&
                                      request.metadata?.skip_enhancement !== true,
            enhancement_model: request.metadata?.enhancement_model || 'qwen_instruct',
            skip_enhancement: request.metadata?.skip_enhancement || request.metadata?.exact_copy_mode
          }
        }
      });

      if (error) {
        console.error('❌ Queue job error:', { error, request });
        
        // Enhanced error handling with specific messages
        let errorMessage = `Failed to queue generation: ${error.message}`;
        if (error.details) {
          const { status, worker_type, workerUrl } = error.details;
          if (status === 404) {
            errorMessage = `Worker endpoint not found (404). The ${worker_type} worker at ${workerUrl} is not responding correctly.`;
          } else if (status === 503) {
            errorMessage = `No worker available for processing. Please try again later.`;
          } else if (status === 400) {
            errorMessage = `Invalid request sent to worker (400). Please try a different prompt or settings.`;
          } else if (status >= 500) {
            errorMessage = `Worker server error (${status}). The generation service is temporarily unavailable.`;
          }
        } else if (error.message.includes('No active worker')) {
          errorMessage = `No generation workers are currently available. Please try again in a few minutes.`;
        } else if (error.message.includes('Worker responded with status')) {
          errorMessage = `Generation worker error. Please try again or contact support if the issue persists.`;
        }
        
        throw new Error(errorMessage);
      }

      const jobId = data?.jobId;
      if (!jobId) {
        throw new Error('No job ID returned from queue-job');
      }

      console.log('✅ Job queued successfully:', {
        jobId,
        status: data.status,
        queueName: data.queueName,
        message: data.message
      });

      // Phase 2: Create records with job_id directly (like videos)
      if (config.isVideo) {
        console.log('📹 Creating video record with job_id...');
        // TODO: Replace with new workspace_assets creation
        console.log('⚠️ Video creation temporarily disabled - using new architecture');
        
        // For now, the job is created and queued without creating legacy video records
        // The callback will create workspace_assets entries
      } else {
        console.log('🖼️ Creating image record(s) with job_id directly...');
        
        // TODO: Replace with new workspace_assets creation
        console.log('⚠️ Image creation temporarily disabled - using new architecture');
        
        // For now, the job is created and queued without creating legacy image records
        // The callback will create workspace_assets entries
      }
      
      // Usage logging handled by edge function

      return data.jobId || 'unknown';
      } catch (error) {
        console.error('Generation request failed:', error);
        
        // Enhanced error messages for common failures
        let userMessage = 'Generation failed. Please try again.';
        
        if (error.message?.includes('Worker responded with status: 404')) {
          userMessage = 'Generation worker endpoint not found. Please contact support if this persists.';
        } else if (error.message?.includes('All worker endpoints failed')) {
          userMessage = 'Unable to connect to any generation endpoints. Please try again later.';
        } else if (error.message?.includes('No active') || error.message?.includes('worker available')) {
          userMessage = 'Generation service is starting up. Please try again in a moment.';
        } else if (error.message?.includes('timeout') || error.message?.includes('AbortError')) {
          userMessage = 'Generation request timed out. Please try again with a simpler prompt.';
        } else if (error.message?.includes('enhance') || error.message?.includes('prompt')) {
          userMessage = 'Failed to enhance your prompt. Please try with a simpler description.';
        } else if (error.message?.includes('Network error') || error.message?.includes('fetch')) {
          userMessage = 'Network connection issue. Please check your connection and try again.';
        } else if (error.message?.includes('Worker endpoint not found') || error.message?.includes('404')) {
          userMessage = 'Generation service configuration issue. Please contact support.';
        } else if (error.message?.includes('Worker server error') || error.message?.includes('503')) {
          userMessage = 'Generation service temporarily overloaded. Please try again in a few minutes.';
        }
        
        throw new Error(userMessage);
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

  static async queueReplicateGeneration(request: GenerationRequest, config: any): Promise<string> {
    console.log('🔥 Routing to Replicate generation:', request.format);

    try {
      // Fetch the active Replicate image generation model
      const { data: apiModels, error: modelError } = await supabase
        .from('api_models')
        .select(`
          id,
          display_name,
          model_key,
          version,
          input_defaults,
          api_providers!inner(name)
        `)
        .eq('is_active', true)
        .eq('modality', 'image')
        .eq('task', 'generation')
        .eq('api_providers.name', 'replicate')
        .order('priority', { ascending: false })
        .limit(1);

      if (modelError || !apiModels || apiModels.length === 0) {
        console.error('❌ No active Replicate model found:', modelError);
        throw new Error('Replicate model not available');
      }

      const apiModel = apiModels[0];
      console.log('🎨 Using Replicate model:', apiModel.display_name, apiModel.id);

      // Build input from model defaults + request overrides
      const modelDefaults = (apiModel.input_defaults && typeof apiModel.input_defaults === 'object') 
        ? apiModel.input_defaults as Record<string, any>
        : {};
      
      const input = {
        ...modelDefaults,
        // Request-specific overrides
        negative_prompt: request.metadata?.negative_prompt,
        num_outputs: request.batchCount || 1,
        num_inference_steps: request.metadata?.steps || 20,
        guidance_scale: request.metadata?.guidance_scale || 7.5,
        seed: request.metadata?.seed ? Number(request.metadata.seed) : undefined
      };

      const { data, error } = await supabase.functions.invoke('replicate-image', {
        body: {
          prompt: request.prompt,
          apiModelId: apiModel.id,
          input: input,
          jobType: request.format,
          quality: config.displayName.includes('High') ? 'high' : 'fast',
          metadata: {
            ...request.metadata,
            model_type: 'realistic_vision_v51',
            credits: config.credits,
            original_prompt: request.originalPrompt || request.prompt
          }
        }
      });

      if (error) {
        console.error('❌ Replicate generation error:', error);
        throw new Error(`Replicate generation failed: ${error.message}`);
      }

      console.log('✅ Replicate job queued:', { jobId: data.jobId, predictionId: data.predictionId });
      return data.jobId;
    } catch (error) {
      console.error('Replicate generation request failed:', error);
      throw new Error(`Replicate generation failed: ${error.message}`);
    }
  }
}
