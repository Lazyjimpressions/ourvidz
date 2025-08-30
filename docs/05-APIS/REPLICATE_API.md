# Replicate API Integration

**Last Updated:** January 2025  
**Status:** ✅ ACTIVE - RV5.1 model integrated, additional models planned

## **🎯 Overview**

The Replicate API integration provides access to alternative image generation models, starting with RV5.1 (Realistic Vision 5.1). This serves as a fallback option when the SDXL worker is unavailable and provides additional model variety for users.

### **Key Capabilities**
- **RV5.1 Model**: High-quality realistic image generation
- **Fallback Support**: Alternative to SDXL worker when needed
- **Model Variety**: Access to multiple Replicate models
- **Cost Optimization**: Pay-per-use model with transparent pricing

---

## **🔧 Technical Setup**

### **API Configuration**
```typescript
// Replicate API Configuration
const REPLICATE_CONFIG = {
  baseUrl: 'https://api.replicate.com/v1',
  apiKey: process.env.REPLICATE_API_KEY,
  defaultModel: 'stability-ai/realistic-vision-v5.1',
  timeout: 300000, // 5 minutes
  retryAttempts: 3
};
```

### **Model Specifications**
```yaml
RV5.1 Model:
  Name: "stability-ai/realistic-vision-v5.1"
  Type: Text-to-Image
  License: CreativeML Open RAIL-M
  Resolution: 1024x1024 (default)
  Performance: 10-30 seconds per image
  Cost: ~$0.05 per image
```

### **Environment Variables**
```bash
# Required environment variables
REPLICATE_API_KEY=your_replicate_api_key
REPLICATE_WEBHOOK_URL=https://your-domain.com/api/replicate-webhook
```

---

## **🎨 RV5.1 Implementation**

### **Model Integration**
```typescript
// RV5.1 model integration
const generateWithRV51 = async (params: RV51Params) => {
  const prediction = await replicate.predictions.create({
    version: "stability-ai/realistic-vision-v5.1",
    input: {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || "",
      width: params.width || 1024,
      height: params.height || 1024,
      num_outputs: params.batchSize || 1,
      guidance_scale: params.guidanceScale || 7.5,
      num_inference_steps: params.steps || 25,
      seed: params.seed || Math.floor(Math.random() * 1000000)
    },
    webhook: REPLICATE_CONFIG.webhookUrl,
    webhook_events_filter: ["completed"]
  });
  
  return prediction;
};
```

### **Parameter Mapping**
```typescript
// Map frontend parameters to RV5.1
const mapToRV51Params = (frontendParams: FrontendParams) => {
  return {
    prompt: frontendParams.prompt,
    negative_prompt: frontendParams.negativePrompt || "",
    width: frontendParams.width || 1024,
    height: frontendParams.height || 1024,
    num_outputs: frontendParams.batchSize || 1,
    guidance_scale: frontendParams.guidanceScale || 7.5,
    num_inference_steps: frontendParams.steps || 25,
    seed: frontendParams.seed || Math.floor(Math.random() * 1000000)
  };
};
```

### **I2I Support (Planned)**
```typescript
// Future I2I support for RV5.1
const generateI2IWithRV51 = async (params: RV51I2IParams) => {
  const prediction = await replicate.predictions.create({
    version: "stability-ai/realistic-vision-v5.1",
    input: {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || "",
      image: params.referenceImageUrl,
      strength: params.denoiseStrength || 0.5,
      guidance_scale: params.guidanceScale || 7.5,
      num_inference_steps: params.steps || 25
    },
    webhook: REPLICATE_CONFIG.webhookUrl,
    webhook_events_filter: ["completed"]
  });
  
  return prediction;
};
```

---

## **🔗 Frontend Integration**

### **Job Submission**
```typescript
// Frontend job submission to Replicate
const submitReplicateJob = async (params: ReplicateJobParams) => {
  const jobData = {
    job_type: 'replicate_rv51',
    provider: 'replicate',
    model: 'stability-ai/realistic-vision-v5.1',
    prompt: params.prompt,
    negative_prompt: params.negativePrompt,
    batch_size: params.batchSize || 1,
    width: params.width || 1024,
    height: params.height || 1024,
    guidance_scale: params.guidanceScale || 7.5,
    steps: params.steps || 25,
    
    // I2I parameters (future)
    reference_image_url: params.referenceImageUrl,
    denoise_strength: params.denoiseStrength,
    
    // Fallback configuration
    fallback_to_sdxl: params.fallbackToSDXL || false
  };
  
  return await queueJob(jobData);
};
```

### **Progress Tracking**
```typescript
// Track Replicate job progress
const trackReplicateProgress = (predictionId: string) => {
  const checkStatus = async () => {
    const prediction = await replicate.predictions.get(predictionId);
    
    switch (prediction.status) {
      case 'starting':
        updateProgressUI({ status: 'starting', percentage: 10 });
        break;
      case 'processing':
        updateProgressUI({ status: 'processing', percentage: 50 });
        break;
      case 'succeeded':
        updateProgressUI({ status: 'completed', percentage: 100 });
        handleCompletedPrediction(prediction);
        break;
      case 'failed':
        updateProgressUI({ status: 'failed', percentage: 0 });
        handleFailedPrediction(prediction);
        break;
    }
  };
  
  // Poll status every 2 seconds
  const interval = setInterval(checkStatus, 2000);
  return () => clearInterval(interval);
};
```

---

## **📊 Cost Management**

