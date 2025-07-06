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

### **3. generate-admin-image** (`/functions/generate-admin-image/index.ts`)
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
```

### **Function Configuration** (`config.toml`):
```toml
[functions.queue-job]
verify_jwt = true

[functions.job-callback]
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

### **Error Handling**:
- Comprehensive error logging throughout
- Graceful fallbacks for missing data
- Detailed debugging information in metadata
- Automatic retry mechanisms in workers

### **Performance Optimizations**:
- Intelligent negative prompt generation
- Efficient job type parsing
- Optimized database queries
- Proper indexing for fast lookups

---

## 📊 **Monitoring & Debugging**

### **Logging Strategy**:
- Structured logging with emojis for easy scanning
- Detailed error tracking with timestamps
- Performance metrics in metadata
- Debug information for troubleshooting

### **Key Metrics Tracked**:
- Job creation and completion times
- Queue lengths and processing rates
- Error rates and types
- Storage bucket usage
- User activity patterns

---

## 🚨 **Security Considerations**

### **Authentication**:
- JWT verification for user-facing functions
- Service role access for internal operations
- Proper RLS policy enforcement

### **Data Validation**:
- Input sanitization and validation
- Job type whitelisting
- File path security
- User ownership verification

### **Error Handling**:
- No sensitive information in error messages
- Proper HTTP status codes
- Graceful degradation 