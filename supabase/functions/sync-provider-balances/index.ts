import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BalanceData {
  balanceUsd: number | null;
  balanceCredits: number | null;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active providers
    const { data: providers, error: providersError } = await supabase
      .from('api_providers')
      .select('*')
      .eq('is_active', true);

    if (providersError) {
      console.error('❌ Failed to fetch providers:', providersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch providers', details: providersError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!providers || providers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active providers found', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results: Array<{ provider: string; status: string; error?: string }> = [];

    // Sync each provider
    for (const provider of providers) {
      try {
        let balanceData: BalanceData = { balanceUsd: null, balanceCredits: null };

        switch (provider.name) {
          case 'openrouter':
            balanceData = await syncOpenRouterBalance(provider);
            break;
          case 'replicate':
            balanceData = await syncReplicateBalance(provider);
            break;
          case 'fal':
            balanceData = await syncFalBalance(provider);
            break;
          default:
            console.log(`⚠️ No sync function for provider: ${provider.name}`);
            results.push({ provider: provider.name, status: 'skipped' });
            continue;
        }

        // Update balance record
        const { error: updateError } = await supabase
          .from('api_provider_balances')
          .upsert({
            provider_id: provider.id,
            balance_usd: balanceData.balanceUsd,
            balance_credits: balanceData.balanceCredits,
            currency: 'USD',
            last_synced_at: new Date().toISOString(),
            sync_method: 'api',
            sync_status: 'success',
            sync_error: null,
            balance_metadata: balanceData.metadata || {}
          }, {
            onConflict: 'provider_id'
          });

        if (updateError) {
          console.error(`❌ Failed to update balance for ${provider.name}:`, updateError);
          results.push({ 
            provider: provider.name, 
            status: 'failed', 
            error: updateError.message 
          });
        } else {
          console.log(`✅ Synced balance for ${provider.name}: $${balanceData.balanceUsd || 0}`);
          results.push({ provider: provider.name, status: 'success' });
        }

      } catch (error) {
        console.error(`❌ Failed to sync ${provider.name}:`, error);
        
        // Update with error status
        await supabase
          .from('api_provider_balances')
          .upsert({
            provider_id: provider.id,
            sync_status: 'failed',
            sync_error: error instanceof Error ? error.message : String(error),
            last_synced_at: new Date().toISOString()
          }, {
            onConflict: 'provider_id'
          });

        results.push({ 
          provider: provider.name, 
          status: 'failed', 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return new Response(
      JSON.stringify({
        success: true,
        synced: successCount,
        failed: failedCount,
        total: providers.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error in sync-provider-balances:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Sync OpenRouter balance
 */
async function syncOpenRouterBalance(provider: any): Promise<BalanceData> {
  const apiKey = Deno.env.get(provider.secret_name || 'OpenRouter_Roleplay_API_KEY');
  if (!apiKey) {
    throw new Error(`API key not found for secret: ${provider.secret_name}`);
  }

  const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  
  // OpenRouter returns credits in data.data.credits
  const credits = data.data?.credits || 0;
  
  return {
    balanceUsd: credits, // OpenRouter uses credits as USD equivalent
    balanceCredits: credits,
    metadata: {
      key_name: data.data?.name,
      created_at: data.data?.created_at,
      limit: data.data?.limit
    }
  };
}

/**
 * Sync Replicate balance
 */
async function syncReplicateBalance(provider: any): Promise<BalanceData> {
  const apiKey = Deno.env.get(provider.secret_name || 'REPLICATE_API_TOKEN');
  if (!apiKey) {
    throw new Error(`API key not found for secret: ${provider.secret_name}`);
  }

  const response = await fetch('https://api.replicate.com/v1/account', {
    headers: { 'Authorization': `Token ${apiKey}` }
  });

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  
  return {
    balanceUsd: data.balance || 0,
    balanceCredits: null,
    metadata: {
      username: data.username,
      email: data.email,
      type: data.type
    }
  };
}

/**
 * Sync fal.ai balance
 * Note: fal.ai may not have a direct balance endpoint - this is a placeholder
 */
async function syncFalBalance(provider: any): Promise<BalanceData> {
  const apiKey = Deno.env.get(provider.secret_name || 'FAL_KEY');
  if (!apiKey) {
    throw new Error(`API key not found for secret: ${provider.secret_name}`);
  }

  // Try fal.ai balance endpoint (may need to verify actual endpoint)
  try {
    const response = await fetch('https://fal.ai/api/v1/account/balance', {
      headers: { 'Authorization': `Key ${apiKey}` }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        balanceUsd: data.balance || 0,
        balanceCredits: null,
        metadata: data
      };
    } else if (response.status === 404) {
      // Balance endpoint may not exist - return null
      console.log('⚠️ fal.ai balance endpoint not found, returning null');
      return {
        balanceUsd: null,
        balanceCredits: null,
        metadata: { note: 'Balance endpoint not available' }
      };
    } else {
      throw new Error(`fal.ai API error: ${response.status} - ${await response.text()}`);
    }
  } catch (error) {
    // If endpoint doesn't exist or fails, return null balance
    console.warn('⚠️ fal.ai balance sync failed:', error);
    return {
      balanceUsd: null,
      balanceCredits: null,
      metadata: { 
        error: error instanceof Error ? error.message : String(error),
        note: 'Balance sync not available for fal.ai'
      }
    };
  }
}
