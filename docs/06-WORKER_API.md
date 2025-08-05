# Worker API Documentation

**Last Updated:** August 4, 2025  
**Status:** ✅ Production Ready with Enhanced Logging  
**✅ RESOLVED - MEDIUM PRIORITY:** Worker Code Interference Risk eliminated through pure inference architecture.

## Overview

The OurVidz worker system runs on RunPod RTX 6000 ADA instances, providing AI-powered image generation, chat/playground functionality, and prompt enhancement. The system has been **completely overhauled** to implement a **Pure Inference Engine** architecture with enhanced logging.

## Core Endpoints

### 1. Pure Inference Engine Endpoints ⭐ NEW ARCHITECTURE

#### `POST /chat`
**Purpose:** Pure inference chat endpoint - worker executes exactly what edge functions provide

**Request:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are an AI assistant specialized in creative content generation..."
    },
    {
      "role": "user",
      "content": "Create a detailed prompt for a fantasy landscape"
    }
  ],
  "max_tokens": 200,
  "temperature": 0.7,
  "top_p": 0.9
}
```

**Response:**
```json
{
  "success": true,
  "response": "A mystical forest landscape with ancient trees...",
  "enhanced_prompt": "A mystical forest landscape with ancient trees...",
  "generation_time": 2.34,
  "tokens_generated": 45,
  "model_used": "qwen_instruct",
  "pure_inference": true,
  "no_prompt_overrides": true
}
```

#### `POST /enhance`
**Purpose:** Pure inference prompt enhancement - used by enhance-prompt edge function

**Request:**
```json
{
  "messages": [
    {
      "role": "system", 
      "content": "You are an expert prompt engineer specializing in artistic image generation..."
    },
    {
      "role": "user",
      "content": "A beautiful sunset"
    }
  ],
  "max_tokens": 75,
  "temperature": 0.7,
  "top_p": 0.9
}
```

**Response:**
```json
{
  "success": true,
  "enhanced_prompt": "A beautiful sunset over rolling hills, golden hour lighting, cinematic composition, professional photography, 8k resolution, masterpiece quality",
  "generation_time": 1.87,
  "tokens_generated": 23,
  "model_used": "qwen_instruct",
  "pure_inference": true,
  "no_prompt_overrides": true,
  "template_respected": true
}
```

#### `POST /generate`
**Purpose:** Generic pure inference endpoint for any AI task

**Request:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a creative writing assistant..."
    },
    {
      "role": "user", 
      "content": "Write a short story about a robot"
    }
  ],
  "max_tokens": 300,
  "temperature": 0.8,
  "top_p": 0.9
}
```

**Response:**
```json
{
  "success": true,
  "response": "In the year 2157, a robot named Atlas...",
  "generation_time": 4.12,
  "tokens_generated": 89,
  "model_used": "qwen_instruct",
  "pure_inference": true,
  "no_prompt_overrides": true
}
```

#### `GET /worker/info`
**Purpose:** Get worker capabilities and architecture information

**Response:**
```json
{
  "success": true,
  "worker_info": {
    "worker_type": "chat",
    "model": "qwen_instruct",
    "architecture": "pure_inference_engine",
    "capabilities": [
      "pure_inference",
      "no_prompt_overrides", 
      "template_respect",
      "enhanced_logging"
    ],
    "endpoints": [
      "/chat",
      "/enhance", 
      "/generate",
      "/worker/info"
    ],
    "security_features": [
      "no_hardcoded_prompts",
      "edge_function_control",
      "template_override_protection"
    ],
    "performance": {
      "max_tokens": 2000,
      "response_time_ms": 1500,
      "memory_optimized": true
    }
  }
}
```

### 2. Image Generation

#### `POST /generate`
**Purpose:** Generate images using SDXL model

**Request:**
```json
{
  "prompt": "A beautiful sunset over mountains",
  "negative_prompt": "blurry, low quality",
  "width": 1024,
  "height": 1024,
  "steps": 20,
  "cfg_scale": 7.5,
  "seed": -1
}
```

**Response:**
```json
{
  "success": true,
  "image_url": "https://storage.example.com/generated/image.jpg",
  "metadata": {
    "prompt": "A beautiful sunset over mountains",
    "seed": 12345,
    "steps": 20,
    "cfg_scale": 7.5
  }
}
```

### 3. Chat & Playground

#### `POST /chat` (Legacy Format)
**Purpose:** Pure Inference Engine - Chat worker respects all system prompts from edge functions

