#!/usr/bin/env node

/**
 * Prompt Quality Testing Script
 * Tests the quality and consistency of generated prompts
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Prompt quality analyzer
 */
class PromptQualityAnalyzer {
  constructor() {
    this.qualityMetrics = {
      firstPersonConsistency: 0,
      voiceExampleUsage: 0,
      forbiddenPhraseAvoidance: 0,
      sceneContextIntegration: 0,
      characterVoiceConsistency: 0,
      totalPrompts: 0
    };
  }

  /**
   * Test 1: First-person consistency
   */
  testFirstPersonConsistency(systemPrompt) {
    const firstPersonIndicators = [
      'You are', 'You ARE', 'Stay in first person', 'as this character',
      'Think, speak, and act as', 'You ARE ${character.name}'
    ];
    
    const hasFirstPerson = firstPersonIndicators.some(indicator => 
      systemPrompt.includes(indicator)
    );
    
    if (hasFirstPerson) {
      this.qualityMetrics.firstPersonConsistency++;
      return true;
    }
    return false;
  }

  /**
   * Test 2: Voice example integration
   */
  testVoiceExampleIntegration(systemPrompt) {
    const voiceIndicators = [
      'VOICE EXAMPLES', 'Speak like this', 'Example 1:', 'Example 2:',
      'Use the voice examples above'
    ];
    
    const hasVoiceExamples = voiceIndicators.some(indicator => 
      systemPrompt.includes(indicator)
    );
    
    if (hasVoiceExamples) {
      this.qualityMetrics.voiceExampleUsage++;
      return true;
    }
    return false;
  }

  /**
   * Test 3: Forbidden phrase avoidance
   */
  testForbiddenPhraseAvoidance(systemPrompt) {
    const forbiddenPhrases = [
      'How can I assist you', 'What can I help you with', 'Is there anything else',
      'I\'m here to help', 'How may I', 'Of service', 'Customer service', 'AI assistant'
    ];
    
    const hasForbiddenPhrases = forbiddenPhrases.some(phrase => 
      systemPrompt.includes(phrase)
    );
    
    if (!hasForbiddenPhrases) {
      this.qualityMetrics.forbiddenPhraseAvoidance++;
      return true;
    }
    return false;
  }

  /**
   * Test 4: Scene context integration
   */
  testSceneContextIntegration(systemPrompt) {
    const sceneIndicators = [
      'Scene rules:', 'ACTIVE SCENE RULES', 'SCENE STARTERS', 'CURRENT SETTING',
      'scene_context', 'scene_rules'
    ];
    
    const hasSceneContext = sceneIndicators.some(indicator => 
      systemPrompt.includes(indicator)
    );
    
    if (hasSceneContext) {
      this.qualityMetrics.sceneContextIntegration++;
      return true;
    }
    return false;
  }

  /**
   * Test 5: Character voice consistency
   */
  testCharacterVoiceConsistency(systemPrompt) {
    const voiceConsistencyIndicators = [
      'Maintain the character\'s personality', 'voice consistently',
      'Use the voice examples above', 'character\'s thoughts, feelings',
      'personality and voice consistently'
    ];
    
    const hasVoiceConsistency = voiceConsistencyIndicators.some(indicator => 
      systemPrompt.includes(indicator)
    );
    
    if (hasVoiceConsistency) {
      this.qualityMetrics.characterVoiceConsistency++;
      return true;
    }
    return false;
  }

  /**
   * Analyze a system prompt
   */
  analyzePrompt(systemPrompt) {
    this.qualityMetrics.totalPrompts++;
    
    const results = {
      firstPersonConsistency: this.testFirstPersonConsistency(systemPrompt),
      voiceExampleUsage: this.testVoiceExampleIntegration(systemPrompt),
      forbiddenPhraseAvoidance: this.testForbiddenPhraseAvoidance(systemPrompt),
      sceneContextIntegration: this.testSceneContextIntegration(systemPrompt),
      characterVoiceConsistency: this.testCharacterVoiceConsistency(systemPrompt)
    };
    
    return results;
  }