### **Pricing Structure**
```yaml
RV5.1 Model Pricing:
  Base Cost: $0.05 per image
  Batch Discount: 10% for 3+ images
  Resolution Scaling:
    512x512: $0.025 per image
    1024x1024: $0.05 per image
    1536x1536: $0.075 per image
```

### **Usage Tracking**
```typescript
// Track Replicate API usage
const trackReplicateUsage = (prediction: ReplicatePrediction) => {
  const usage = {
    provider: 'replicate',
    model: prediction.model,
    cost: calculateCost(prediction),
    tokens_used: prediction.metrics?.tokens || 0,
    timestamp: new Date().toISOString()
  };
  
  logUsage(usage);
};
```

### **Budget Management**
```typescript
// Budget management for Replicate usage
const checkReplicateBudget = async (userId: string) => {
  const monthlyUsage = await getMonthlyUsage(userId, 'replicate');
  const userPlan = await getUserPlan(userId);
  
  if (monthlyUsage.cost > userPlan.replicateBudget) {
    throw new Error('Replicate budget exceeded');
  }
  
  return true;
};
```

---

## **🔍 Error Handling**

### **Common Issues**
```typescript
// Handle Replicate API errors
const handleReplicateError = (error: any, jobData: any) => {
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
      error: 'Payment required for Replicate API',
      fallback: true
    };
  }
  
  if (error.status === 500) {
    // Server error
    return {
      error: 'Replicate service temporarily unavailable',
      fallback: true
    };
  }
  
  return {
    error: 'Unknown Replicate API error',
    fallback: true
  };
};
```

### **Fallback Strategy**
```typescript
// Fallback to SDXL worker if Replicate fails
const handleReplicateFallback = async (jobData: any) => {
  if (jobData.fallback_to_sdxl) {
    // Convert to SDXL job
    const sdxlJob = {
      ...jobData,
      job_type: 'sdxl_image_high',
      target_worker: 'sdxl'
    };
    
    return await queueJob(sdxlJob);
  }
  
  throw new Error('Replicate generation failed and fallback disabled');
};
```

---

## **📈 Performance Monitoring**

### **Response Time Tracking**
```typescript
// Monitor Replicate response times
const monitorReplicatePerformance = (prediction: ReplicatePrediction) => {
  const startTime = new Date(prediction.created_at);
  const endTime = new Date(prediction.completed_at);
  const duration = endTime.getTime() - startTime.getTime();
  
  const metrics = {
    provider: 'replicate',
    model: prediction.model,
    duration_ms: duration,
    status: prediction.status,
    timestamp: new Date().toISOString()
  };
  
  logPerformanceMetrics(metrics);
};
```

### **Quality Monitoring**
```typescript
// Monitor generation quality
const monitorReplicateQuality = (prediction: ReplicatePrediction) => {
  if (prediction.status === 'failed') {
    logQualityIssue('replicate_generation_failed', prediction);
  }
  
  if (prediction.metrics?.duration > 60000) { // 60 seconds
    logQualityIssue('slow_replicate_generation', prediction);
  }
  
  // Check output quality
  if (prediction.output && Array.isArray(prediction.output)) {
    prediction.output.forEach((imageUrl, index) => {
      validateImageQuality(imageUrl, `replicate_rv51_${index}`);
    });
  }
};
```

---

## **🚀 Future Enhancements**

### **Additional Models**
```yaml
Planned Replicate Models:
  - SDXL 1.0: "stability-ai/sdxl"
  - SDXL Turbo: "stability-ai/sdxl-turbo"
  - Realistic Vision 6.0: "stability-ai/realistic-vision-v6"
  - Custom Models: User-trained models
```

### **Advanced Features**
```typescript
// Future advanced features
const advancedReplicateFeatures = {
  // Multi-model comparison
  compareModels: async (prompt: string, models: string[]) => {
    const results = await Promise.all(
      models.map(model => generateWithModel(prompt, model))
    );
    return results;
  },
  
  // Style transfer
  styleTransfer: async (imageUrl: string, style: string) => {
    // Implement style transfer with Replicate
  },
  
  // Batch processing
  batchProcess: async (prompts: string[]) => {
    // Process multiple prompts efficiently
  }
};
```

### **Integration Opportunities**
1. **Model Selection UI**: Let users choose between different Replicate models
2. **Quality Comparison**: Side-by-side comparison of different models
3. **Cost Optimization**: Automatic model selection based on cost/quality requirements

---

## **🔧 Configuration Management**

### **Supabase Integration**
```sql
-- API providers table
CREATE TABLE api_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  provider_type VARCHAR(50) NOT NULL,
  api_key_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API models table
CREATE TABLE api_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES api_providers(id),
  model_name VARCHAR(255) NOT NULL,
  model_version VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  cost_per_request DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Admin Interface**
```typescript
// Admin interface for managing Replicate configuration
const manageReplicateConfig = {
  // Add new model
  addModel: async (modelConfig: ModelConfig) => {
    return await supabase.from('api_models').insert(modelConfig);
  },
  
  // Update model settings
  updateModel: async (modelId: string, updates: Partial<ModelConfig>) => {
    return await supabase.from('api_models').update(updates).eq('id', modelId);
  },
  
  // Monitor usage
  getUsageStats: async (timeframe: string) => {
    return await supabase.rpc('get_replicate_usage_stats', { timeframe });
  }
};
```

---

**Note**: This integration provides a robust fallback option for image generation and expands the platform's model variety. The RV5.1 model offers high-quality realistic image generation as an alternative to the SDXL worker.
