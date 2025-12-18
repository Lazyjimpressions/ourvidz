import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const envPath = join(process.cwd(), '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        const value = values.join('=').trim().replace(/^["']|["']$/g, ''); // Remove quotes
        process.env[key.trim()] = value;
      }
    }
  });
} catch (e) {
  console.warn('Could not load .env file');
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)?.replace(/^["']|["']$/g, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/^["']|["']$/g, '');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRoleplayConfig() {
  console.log('🔍 Verifying Roleplay API Configuration...\n');

  // 1. Check API Providers
  console.log('1️⃣ Checking API Providers...');
  const { data: providers, error: providerError } = await supabase
    .from('api_providers')
    .select('id, name, secret_name, is_active')
    .in('name', ['openrouter', 'replicate']);

  if (providerError) {
    console.error('❌ Error fetching providers:', providerError);
    return;
  }

  console.log('   Providers found:');
  providers?.forEach(p => {
    console.log(`   - ${p.name}: secret_name="${p.secret_name}", active=${p.is_active}`);
  });

  // 2. Check Roleplay Models (OpenRouter)
  console.log('\n2️⃣ Checking Roleplay Models (OpenRouter)...');
  const { data: roleplayModels, error: roleplayError } = await supabase
    .from('api_models')
    .select(`
      id,
      model_key,
      display_name,
      modality,
      is_active,
      is_default,
      priority,
      api_providers!inner(name, secret_name)
    `)
    .eq('modality', 'roleplay')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (roleplayError) {
    console.error('❌ Error fetching roleplay models:', roleplayError);
  } else {
    console.log(`   Found ${roleplayModels?.length || 0} active roleplay models:`);
    roleplayModels?.forEach(m => {
      console.log(`   - ${m.model_key} (${m.display_name})`);
      console.log(`     Provider: ${(m.api_providers as any).name}, Secret: ${(m.api_providers as any).secret_name}`);
      console.log(`     Default: ${m.is_default}, Priority: ${m.priority}`);
    });
  }

  // 3. Check Image Models (Replicate)
  console.log('\n3️⃣ Checking Image Models (Replicate)...');
  const { data: imageModels, error: imageError } = await supabase
    .from('api_models')
    .select(`
      id,
      model_key,
      display_name,
      modality,
      version,
      is_active,
      is_default,
      priority,
      api_providers!inner(name, secret_name)
    `)
    .eq('modality', 'image')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (imageError) {
    console.error('❌ Error fetching image models:', imageError);
  } else {
    console.log(`   Found ${imageModels?.length || 0} active image models:`);
    imageModels?.forEach(m => {
      const provider = (m.api_providers as any);
      console.log(`   - ${m.model_key} (${m.display_name})`);
      console.log(`     ID: ${m.id}`);
      console.log(`     Provider: ${provider.name}, Secret: ${provider.secret_name}`);
      console.log(`     Version: ${m.version || 'MISSING'}`);
      console.log(`     Default: ${m.is_default}, Priority: ${m.priority}`);
    });
  }

  // 4. Check for common issues
  console.log('\n4️⃣ Checking for Configuration Issues...');
  const issues: string[] = [];

  // Check if OpenRouter provider has correct secret name
  const openRouterProvider = providers?.find(p => p.name === 'openrouter');
  if (openRouterProvider) {
    if (openRouterProvider.secret_name !== 'OpenRouter_Roleplay_API_KEY') {
      issues.push(`⚠️  OpenRouter provider secret_name is "${openRouterProvider.secret_name}", expected "OpenRouter_Roleplay_API_KEY"`);
    }
    if (!openRouterProvider.is_active) {
      issues.push(`⚠️  OpenRouter provider is not active`);
    }
  } else {
    issues.push('❌ OpenRouter provider not found');
  }

  // Check if Replicate provider has correct secret name
  const replicateProvider = providers?.find(p => p.name === 'replicate');
  if (replicateProvider) {
    if (replicateProvider.secret_name !== 'REPLICATE_API_TOKEN') {
      issues.push(`⚠️  Replicate provider secret_name is "${replicateProvider.secret_name}", expected "REPLICATE_API_TOKEN"`);
    }
    if (!replicateProvider.is_active) {
      issues.push(`⚠️  Replicate provider is not active`);
    }
  } else {
    issues.push('❌ Replicate provider not found');
  }

  // Check if there are any roleplay models
  if (!roleplayModels || roleplayModels.length === 0) {
    issues.push('❌ No active roleplay models found');
  }

  // Check if there are any image models
  if (!imageModels || imageModels.length === 0) {
    issues.push('❌ No active image models found');
  }

  // Check if image models have version (required for Replicate)
  imageModels?.forEach(m => {
    if (!m.version) {
      issues.push(`⚠️  Image model "${m.model_key}" (${m.id}) is missing version field (required for Replicate)`);
    }
  });

  if (issues.length > 0) {
    console.log('   Issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('   ✅ No configuration issues found');
  }

  // 5. Summary
  console.log('\n📊 Summary:');
  console.log(`   - API Providers: ${providers?.length || 0}`);
  console.log(`   - Active Roleplay Models: ${roleplayModels?.length || 0}`);
  console.log(`   - Active Image Models: ${imageModels?.length || 0}`);
  console.log(`   - Configuration Issues: ${issues.length}`);
}

verifyRoleplayConfig().catch(console.error);

