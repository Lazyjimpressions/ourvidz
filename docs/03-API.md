# API Documentation - Consolidated

**Last Updated:** July 30, 2025  
**Status:** Production Active

## 🚀 Overview

The OurVidz API consists of **Supabase Edge Functions** that handle all backend operations, including job management, content generation, and real-time communication.

## 🔌 Edge Functions API

### **Base URL**
```
https://your-project.supabase.co/functions/v1/
```

### **Authentication**
All endpoints require Supabase authentication:
```typescript
const supabase = createClient(url, anon_key);
const { data: { session } } = await supabase.auth.getSession();
```

### **Function Configuration** (`config.toml`):
```toml
[functions.queue-job]
verify_jwt = true

[functions.job-callback]
verify_jwt = false

[functions.enhance-prompt]
verify_jwt = false

[functions.generate-admin-image]
verify_jwt = false

[functions.get-active-worker-url]
verify_jwt = false

[functions.register-chat-worker]
verify_jwt = false

[functions.update-worker-url]
verify_jwt = false

[functions.playground-chat]
verify_jwt = true

[functions.validate-enhancement-fix]
verify_jwt = false
```

## 📋 Core Endpoints

### **1. Job Management**

#### **Queue Job** - `POST /queue-job`
Creates and routes generation jobs to appropriate workers.

**Supported Job Types (10 Total):**
- `sdxl_image_fast` - SDXL ultra-fast images (3-8s)
- `sdxl_image_high` - SDXL high-quality images (8-15s)
- `image_fast` - WAN fast images (73s)
- `image_high` - WAN high-quality images (90s)
- `video_fast` - WAN fast videos (180s)
- `video_high` - WAN high-quality videos (280s)
- `image7b_fast_enhanced` - Enhanced fast images (87s)
- `image7b_high_enhanced` - Enhanced high-quality images (104s)
- `video7b_fast_enhanced` - Enhanced fast videos (194s)
- `video7b_high_enhanced` - Enhanced high-quality videos (294s)

**Queue Routing:**
- SDXL jobs → `sdxl_queue` (2s polling)
- WAN jobs → `wan_queue` (5s polling)

```typescript
interface QueueJobRequest {
  jobType: string;           // One of the 10 supported types
  metadata?: {
    prompt?: string;
    bucket?: string;
    credits?: number;
    queue?: string;
    [key: string]: any;
  };
  projectId?: string;
  videoId?: string;
  imageId?: string;
}

interface QueueJobResponse {
  success: boolean;
  job: JobRecord;
  message: string;
  queueLength: number;
  modelVariant: string;
  debug: {
    userId: string;
    hasPrompt: boolean;
    redisConfigured: boolean;
    timestamp: string;
  };
}
```

**Example:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/queue-job \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "sdxl_image_fast",
    "metadata": {
      "prompt": "beautiful landscape",
      "quality": "fast"
    }
  }'
```

#### **Job Callback** - `POST /job-callback`
Processes completed jobs from workers and updates database.

**Supported Status Updates:**
- `queued` → `processing` → `completed`/`failed`
- Handles both SDXL and WAN job completions
- Updates image/video records with file paths
- Manages enhanced prompt storage for 7B jobs

```typescript
interface JobCallbackRequest {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  filePath?: string;         // SDXL workers
  outputUrl?: string;        // WAN workers
  errorMessage?: string;
  enhancedPrompt?: string;   // For 7B enhanced jobs
  imageUrls?: string[]       // Multiple images for SDXL
}
```

### **2. Content Generation**

#### **Enhance Prompt** - `POST /enhance-prompt`
AI-powered prompt enhancement with NSFW optimization.

**Features:**
- **ContentCompliantEnhancementOrchestrator**: Multi-tier enhancement system
- **NSFW Content Detection**: Automatic tier classification (artistic/explicit/unrestricted)
- **Worker Selection**: Intelligent routing between chat and WAN workers
- **Token Optimization**: SDXL (77 tokens), WAN (175-250 tokens)
- **System Prompts**: Specialized prompts for each model/quality combination

**Supported Models:**
- **SDXL Fast/High**: 75-token optimization with Lustify tags
- **WAN Fast**: 175-token motion and temporal consistency
- **WAN High 7B**: 250-token cinematic quality enhancement

```typescript
interface EnhancePromptRequest {
  prompt: string;
  jobType: string;
  format: string;
  quality: 'fast' | 'high';
  selectedModel?: 'qwen_instruct' | 'qwen_base';
  user_id?: string;
  regeneration?: boolean;
  selectedPresets?: string[];
}

