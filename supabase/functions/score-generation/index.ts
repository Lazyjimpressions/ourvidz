import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ScoreGenerationRequest {
  jobId: string;
  imageUrl: string;
  force?: boolean;
}

interface ScoringConfig {
  enabled: boolean;
  autoAnalysisEnabled: boolean;
  showQuickRating: boolean;
  visionModelId: string | null;
  scoringWeights: {
    actionMatch: number;
    appearanceMatch: number;
    overallQuality: number;
  };
}

interface VisionScoringResult {
  action_match: number;
  appearance_match: number;
  overall_quality: number;
  description?: string;
  elements_present?: string[];
  elements_missing?: string[];
  issues?: string[];
  strengths?: string[];
}

/**
 * Fetch prompt scoring configuration from system_config
 */
async function getScoringConfig(): Promise<ScoringConfig | null> {
  const { data } = await supabase
    .from("system_config")
    .select("config")
    .limit(1)
    .single();

  if (!data?.config?.promptScoring) {
    return null;
  }

  return data.config.promptScoring as ScoringConfig;
}

/**
 * Call describe-image with scoring output mode
 */
async function analyzeWithVision(
  imageUrl: string,
  originalPrompt: string,
  visionModelId?: string | null
): Promise<VisionScoringResult | null> {
  try {
    const response = await supabase.functions.invoke("describe-image", {
      body: {
        imageUrl,
        originalPrompt,
        outputMode: "scoring",
        modelId: visionModelId || undefined,
        contentRating: "nsfw",
      },
    });

    if (!response.data?.success || !response.data?.data) {
      console.error("❌ Vision scoring failed:", response.data?.error);
      return null;
    }

    return response.data.data as VisionScoringResult;
  } catch (error) {
    console.error("❌ Error calling describe-image:", error);
    return null;
  }
}

/**
 * Compute composite score from individual dimensions
 */
function computeCompositeScore(
  scores: VisionScoringResult,
  weights: ScoringConfig["scoringWeights"]
): number {
  const { actionMatch = 0.4, appearanceMatch = 0.35, overallQuality = 0.25 } = weights;

  const action = scores.action_match || 3;
  const appearance = scores.appearance_match || 3;
  const quality = scores.overall_quality || 3;

  const composite = (
    action * actionMatch +
    appearance * appearanceMatch +
    quality * overallQuality
  );

  return Math.round(composite * 10) / 10;
}

