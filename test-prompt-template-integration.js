#!/usr/bin/env node

/**
 * Test Prompt Template Integration
 * 
 * This script tests the complete flow from frontend to edge function
 * to verify that prompt templates are being used correctly.
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

async function testPromptTemplateIntegration() {
  console.log('🧪 Testing Prompt Template Integration...\n');

  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Test 1: Check if prompt templates exist
    console.log('📝 Test 1: Checking prompt templates...');
    const { data: templates, error: templateError } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('use_case', 'character_roleplay')
      .eq('content_mode', 'nsfw')
      .eq('is_active', true);

    if (templateError) {
      console.error('❌ Failed to fetch templates:', templateError);
      return;
    }

    if (!templates || templates.length === 0) {
      console.error('❌ No prompt templates found for character_roleplay + nsfw');
      return;
    }

    console.log(`✅ Found ${templates.length} prompt template(s):`);
    templates.forEach(template => {
      console.log(`   - ${template.template_name} (ID: ${template.id})`);
      console.log(`     Use case: ${template.use_case}`);
      console.log(`     Content mode: ${template.content_mode}`);
      console.log(`     Token limit: ${template.token_limit}`);
      console.log(`     System prompt preview: ${template.system_prompt.substring(0, 100)}...`);
    });

    // Test 2: Check if characters have voice data
    console.log('\n🎭 Test 2: Checking character voice data...');
    const { data: characters, error: characterError } = await supabase
      .from('characters')
      .select('id, name, voice_examples, forbidden_phrases, scene_behavior_rules')
      .limit(5);

    if (characterError) {
      console.error('❌ Failed to fetch characters:', characterError);
      return;
    }

    console.log(`✅ Found ${characters.length} character(s):`);
    characters.forEach(char => {
      console.log(`   - ${char.name} (ID: ${char.id})`);
      console.log(`     Voice examples: ${char.voice_examples?.length || 0}`);
      console.log(`     Forbidden phrases: ${char.forbidden_phrases?.length || 0}`);
      console.log(`     Scene behavior rules: ${char.scene_behavior_rules ? 'Yes' : 'No'}`);
    });

    // Test 3: Check if character scenes have enhanced data
    console.log('\n🎬 Test 3: Checking character scenes...');
    const { data: scenes, error: sceneError } = await supabase
      .from('character_scenes')
      .select('id, character_id, scene_name, scene_rules, scene_starters, priority, is_active')
      .limit(5);

    if (sceneError) {
      console.error('❌ Failed to fetch scenes:', sceneError);
      return;
    }

    console.log(`✅ Found ${scenes.length} scene(s):`);
    scenes.forEach(scene => {
      console.log(`   - Scene ID: ${scene.id} (Character: ${scene.character_id})`);
      console.log(`     Name: ${scene.scene_name || 'Unnamed'}`);
      console.log(`     Rules: ${scene.scene_rules ? 'Yes' : 'No'}`);
      console.log(`     Starters: ${scene.scene_starters?.length || 0}`);
      console.log(`     Priority: ${scene.priority || 'Not set'}`);
      console.log(`     Active: ${scene.is_active ? 'Yes' : 'No'}`);
    });

    // Test 4: Simulate frontend template loading
    console.log('\n🖥️ Test 4: Simulating frontend template loading...');
    const testContentTier = 'nsfw';
    const { data: frontendTemplate, error: frontendError } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('use_case', 'character_roleplay')
      .eq('content_mode', testContentTier)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (frontendError) {
      console.error('❌ Frontend template loading failed:', frontendError);
    } else {
      console.log(`✅ Frontend template loading successful:`);
      console.log(`   Template: ${frontendTemplate.template_name}`);
      console.log(`   ID: ${frontendTemplate.id}`);
      console.log(`   Placeholders found: ${(frontendTemplate.system_prompt.match(/\{\{[^}]+\}\}/g) || []).length}`);
    }

    // Test 5: Check template placeholder variables
    if (frontendTemplate) {
      console.log('\n🔍 Test 5: Analyzing template placeholders...');
      const placeholders = frontendTemplate.system_prompt.match(/\{\{[^}]+\}\}/g) || [];
      const uniquePlaceholders = [...new Set(placeholders)];
      
      console.log(`Found ${uniquePlaceholders.length} unique placeholders:`);
      uniquePlaceholders.forEach(placeholder => {
        console.log(`   - ${placeholder}`);
      });

      // Check if placeholders match expected character fields
      const expectedPlaceholders = [
        '{{character_name}}',
        '{{character_description}}',
        '{{character_personality}}',
        '{{character_background}}',
        '{{character_speaking_style}}',
        '{{character_goals}}',
        '{{character_quirks}}',
        '{{character_relationships}}',
        '{{voice_tone}}',
        '{{mood}}',
        '{{character_visual_description}}',
        '{{scene_context}}'
      ];

      const missingPlaceholders = expectedPlaceholders.filter(p => !uniquePlaceholders.includes(p));
      if (missingPlaceholders.length > 0) {
        console.log(`⚠️ Missing expected placeholders: ${missingPlaceholders.join(', ')}`);
      } else {
        console.log('✅ All expected placeholders are present');
      }
    }

    console.log('\n🎉 Prompt Template Integration Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`   - Templates: ${templates.length} found`);
    console.log(`   - Characters with voice data: ${characters.filter(c => c.voice_examples?.length > 0).length}`);
    console.log(`   - Scenes with enhanced data: ${scenes.filter(s => s.scene_rules || s.scene_starters?.length > 0).length}`);
    console.log(`   - Frontend template loading: ${frontendTemplate ? '✅ Working' : '❌ Failed'}`);

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
if (require.main === module) {
  testPromptTemplateIntegration();
}

module.exports = { testPromptTemplateIntegration };
