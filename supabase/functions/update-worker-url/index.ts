import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const body = await req.json();
    
    // ✅ FIXED: Accept the parameter names that WAN worker actually sends
    const { 
      worker_url, 
      auto_registered, 
      registration_method, 
      detection_method,
      timestamp 
    } = body;
    
    console.log('🌐 Worker URL registration request received:', {
      worker_url,
      auto_registered,
      registration_method,
      detection_method,
      timestamp,
      received_at: new Date().toISOString()
    });

    if (!worker_url) {
      console.error('❌ Missing worker_url in request');
      return new Response(JSON.stringify({
        error: 'worker_url is required',
        success: false
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Validate URL format
    try {
      new URL(worker_url);
    } catch {
      console.error('❌ Invalid worker_url format:', worker_url);
      return new Response(JSON.stringify({
        error: 'Invalid URL format',
        success: false
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    console.log('🔧 Updating worker URL:', worker_url);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test worker connection before updating
    console.log('🔍 Testing worker connection...');
    try {
      const testResponse = await fetch(`${worker_url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!testResponse.ok) {
        throw new Error(`Worker health check failed: ${testResponse.status}`);
      }
      
      console.log('✅ Worker connection test successful');
    } catch (error) {
      console.warn('⚠️ Worker connection test failed:', error.message);
      return new Response(JSON.stringify({
        error: 'Worker URL is not responding',
        success: false,
        details: error.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // ✅ FIXED: Better handling of system_config table
    // Try to get current config, but handle case where table/row doesn't exist
    let currentConfig = {};
    
    try {
      const { data, error: fetchError } = await supabase
        .from('system_config')
        .select('config')
        .single();
        
      if (data && !fetchError) {
        currentConfig = data.config || {};
      } else if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's OK, we'll create it
        console.warn('⚠️ Error fetching system config (will create new):', fetchError);
      }
    } catch (error) {
      console.warn('⚠️ System config table access error (will create new):', error);
    }

    // Update worker URL in config with auto-registration metadata
    const updatedConfig = {
      ...currentConfig,
      workerUrl: worker_url,  // Store with both naming conventions for compatibility
      worker_url: worker_url, // Match what WAN worker sends
      workerUrlUpdatedAt: new Date().toISOString(),
      autoRegistered: auto_registered || false,
      auto_registered: auto_registered || false, // Match what WAN worker sends
      registrationMethod: registration_method || 'manual',
      registration_method: registration_method || 'manual', // Match what WAN worker sends
      detectionMethod: detection_method || 'manual',
      detection_method: detection_method || 'manual', // Match what WAN worker sends
      lastRegistrationAttempt: new Date().toISOString(),
      last_health_check: new Date().toISOString(),
      worker_status: 'active'
    };

    console.log('💾 Updating system config with:', {
      worker_url,
      auto_registered,
      registration_method,
      detection_method
    });

    // ✅ FIXED: Use upsert to handle both insert and update cases
    const { error: updateError } = await supabase
      .from('system_config')
      .upsert({
        config: updatedConfig,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'  // Assuming there's a unique constraint or primary key
      });

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      throw updateError;
    }

    const logMessage = auto_registered 
      ? `✅ Worker URL auto-registered successfully via ${registration_method}` 
      : '✅ Worker URL updated manually';
    
    console.log(logMessage);
    console.log('🎯 Registration complete:', {
      worker_url,
      auto_registered,
      registration_method,
      detection_method,
      timestamp: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      message: auto_registered 
        ? 'Worker URL auto-registered successfully' 
        : 'Worker URL updated successfully',
      worker_url: worker_url,  // Return the same parameter name format
      updatedAt: new Date().toISOString(),
      auto_registered: auto_registered || false,
      registration_method: registration_method || 'manual',
      detection_method: detection_method || 'manual'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Update worker URL error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update worker URL',
      success: false,
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});