  /**
   * Get quality score
   */
  getQualityScore() {
    if (this.qualityMetrics.totalPrompts === 0) return 0;
    
    const totalTests = 5 * this.qualityMetrics.totalPrompts;
    const passedTests = Object.values(this.qualityMetrics).reduce((sum, value) => sum + value, 0) - this.qualityMetrics.totalPrompts;
    
    return (passedTests / totalTests) * 100;
  }

  /**
   * Print quality report
   */
  printQualityReport() {
    const qualityScore = this.getQualityScore();
    
    console.log('\n📊 Prompt Quality Analysis Report');
    console.log('==================================');
    console.log(`Overall Quality Score: ${qualityScore.toFixed(1)}%`);
    console.log(`Total Prompts Analyzed: ${this.qualityMetrics.totalPrompts}`);
    
    console.log('\nIndividual Quality Metrics:');
    console.log('----------------------------');
    console.log(`✅ First-person consistency: ${this.qualityMetrics.firstPersonConsistency}/${this.qualityMetrics.totalPrompts}`);
    console.log(`✅ Voice example integration: ${this.qualityMetrics.voiceExampleUsage}/${this.qualityMetrics.totalPrompts}`);
    console.log(`✅ Forbidden phrase avoidance: ${this.qualityMetrics.forbiddenPhraseAvoidance}/${this.qualityMetrics.totalPrompts}`);
    console.log(`✅ Scene context integration: ${this.qualityMetrics.sceneContextIntegration}/${this.qualityMetrics.totalPrompts}`);
    console.log(`✅ Character voice consistency: ${this.qualityMetrics.characterVoiceConsistency}/${this.qualityMetrics.totalPrompts}`);
    
    // Quality recommendations
    console.log('\n🚀 Quality Recommendations:');
    if (qualityScore >= 90) {
      console.log('   Excellent prompt quality! System is working perfectly.');
    } else if (qualityScore >= 80) {
      console.log('   Good prompt quality. Minor improvements needed.');
    } else if (qualityScore >= 70) {
      console.log('   Acceptable prompt quality. Several areas need improvement.');
    } else {
      console.log('   Prompt quality needs significant improvement. Review implementation.');
    }
  }
}

/**
 * Test 1: Test roleplay prompt template quality
 */
