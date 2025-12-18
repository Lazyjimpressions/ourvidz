#!/usr/bin/env tsx
/**
 * Test 3: System Prompt & Template Testing
 * Tests prompt template application, character data integration, scene system prompts
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
  verification: Record<string, any>;
  systemPromptSample?: string;
}

const results: TestResult[] = [];

// Test 3.1: Prompt Template Application
async function testPromptTemplateApplication(): Promise<TestResult> {
  const testId = '3.1';
  const testName = 'Prompt Template Application';
  const errors: string[] = [];
  const databaseChecks: Record<string, any> = {};
  const verification: Record<string, any> = {};

  console.log(`\n🧪 Test ${testId}: ${testName}`);
  console.log('='.repeat(60));

  try {
    // Load prompt template
    const { data: templates, error: templateError } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('use_case', 'character_roleplay')
      .eq('content_mode', 'nsfw')
      .eq('is_active', true)
      .limit(1);
    
    const template = templates && templates.length > 0 ? templates[0] : null;

    if (templateError) {
      errors.push(`Template load failed: ${templateError.message}`);
      databaseChecks.templateLoaded = false;
    } else if (!template) {
      errors.push('No prompt template found');
      databaseChecks.templateLoaded = false;
    } else {
      databaseChecks.templateLoaded = true;
      databaseChecks.templateData = {
        id: template.id,
        template_name: template.template_name,
        hasSystemPrompt: !!template.system_prompt,
        hasPlaceholders: template.system_prompt?.includes('{{character_name}}') || false
      };
    }

    // Load character data
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
    }

    // Verify template placeholders
    if (databaseChecks.templateLoaded && character) {
      const requiredPlaceholders = [
        '{{character_name}}',
        '{{character_description}}',
        '{{character_personality}}',
        '{{character_background}}',
        '{{character_speaking_style}}',
        '{{voice_examples}}',
        '{{scene_context}}'
      ];

      const templateHasPlaceholders = requiredPlaceholders.every(placeholder =>
        template.system_prompt?.includes(placeholder)
      );

      verification.allPlaceholdersPresent = templateHasPlaceholders;
      verification.characterNamePlaceholder = template.system_prompt?.includes('{{character_name}}');
      verification.voiceExamplesPlaceholder = template.system_prompt?.includes('{{voice_examples}}');
      verification.sceneContextPlaceholder = template.system_prompt?.includes('{{scene_context}}');

      // Check NSFW unlock block
      const hasNSFWUnlock = template.system_prompt?.toLowerCase().includes('nsfw') ||
                            template.system_prompt?.toLowerCase().includes('unrestricted') ||
                            template.system_prompt?.toLowerCase().includes('adult');

      verification.nsfwUnlockBlockPresent = hasNSFWUnlock;
    }

    const passed = errors.length === 0 && 
                  databaseChecks.templateLoaded && 
                  databaseChecks.characterLoaded &&
                  verification.allPlaceholdersPresent;

    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    return {
      testId,
      testName,
      passed,
      errors,
      databaseChecks,
      verification,
      systemPromptSample: template ? template.system_prompt?.substring(0, 200) : undefined
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return { testId, testName, passed: false, errors, databaseChecks, verification };
  }
}

// Test 3.2: Character Data Integration
async function testCharacterDataIntegration(): Promise<TestResult> {
  const testId = '3.2';
  const testName = 'Character Data Integration';
  const errors: string[] = [];
  const databaseChecks: Record<string, any> = {};
  const verification: Record<string, any> = {};

  console.log(`\n🧪 Test ${testId}: ${testName}`);
  console.log('='.repeat(60));

  try {
    // Load character with all fields
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
      databaseChecks.characterFields = {
        hasDescription: !!character.description,
        hasTraits: !!character.traits,
        hasPersona: !!character.persona,
        hasBasePrompt: !!character.base_prompt,
        hasVoiceExamples: Array.isArray(character.voice_examples) && character.voice_examples.length > 0,
        hasForbiddenPhrases: Array.isArray(character.forbidden_phrases) && character.forbidden_phrases.length > 0,
        hasVoiceTone: !!character.voice_tone
      };
    }

    // Verify all fields are present
    verification.allFieldsPresent = 
      databaseChecks.characterFields?.hasDescription &&
      databaseChecks.characterFields?.hasTraits &&
      databaseChecks.characterFields?.hasPersona &&
      databaseChecks.characterFields?.hasBasePrompt;

    verification.voiceExamplesPresent = databaseChecks.characterFields?.hasVoiceExamples;
    verification.forbiddenPhrasesPresent = databaseChecks.characterFields?.hasForbiddenPhrases;

    const passed = errors.length === 0 && 
                  databaseChecks.characterLoaded && 
                  verification.allFieldsPresent;

    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    return { testId, testName, passed, errors, databaseChecks, verification };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return { testId, testName, passed: false, errors, databaseChecks, verification };
  }
}

// Test 3.3: Scene System Prompt Application
async function testSceneSystemPromptApplication(): Promise<TestResult> {
  const testId = '3.3';
  const testName = 'Scene System Prompt Application';
  const errors: string[] = [];
  const databaseChecks: Record<string, any> = {};
  const verification: Record<string, any> = {};

  console.log(`\n🧪 Test ${testId}: ${testName}`);
  console.log('='.repeat(60));

  try {
    // Load scene with system prompt
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
        hasSystemPrompt: !!scene.system_prompt,
        hasSceneRules: !!scene.scene_rules,
        hasSceneStarters: Array.isArray(scene.scene_starters) && scene.scene_starters.length > 0,
        systemPromptLength: scene.system_prompt?.length || 0,
        sceneRulesLength: scene.scene_rules?.length || 0,
        sceneStartersCount: scene.scene_starters?.length || 0
      };
    }

    // Verification
    verification.sceneSystemPromptPresent = databaseChecks.sceneData?.hasSystemPrompt;
    verification.sceneRulesPresent = databaseChecks.sceneData?.hasSceneRules;
    verification.sceneStartersPresent = databaseChecks.sceneData?.hasSceneStarters;

    const passed = errors.length === 0 && 
                  databaseChecks.sceneLoaded && 
                  verification.sceneSystemPromptPresent;

    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    return {
      testId,
      testName,
      passed,
      errors,
      databaseChecks,
      verification,
      systemPromptSample: scene?.system_prompt?.substring(0, 200)
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return { testId, testName, passed: false, errors, databaseChecks, verification };
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting System Prompt & Template Tests');
  console.log('='.repeat(60));

  results.push(await testPromptTemplateApplication());
  results.push(await testCharacterDataIntegration());
  results.push(await testSceneSystemPromptApplication());

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

