# API Documentation - Consolidated

**Last Updated:** August 2, 2025  
**Status:** Production Active with Dual-Destination System

## �� Overview

The OurVidz API consists of **Supabase Edge Functions** that handle all backend operations, including job management, content generation, workspace management, and real-time communication.

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
Creates and routes generation jobs to appropriate workers with workspace support.

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

**Workspace Support:**
- **Destination**: `'library'` (default) or `'workspace'`
- **Session Management**: Automatic workspace session creation
- **Metadata**: Enhanced metadata for workspace tracking

```typescript
interface QueueJobRequest {
  jobType: string;           // One of the 10 supported types
  metadata?: {
    prompt?: string;
    bucket?: string;
    credits?: number;
    queue?: string;
    destination?: 'library' | 'workspace';  // NEW: Workspace support
    session_name?: string;                  // NEW: Workspace session name
    num_images?: number;                    // NEW: Number of images for workspace
    user_requested_enhancement?: boolean;   // NEW: Enhancement flag
    reference_image?: boolean;              // NEW: Reference image flag
    reference_strength?: number;            // NEW: Reference strength
    reference_type?: 'character' | 'style' | 'composition'; // NEW: Reference type
    [key: string]: any;
  };
  projectId?: string;
  videoId?: string;
  imageId?: string;
  // NEW: Reference image URLs for workspace
  referenceImageUrl?: string;
  startReferenceImageUrl?: string;
  endReferenceImageUrl?: string;
}

interface QueueJobResponse {
  success: boolean;
  job: JobRecord;
  message: string;
  queueLength: number;
  modelVariant: string;
  workspaceSessionId?: string;  // NEW: Workspace session ID
  debug: {
    userId: string;
    hasPrompt: boolean;
    destination: 'library' | 'workspace';  // NEW: Job destination
    workspaceSessionCreated: boolean;      // NEW: Session creation status
  };
}
```

#### **Job Callback** - `POST /job-callback`
Handles job completion with workspace routing support.

**Workspace Routing:**
- **Library Jobs**: Routes to `images`/`videos` tables
- **Workspace Jobs**: Routes to `workspace_items` table

```typescript
interface JobCallbackRequest {
  job_id: string;
  status: 'completed' | 'failed' | 'processing';
  assets?: string[];           // Generated asset URLs
  error_message?: string;      // Error details if failed
  metadata?: {
    generation_time?: number;
    model_used?: string;
    [key: string]: any;
  };
}

interface JobCallbackResponse {
  success: boolean;
  message: string;
  items_created?: number;      // NEW: Number of workspace items created
  destination?: 'library' | 'workspace';  // NEW: Where items were routed
}
```

### **2. Workspace Management (NEW)**

#### **Create Workspace Session** - `RPC /create_workspace_session`
Creates a new workspace session for the user.

```typescript
interface CreateWorkspaceSessionRequest {
  p_user_id: string;
  p_session_name?: string;  // Default: 'Workspace Session'
}

interface CreateWorkspaceSessionResponse {
  session_id: string;  // UUID of created session
}
```

**Example Usage:**
```typescript
const { data: sessionId, error } = await supabase.rpc('create_workspace_session', {
  p_user_id: user.id,
  p_session_name: 'My Workspace Session'
});
```

#### **Save Workspace Item to Library** - `RPC /save_workspace_item_to_library`
Moves a workspace item to the permanent library.

```typescript
interface SaveWorkspaceItemRequest {
  p_workspace_item_id: string;
  p_user_id: string;
}

interface SaveWorkspaceItemResponse {
  library_item_id: string;  // UUID of created library item (image/video)
}
```

**Example Usage:**
```typescript
const { data: libraryItemId, error } = await supabase.rpc('save_workspace_item_to_library', {
  p_workspace_item_id: workspaceItem.id,
  p_user_id: user.id
});
```

#### **Clear Workspace Session** - `RPC /clear_workspace_session`
Deletes all items in a workspace session and the session itself.

```typescript
interface ClearWorkspaceSessionRequest {
  p_session_id: string;
  p_user_id: string;
}

interface ClearWorkspaceSessionResponse {
  success: boolean;
}
```

**Example Usage:**
```typescript
const { data: success, error } = await supabase.rpc('clear_workspace_session', {
  p_session_id: sessionId,
  p_user_id: user.id
});
```

### **3. Content Generation**

#### **Enhance Prompt** - `POST /enhance-prompt`
AI-powered prompt enhancement service.

```typescript
interface EnhancePromptRequest {
  prompt: string;
  model_type?: 'qwen_base' | 'qwen_instruct';
  content_mode?: 'sfw' | 'nsfw';
  use_case?: 'enhancement' | 'chat' | 'roleplay';
}

interface EnhancePromptResponse {
  success: boolean;
  enhanced_prompt: string;
  original_prompt: string;
  enhancement_metadata: {
    model_used: string;
    template_used: string;
    enhancement_time_ms: number;
    [key: string]: any;
  };
}
```

