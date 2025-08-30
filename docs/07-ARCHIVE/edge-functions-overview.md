# Supabase Edge Functions Overview

## 🚀 **Available Edge Functions**

### **1. queue-job** (`/functions/queue-job/index.ts`)
**Purpose**: Job creation and queue routing for the dual worker system

**Authentication**: ✅ Required (JWT verification enabled)

**Supported Job Types** (10 total):
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

**Queue Routing**:
- SDXL jobs → `sdxl_queue` (2s polling)
- WAN jobs → `wan_queue` (5s polling)

**Request Body**:
```typescript
{
  jobType: string,           // One of the 10 supported types
  metadata?: {
    prompt?: string,
    bucket?: string,
    credits?: number,
    queue?: string,
    [key: string]: any
  },
  projectId?: string,
  videoId?: string,
  imageId?: string
}
```

**Response**:
```typescript
{
  success: boolean,
  job: JobRecord,
  message: string,
  queueLength: number,
  modelVariant: string,
  debug: {
    userId: string,
    hasPrompt: boolean,
    redisConfigured: boolean,
    timestamp: string
  }
}
```

---

### **2. job-callback** (`/functions/job-callback/index.ts`)
**Purpose**: Process completed jobs from workers and update database

**Authentication**: ❌ Not required (called by workers)

**Supported Status Updates**:
- `queued` → `processing` → `completed`/`failed`
- Handles both SDXL and WAN job completions
- Updates image/video records with file paths
- Manages enhanced prompt storage for 7B jobs

**Request Body**:
```typescript
{
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  filePath?: string,         // SDXL workers
  outputUrl?: string,        // WAN workers
  errorMessage?: string,
  enhancedPrompt?: string,   // For 7B enhanced jobs
  imageUrls?: string[]       // Multiple images for SDXL
}
```

**Processing Logic**:
- Validates job exists and belongs to user
- Routes to appropriate handler based on job type
- Updates asset records (images/videos) with URLs
- Handles path normalization for user-scoped storage
- Manages metadata updates and debugging info

---

### **3. enhance-prompt** (`/functions/enhance-prompt/index.ts`)
**Purpose**: AI-powered prompt enhancement with NSFW optimization

**Authentication**: ❌ Not required (internal service)

**Features**:
- **ContentCompliantEnhancementOrchestrator**: Multi-tier enhancement system
- **NSFW Content Detection**: Automatic tier classification (artistic/explicit/unrestricted)
- **Worker Selection**: Intelligent routing between chat and WAN workers
- **Token Optimization**: SDXL (77 tokens), WAN (175-250 tokens)
- **System Prompts**: Specialized prompts for each model/quality combination

**Supported Models**:
- **SDXL Fast/High**: 75-token optimization with Lustify tags
- **WAN Fast**: 175-token motion and temporal consistency
- **WAN High 7B**: 250-token cinematic quality enhancement

**Request Body**:
```typescript
{
  prompt: string,
  jobType: string,
  format: string,
  quality: 'fast' | 'high',
  selectedModel?: 'qwen_instruct' | 'qwen_base',
  user_id?: string,
  regeneration?: boolean,
  selectedPresets?: string[]
}
```

**Response**:
```typescript
{
  success: boolean,
  original_prompt: string,
  enhanced_prompt: string,
  enhancement_strategy: string,
  enhancement_metadata: {
    original_length: number,
    enhanced_length: number,
    expansion_percentage: string,
    job_type: string,
    format: string,
    quality: string,
    is_sdxl: boolean,
    is_video: boolean,
    enhancement_strategy: string,
    model_used: string,
    token_count: number,
    compression_applied: boolean,
    token_optimization: object,
    version: string
  },
  optimization: object
}
```

---

### **4. generate-admin-image** (`/functions/generate-admin-image/index.ts`)
**Purpose**: Admin-only image generation for testing and admin operations

**Authentication**: ❌ Not required (admin bypass)

**Features**:
- Bypasses user authentication
- Simulates image generation with mock URLs
- Used for testing and admin operations
- Returns mock image URLs for development

**Request Body**:
```typescript
{
  prompt: string,
  mode?: string,
  metadata?: any
}
```

**Response**:
```typescript
{
  success: boolean,
  image: {
    id: string,
    url: string,
    thumbnail_url: string,
    prompt: string,
    mode: string,
    timestamp: string,
    metadata: any
  }
}
```

---

### **5. get-active-worker-url** (`/functions/get-active-worker-url/index.ts`)
**Purpose**: Retrieve and validate active worker URL from database

**Authentication**: ❌ Not required (internal service)

**Features**:
- Fetches worker URL from system_config table
- Performs health check on worker endpoint
- Returns registration information and health status
- Handles worker availability validation

**Response**:
```typescript
{
  success: boolean,
  workerUrl: string,
  isHealthy: boolean,
  healthError?: string,
  registrationInfo?: {
    autoRegistered: boolean,
    registrationMethod: string,
    detectionMethod: string,
    lastUpdated: string,
    lastRegistrationAttempt: string
  }
}
```

