# OpenRouter API Integration

**Last Updated:** January 2025  
**Status:** 🚧 PLANNED - Integration planned for chat alternatives

## **🎯 Overview**

The OpenRouter API integration provides access to alternative chat models for roleplay, storytelling, and prompt enhancement. This serves as a fallback option when the Chat worker is unavailable and provides additional model variety for users.

### **Key Capabilities**
- **Chat Model Alternatives**: Access to multiple chat models (Claude, GPT, etc.)
- **Roleplay Enhancement**: Alternative models for roleplay scenarios
- **Storytelling**: Creative writing and story generation
- **Prompt Enhancement**: Assist with prompt creation and refinement
- **Fallback Support**: Alternative to Chat worker when needed

---

## **🔧 Technical Setup**

### **API Configuration**
```typescript
// OpenRouter API Configuration
const OPENROUTER_CONFIG = {
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultModel: 'anthropic/claude-3.5-sonnet',
  timeout: 60000, // 60 seconds
  retryAttempts: 3
};
```

### **Available Models**
```yaml
Chat Models:
  - Claude 3.5 Sonnet: "anthropic/claude-3.5-sonnet"
  - Claude 3.5 Haiku: "anthropic/claude-3.5-haiku"
  - GPT-4: "openai/gpt-4"
  - GPT-4 Turbo: "openai/gpt-4-turbo"
  - GPT-3.5 Turbo: "openai/gpt-3.5-turbo"
  - Llama 3.1: "meta-llama/llama-3.1-8b-instruct"
  - Mistral: "mistralai/mistral-7b-instruct"

Performance:
  - Claude 3.5 Sonnet: 5-15 seconds per response
  - GPT-4: 3-10 seconds per response
  - GPT-3.5 Turbo: 2-8 seconds per response
  - Llama 3.1: 4-12 seconds per response
```

### **Environment Variables**
```bash
# Required environment variables
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_WEBHOOK_URL=https://your-domain.com/api/openrouter-webhook
```

---

## **💬 Chat Implementation**

### **Model Integration**
```typescript
// OpenRouter chat integration
const generateWithOpenRouter = async (params: OpenRouterParams) => {
  const response = await fetch(`${OPENROUTER_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ourvidz.com',
      'X-Title': 'OurVidz Platform'
    },
    body: JSON.stringify({
      model: params.model || OPENROUTER_CONFIG.defaultModel,
      messages: params.messages,
      max_tokens: params.maxTokens || 500,
      temperature: params.temperature || 0.7,
      top_p: params.topP || 0.9,
      stream: false
    })
  });
  
  return await response.json();
};
```

### **Roleplay Integration**
```typescript
// Roleplay with OpenRouter
const generateRoleplayResponse = async (params: RoleplayParams) => {
  const messages = buildRoleplayMessages(params);
  
  const response = await generateWithOpenRouter({
    model: params.model || 'anthropic/claude-3.5-sonnet',
    messages: messages,
    maxTokens: params.maxTokens || 300,
    temperature: params.temperature || 0.8,
    topP: params.topP || 0.9
  });
  
  return response.choices[0].message.content;
};
```

### **Storytelling Integration**
```typescript
// Storytelling with OpenRouter
const generateStory = async (params: StoryParams) => {
  const messages = buildStoryMessages(params);
  
  const response = await generateWithOpenRouter({
    model: params.model || 'openai/gpt-4',
    messages: messages,
    maxTokens: params.maxTokens || 1000,
    temperature: params.temperature || 0.8,
    topP: params.topP || 0.9
  });
  
  return response.choices[0].message.content;
};
```

---

## **🔗 Frontend Integration**

### **Chat Job Submission**
```typescript
// Frontend chat job submission to OpenRouter
const submitOpenRouterChat = async (params: OpenRouterChatParams) => {
  const jobData = {
    job_type: 'openrouter_chat',
    provider: 'openrouter',
    model: params.model || 'anthropic/claude-3.5-sonnet',
    messages: params.messages,
    max_tokens: params.maxTokens || 500,
    temperature: params.temperature || 0.7,
    top_p: params.topP || 0.9,
    
    // Roleplay specific parameters
    character: params.character,
    scenario: params.scenario,
    
    // Fallback configuration
    fallback_to_chat_worker: params.fallbackToChatWorker || false
  };
  
  return await queueJob(jobData);
};
```

### **Model Selection**
```typescript
// Model selection for different use cases
const selectOpenRouterModel = (useCase: string) => {
  const modelMap = {
    'roleplay': 'anthropic/claude-3.5-sonnet',
    'storytelling': 'openai/gpt-4',
    'prompt_enhancement': 'anthropic/claude-3.5-haiku',
    'casual_chat': 'openai/gpt-3.5-turbo',
    'creative_writing': 'openai/gpt-4'
  };
  
  return modelMap[useCase] || 'anthropic/claude-3.5-sonnet';
};
```

---

## **📊 Cost Management**

### **Pricing Structure**
```yaml
OpenRouter Model Pricing:
  Claude 3.5 Sonnet: $0.003 per 1K input tokens, $0.015 per 1K output tokens
  Claude 3.5 Haiku: $0.00025 per 1K input tokens, $0.00125 per 1K output tokens
  GPT-4: $0.03 per 1K input tokens, $0.06 per 1K output tokens
  GPT-4 Turbo: $0.01 per 1K input tokens, $0.03 per 1K output tokens
  GPT-3.5 Turbo: $0.0015 per 1K input tokens, $0.002 per 1K output tokens
  Llama 3.1: $0.0002 per 1K input tokens, $0.0002 per 1K output tokens
