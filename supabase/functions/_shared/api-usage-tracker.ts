/**
 * Shared API usage tracking utilities for edge functions
 * Tracks API provider usage, costs, and aggregates metrics
 */

export interface UsageLogData {
  providerId: string;
  modelId?: string;
  userId?: string;
  requestType: 'chat' | 'image' | 'video';
  endpointPath?: string;
  requestPayload?: any;
  tokensInput?: number;
  tokensOutput?: number;
  tokensTotal?: number;
  tokensCached?: number;
  costUsd?: number;
  costCredits?: number;
  responseStatus?: number;
  responseTimeMs: number;
  responsePayload?: any;
  errorMessage?: string;
  providerMetadata?: Record<string, any>;
}

/**
 * Main logging function - inserts usage log and updates aggregates
 * Non-blocking: errors are logged but don't throw
 */
export async function logApiUsage(
  supabase: any,
  data: UsageLogData
): Promise<void> {
  try {
    // Insert detailed log
    const { error: logError } = await supabase
      .from('api_usage_logs')
      .insert([{
        provider_id: data.providerId,
        model_id: data.modelId || null,
        user_id: data.userId || null,
        request_type: data.requestType,
        endpoint_path: data.endpointPath || null,
        request_payload: data.requestPayload || null,
        tokens_input: data.tokensInput || null,
        tokens_output: data.tokensOutput || null,
        tokens_total: data.tokensTotal || null,
        tokens_cached: data.tokensCached || null,
        cost_usd: data.costUsd || null,
        cost_credits: data.costCredits || null,
        response_status: data.responseStatus || null,
        response_time_ms: data.responseTimeMs,
        response_payload: data.responsePayload || null,
        error_message: data.errorMessage || null,
        provider_metadata: data.providerMetadata || {}
      }]);

    if (logError) {
      console.error('❌ Failed to log API usage:', logError);
      // Don't throw - logging failures shouldn't break requests
      return;
    }

    // Update aggregates (async, don't await)
    updateAggregates(supabase, data).catch(err => {
      console.error('❌ Failed to update aggregates:', err);
    });
  } catch (error) {
    console.error('❌ Error in logApiUsage:', error);
    // Don't throw - logging failures shouldn't break requests
  }
}

/**
 * Update aggregate records for fast dashboard queries
 * Called asynchronously to avoid blocking API requests
 */
async function updateAggregates(
  supabase: any,
  data: UsageLogData
): Promise<void> {
  try {
    const now = new Date();
    const dateBucket = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hourBucket = now.getHours(); // 0-23

    // Call PostgreSQL function to upsert aggregate
    const { error } = await supabase.rpc('upsert_usage_aggregate', {
      p_provider_id: data.providerId,
      p_model_id: data.modelId || null,
      p_date_bucket: dateBucket,
      p_hour_bucket: hourBucket,
      p_request_count: 1,
      p_success_count: (data.responseStatus && data.responseStatus < 400) ? 1 : 0,
      p_error_count: (data.responseStatus && data.responseStatus >= 400) ? 1 : 0,
      p_tokens_input: data.tokensInput || 0,
      p_tokens_output: data.tokensOutput || 0,
      p_tokens_cached: data.tokensCached || 0,
      p_cost_usd: data.costUsd || 0,
      p_cost_credits: data.costCredits || 0,
      p_response_time_ms: data.responseTimeMs
    });

    if (error) {
      console.error('❌ Failed to update aggregate:', error);
    }
  } catch (error) {
    console.error('❌ Error updating aggregates:', error);
  }
}

/**
 * Extract usage data from OpenRouter API response
 */
export function extractOpenRouterUsage(response: any): Partial<UsageLogData> {
  const usage = response.usage || {};
  return {
    tokensInput: usage.prompt_tokens,
    tokensOutput: usage.completion_tokens,
    tokensTotal: usage.total_tokens,
    tokensCached: usage.cached_tokens || 0,
    costUsd: response.cost || (usage.total_tokens ? usage.total_tokens * 0.000002 : null), // Estimate if not provided
    providerMetadata: {
      upstream_cost: response.cost_details?.upstream_inference_cost,
      model: response.model,
      id: response.id
    }
  };
}

/**
 * Extract usage data from Replicate API response
 * Note: Replicate doesn't provide usage in response, need to estimate or fetch separately
 */
export function extractReplicateUsage(response: any): Partial<UsageLogData> {
  // Replicate provides cost in prediction object, but may need to fetch separately
  // For now, estimate based on predict_time if available
  const predictTime = response.metrics?.predict_time;
  const estimatedCost = predictTime ? predictTime * 0.0001 : null; // Rough estimate
  
  return {
    costUsd: response.cost || estimatedCost,
    providerMetadata: {
      prediction_id: response.id,
      status: response.status,
      metrics: response.metrics,
      version: response.version,
      created_at: response.created_at,
      completed_at: response.completed_at
    }
  };
}

/**
 * Extract usage data from fal.ai API response
 */
export function extractFalUsage(response: any): Partial<UsageLogData> {
  return {
    costUsd: response.cost || null,
    providerMetadata: {
      request_id: response.request_id,
      status: response.status,
      model: response.model,
      created_at: response.created_at
    }
  };
}
