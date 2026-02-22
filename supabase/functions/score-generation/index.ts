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
  originalPrompt: string;
  enhancedPrompt?: string;
  systemPromptUsed?: string;
  apiModelId?: string;
  userId: string;
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

  // Round to 1 decimal place
  return Math.round(composite * 10) / 10;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: ScoreGenerationRequest = await req.json();
    const {
      jobId,
      imageUrl,
      originalPrompt,
      enhancedPrompt,
      systemPromptUsed,
      apiModelId,
      userId,
    } = body;

    // Validate required fields
    if (!jobId || !imageUrl || !originalPrompt || !userId) {
      console.error("❌ Missing required fields:", { jobId: !!jobId, imageUrl: !!imageUrl, originalPrompt: !!originalPrompt, userId: !!userId });
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📊 Score-generation request:", { jobId, hasImage: !!imageUrl, promptLength: originalPrompt.length });

    // Check if scoring is enabled
    const config = await getScoringConfig();
    if (!config?.enabled || !config?.autoAnalysisEnabled) {
      console.log("⏭️ Scoring disabled, skipping");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Scoring disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if score already exists for this job
    const { data: existingScore } = await supabase
      .from("prompt_scores")
      .select("id")
      .eq("job_id", jobId)
      .single();

    if (existingScore) {
      console.log("⏭️ Score already exists for job:", jobId);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Score already exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call vision model for analysis
    console.log("🔍 Analyzing image with vision model...");
    const visionResult = await analyzeWithVision(
      imageUrl,
      originalPrompt,
      config.visionModelId
    );

    if (!visionResult) {
      console.error("❌ Vision analysis failed for job:", jobId);
      return new Response(
        JSON.stringify({ success: false, error: "Vision analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Vision analysis complete:", {
      action_match: visionResult.action_match,
      appearance_match: visionResult.appearance_match,
      overall_quality: visionResult.overall_quality,
    });

    // Compute composite score
    const compositeScore = computeCompositeScore(visionResult, config.scoringWeights);

    // Insert prompt_scores record
    const { error: insertError } = await supabase.from("prompt_scores").insert({
      job_id: jobId,
      user_id: userId,
      api_model_id: apiModelId || null,
      original_prompt: originalPrompt,
      enhanced_prompt: enhancedPrompt || null,
      system_prompt_used: systemPromptUsed || null,
      vision_analysis: {
        ...visionResult,
        analysis_timestamp: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
      },
      action_match: visionResult.action_match,
      appearance_match: visionResult.appearance_match,
      overall_quality: visionResult.overall_quality,
      composite_score: compositeScore,
      scoring_version: "v1",
    });

    if (insertError) {
      console.error("❌ Failed to insert prompt_scores:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processingTime = Date.now() - startTime;
    console.log("✅ Score saved for job:", jobId, "composite:", compositeScore, `(${processingTime}ms)`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
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
