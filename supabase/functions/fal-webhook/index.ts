import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ── 1. Verify webhook secret ──
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const expectedSecret = Deno.env.get("FAL_WEBHOOK_SECRET");

    if (!expectedSecret) {
      console.error("❌ FAL_WEBHOOK_SECRET not configured");
      return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
    }
    if (secret !== expectedSecret) {
      console.error("❌ Invalid webhook secret");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // ── 2. Parse payload ──
    const payload = await req.json();
    const requestId = payload.request_id || req.headers.get("x-fal-webhook-request-id");

    console.log("🔔 fal-webhook received:", {
      request_id: requestId,
      status: payload.status,
      has_payload: !!payload.payload,
      has_video: !!payload.video || !!payload.payload?.video,
      has_images: !!payload.images || !!payload.payload?.images,
    });

    if (!requestId) {
      console.error("❌ No request_id in webhook");
      return new Response("Missing request_id", { status: 400, headers: corsHeaders });
    }

    // ── 3. Find job by fal_request_id ──
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("metadata->>fal_request_id", requestId)
      .single();

    if (jobError || !job) {
      console.error("❌ Job not found for fal request_id:", requestId, jobError);
      return new Response("Job not found", { status: 404, headers: corsHeaders });
    }

    console.log("✅ Found job:", job.id, "status:", job.status);

    // ── 4. Handle failure ──
    // fal.ai sends status "COMPLETED" on success; anything else is a failure
    const falStatus = payload.status || "COMPLETED";
    if (falStatus !== "COMPLETED") {
      const errorMsg = payload.error || payload.detail || `fal.ai returned status: ${falStatus}`;
      console.error("❌ fal.ai generation failed:", errorMsg);

      await supabase.from("jobs").update({
        status: "failed",
        error_message: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg),
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);

      return new Response(JSON.stringify({ ok: true, job_id: job.id, status: "failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 5. Extract result URL ──
    // fal.ai webhook payload structure: the result is either at top level or nested under .payload
    const result = payload.payload || payload;

    let resultUrl: string | null = null;
    let resultType = "image";

    if (result.video?.url) {
      resultUrl = result.video.url;
      resultType = "video";
    } else if (result.images && result.images.length > 0) {
      resultUrl = result.images[0].url;
      resultType = "image";
    } else if (result.output?.url) {
      resultUrl = result.output.url;
      resultType = job.format === "video" ? "video" : "image";
    }

    if (!resultUrl) {
      console.error("❌ No result URL in webhook payload:", JSON.stringify(result).substring(0, 500));
      await supabase.from("jobs").update({
        status: "failed",
        error_message: "No result URL in fal.ai webhook payload",
      }).eq("id", job.id);
      return new Response(JSON.stringify({ ok: true, job_id: job.id, status: "failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("📥 Result URL:", resultUrl.substring(0, 80), "type:", resultType);

    // ── 6. Download result and upload to workspace-temp ──
    const downloadResponse = await fetch(resultUrl);
    if (!downloadResponse.ok) {
      console.error("❌ Failed to download result:", downloadResponse.status);
      await supabase.from("jobs").update({
        status: "failed",
        error_message: `Failed to download result: ${downloadResponse.status}`,
      }).eq("id", job.id);
      return new Response(JSON.stringify({ ok: true, job_id: job.id, status: "failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultBuffer = await downloadResponse.arrayBuffer();
    const fileSizeBytes = resultBuffer.byteLength;
    const ext = resultType === "video" ? "mp4" : "png";
    const contentType = resultType === "video" ? "video/mp4" : "image/png";
    const storagePath = `${job.user_id}/${job.id}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("workspace-temp")
      .upload(storagePath, resultBuffer, { contentType, upsert: true });

    if (uploadError) {
      console.error("❌ Upload failed:", uploadError);
      await supabase.from("jobs").update({
        status: "failed",
        error_message: `Storage upload failed: ${uploadError.message}`,
      }).eq("id", job.id);
      return new Response(JSON.stringify({ ok: true, job_id: job.id, status: "failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Uploaded to workspace-temp:", storagePath, `(${fileSizeBytes} bytes)`);

    // ── 7. Generate thumbnail for video (use reference image from job metadata) ──
    let thumbnailPath: string | null = null;
    if (resultType === "video") {
      const refImageUrl = job.metadata?.reference_image_signed_url || job.metadata?.input_used?.image_url;
      if (refImageUrl && typeof refImageUrl === "string" && refImageUrl.startsWith("http")) {
        try {
          const thumbResponse = await fetch(refImageUrl);
          if (thumbResponse.ok) {
            const thumbBuffer = await thumbResponse.arrayBuffer();
            const thumbStoragePath = `${job.user_id}/${job.id}_${Date.now()}.thumb.webp`;
            const { error: thumbErr } = await supabase.storage
              .from("workspace-temp")
              .upload(thumbStoragePath, thumbBuffer, { contentType: "image/webp", upsert: true });
            if (!thumbErr) {
              thumbnailPath = thumbStoragePath;
              console.log("✅ Thumbnail created from reference image");
            }
          }
        } catch (thumbError) {
          console.warn("⚠️ Thumbnail generation failed:", thumbError);
        }
      }
    }

    // ── 8. Create workspace_assets record ──
    const generationSeed = result.seed || Math.floor(Math.random() * 1000000000);
    const modelKey = job.metadata?.model_key || "unknown";
    const generationMode = job.metadata?.generation_mode || (resultType === "video" ? "txt2vid" : "txt2img");

    const { error: assetError } = await supabase.from("workspace_assets").insert({
      user_id: job.user_id,
      job_id: job.id,
      asset_type: resultType,
      temp_storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      file_size_bytes: fileSizeBytes,
      mime_type: contentType,
      original_prompt: job.original_prompt || "",
      model_used: modelKey,
      generation_seed: generationSeed,
      generation_settings: {
        model_key: modelKey,
        provider: job.metadata?.provider_name || "fal",
        content_mode: job.metadata?.content_mode || "nsfw",
        generation_mode: generationMode,
        seed: generationSeed,
        scene_id: job.metadata?.scene_id,
        scene_template_id: job.metadata?.scene_template_id,
        scene_template_name: job.metadata?.scene_template_name,
        original_scene_prompt: job.metadata?.original_scene_prompt || job.original_prompt,
      },
    });

    if (assetError) {
      console.warn("⚠️ Failed to create workspace asset:", assetError);
    } else {
      console.log("✅ Workspace asset created");
    }

    // ── 9. Update job to completed ──
    await supabase.from("jobs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      metadata: {
        ...job.metadata,
        result_type: resultType,
        fal_webhook_payload: {
          request_id: requestId,
          seed: result.seed,
          timings: result.timings,
        },
        original_fal_url: resultUrl,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        webhook_processed: true,
      },
    }).eq("id", job.id);

    console.log("✅ Job completed via webhook:", job.id);

    // ── 10. Post-processing (fire-and-forget) ──
    // Handle character portrait and scene destinations
    const destination = job.metadata?.destination;
    if (destination) {
      handlePostProcessing(supabase, job, storagePath, resultType, fileSizeBytes, generationSeed, modelKey, thumbnailPath)
        .catch((err) => console.error("❌ Post-processing error:", err));
    }

    // ── 11. Log API usage ──
    try {
      const providerName = job.metadata?.provider_name || "fal";
      // Look up provider ID
      const { data: provider } = await supabase
        .from("api_providers")
        .select("id")
        .eq("name", providerName)
        .single();

      if (provider) {
        await supabase.from("api_usage_logs").insert({
          provider_id: provider.id,
          model_id: job.api_model_id,
          user_id: job.user_id,
          request_type: resultType === "video" ? "video" : "image",
          endpoint_path: `/${modelKey}`,
          response_status: 200,
          response_time_ms: job.started_at
            ? new Date().getTime() - new Date(job.started_at).getTime()
            : 0,
          cost_usd: job.metadata?.estimated_cost || null,
          provider_metadata: {
            request_id: requestId,
            webhook: true,
            cost_source: "estimated",
          },
        });
      }
    } catch (usageError) {
      console.error("❌ Usage logging failed:", usageError);
    }

    return new Response(
      JSON.stringify({ ok: true, job_id: job.id, status: "completed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ fal-webhook error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Post-processing helper (mirrors fal-image handlePostProcessing)
// ═══════════════════════════════════════════════════════════════════════════════

async function handlePostProcessing(
  supabase: any,
  job: any,
  storagePath: string,
  resultType: string,
  fileSizeBytes: number,
  generationSeed: number,
  modelKey: string,
  thumbnailPath: string | null
): Promise<void> {
  const destination = job.metadata?.destination;
  if (!destination) return;

  // ─── Character Portrait ───
  if (destination === "character_portrait") {
    let characterId = job.metadata?.character_id;
    if (!characterId) {
      console.warn("⚠️ No character ID in webhook job, skipping portrait");
      return;
    }

    console.log("🖼️ Webhook: Updating character portrait:", characterId);
    const fullImagePath = `workspace-temp/${storagePath}`;

    await supabase.from("characters").update({
      image_url: fullImagePath,
      reference_image_url: fullImagePath,
      seed_locked: generationSeed,
      updated_at: new Date().toISOString(),
    }).eq("id", characterId);

    // Auto-save to library
    try {
      const destKey = `${job.user_id}/${job.id}_${characterId}.${resultType === "video" ? "mp4" : "png"}`;
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("workspace-temp")
        .download(storagePath);
      if (dlErr || !fileData) return;

      const { error: ulErr } = await supabase.storage
        .from("user-library")
        .upload(destKey, fileData, {
          contentType: resultType === "video" ? "video/mp4" : "image/png",
          upsert: true,
        });
      if (ulErr) return;

      // Copy thumbnail
      let libraryThumbPath: string | null = null;
      if (thumbnailPath) {
        try {
          const { data: thumbData } = await supabase.storage
            .from("workspace-temp")
            .download(thumbnailPath);
          if (thumbData) {
            const thumbDest = `${job.user_id}/${job.id}_${characterId}.thumb.webp`;
            const { error: upErr } = await supabase.storage
              .from("user-library")
              .upload(thumbDest, thumbData, { contentType: "image/webp", upsert: true });
            if (!upErr) libraryThumbPath = thumbDest;
          }
        } catch { /* thumbnail not critical */ }
      }

      const { data: libAsset, error: libErr } = await supabase
        .from("user_library")
        .insert({
          user_id: job.user_id,
          asset_type: resultType,
          storage_path: destKey,
          thumbnail_path: libraryThumbPath,
          file_size_bytes: fileSizeBytes,
          mime_type: resultType === "video" ? "video/mp4" : "image/png",
          original_prompt: job.original_prompt,
          model_used: modelKey,
          generation_seed: generationSeed,
          tags: ["character", "portrait"],
          roleplay_metadata: {
            type: "character_portrait",
            character_id: characterId,
            character_name: job.metadata?.character_name,
          },
          content_category: "character",
        })
        .select()
        .single();

      if (!libErr && libAsset) {
        const stableUrl = `user-library/${destKey}`;
        await supabase.from("characters").update({
          image_url: stableUrl,
          reference_image_url: stableUrl,
          seed_locked: generationSeed,
          updated_at: new Date().toISOString(),
        }).eq("id", characterId);
        console.log(`✅ Character ${characterId} portrait saved to library via webhook`);
      }
    } catch (error) {
      console.error("❌ Error auto-saving character portrait via webhook:", error);
    }
    return;
  }

  // ─── Character Scene / Roleplay Scene ───
  if (
    (destination === "character_scene" || destination === "roleplay_scene") &&
    job.metadata?.scene_id
  ) {
    console.log("🎬 Webhook: Updating scene:", job.metadata.scene_id);
    const sceneImagePath = `workspace-temp/${storagePath}`;

    // Try to persist to library
    let persistentPath = sceneImagePath;
    try {
      const sourceKey = storagePath;
      const libDestKey = `${job.user_id}/scenes/${job.metadata.scene_id}_${Date.now()}.${resultType === "video" ? "mp4" : "png"}`;
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("workspace-temp")
        .download(sourceKey);

      if (!dlErr && fileData) {
        const { error: ulErr } = await supabase.storage
          .from("user-library")
          .upload(libDestKey, fileData, {
            contentType: resultType === "video" ? "video/mp4" : "image/png",
            upsert: true,
          });
        if (!ulErr) {
          persistentPath = `user-library/${libDestKey}`;
          await supabase.from("user_library").insert({
            user_id: job.user_id,
            asset_type: resultType,
            storage_path: libDestKey,
            file_size_bytes: fileSizeBytes,
            mime_type: resultType === "video" ? "video/mp4" : "image/png",
            original_prompt: job.original_prompt,
            model_used: modelKey,
            generation_seed: generationSeed,
            tags: ["scene", "roleplay"],
            roleplay_metadata: {
              type: "roleplay_scene",
              scene_id: job.metadata.scene_id,
              character_id: job.metadata.character_id,
              character_name: job.metadata.character_name,
              conversation_id: job.metadata.conversation_id,
            },
            content_category: "scene",
          });
          console.log("✅ Scene saved to library via webhook");
        }
      }
    } catch (error) {
      console.error("❌ Error copying scene to library via webhook:", error);
    }

    await supabase.from("character_scenes")
      .update({ image_url: persistentPath, updated_at: new Date().toISOString() })
      .eq("id", job.metadata.scene_id);

    console.log("✅ Scene updated via webhook:", job.metadata.scene_id);
  }
}