```

### **Usage Tracking**
```typescript
// Track OpenRouter API usage
const trackOpenRouterUsage = (response: OpenRouterResponse) => {
  const usage = {
    provider: 'openrouter',
    model: response.model,
    input_tokens: response.usage.prompt_tokens,
    output_tokens: response.usage.completion_tokens,
    total_tokens: response.usage.total_tokens,
    cost: calculateOpenRouterCost(response),
    timestamp: new Date().toISOString()
  };
  
  logUsage(usage);
};
```

### **Cost Calculation**
```typescript
// Calculate OpenRouter costs
const calculateOpenRouterCost = (response: OpenRouterResponse) => {
  const modelPricing = OPENROUTER_PRICING[response.model];
  
  const inputCost = (response.usage.prompt_tokens / 1000) * modelPricing.input;
  const outputCost = (response.usage.completion_tokens / 1000) * modelPricing.output;
  
  return inputCost + outputCost;
};
```

---

## **🔍 Error Handling**

### **Common Issues**
```typescript
// Handle OpenRouter API errors
const handleOpenRouterError = (error: any, jobData: any) => {
  if (error.status === 429) {
    // Rate limit exceeded
    return {
      error: 'Rate limit exceeded, please try again later',
      retryAfter: error.headers['retry-after'],
      fallback: true
    };
  }
  
  if (error.status === 402) {
    // Payment required
    return {
      error: 'Payment required for OpenRouter API',
      fallback: true
    };
  }
  
  if (error.status === 503) {
    // Service unavailable
    return {
      error: 'OpenRouter service temporarily unavailable',
      fallback: true
    };
  }
  
  return {
    error: 'Unknown OpenRouter API error',
    fallback: true
  };
};
```

### **Fallback Strategy**
```typescript
// Fallback to Chat worker if OpenRouter fails
const handleOpenRouterFallback = async (jobData: any) => {
  if (jobData.fallback_to_chat_worker) {
    // Convert to Chat worker job
    const chatJob = {
      ...jobData,
      job_type: 'chat_conversation',
      target_worker: 'chat'
    };
    
    return await queueJob(chatJob);
  }
  
  throw new Error('OpenRouter generation failed and fallback disabled');
};
```

---

## **📈 Performance Monitoring**

### **Response Time Tracking**
```typescript
// Monitor OpenRouter response times
const monitorOpenRouterPerformance = (response: OpenRouterResponse) => {
  const metrics = {
    provider: 'openrouter',
    model: response.model,
    response_time: response.responseTime,
    input_tokens: response.usage.prompt_tokens,
    output_tokens: response.usage.completion_tokens,
    total_tokens: response.usage.total_tokens,
    timestamp: new Date().toISOString()
  };
  
  logPerformanceMetrics(metrics);
};
```

### **Quality Monitoring**
```typescript
// Monitor chat response quality
const monitorOpenRouterQuality = (response: OpenRouterResponse) => {
  // Check response time
  if (response.responseTime > 30000) { // 30 seconds
    logQualityIssue('slow_openrouter_response', response);
  }
  
  // Check response length
  if (response.choices[0].message.content.length < 50) {
    logQualityIssue('short_openrouter_response', response);
  }
  
  // Check for roleplay consistency
  if (response.metadata?.roleplay) {
    if (!isInCharacter(response.choices[0].message.content, response.metadata.character)) {
      logQualityIssue('out_of_character_openrouter_response', response);
    }
  }
};
```

---

## **🚀 Future Enhancements**

### **Advanced Features**
```typescript
// Future advanced features
const advancedOpenRouterFeatures = {
  // Multi-model comparison
  compareModels: async (prompt: string, models: string[]) => {
    const results = await Promise.all(
      models.map(model => generateWithModel(prompt, model))
    );
    return results;
  },
  
  // Model-specific optimization
  optimizeForUseCase: (useCase: string) => {
    const optimizations = {
      'roleplay': {
        model: 'anthropic/claude-3.5-sonnet',
        temperature: 0.8,
        maxTokens: 300
      },
      'storytelling': {
        model: 'openai/gpt-4',
        temperature: 0.7,
        maxTokens: 1000
      },
      'prompt_enhancement': {
        model: 'anthropic/claude-3.5-haiku',
        temperature: 0.5,
        maxTokens: 200
      }
    };
    
    return optimizations[useCase] || optimizations.roleplay;
  },
  
  // Streaming responses
  streamResponse: async (params: StreamingParams) => {
    // Implement streaming for real-time responses
  }
};
```

### **Integration Opportunities**
1. **Model Selection UI**: Let users choose between different OpenRouter models
2. **Quality Comparison**: Side-by-side comparison of different models
3. **Cost Optimization**: Automatic model selection based on cost/quality requirements
4. **Streaming Chat**: Real-time streaming responses for better UX

---

## **🔧 Configuration Management**

### **Supabase Integration**
```sql
-- Add OpenRouter to API providers
INSERT INTO api_providers (name, provider_type, is_active) 
VALUES ('OpenRouter', 'openrouter', true);