#### **Generate Admin Image** - `POST /generate-admin-image`
Admin-only image generation bypass.

```typescript
interface GenerateAdminImageRequest {
  prompt: string;
  model_type: string;
  quality: 'fast' | 'high';
}

interface GenerateAdminImageResponse {
  success: boolean;
  image_url: string;
  job_id: string;
}
```

### **4. Worker Management**

#### **Get Active Worker URL** - `POST /get-active-worker-url`
Returns active worker endpoints.

```typescript
interface GetWorkerUrlRequest {
  worker_type: 'chat' | 'wan' | 'sdxl';
}

interface GetWorkerUrlResponse {
  success: boolean;
  worker_url: string;
  worker_type: string;
  last_updated: string;
}
```

#### **Register Chat Worker** - `POST /register-chat-worker`
Registers a new chat worker endpoint.

```typescript
interface RegisterChatWorkerRequest {
  worker_url: string;
  worker_id: string;
}

interface RegisterChatWorkerResponse {
  success: boolean;
  message: string;
}
```

#### **Update Worker URL** - `POST /update-worker-url`
Updates worker endpoint URLs.

```typescript
interface UpdateWorkerUrlRequest {
  worker_type: 'chat' | 'wan' | 'sdxl';
  worker_url: string;
  worker_id: string;
}

interface UpdateWorkerUrlResponse {
  success: boolean;
  message: string;
}
```

### **5. Playground & Testing**

#### **Playground Chat** - `POST /playground-chat`
Chat functionality for the playground.

```typescript
interface PlaygroundChatRequest {
  message: string;
  conversation_id?: string;
  model_type?: 'qwen_base' | 'qwen_instruct';
}

interface PlaygroundChatResponse {
  success: boolean;
  response: string;
  conversation_id: string;
  metadata: {
    model_used: string;
    response_time_ms: number;
    [key: string]: any;
  };
}
```

#### **Validate Enhancement Fix** - `POST /validate-enhancement-fix`
Validates enhancement fixes and improvements.

```typescript
interface ValidateEnhancementRequest {
  original_prompt: string;
  enhanced_prompt: string;
  test_cases: string[];
}

interface ValidateEnhancementResponse {
  success: boolean;
  validation_results: {
    test_case: string;
    passed: boolean;
    score: number;
    feedback: string;
  }[];
}
```

## 🗄️ Database API

### **Workspace Tables**

#### **workspace_sessions**
```sql
-- Query active workspace sessions for user
SELECT * FROM workspace_sessions 
WHERE user_id = $1 AND is_active = true 
ORDER BY created_at DESC;

-- Create new workspace session
INSERT INTO workspace_sessions (user_id, session_name)
VALUES ($1, $2) RETURNING id;

-- Deactivate all sessions for user
UPDATE workspace_sessions 
SET is_active = false 
WHERE user_id = $1 AND is_active = true;
```

#### **workspace_items**
```sql
-- Query workspace items for session
SELECT * FROM workspace_items 
WHERE session_id = $1 
ORDER BY created_at DESC;

-- Query workspace items by status
SELECT * FROM workspace_items 
WHERE user_id = $1 AND status = $2 
ORDER BY created_at DESC;

-- Update workspace item status
UPDATE workspace_items 
SET status = $2, updated_at = NOW() 
WHERE id = $1;

-- Delete workspace item
DELETE FROM workspace_items WHERE id = $1 AND user_id = $2;
```

#### **jobs (Updated)**
```sql
-- Query jobs by destination
SELECT * FROM jobs 
WHERE user_id = $1 AND destination = $2 
ORDER BY created_at DESC;

-- Query workspace jobs
SELECT * FROM jobs 
WHERE workspace_session_id = $1 
ORDER BY created_at DESC;

-- Update job with workspace session
UPDATE jobs 
SET workspace_session_id = $2, destination = 'workspace' 
WHERE id = $1;
```

### **Real-time Subscriptions**

#### **Workspace Items Subscription**
```typescript
// Subscribe to workspace item changes
const workspaceSubscription = supabase
  .channel('workspace_items')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'workspace_items',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    console.log('Workspace item change:', payload);
    // Handle workspace item updates
  })
  .subscribe();
```

#### **Job Status Subscription**
```typescript
// Subscribe to job status changes
const jobSubscription = supabase
  .channel('jobs')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'jobs',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    console.log('Job status change:', payload);
    // Handle job status updates
  })
  .subscribe();
```

## 🔄 API Workflows

### **Dual-Destination Generation Workflow**

#### **1. Create Workspace Session**
```