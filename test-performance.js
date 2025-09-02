#!/usr/bin/env node

/**
 * Performance Testing Script
 * Tests caching performance and response times for the roleplay system
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Performance metrics
 */
class PerformanceMetrics {
  constructor() {
    this.tests = [];
    this.startTime = Date.now();
  }

  startTest(name) {
    return {
      name,
      startTime: Date.now()
    };
  }

  endTest(test) {
    const duration = Date.now() - test.startTime;
    this.tests.push({
      name: test.name,
      duration,
      startTime: test.startTime
    });
    return duration;
  }

  getResults() {
    const totalDuration = Date.now() - this.startTime;
    const avgDuration = this.tests.reduce((sum, test) => sum + test.duration, 0) / this.tests.length;
    
    return {
      totalDuration,
      avgDuration,
      tests: this.tests,
      testCount: this.tests.length
    };
  }

  printResults() {
    const results = this.getResults();
    
    console.log('\n📊 Performance Test Results:');
    console.log('=============================');
    console.log(`Total Duration: ${results.totalDuration}ms`);
    console.log(`Average Duration: ${Math.round(results.avgDuration)}ms`);
    console.log(`Tests Run: ${results.testCount}`);
    
    console.log('\nIndividual Test Results:');
    console.log('------------------------');
    results.tests.forEach(test => {
      const status = test.duration < 1000 ? '✅' : test.duration < 3000 ? '⚠️' : '❌';
      console.log(`${status} ${test.name}: ${test.duration}ms`);
    });
    
    // Performance recommendations
    console.log('\n🚀 Performance Recommendations:');
    if (results.avgDuration < 500) {
      console.log('   Excellent performance! System is highly optimized.');
    } else if (results.avgDuration < 1000) {
      console.log('   Good performance. Consider caching for frequently accessed data.');
    } else if (results.avgDuration < 3000) {
      console.log('   Acceptable performance. Implement caching and optimize queries.');
    } else {
      console.log('   Performance needs improvement. Review database queries and caching.');
    }
  }
}

/**
 * Test 1: Character loading performance (with and without cache)
 */
async function testCharacterLoadingPerformance(metrics) {
  console.log('\n🧪 Test 1: Character Loading Performance');
  
  const test1 = metrics.startTest('Character Load - First Time');
  
  try {
    // First load (should be slower)
    const startTime = Date.now();
    const { data: character, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', 'test-character-id') // Replace with actual character ID
      .single();
    
    const firstLoadTime = Date.now() - startTime;
    metrics.endTest(test1);
    
    if (error) {
      console.log('❌ Character loading failed:', error.message);
      return false;
    }
    
    console.log(`✅ First load completed in ${firstLoadTime}ms`);
    
    // Second load (should be faster due to caching)
    const test2 = metrics.startTest('Character Load - Cached');
    const startTime2 = Date.now();
    
    const { data: character2, error: error2 } = await supabase
      .from('characters')
      .select('*')
      .eq('id', 'test-character-id')
      .single();
    
    const secondLoadTime = Date.now() - startTime2;
    metrics.endTest(test2);
    
    if (error2) {
      console.log('❌ Second character load failed:', error.message);
      return false;
    }
    
    console.log(`✅ Second load completed in ${secondLoadTime}ms`);
    
    // Calculate improvement
    const improvement = ((firstLoadTime - secondLoadTime) / firstLoadTime * 100).toFixed(1);
    console.log(`📈 Cache improvement: ${improvement}% faster`);
    
    return true;
  } catch (error) {
    console.log('❌ Character loading performance test failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Scene loading performance
 */
async function testSceneLoadingPerformance(metrics) {
  console.log('\n🧪 Test 2: Scene Loading Performance');
  
  const test = metrics.startTest('Scene Load with Joins');
  
  try {
    const startTime = Date.now();
    
    const { data: scenes, error } = await supabase
      .from('character_scenes')
      .select(`
        *,
        characters!inner(
          name,
          voice_examples,
          forbidden_phrases
        )
      `)
      .eq('character_id', 'test-character-id') // Replace with actual character ID
      .eq('is_active', true)
      .order('priority', { ascending: false });
    
    const duration = Date.now() - startTime;
    metrics.endTest(test);
    
    if (error) {
      console.log('❌ Scene loading failed:', error.message);
      return false;
    }
    
    console.log(`✅ Scene loading completed in ${duration}ms`);
    console.log(`   Scenes loaded: ${scenes?.length || 0}`);
    
    return true;
  } catch (error) {
    console.log('❌ Scene loading performance test failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Template loading performance
 */
async function testTemplateLoadingPerformance(metrics) {
  console.log('\n🧪 Test 3: Template Loading Performance');
  
  const test = metrics.startTest('Template Load');
  
  try {
    const startTime = Date.now();
    
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('enhancer_model', 'qwen_instruct')
      .eq('use_case', 'character_roleplay')
      .eq('content_mode', 'nsfw')
      .single();
    
    const duration = Date.now() - startTime;
    metrics.endTest(test);
    
    if (error) {
      console.log('❌ Template loading failed:', error.message);
      return false;
    }
    
    console.log(`✅ Template loading completed in ${duration}ms`);
    console.log(`   Template: ${template.template_name}`);
    console.log(`   System prompt length: ${template.system_prompt?.length || 0} characters`);
    
    return true;
  } catch (error) {
    console.log('❌ Template loading performance test failed:', error.message);
    return false;
  }
}

/**
 * Test 4: Concurrent loading performance
 */
async function testConcurrentLoadingPerformance(metrics) {
  console.log('\n🧪 Test 4: Concurrent Loading Performance');
  
  const test = metrics.startTest('Concurrent Character Loads');
  
  try {
    const startTime = Date.now();
    
    // Simulate concurrent character loads
    const promises = Array(5).fill().map((_, i) => 
      supabase
        .from('characters')
        .select('*')
        .eq('id', 'test-character-id') // Replace with actual character ID
        .single()
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    metrics.endTest(test);
    
    const successCount = results.filter(r => !r.error).length;
    console.log(`✅ Concurrent loading completed in ${duration}ms`);
    console.log(`   Successful loads: ${successCount}/${results.length}`);
    
    return successCount === results.length;
  } catch (error) {
    console.log('❌ Concurrent loading performance test failed:', error.message);
    return false;
  }
}

/**
 * Run all performance tests
 */
async function runPerformanceTests() {
  console.log('🚀 Starting Performance Tests...\n');
  
  const metrics = new PerformanceMetrics();
  
  const tests = [
    () => testCharacterLoadingPerformance(metrics),
    () => testSceneLoadingPerformance(metrics),
    () => testTemplateLoadingPerformance(metrics),
    () => testConcurrentLoadingPerformance(metrics)
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) passedTests++;
    } catch (error) {
      console.log('❌ Performance test execution error:', error.message);
    }
  }
  
  // Print performance results
  metrics.printResults();
  
  console.log('\n📊 Performance Test Summary:');
  console.log(`   Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All performance tests passed! System is performing well.');
  } else {
    console.log('\n⚠️ Some performance tests failed. Review the results above.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = {
  PerformanceMetrics,
  testCharacterLoadingPerformance,
  testSceneLoadingPerformance,
  testTemplateLoadingPerformance,
  testConcurrentLoadingPerformance,
  runPerformanceTests
};