function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: ScoreGenerationRequest = await req.json();
    const { jobId, imageUrl, force = false } = body;

    if (!jobId || !imageUrl) {
      return errorResponse("Missing required fields: jobId and imageUrl");
    }

    console.log("📊 Score-generation request:", { jobId, hasImage: !!imageUrl, force });

    // ── Fetch job record for all metadata ──
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("original_prompt, enhanced_prompt, template_name, api_model_id, user_id, metadata")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("❌ Job not found:", jobId, jobError);
      return errorResponse("Job not found", 404);
    }

    const originalPrompt = job.original_prompt || "";
    if (!originalPrompt) {
      return errorResponse("Job has no original_prompt");
    }

    // ── Derive prompt type and enhancement metadata ──
    const enhancementMeta = (job.metadata as Record<string, unknown>)?.enhancement_metadata as Record<string, unknown> | undefined;
    const isEnhanced = !!(job.enhanced_prompt && job.enhanced_prompt !== originalPrompt && job.template_name);
    const promptType = isEnhanced ? "enhanced" : "manual";

    console.log("📋 Job metadata:", {
      promptType,
      templateName: job.template_name || null,
      hasEnhancedPrompt: !!job.enhanced_prompt,
      apiModelId: job.api_model_id,
    });

    // ── Check if scoring is enabled ──
    const config = await getScoringConfig();
    if (!config?.enabled || !config?.autoAnalysisEnabled) {
      console.log("⏭️ Scoring disabled, skipping");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Scoring disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Check for existing score ──
    const { data: existingScore } = await supabase
      .from("prompt_scores")
      .select("id")
      .eq("job_id", jobId)
      .single();

    if (existingScore && !force) {
      console.log("⏭️ Score already exists for job:", jobId);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Score already exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Run vision analysis ──
    console.log("🔍 Analyzing image with vision model...");
    const visionResult = await analyzeWithVision(imageUrl, originalPrompt, config.visionModelId);

    if (!visionResult) {
      console.error("❌ Vision analysis failed for job:", jobId);
      return errorResponse("Vision analysis failed", 500);
    }

    console.log("✅ Vision analysis complete:", {
      action_match: visionResult.action_match,
      appearance_match: visionResult.appearance_match,
      overall_quality: visionResult.overall_quality,
    });

    // ── Compute composite score ──
    const compositeScore = computeCompositeScore(visionResult, config.scoringWeights);

    // ── Look up vision model cost ──
    let visionModelUsed = config.visionModelId || "default";
    let visionCostEstimate: number | null = null;
    if (config.visionModelId) {
      const { data: modelData } = await supabase
        .from("api_models")
        .select("pricing")
        .eq("id", config.visionModelId)
        .single();
      if (modelData?.pricing && typeof modelData.pricing === "object") {
        visionCostEstimate = (modelData.pricing as Record<string, unknown>).per_generation as number || null;
      }
    }

    // ── Build vision_analysis JSONB ──
    const visionAnalysis = {
      ...visionResult,
      analysis_timestamp: new Date().toISOString(),
      processing_time_ms: Date.now() - startTime,
      vision_model_used: visionModelUsed,
      vision_cost_estimate: visionCostEstimate,
      prompt_type: promptType,
      template_name: job.template_name || null,
      enhancement_model: enhancementMeta?.enhancement_model || null,
      content_mode: enhancementMeta?.content_mode || null,
    };

    // ── Build the vision-only columns payload ──
    const visionColumns = {
      vision_analysis: visionAnalysis,
      action_match: visionResult.action_match,
      appearance_match: visionResult.appearance_match,
      overall_quality: visionResult.overall_quality,
      composite_score: compositeScore,
      scoring_version: "v1",
    };

    let scoreId: string | null = null;

    if (existingScore) {
      // ── Force re-score: UPDATE only vision columns, preserve user data ──
      console.log("🔄 Force re-score: updating existing score, preserving user ratings");
      const { error: updateError } = await supabase
        .from("prompt_scores")
        .update({
          ...visionColumns,
          // Also refresh metadata from job in case it was missing before
          original_prompt: originalPrompt,
          enhanced_prompt: job.enhanced_prompt || null,
          system_prompt_used: job.template_name || null,
          api_model_id: job.api_model_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingScore.id);

      if (updateError) {
        console.error("❌ Failed to update prompt_scores:", updateError);
        return errorResponse(updateError.message, 500);
      }
      scoreId = existingScore.id;
    } else {
      // ── New score: INSERT ──
      const { data: insertedScore, error: insertError } = await supabase
        .from("prompt_scores")
        .insert({
          job_id: jobId,
          user_id: job.user_id,
          api_model_id: job.api_model_id || null,
          original_prompt: originalPrompt,
          enhanced_prompt: job.enhanced_prompt || null,
          system_prompt_used: job.template_name || null,
          ...visionColumns,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("❌ Failed to insert prompt_scores:", insertError);
        return errorResponse(insertError.message, 500);
      }
      scoreId = insertedScore?.id || null;
    }

    // ── Link workspace_asset_id if not already set ──
    if (scoreId && !existingScore) {
      const { data: wsAsset } = await supabase
        .from("workspace_assets")
        .select("id")
        .eq("job_id", jobId)
        .limit(1)
        .single();

      if (wsAsset?.id) {
        await supabase
          .from("prompt_scores")
          .update({ workspace_asset_id: wsAsset.id })
          .eq("id", scoreId);
        console.log("✅ Linked workspace_asset_id:", wsAsset.id);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log("✅ Score saved for job:", jobId, "composite:", compositeScore, `(${processingTime}ms)`, "type:", promptType);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        prompt_type: promptType,
        scores: {
          action_match: visionResult.action_match,
          appearance_match: visionResult.appearance_match,
          overall_quality: visionResult.overall_quality,
          composite_score: compositeScore,
        },
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ score-generation error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
