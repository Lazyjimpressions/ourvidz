#!/usr/bin/env tsx
/**
 * Verification script for roleplay models configuration
 * Checks that all required models are properly configured in Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables - try multiple sources
// Default to production Supabase URL if not set
const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    'https://ulmdmzhcdwfadbvfpckt.supabase.co';
                    
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 
                    process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
  console.error('Add it to your .env file or export it in your shell');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ModelCheck {
  modality: 'roleplay' | 'image';
  required: boolean;
  minCount: number;
}

const checks: ModelCheck[] = [
  { modality: 'roleplay', required: true, minCount: 1 },
  { modality: 'image', required: true, minCount: 1 }
];

async function verifyModels() {
  console.log('🔍 Verifying roleplay models configuration...\n');

  let allPassed = true;

  for (const check of checks) {
    console.log(`📋 Checking ${check.modality} models...`);
    
    const { data: models, error } = await supabase
      .from('api_models')
      .select(`
        id,
        model_key,
        display_name,
        modality,
        task,
        is_active,
        is_default,
        priority,
        api_providers!inner(name, display_name, is_active)
      `)
      .eq('modality', check.modality)
      .eq('is_active', true);

    if (error) {
      console.error(`  ❌ Error querying ${check.modality} models:`, error.message);
      allPassed = false;
      continue;
    }

    const activeModels = models || [];
    const activeCount = activeModels.length;

    console.log(`  ✅ Found ${activeCount} active ${check.modality} model(s)`);

    if (check.required && activeCount < check.minCount) {
      console.error(`  ❌ Required minimum ${check.minCount} active ${check.modality} model(s), found ${activeCount}`);
      allPassed = false;
    }

    if (activeCount > 0) {
      console.log(`  📝 Active ${check.modality} models:`);
      activeModels.forEach((model: any) => {
        const provider = model.api_providers;
        const defaultBadge = model.is_default ? ' [DEFAULT]' : '';
        const priorityBadge = model.priority > 0 ? ` [Priority: ${model.priority}]` : '';
        console.log(`    - ${model.display_name} (${provider.display_name})${defaultBadge}${priorityBadge}`);
        console.log(`      Key: ${model.model_key}`);
      });
    }

    // Check for default model
    const defaultModel = activeModels.find((m: any) => m.is_default === true);
    if (activeCount > 0 && !defaultModel) {
      console.warn(`  ⚠️  No default model set for ${check.modality} (recommended)`);
    }

    // Check provider status
    const providers = new Set(activeModels.map((m: any) => m.api_providers.name));
    providers.forEach(providerName => {
      const providerModels = activeModels.filter((m: any) => m.api_providers.name === providerName);
      const provider = providerModels[0].api_providers;
      if (!provider.is_active) {
        console.warn(`  ⚠️  Provider "${provider.display_name}" is inactive but has active models`);
      }
    });

    console.log('');
  }

  // Check for local model configuration
  console.log('🔍 Checking local model configuration...');
  const { data: config, error: configError } = await supabase
    .from('system_config')
    .select('config')
    .eq('id', 1)
    .single();

  if (configError) {
    console.warn('  ⚠️  Could not check system config:', configError.message);
  } else {
    const workerHealth = config?.config?.workerHealthCache || {};
    const chatWorkerHealthy = workerHealth.chatWorker?.isHealthy === true;
    const sdxlWorkerHealthy = workerHealth.wanWorker?.isHealthy === true;

    console.log(`  Chat Worker: ${chatWorkerHealthy ? '✅ Healthy' : '❌ Unhealthy/Unavailable'}`);
    console.log(`  SDXL Worker: ${sdxlWorkerHealthy ? '✅ Healthy' : '❌ Unhealthy/Unavailable'}`);
    
    if (!chatWorkerHealthy && !sdxlWorkerHealthy) {
      console.log('  ℹ️  Local models will not be available in UI');
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ All model checks passed!');
    console.log('✅ Production ready');
  } else {
    console.log('❌ Some checks failed. Please review the output above.');
    process.exit(1);
  }
}

verifyModels().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});