---

### **6. register-chat-worker** (`/functions/register-chat-worker/index.ts`)
**Purpose**: Register chat worker URL in system configuration

**Authentication**: ❌ Not required (worker self-registration)

**Features**:
- Updates system_config with chat worker URL
- Handles worker health validation
- Manages worker registration metadata
- Supports auto-registration workflow

---

### **7. update-worker-url** (`/functions/update-worker-url/index.ts`)
**Purpose**: Update worker URL in system configuration

**Authentication**: ❌ Not required (worker management)

**Features**:
- Updates system_config with new worker URL
- Validates worker connectivity
- Manages worker URL rotation
- Handles worker failover scenarios

---

### **8. playground-chat** (`/functions/playground-chat/index.ts`)
**Purpose**: Chat playground functionality with NSFW content handling

**Authentication**: ✅ Required (JWT verification enabled)

**Features**:
- **Content Tier Detection**: Automatic NSFW content classification
- **System Prompt Selection**: Context-aware prompt generation
- **SDXL Lustify Conversion**: Specialized prompts for adult content
- **Conversation Management**: Real-time chat with AI models

**Content Tiers**:
- **Artistic**: Tasteful adult aesthetics
- **Explicit**: Detailed adult content
- **Unrestricted**: Maximum explicit detail

**Request Body**:
```typescript
{
  message: string,
  conversation_id?: string,
  project_id?: string,
  content_tier?: 'artistic' | 'explicit' | 'unrestricted'
}
```

---

### **9. validate-enhancement-fix** (`/functions/validate-enhancement-fix/index.ts`)
**Purpose**: Validate and test enhancement system fixes

**Authentication**: ❌ Not required (testing/debugging)

**Features**:
- Validates enhancement system functionality
- Tests prompt enhancement quality
- Debugs enhancement pipeline issues
- Provides enhancement system diagnostics

---

## 🔧 **Configuration**

### **Environment Variables Required**:
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis Configuration (Upstash)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Worker Configuration
WAN_WORKER_API_KEY=your_worker_api_key
CHAT_WORKER_URL=your_chat_worker_url
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

---

## 🔄 **Workflow Integration**

### **Frontend → Backend Flow**:
1. **User submits generation request** → `queue-job`
2. **Job created and queued** → Redis queue
3. **Worker processes job** → AI generation
4. **Worker calls callback** → `job-callback`
5. **Database updated** → Asset records created
6. **Frontend notified** → Real-time updates via Supabase subscriptions

### **Enhancement Workflow**:
1. **User requests enhancement** → `enhance-prompt`
2. **Content tier detected** → NSFW classification
3. **Worker selected** → Chat or WAN worker routing
4. **System prompt applied** → Model-specific optimization
5. **Token optimization** → Compression if needed
6. **Enhanced prompt returned** → Ready for generation

### **Worker Management**:
1. **Worker startup** → `register-chat-worker` or `update-worker-url`
2. **Health monitoring** → `get-active-worker-url`
3. **URL validation** → Health checks and connectivity tests
4. **Configuration update** → Database system_config updates

### **Error Handling**:
- Comprehensive error logging throughout
- Graceful fallbacks for missing data
- Detailed debugging information in metadata
- Automatic retry mechanisms in workers
- Multi-tier enhancement fallback system

### **Performance Optimizations**:
- Intelligent negative prompt generation
- Efficient job type parsing
- Optimized database queries
- Proper indexing for fast lookups
- Token compression for SDXL compatibility
- Worker health caching

---

## 📊 **Monitoring & Debugging**

### **Logging Strategy**:
- Structured logging with emojis for easy scanning
- Detailed error tracking with timestamps
- Performance metrics in metadata
- Debug information for troubleshooting
- Enhancement quality tracking

### **Key Metrics Tracked**:
- Job creation and completion times
- Queue lengths and processing rates
- Error rates and types
- Storage bucket usage
- User activity patterns
- Enhancement success rates
- Worker health and response times
- Token optimization efficiency

### **Health Monitoring**:
- Worker availability checks
- Response time monitoring
- Error rate tracking
- Enhancement quality validation
- System configuration validation

---

## 🚨 **Security Considerations**

### **Authentication**:
- JWT verification for user-facing functions
- Service role access for internal operations
- Proper RLS policy enforcement
- Admin bypass for testing functions

### **Data Validation**:
- Input sanitization and validation
- Job type whitelisting
- File path security
- User ownership verification
- Content tier validation

### **Error Handling**:
- No sensitive information in error messages
- Proper HTTP status codes
- Graceful degradation
- Fallback mechanisms for all critical functions

### **NSFW Content Handling**:
- Automatic content tier detection
- Appropriate system prompt selection
- Token optimization for adult content
- Quality preservation for explicit content 