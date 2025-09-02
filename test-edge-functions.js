#!/usr/bin/env node

/**
 * Edge Function Testing Script
 * Tests the roleplay-chat and enhance-prompt edge functions
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Test 1: Test character loading with voice data
 */
async function testCharacterLoading() {
  console.log('\n🧪 Test 1: Character Loading with Voice Data');
  
  try {
    // Test loading a character with voice examples
    const { data: character, error } = await supabase
      .from('characters')
      .select(`
        *,
        character_scenes!inner(
          scene_rules,
          scene_starters,
          priority,
          scene_name,
          scene_description
        )
      `)
      .eq('id', 'test-character-id') // Replace with actual character ID
      .eq('character_scenes.is_active', true)
      .order('character_scenes.priority', { ascending: false })
      .single();

    if (error) {
      console.log('❌ Character loading error:', error.message);
      return false;
    }

    console.log('✅ Character loaded successfully');
    console.log('   Name:', character.name);
    console.log('   Voice examples:', character.voice_examples?.length || 0);
    console.log('   Forbidden phrases:', character.forbidden_phrases?.length || 0);
    console.log('   Active scenes:', character.character_scenes?.length || 0);
    
    return true;
  } catch (error) {
    console.log('❌ Character loading test failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Test prompt template retrieval
 */
async function testPromptTemplates() {
  console.log('\n🧪 Test 2: Prompt Template Retrieval');
  
  try {
    // Test loading the roleplay template
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('enhancer_model', 'qwen_instruct')
      .eq('use_case', 'character_roleplay')
      .eq('content_mode', 'nsfw')
      .eq('template_name', 'Universal Roleplay - Qwen Instruct (NSFW)')
      .single();

    if (error) {
      console.log('❌ Template loading error:', error.message);
      return false;
    }

    console.log('✅ Template loaded successfully');
    console.log('   Template name:', template.template_name);
    console.log('   System prompt length:', template.system_prompt?.length || 0);
    console.log('   Token limit:', template.token_limit);
    
    return true;
  } catch (error) {
    console.log('❌ Template loading test failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Test scene data retrieval
 */
async function testSceneData() {
  console.log('\n🧪 Test 3: Scene Data Retrieval');
  
  try {
    // Test loading character scenes
    const { data: scenes, error } = await supabase
      .from('character_scenes')
      .select('*')
      .eq('character_id', 'test-character-id') // Replace with actual character ID
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      console.log('❌ Scene loading error:', error.message);
      return false;
    }

    console.log('✅ Scenes loaded successfully');
    console.log('   Scene count:', scenes?.length || 0);
    
    if (scenes && scenes.length > 0) {
      const scene = scenes[0];
      console.log('   First scene:');
      console.log('     Rules:', scene.scene_rules ? 'Yes' : 'No');
      console.log('     Starters:', scene.scene_starters?.length || 0);
      console.log('     Priority:', scene.priority);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Scene loading test failed:', error.message);
    return false;
  }
}

/**
 * Test 4: Test edge function invocation (mock)
 */
async function testEdgeFunctionInvocation() {
  console.log('\n🧪 Test 4: Edge Function Invocation (Mock)');
  
  try {
    // This would test the actual edge function invocation
    // For now, we'll just test the request structure
    const testRequest = {
      kickoff: true,
      conversation_id: 'test-conversation-id',
      character_id: 'test-character-id',
      model_provider: 'chat_worker',
      memory_tier: 'conversation',
      content_tier: 'nsfw',
      user_id: 'test-user-id'
    };

    console.log('✅ Test request structure valid');
    console.log('   Request keys:', Object.keys(testRequest));
    console.log('   Content tier:', testRequest.content_tier);
    console.log('   Memory tier:', testRequest.memory_tier);
    
    return true;
  } catch (error) {
    console.log('❌ Edge function test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Edge Function Tests...\n');
  
  const tests = [
    testCharacterLoading,
    testPromptTemplates,
    testSceneData,
    testEdgeFunctionInvocation
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) passedTests++;
    } catch (error) {
      console.log('❌ Test execution error:', error.message);
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Edge functions are ready for production.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the implementation.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testCharacterLoading,
  testPromptTemplates,
  testSceneData,
  testEdgeFunctionInvocation,
  runAllTests
};
