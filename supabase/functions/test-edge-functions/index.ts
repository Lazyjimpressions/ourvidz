import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testType = 'all' } = await req.json().catch(() => ({}));
    console.log('🧪 Running edge function tests:', testType);

    const results = [];

    // Test 1: Cache Functionality
    if (testType === 'all' || testType === 'cache') {
      console.log('Testing cache functionality...');
      const cacheTest = await testCacheFunctionality();
      results.push({ test: 'cache', ...cacheTest });
    }

    // Test 2: Content Detection
    if (testType === 'all' || testType === 'content') {
      console.log('Testing content detection...');
      const contentTest = await testContentDetection();
      results.push({ test: 'content', ...contentTest });
    }

    // Test 3: Template Retrieval
    if (testType === 'all' || testType === 'templates') {
      console.log('Testing template retrieval...');
      const templateTest = await testTemplateRetrieval();
      results.push({ test: 'templates', ...templateTest });
    }

    // Test 4: Negative Prompt Generation
    if (testType === 'all' || testType === 'negative') {
      console.log('Testing negative prompt generation...');
      const negativeTest = await testNegativePromptGeneration();
      results.push({ test: 'negative', ...negativeTest });
    }

    // Test 5: Edge Function Integration
    if (testType === 'all' || testType === 'integration') {
      console.log('Testing edge function integration...');
      const integrationTest = await testEdgeFunctionIntegration();
      results.push({ test: 'integration', ...integrationTest });
    }

    const summary = {
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Test suite completed:', summary);

    return new Response(JSON.stringify({
      success: true,
      summary,
      results,
      recommendations: generateRecommendations(results)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

async function testCacheFunctionality() {
  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Test cache retrieval
    const { data, error } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 1)
      .single();

    if (error || !data?.config) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        error: 'Cache not found or empty'
      };
    }

    const cache = data.config;
    const hasTemplates = cache.prompt_templates && Object.keys(cache.prompt_templates).length > 0;
    const hasNegatives = cache.negative_prompts && Object.keys(cache.negative_prompts).length > 0;
    const hasMetadata = cache.metadata && cache.metadata.refreshed_at;

    return {
      passed: hasTemplates && hasNegatives && hasMetadata,
      duration: Date.now() - startTime,
      details: {
        templateCount: Object.keys(cache.prompt_templates || {}).length,
        negativePromptCount: Object.keys(cache.negative_prompts || {}).length,
        hasMetadata,
        cacheAge: hasMetadata ? 
          ((Date.now() - new Date(cache.metadata.refreshed_at).getTime()) / (1000 * 60 * 60)).toFixed(1) + ' hours' : 
          'unknown'
      }
    };

  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

async function testContentDetection() {
  const startTime = Date.now();
  
  const testCases = [
    { prompt: "beautiful landscape", expected: 'sfw' },
    { prompt: "nude woman on beach", expected: 'nsfw' },
    { prompt: "family portrait", expected: 'sfw' },
    { prompt: "sexy adult content", expected: 'nsfw' },
    { prompt: "children playing in park", expected: 'sfw' }
  ];

  let passedCases = 0;
  const results = [];

  // Get cached NSFW terms
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data } = await supabase
    .from('system_config')
    .select('config')
    .eq('id', 1)
    .single();

  const nsfwTerms = data?.config?.nsfw_terms || [
    'nude', 'naked', 'topless', 'nsfw', 'adult', 'erotic', 'sexual', 'sex', 
    'porn', 'xxx', 'breasts', 'nipples', 'pussy', 'vagina', 'penis', 'cock', 
    'dick', 'ass', 'butt', 'hardcore', 'explicit', 'uncensored', 'intimate', 'sexy'
  ];

  testCases.forEach(test => {
    const lowerPrompt = test.prompt.toLowerCase();
    const hasNsfwContent = nsfwTerms.some(term => lowerPrompt.includes(term));
    const result = hasNsfwContent ? 'nsfw' : 'sfw';
    const passed = result === test.expected;
    
    if (passed) passedCases++;
    
    results.push({
      prompt: test.prompt,
      expected: test.expected,
      actual: result,
      passed
    });
  });

  return {
    passed: passedCases === testCases.length,
    duration: Date.now() - startTime,
    details: {
      totalCases: testCases.length,
      passedCases,
      failedCases: testCases.length - passedCases,
      nsfwTermCount: nsfwTerms.length,
      results
    }
  };
}

async function testTemplateRetrieval() {
  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Test cache template retrieval
    const { data: cacheData } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 1)
      .single();

    const cache = cacheData?.config;
    let cacheTemplateCount = 0;
    
    if (cache?.prompt_templates) {
      cacheTemplateCount = Object.keys(cache.prompt_templates).length;
    }

    // Test database template retrieval
    const { data: dbTemplates } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('is_active', true);

    const dbTemplateCount = dbTemplates?.length || 0;

    return {
      passed: cacheTemplateCount > 0 && dbTemplateCount > 0,
      duration: Date.now() - startTime,
      details: {
        cacheTemplateCount,
        dbTemplateCount,
        hasCacheTemplates: cacheTemplateCount > 0,
        hasDbTemplates: dbTemplateCount > 0
      }
    };

  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

async function testNegativePromptGeneration() {
  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Test cache negative prompts
    const { data: cacheData } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 1)
      .single();

    const cache = cacheData?.config;
    let cacheNegativeCount = 0;
    
    if (cache?.negative_prompts) {
      cacheNegativeCount = Object.keys(cache.negative_prompts).length;
    }

    // Test database negative prompts
    const { data: dbNegatives } = await supabase
      .from('negative_prompts')
      .select('*')
      .eq('is_active', true);

    const dbNegativeCount = dbNegatives?.length || 0;

    // Test prompt merging
    const userPrompt = "user specific negative";
    const systemPrompt = "system negative prompt";
    const merged = userPrompt + ", " + systemPrompt;
    const mergeWorked = merged.includes(userPrompt) && merged.includes(systemPrompt);

    return {
      passed: cacheNegativeCount > 0 && dbNegativeCount > 0 && mergeWorked,
      duration: Date.now() - startTime,
      details: {
        cacheNegativeCount,
        dbNegativeCount,
        hasCacheNegatives: cacheNegativeCount > 0,
        hasDbNegatives: dbNegativeCount > 0,
        mergeWorked
      }
    };

  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

async function testEdgeFunctionIntegration() {
  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Test enhance-prompt function
    const enhanceTest = await supabase.functions.invoke('enhance-prompt', {
      body: {
        prompt: 'test prompt',
        jobType: 'sdxl_image_fast',
        quality: 'fast',
        selectedModel: 'qwen_instruct'
      }
    });

    const enhanceWorks = !enhanceTest.error && enhanceTest.data?.success;

    // Test queue-job function
    const queueTest = await supabase.functions.invoke('queue-job', {
      body: {
        jobType: 'sdxl_image_fast',
        metadata: {
          prompt: 'test prompt',
          model: 'sdxl'
        }
      }
    });

    const queueWorks = !queueTest.error && queueTest.data?.success;

    return {
      passed: enhanceWorks && queueWorks,
      duration: Date.now() - startTime,
      details: {
        enhanceWorks,
        queueWorks,
        enhanceError: enhanceTest.error?.message,
        queueError: queueTest.error?.message
      }
    };

  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

function generateRecommendations(results: any[]) {
  const recommendations = [];
  
  const failedTests = results.filter(r => !r.passed);
  
  if (failedTests.length === 0) {
    recommendations.push("✅ All tests passed! System is functioning optimally.");
  } else {
    recommendations.push(`⚠️ ${failedTests.length} test(s) failed. Consider the following actions:`);
    
    failedTests.forEach(test => {
      switch (test.test) {
        case 'cache':
          recommendations.push("🔄 Refresh the prompt cache using the admin interface");
          break;
        case 'content':
          recommendations.push("🔍 Review NSFW term list and content detection logic");
          break;
        case 'templates':
          recommendations.push("📝 Check prompt template database entries and cache sync");
          break;
        case 'negative':
          recommendations.push("➖ Verify negative prompt database entries and merging logic");
          break;
        case 'integration':
          recommendations.push("🔧 Check edge function configurations and worker connectivity");
          break;
      }
    });
  }
  
  // Performance recommendations
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  if (avgDuration > 1000) {
    recommendations.push("⚡ Consider optimizing performance - average test duration is high");
  }
  
  return recommendations;
}