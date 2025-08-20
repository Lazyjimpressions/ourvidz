import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const body = await req.json()
    console.log('🔄 Replicate callback received:', { 
      id: body.id, 
      status: body.status,
      hasOutput: !!body.output
    })

    // Find job by external_id (prediction ID)
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('external_id', body.id)
      .single()

    if (jobError || !jobData) {
      console.error('❌ Job not found:', jobError)
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    const jobId = jobData.id
    console.log('✅ Job found:', jobId)

    if (body.status === 'succeeded' && body.output) {
      console.log('🎉 Generation completed successfully')
      
      // Download image from Replicate
      const imageUrl = Array.isArray(body.output) ? body.output[0] : body.output
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.statusText}`)
      }
      
      const imageBuffer = await imageResponse.arrayBuffer()
      const fileName = `replicate_${jobId}_${Date.now()}.png`
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('workspace-temp')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
          duplex: 'half'
        })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw new Error(`Failed to upload image: ${uploadError.message}`)
      }

      console.log('📁 Image uploaded:', fileName)

      // Get signed URL
      const { data: signedUrlData } = await supabase.storage
        .from('workspace-temp')
        .createSignedUrl(fileName, 86400) // 24 hours

      // Create workspace asset record
      const { error: assetError } = await supabase
        .from('workspace_assets')
        .insert({
          id: jobId, // Use job ID as asset ID
          user_id: jobData.user_id,
          type: 'image',
          file_path: fileName,
          bucket: 'workspace-temp',
          metadata: {
            ...jobData.metadata,
            original_url: imageUrl,
            model: 'realistic_vision_v51',
            provider: 'replicate'
          }
        })

      if (assetError) {
        console.error('❌ Asset creation error:', assetError)
      }

      // Update job status
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result_url: signedUrlData?.signedUrl,
          metadata: {
            ...jobData.metadata,
            file_path: fileName,
            signed_url: signedUrlData?.signedUrl
          }
        })
        .eq('id', jobId)

      console.log('✅ Job completed successfully')

    } else if (body.status === 'failed') {
      console.error('❌ Generation failed:', body.error)
      
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: body.error || 'Generation failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)

    } else {
      // Update status for other states (processing, etc.)
      await supabase
        .from('jobs')
        .update({
          metadata: {
            ...jobData.metadata,
            replicate_status: body.status
          }
        })
        .eq('id', jobId)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error("❌ Error in replicate-callback function:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})