-- Add OpenRouter models
INSERT INTO api_models (provider_id, model_name, model_version, is_active, cost_per_request) VALUES
((SELECT id FROM api_providers WHERE name = 'OpenRouter'), 'claude-3.5-sonnet', 'anthropic/claude-3.5-sonnet', true, 0.018),
((SELECT id FROM api_providers WHERE name = 'OpenRouter'), 'claude-3.5-haiku', 'anthropic/claude-3.5-haiku', true, 0.0015),
((SELECT id FROM api_providers WHERE name = 'OpenRouter'), 'gpt-4', 'openai/gpt-4', true, 0.09),
((SELECT id FROM api_providers WHERE name = 'OpenRouter'), 'gpt-4-turbo', 'openai/gpt-4-turbo', true, 0.04),
((SELECT id FROM api_providers WHERE name = 'OpenRouter'), 'gpt-3.5-turbo', 'openai/gpt-3.5-turbo', true, 0.0035);
```

### **Admin Interface**
```typescript
// Admin interface for managing OpenRouter configuration
const manageOpenRouterConfig = {
  // Add new model
  addModel: async (modelConfig: OpenRouterModelConfig) => {
    return await supabase.from('api_models').insert(modelConfig);
  },
  
  // Update model settings
  updateModel: async (modelId: string, updates: Partial<OpenRouterModelConfig>) => {
    return await supabase.from('api_models').update(updates).eq('id', modelId);
  },
  
  // Monitor usage
  getUsageStats: async (timeframe: string) => {
    return await supabase.rpc('get_openrouter_usage_stats', { timeframe });
  },
  
  // Model performance comparison
  compareModelPerformance: async (models: string[]) => {
    return await supabase.rpc('compare_openrouter_models', { models });
  }
};
```

---

## **🎯 Use Case Optimization**

### **Roleplay Optimization**
```typescript
// Optimize for roleplay scenarios
const optimizeForRoleplay = (character: string, scenario: string) => {
  return {
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.8,
    maxTokens: 300,
    systemPrompt: `You are roleplaying as ${character} in the scenario: ${scenario}. Stay in character and respond naturally.`
  };
};
```

### **Storytelling Optimization**
```typescript
// Optimize for storytelling
const optimizeForStorytelling = (genre: string, length: string) => {
  return {
    model: 'openai/gpt-4',
    temperature: 0.7,
    maxTokens: length === 'short' ? 500 : 1000,
    systemPrompt: `You are a creative storyteller specializing in ${genre}. Create engaging, immersive stories.`
  };
};
```

### **Prompt Enhancement Optimization**
```typescript
// Optimize for prompt enhancement
const optimizeForPromptEnhancement = (contentType: string) => {
  return {
    model: 'anthropic/claude-3.5-haiku',
    temperature: 0.5,
    maxTokens: 200,
    systemPrompt: `Enhance prompts for ${contentType} generation. Add cinematic details, lighting, and composition elements.`
  };
};
```

---

**Note**: This integration provides robust alternatives for chat functionality and expands the platform's model variety. The OpenRouter API offers access to high-quality chat models as alternatives to the Chat worker.