**Request:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are an AI assistant for creative content generation..."
    },
    {
      "role": "user",
      "content": "Help me create a prompt for a sci-fi scene"
    }
  ],
  "max_tokens": 200,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "success": true,
  "response": "Here's a detailed sci-fi scene prompt...",
  "enhanced_prompt": "A futuristic cityscape with flying cars...",
  "generation_time": 2.1,
  "tokens_generated": 67,
  "pure_inference": true,
  "no_prompt_overrides": true
}
```

### 4. Health & Status

#### `GET /health`
**Purpose:** Check worker health and status

**Response:**
```json
{
  "status": "healthy",
  "worker_type": "chat",
  "model": "qwen_instruct",
  "uptime": 3600,
  "memory_usage": "2.1GB",
  "gpu_utilization": "45%",
  "pure_inference_engine": true,
  "no_prompt_overrides": true,
  "template_override_risk": "eliminated",
  "hardcoded_prompts": false,
  "edge_function_control": true,
  "capabilities": [
    "pure_inference",
    "enhanced_logging",
    "template_respect"
  ]
}
```

#### `GET /status`
**Purpose:** Detailed worker status and performance metrics

**Response:**
```json
{
  "status": "operational",
  "worker_info": {
    "type": "chat",
    "model": "qwen_instruct",
    "version": "2.0.0",
    "architecture": "pure_inference_engine"
  },
  "performance": {
    "requests_per_minute": 45,
    "average_response_time": 1.8,
    "error_rate": 0.02,
    "memory_usage_mb": 2100,
    "gpu_utilization_percent": 45
  },
  "security": {
    "pure_inference": true,
    "no_prompt_overrides": true,
    "template_override_risk": "eliminated",
    "hardcoded_prompts": false,
    "edge_function_control": true
  },
  "capabilities": {
    "endpoints": ["/chat", "/enhance", "/generate", "/worker/info"],
    "models": ["qwen_instruct"],
    "features": ["pure_inference", "enhanced_logging", "template_respect"]
  }
}
```

## Enhanced Logging Integration

### Edge Function Logging

The `enhance-prompt` edge function provides comprehensive logging for all worker interactions:

```typescript
// Request logging with prompt preview
console.log('🎯 Dynamic enhance prompt request:', {
  prompt: prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt,
  jobType,
  format,
  quality,
  selectedModel,
  promptLength: prompt.length
});

// Template selection logging
console.log('🚀 Enhancing with template:', {
  template: template.template_name || 'unnamed_template',
  enhancerModel: template.enhancer_model,
  modelType: template.model_type,
  selectedModel,
  workerType,
  contentMode
});

// Pure inference payload logging
console.log('💬 Chat worker payload (pure inference):', {
  messagesCount: messages.length,
  systemPromptLength: template.system_prompt.length,
  userPromptLength: request.prompt.length,
  maxTokens: payload.max_tokens,
  templateName: template.template_name || 'unnamed'
});

// Enhanced prompt result logging
console.log('🎯 ENHANCED PROMPT GENERATED:', {
  originalPrompt: prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt,
  enhancedPrompt: enhancementResult.enhanced_prompt,
  templateUsed: enhancementResult.template_name,
  strategy: enhancementResult.strategy
});
```

### Worker Response Logging

All worker responses include enhanced metadata for monitoring:

```json
{
  "success": true,
  "enhanced_prompt": "Enhanced prompt content...",
  "generation_time": 1.87,
  "tokens_generated": 23,
  "model_used": "qwen_instruct",
  "pure_inference": true,
  "no_prompt_overrides": true,
  "template_respected": true,
  "execution_metadata": {
    "worker_type": "chat",
    "architecture": "pure_inference_engine",
    "template_name": "enhancement_sdxl_sfw",
    "fallback_level": 0,
    "cache_hit": false
  }
}
```

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error": "Worker communication failed",
  "details": "Connection timeout after 30 seconds",
  "error_code": "WORKER_TIMEOUT",
  "suggested_action": "Retry with exponential backoff"
}
```

### Error Codes

- `WORKER_UNAVAILABLE`: No active worker found
- `WORKER_TIMEOUT`: Request timeout
- `INVALID_PAYLOAD`: Malformed request
- `TEMPLATE_NOT_FOUND`: Database template missing
- `TOKEN_LIMIT_EXCEEDED`: Request exceeds token limits

## Security Features

### Pure Inference Engine Security

- **No Hardcoded Prompts:** Workers contain no prompt logic
- **Edge Function Control:** All prompt construction in edge functions
- **Template Override Protection:** Workers cannot modify system prompts
- **Audit Trail:** Complete logging of all prompt interactions
- **Database-Driven:** All templates stored in secure database

### Authentication

All worker endpoints require authentication via:
- API key in headers
- Worker URL validation
- Request signature verification

## Performance Monitoring

### Key Metrics

- **Response Time:** Average worker response time
- **Throughput:** Requests per minute
- **Error Rate:** Percentage of failed requests
- **Memory Usage:** Worker memory consumption
- **GPU Utilization:** GPU usage percentage

### Monitoring Endpoints

```bash
# Check worker health
curl -X GET "https://worker-url/health"

# Get detailed status
curl -X GET "https://worker-url/status"

# Get worker capabilities
curl -X GET "https://worker-url/worker/info"
```

## Recent Updates

### August 4, 2025: Enhanced Logging & Pure Inference

- **Enhanced Logging:** Comprehensive logging throughout worker interactions
- **Pure Inference Integration:** Complete integration with new worker architecture
- **Template Override Elimination:** Security improvement through pure inference
- **Performance Monitoring:** Real-time metrics and response tracking
- **Error Handling:** Improved error handling with detailed logging 