interface EnhancePromptResponse {
  success: boolean;
  original_prompt: string;
  enhanced_prompt: string;
  enhancement_strategy: string;
  enhancement_metadata: {
    original_length: number;
    enhanced_length: number;
    expansion_percentage: string;
    job_type: string;
    format: string;
    quality: string;
    is_sdxl: boolean;
    is_video: boolean;
    enhancement_strategy: string;
    model_used: string;
    token_count: number;
    compression_applied: boolean;
    token_optimization: object;
    version: string;
  };
  optimization: object;
}
```

#### **Generate Admin Image** - `POST /generate-admin-image`
Admin-only image generation for testing and moderation.

```typescript
interface AdminImageRequest {
  prompt: string;
  model: 'sdxl' | 'wan';
  quality: 'fast' | 'high';
}
```

### **3. Worker Management**

#### **Get Active Worker URL** - `GET /get-active-worker-url`
Retrieve and validate active worker URL from database.

**Features:**
- Fetches worker URL from system_config table
- Performs health check on worker endpoint
- Returns registration information and health status
- Handles worker availability validation

```typescript
interface WorkerUrlResponse {
  success: boolean;
  workerUrl: string;
  isHealthy: boolean;
  healthError?: string;
  registrationInfo?: {
    autoRegistered: boolean;
    registrationMethod: string;
    detectionMethod: string;
    lastUpdated: string;
    lastRegistrationAttempt: string;
  };
}
```

#### **Health Check Workers** - `GET /health-check-workers`
Monitors worker health and performance.

```typescript
interface HealthCheckResponse {
  workers: {
    sdxl: { status: 'healthy' | 'unhealthy'; responseTime: number };
    wan: { status: 'healthy' | 'unhealthy'; responseTime: number };
    video: { status: 'healthy' | 'unhealthy'; responseTime: number };
    chat: { status: 'healthy' | 'unhealthy'; responseTime: number };
  };
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
}
```

#### **Update Worker URL** - `POST /update-worker-url`
Updates worker endpoint URLs (admin only).

```typescript
interface UpdateWorkerUrlRequest {
  workerType: 'sdxl' | 'wan' | 'video' | 'chat';
  url: string;
}
```

#### **Register Chat Worker** - `POST /register-chat-worker`
Registers new chat worker instances.

```typescript
interface RegisterChatWorkerRequest {
  workerUrl: string;
  capabilities: string[];
  maxConcurrentChats: number;
}
```

### **4. Playground & Chat**

#### **Playground Chat** - `POST /playground-chat`
Chat playground functionality with NSFW content handling.

**Features:**
- **Content Tier Detection**: Automatic NSFW content classification
- **System Prompt Selection**: Context-aware prompt generation
- **SDXL Lustify Conversion**: Specialized prompts for adult content
- **Conversation Management**: Real-time chat with AI models

**Content Tiers:**
- **Artistic**: Tasteful adult aesthetics
- **Explicit**: Detailed adult content
- **Unrestricted**: Maximum explicit detail

```typescript
interface ChatRequest {
  message: string;
  conversation_id?: string;
  project_id?: string;
  content_tier?: 'artistic' | 'explicit' | 'unrestricted';
}
```

### **5. Utilities**

#### **Refresh Prompt Cache** - `POST /refresh-prompt-cache`
Refreshes the prompt enhancement cache.

#### **Validate Enhancement Fix** - `POST /validate-enhancement-fix`
Validates prompt enhancement improvements.

#### **Test Edge Functions** - `GET /test-edge-functions`
Testing endpoint for edge function validation.

## 🔄 Workflow Integration

### **Frontend → Backend Flow**
1. **User submits generation request** → `queue-job`
2. **Job created and queued** → Redis queue
3. **Worker processes job** → AI generation
4. **Worker calls callback** → `job-callback`
5. **Database updated** → Asset records created
6. **Frontend notified** → Real-time updates via Supabase subscriptions

### **Enhancement Workflow**
1. **User requests enhancement** → `enhance-prompt`
2. **Content tier detected** → NSFW classification
3. **Worker selected** → Chat or WAN worker routing
4. **System prompt applied** → Model-specific optimization
5. **Token optimization** → Compression if needed
6. **Enhanced prompt returned** → Ready for generation

### **Worker Management**
1. **Worker startup** → `register-chat-worker` or `update-worker-url`
2. **Health monitoring** → `get-active-worker-url`
3. **URL validation** → Health checks and connectivity tests
4. **Configuration update** → Database system_config updates

## 🔄 Real-time Communication

### **WebSocket Connections**
```typescript
// Job status updates
interface JobStatusUpdate {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  result?: {
    imageUrl?: string;
    videoUrl?: string;
    metadata?: any;
  };
  error?: string;
}

