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
            balanceData = await syncFalBalance(provider, supabase);
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
          const displayValue = balanceData.balanceUsd !== null 
            ? `$${balanceData.balanceUsd.toFixed(2)} balance`
            : balanceData.metadata?.total_spend_usd !== undefined
              ? `$${balanceData.metadata.total_spend_usd.toFixed(2)} spent`
              : 'N/A';
          console.log(`✅ Synced ${provider.name}: ${displayValue}`);
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
 * Sync fal.ai usage/spend data
 * fal.ai is pay-as-you-go, so we track total spend instead of balance
 * Uses the Usage API: https://api.fal.ai/v1/models/usage
 */
async function syncFalBalance(provider: any, supabase: any): Promise<BalanceData> {
  const apiKey = Deno.env.get(provider.secret_name || 'FAL_KEY');
  if (!apiKey) {
    throw new Error(`API key not found for secret: ${provider.secret_name}`);
  }

  // First, try the fal.ai Usage API for spend tracking
  try {
    const response = await fetch('https://api.fal.ai/v1/models/usage?timezone=UTC&bound_to_timeframe=false', {
      headers: { 
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Sum all costs from time_series
      let totalSpend = 0;
      const usageByModel: Record<string, { cost: number; count: number }> = {};
      
      for (const bucket of data.time_series || []) {
        for (const result of bucket.results || []) {
          const cost = result.cost || 0;
          totalSpend += cost;
          
          const endpointId = result.endpoint_id || 'unknown';
          if (!usageByModel[endpointId]) {
            usageByModel[endpointId] = { cost: 0, count: 0 };
          }
          usageByModel[endpointId].cost += cost;
          usageByModel[endpointId].count += result.quantity || 1;
        }
      }

      console.log(`✅ fal.ai Usage API: Total spend $${totalSpend.toFixed(2)}`);

      return {
        balanceUsd: null, // fal.ai doesn't have prepaid balance
        balanceCredits: null,
        metadata: {
          total_spend_usd: totalSpend,
          usage_by_model: usageByModel,
          data_source: 'usage_api',
          note: 'Pay-as-you-go billing - showing total spend from Usage API'
        }
      };
    } else if (response.status === 401 || response.status === 403) {
      console.warn('⚠️ fal.ai Usage API requires admin permissions, falling back to database');
    } else {
      console.warn(`⚠️ fal.ai Usage API returned ${response.status}, falling back to database`);
    }
  } catch (usageError) {
    console.warn('⚠️ fal.ai Usage API failed:', usageError);
  }

  // Fallback: Calculate total spend from our database logs
  try {
    const { data: logs, error: logsError } = await supabase
      .from('api_usage_logs')
      .select('cost_usd, created_at')
      .eq('provider_id', provider.id)
      .not('cost_usd', 'is', null);

    if (logsError) {
      throw logsError;
    }

    const totalSpend = logs?.reduce((sum: number, log: any) => sum + (log.cost_usd || 0), 0) || 0;
    const requestCount = logs?.length || 0;

    console.log(`✅ fal.ai spend from database: $${totalSpend.toFixed(2)} (${requestCount} requests)`);

    return {
      balanceUsd: null, // fal.ai doesn't have prepaid balance
      balanceCredits: null,
      metadata: {
        total_spend_usd: totalSpend,
        request_count: requestCount,
        data_source: 'database_logs',
        note: 'Pay-as-you-go billing - showing total spend from logged API calls'
      }
    };
  } catch (dbError) {
    console.error('❌ Failed to calculate fal.ai spend from database:', dbError);
    return {
      balanceUsd: null,
      balanceCredits: null,
      metadata: {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        note: 'Unable to retrieve fal.ai usage data'
      }
    };
  }
}
