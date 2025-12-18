#!/usr/bin/env tsx
/**
 * Test 1: Character Selection & Navigation
 * Tests direct character selection, scene selection, and character info drawer
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    'https://ulmdmzhcdwfadbvfpckt.supabase.co';
// Use PUBLISHABLE_KEY if ANON_KEY not available (they're the same)
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 
                    process.env.SUPABASE_ANON_KEY ||
                    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_CHARACTER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_SCENE_ID = '00000000-0000-0000-0000-000000000002';

interface TestResult {
  testId: string;
  testName: string;
  passed: boolean;
  errors: string[];
  databaseChecks: Record<string, any>;
  verificationPoints: Record<string, any>;
}

const results: TestResult[] = [];

// Test 1.1: Direct Character Selection
async function testDirectCharacterSelection(): Promise<TestResult> {
  const testId = '1.1';
  const testName = 'Direct Character Selection';
  const errors: string[] = [];
  const databaseChecks: Record<string, any> = {};
  const verificationPoints: Record<string, any> = {};

  console.log(`\n🧪 Test ${testId}: ${testName}`);
  console.log('='.repeat(60));

  try {
    // Database Check: Load character data
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', TEST_CHARACTER_ID)
      .single();

    if (charError) {
      errors.push(`Character load failed: ${charError.message}`);
      databaseChecks.characterLoaded = false;
    } else {
      databaseChecks.characterLoaded = true;
      databaseChecks.characterData = {
        name: character.name,
        description: character.description,
        hasTraits: !!character.traits,
        hasPersona: !!character.persona,
        hasVoiceExamples: Array.isArray(character.voice_examples) && character.voice_examples.length > 0,
        hasForbiddenPhrases: Array.isArray(character.forbidden_phrases) && character.forbidden_phrases.length > 0
      };
    }

    // Database Check: Auto-select scene by priority
    const { data: scenes, error: scenesError } = await supabase
      .from('character_scenes')
      .select('*')
      .eq('character_id', TEST_CHARACTER_ID)
      .order('priority', { ascending: false, nullsFirst: false })
      .limit(1);

    if (scenesError) {
      errors.push(`Scene load failed: ${scenesError.message}`);
      databaseChecks.sceneAutoSelected = false;
    } else if (scenes && scenes.length > 0) {
      databaseChecks.sceneAutoSelected = true;
      databaseChecks.autoSelectedScene = {
        id: scenes[0].id,
        priority: scenes[0].priority,
        hasSystemPrompt: !!scenes[0].system_prompt,
        hasSceneRules: !!scenes[0].scene_rules
      };
    } else {
      databaseChecks.sceneAutoSelected = false;
      databaseChecks.autoSelectedScene = null;
    }

    // Database Check: Check for existing conversation
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('character_id', TEST_CHARACTER_ID)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (convError) {
      errors.push(`Conversation query failed: ${convError.message}`);
    } else {
      databaseChecks.existingConversation = conversations && conversations.length > 0;
      if (conversations && conversations.length > 0) {
        databaseChecks.conversationData = {
          id: conversations[0].id,
          memory_tier: conversations[0].memory_tier,
          conversation_type: conversations[0].conversation_type
        };
      }
    }

    // Verification Points
    verificationPoints.characterImageUrl = character?.image_url || null;
    verificationPoints.characterName = character?.name || null;
    verificationPoints.sceneContextAvailable = databaseChecks.sceneAutoSelected;

    const passed = errors.length === 0 && databaseChecks.characterLoaded;

    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    return { testId, testName, passed, errors, databaseChecks, verificationPoints };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return { testId, testName, passed: false, errors, databaseChecks, verificationPoints };
  }
}

// Test 1.2: Character Selection with Scene
async function testCharacterSelectionWithScene(): Promise<TestResult> {
  const testId = '1.2';
  const testName = 'Character Selection with Scene';
  const errors: string[] = [];
  const databaseChecks: Record<string, any> = {};
  const verificationPoints: Record<string, any> = {};

  console.log(`\n🧪 Test ${testId}: ${testName}`);
  console.log('='.repeat(60));

  try {
    // Database Check: Load specific scene by ID
    const { data: scene, error: sceneError } = await supabase
      .from('character_scenes')
      .select('*')
      .eq('id', TEST_SCENE_ID)
      .eq('character_id', TEST_CHARACTER_ID)
      .single();

    if (sceneError) {
      errors.push(`Scene load failed: ${sceneError.message}`);
      databaseChecks.sceneLoaded = false;
    } else {
      databaseChecks.sceneLoaded = true;
      databaseChecks.sceneData = {
        id: scene.id,
        scene_name: scene.scene_name,
        hasSystemPrompt: !!scene.system_prompt,
        hasSceneRules: !!scene.scene_rules,
        hasSceneStarters: Array.isArray(scene.scene_starters) && scene.scene_starters.length > 0,
        priority: scene.priority
      };
    }

    // Verification Points
    verificationPoints.sceneSystemPrompt = scene?.system_prompt || null;
    verificationPoints.sceneContextApplied = databaseChecks.sceneLoaded && !!scene?.system_prompt;

    const passed = errors.length === 0 && databaseChecks.sceneLoaded;

    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    return { testId, testName, passed, errors, databaseChecks, verificationPoints };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return { testId, testName, passed: false, errors, databaseChecks, verificationPoints };
  }
}

// Test 1.3: Character Info Drawer
async function testCharacterInfoDrawer(): Promise<TestResult> {
  const testId = '1.3';
  const testName = 'Character Info Drawer';
  const errors: string[] = [];
  const databaseChecks: Record<string, any> = {};
  const verificationPoints: Record<string, any> = {};

  console.log(`\n🧪 Test ${testId}: ${testName}`);
  console.log('='.repeat(60));

  try {
    // Database Check: Load all scenes for character
    const { data: scenes, error: scenesError } = await supabase
      .from('character_scenes')
      .select('*')
      .eq('character_id', TEST_CHARACTER_ID)
      .order('priority', { ascending: false, nullsFirst: false });

    if (scenesError) {
      errors.push(`Scenes load failed: ${scenesError.message}`);
      databaseChecks.scenesLoaded = false;
    } else {
      databaseChecks.scenesLoaded = true;
      databaseChecks.scenesCount = scenes?.length || 0;
      databaseChecks.scenesData = scenes?.map(s => ({
        id: s.id,
        scene_name: s.scene_name,
        priority: s.priority,
        hasSystemPrompt: !!s.system_prompt
      })) || [];
    }

    // Verification Points
    verificationPoints.allScenesAvailable = databaseChecks.scenesLoaded;
    verificationPoints.sceneSelectionPossible = (databaseChecks.scenesCount || 0) > 0;

    const passed = errors.length === 0 && databaseChecks.scenesLoaded;

    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    return { testId, testName, passed, errors, databaseChecks, verificationPoints };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return { testId, testName, passed: false, errors, databaseChecks, verificationPoints };
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Character Selection & Navigation Tests');
  console.log('='.repeat(60));

  results.push(await testDirectCharacterSelection());
  results.push(await testCharacterSelectionWithScene());
  results.push(await testCharacterInfoDrawer());

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} Test ${result.testId}: ${result.testName}`);
    if (!result.passed && result.errors.length > 0) {
      result.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
  });

  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