// Worker health updates
interface WorkerHealthUpdate {
  workerType: 'sdxl' | 'wan' | 'video' | 'chat';
  status: 'healthy' | 'unhealthy';
  load: number; // 0-100
  activeJobs: number;
}
```

## 📊 Response Codes

### **Success Codes**
- `200` - Success
- `201` - Created (job queued)
- `202` - Accepted (processing)

### **Error Codes**
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (job/worker not found)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable (worker offline)

## 📊 Monitoring & Debugging

### **Logging Strategy**
- Structured logging with emojis for easy scanning
- Detailed error tracking with timestamps
- Performance metrics in metadata
- Debug information for troubleshooting
- Enhancement quality tracking

### **Key Metrics Tracked**
- Job creation and completion times
- Queue lengths and processing rates
- Error rates and types
- Storage bucket usage
- User activity patterns
- Enhancement success rates
- Worker health and response times
- Token optimization efficiency

### **Health Monitoring**
- Worker availability checks
- Response time monitoring
- Error rate tracking
- Enhancement quality validation
- System configuration validation

## 🔐 Security

### **Authentication**
- **JWT Tokens**: Supabase JWT authentication required
- **Row Level Security**: Database-level access control
- **Rate Limiting**: Per-user request limits

### **Data Validation**
- Input sanitization and validation
- Job type whitelisting
- File path security
- User ownership verification
- Content tier validation

### **NSFW Content Handling**
- Automatic content tier detection
- Appropriate system prompt selection
- Token optimization for adult content
- Quality preservation for explicit content

### **Authorization**
```sql
-- Example RLS policy
CREATE POLICY "Users can only access own jobs" ON jobs
FOR ALL USING (auth.uid() = user_id);
```

## 📈 Performance

### **Response Times**
- **Job Queue**: < 100ms
- **Prompt Enhancement**: < 500ms
- **Worker Health Check**: < 200ms
- **Real-time Updates**: < 50ms

### **Rate Limits**
- **Job Creation**: 10 requests/minute per user
- **Prompt Enhancement**: 30 requests/minute per user
- **Health Checks**: 60 requests/minute per user

## 🔧 Error Handling

### **Standard Error Response**
```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}
```

### **Retry Logic**
- **Network Errors**: Exponential backoff (1s, 2s, 4s, 8s)
- **Worker Errors**: Automatic job requeuing
- **Rate Limits**: Wait for reset window

## 🧪 Testing

### **Test Endpoints**
```bash
# Test all edge functions
curl https://your-project.supabase.co/functions/v1/test-edge-functions

# Test specific function
curl https://your-project.supabase.co/functions/v1/health-check-workers
```

### **Mock Data**
```typescript
// Test job creation
const testJob = {
  jobType: 'sdxl_image_fast',
  metadata: {
    prompt: 'test prompt',
    quality: 'fast'
  }
};
```

---

**For worker API details, see [06-WORKER_API.md](./06-WORKER_API.md)**  
**For deployment info, see [04-DEPLOYMENT.md](./04-DEPLOYMENT.md)** 