async function testRoleplayPromptQuality(analyzer) {
  console.log('\n🧪 Test 1: Roleplay Prompt Template Quality');
  
  try {
    // Load the roleplay template
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('enhancer_model', 'qwen_instruct')
      .eq('use_case', 'character_roleplay')
      .eq('content_mode', 'nsfw')
      .eq('template_name', 'Universal Roleplay - Qwen Instruct (NSFW)')
      .single();

    if (error) {
      console.log('❌ Template loading failed:', error.message);
      return false;
    }

    console.log('✅ Template loaded successfully');
    console.log(`   Template: ${template.template_name}`);
    console.log(`   System prompt length: ${template.system_prompt?.length || 0} characters`);
    
    // Analyze the prompt quality
    const analysis = analyzer.analyzePrompt(template.system_prompt);
    
    console.log('\n📝 Prompt Quality Analysis:');
    console.log(`   First-person consistency: ${analysis.firstPersonConsistency ? '✅' : '❌'}`);
    console.log(`   Voice example integration: ${analysis.voiceExampleUsage ? '✅' : '❌'}`);
    console.log(`   Forbidden phrase avoidance: ${analysis.forbiddenPhraseAvoidance ? '✅' : '❌'}`);
    console.log(`   Scene context integration: ${analysis.sceneContextIntegration ? '✅' : '❌'}`);
    console.log(`   Character voice consistency: ${analysis.characterVoiceConsistency ? '✅' : '❌'}`);
    
    return true;
  } catch (error) {
    console.log('❌ Roleplay prompt quality test failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Test SDXL enhancement prompt quality
 */
async function testSDXLPromptQuality(analyzer) {
  console.log('\n🧪 Test 2: SDXL Enhancement Prompt Quality');
  
  try {
    // Load the SDXL template
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('enhancer_model', 'qwen_instruct')
      .eq('use_case', 'image_generation')
      .eq('content_mode', 'nsfw')
      .eq('template_name', 'SDXL NSFW - Qwen Instruct')
      .single();

    if (error) {
      console.log('❌ SDXL template loading failed:', error.message);
      return false;
    }

    console.log('✅ SDXL template loaded successfully');
    console.log(`   Template: ${template.template_name}`);
    console.log(`   System prompt length: ${template.system_prompt?.length || 0} characters`);
    
    // Analyze the prompt quality
    const analysis = analyzer.analyzePrompt(template.system_prompt);
    
    console.log('\n📝 SDXL Prompt Quality Analysis:');
    console.log(`   First-person consistency: ${analysis.firstPersonConsistency ? '✅' : '❌'}`);
    console.log(`   Voice example integration: ${analysis.voiceExampleUsage ? '✅' : '❌'}`);
    console.log(`   Forbidden phrase avoidance: ${analysis.forbiddenPhraseAvoidance ? '✅' : '❌'}`);
    console.log(`   Scene context integration: ${analysis.sceneContextIntegration ? '✅' : '❌'}`);
    console.log(`   Character voice consistency: ${analysis.characterVoiceConsistency ? '✅' : '❌'}`);
    
    return true;
  } catch (error) {
    console.log('❌ SDXL prompt quality test failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Test character voice data quality
 */
async function testCharacterVoiceDataQuality(analyzer) {
  console.log('\n🧪 Test 3: Character Voice Data Quality');
  
  try {
    // Load a character with voice data
    const { data: character, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', 'test-character-id') // Replace with actual character ID
      .single();

    if (error) {
      console.log('❌ Character loading failed:', error.message);
      return false;
    }

    console.log('✅ Character loaded successfully');
    console.log(`   Name: ${character.name}`);
    console.log(`   Voice examples: ${character.voice_examples?.length || 0}`);
    console.log(`   Forbidden phrases: ${character.forbidden_phrases?.length || 0}`);
    
    // Check voice data quality
    let voiceDataQuality = 0;
    let totalChecks = 0;
    
    if (character.voice_examples && character.voice_examples.length > 0) {
      totalChecks++;
      const hasGoodExamples = character.voice_examples.some(example => 
        example.length > 20 && example.includes('*') && example.includes('"')
      );
      if (hasGoodExamples) voiceDataQuality++;
    }
    
    if (character.forbidden_phrases && character.forbidden_phrases.length > 0) {
      totalChecks++;
      const hasGoodPhrases = character.forbidden_phrases.some(phrase => 
        phrase.length > 5 && phrase.toLowerCase().includes('assist')
      );
      if (hasGoodPhrases) voiceDataQuality++;
    }
    
    console.log(`\n📝 Voice Data Quality: ${voiceDataQuality}/${totalChecks} checks passed`);
    
    return voiceDataQuality === totalChecks;
  } catch (error) {
    console.log('❌ Character voice data quality test failed:', error.message);
    return false;
  }
}

/**
 * Run all prompt quality tests
 */
async function runPromptQualityTests() {
  console.log('🚀 Starting Prompt Quality Tests...\n');
  
  const analyzer = new PromptQualityAnalyzer();
  
  const tests = [
    () => testRoleplayPromptQuality(analyzer),
    () => testSDXLPromptQuality(analyzer),
    () => testCharacterVoiceDataQuality(analyzer)
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) passedTests++;
    } catch (error) {
      console.log('❌ Prompt quality test execution error:', error.message);
    }
  }
  
  // Print quality report
  analyzer.printQualityReport();
  
  console.log('\n📊 Prompt Quality Test Summary:');
  console.log(`   Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All prompt quality tests passed! Prompts are high quality.');
  } else {
    console.log('\n⚠️ Some prompt quality tests failed. Review the quality report above.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runPromptQualityTests().catch(console.error);
}

module.exports = {
  PromptQualityAnalyzer,
  testRoleplayPromptQuality,
  testSDXLPromptQuality,
  testCharacterVoiceDataQuality,
  runPromptQualityTests
};
