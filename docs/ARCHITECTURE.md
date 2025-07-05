# OurVidz.com - Technical Architecture

**Last Updated:** July 5, 2025  
**System:** Dual Worker Architecture on RTX 6000 ADA (48GB VRAM)

---

## **System Architecture Overview**

### **High-Level Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Workers       │
│   (React/TS)    │◄──►│   (Supabase)    │◄──►│   (RunPod)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Components │    │   Edge Functions│    │   Dual Workers  │
│   - Job Selection│    │   - queue-job   │    │   - SDXL Worker │
│   - Asset Display│    │   - job-callback│    │   - WAN Worker  │
│   - Workspace   │    │   - Auth        │    │   - Orchestrator│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Dual Worker System**
```yaml
Worker Architecture:
  SDXL Worker:
    Queue: sdxl_queue (2s polling)
    Job Types: sdxl_image_fast, sdxl_image_high
    Performance: 3-8 seconds
    VRAM Usage: 6.6GB loaded, 10.5GB peak
    Status: ✅ Fully operational

  WAN Worker:
    Queue: wan_queue (5s polling)
    Job Types: 8 types (4 standard + 4 enhanced)
    Performance: 67-294 seconds
    VRAM Usage: 15-30GB peak
    Enhancement: Qwen 7B (14.6s)
    Status: ✅ Ready for deployment

  Orchestrator:
    Type: dual_orchestrator.py
    Purpose: Manage both workers concurrently
    Features: Process monitoring, auto-restart, status reporting
    Status: ✅ Production ready
```

---

## **Frontend Architecture**

### **Technology Stack**
```yaml
Core Framework:
  React: 18.x with TypeScript
  Build Tool: Vite
  Styling: Tailwind CSS + shadcn/ui components
  State Management: React Context + React Query
  Routing: React Router

Key Libraries:
  @tanstack/react-query: Server state management
  @supabase/supabase-js: Backend integration
  lucide-react: Icons
  sonner: Toast notifications
  react-hook-form: Form handling
```

### **Component Architecture**
```yaml
Layout Components:
  OurVidzDashboardLayout: Main dashboard layout
  PortalLayout: Modal/overlay layouts
  AuthHeader: Authentication header

Core Features:
  Workspace: Main generation interface
  Library: Asset management and display
  Dashboard: User overview and navigation

Generation Components:
  FastImageGenerator: SDXL fast generation
  HighImageGenerator: SDXL high-quality generation
  FastVideoGenerator: WAN fast video generation
  HighVideoGenerator: WAN high-quality video generation
  Enhanced Generators: Qwen-enhanced versions (pending)

Asset Management:
  MediaGrid: Asset display grid
  AssetCard: Individual asset display
  AssetFilters: Filtering and sorting
  AssetTableView: Table view of assets
  LibraryImportModal: Import from library to workspace
```

### **State Management**
```yaml
Context Providers:
  AuthContext: User authentication state
  GenerationContext: Generation state and progress

Custom Hooks:
  useGeneration: Generation workflow management
  useGenerationStatus: Real-time status updates
  useJobQueue: Job queue management
  useAssets: Asset management with React Query
  useWorkspace: Workspace state management
  useGenerationWorkspace: Auto-add generated content
  useProject: Project-level state
```

---

## **Backend Architecture**

### **Supabase Services**
```yaml
Database (PostgreSQL):
  Tables:
    - jobs: Job tracking and status
    - assets: Generated content metadata
    - user_profiles: User information
    - job_formats: Format configurations
    - job_qualities: Quality configurations

  RLS Policies:
    - Users can only access their own data
    - Job status updates restricted to workers
    - Asset access controlled by ownership

Storage:
  Buckets:
    - sdxl_image_fast: SDXL fast images
    - sdxl_image_high: SDXL high-quality images
    - image_fast: WAN fast images
    - image_high: WAN high-quality images
    - video_fast: WAN fast videos
    - video_high: WAN high-quality videos
    - image7b_fast_enhanced: Enhanced fast images
    - image7b_high_enhanced: Enhanced high-quality images
    - video7b_fast_enhanced: Enhanced fast videos
    - video7b_high_enhanced: Enhanced high-quality videos

  Policies:
    - Private access (authenticated users only)
    - File size limits: 20MB images, 100MB videos
    - Allowed types: PNG, MP4

Edge Functions:
  queue-job: Job creation and queue routing
  job-callback: Job completion handling
  generate-admin-image: Admin image generation
```

### **Redis Queue System**
```yaml
Provider: Upstash Redis (REST API)
Queues:
  sdxl_queue: SDXL job processing (2s polling)
  wan_queue: WAN job processing (5s polling)

Job Structure:
  id: Unique job identifier
  type: Job type (e.g., sdxl_image_fast)
  prompt: User input prompt
  config: Generation parameters
  user_id: User identifier
  created_at: Timestamp
  status: pending/processing/completed/failed
```

---

## **Worker System Architecture**

### **SDXL Worker Implementation**
```python
# sdxl_worker.py
class SDXLWorker:
    def __init__(self):
        self.model_path = "/workspace/models/sdxl-lustify"
        self.device = "cuda"
        self.pipe = None  # Lazy loading
        
    def load_model(self):
        # Load SDXL model with NSFW capabilities
        # 6.5GB model size, 6.6GB VRAM usage
        
    def generate(self, prompt, config):
        # Generate 6 images per job
        # Performance: 3-8 seconds
        # Output: 1024x1024 PNG images
```

### **Enhanced WAN Worker Implementation**
```python
# enhanced_wan_worker.py
class EnhancedWANWorker:
    def __init__(self):
        self.wan_path = "/workspace/models/wan2.1-t2v-1.3b"
        self.qwen_model = "Qwen/Qwen2.5-7B-Instruct"
        self.device = "cuda"
        
    def enhance_prompt(self, prompt):
        # Qwen 7B prompt enhancement
        # Performance: 14.6 seconds
        # Output: Enhanced Chinese prompt
        
    def generate_video(self, enhanced_prompt, config):
        # WAN 2.1 video generation
        # Performance: 67-280 seconds
        # Output: MP4 video files
```

### **Dual Orchestrator**
```python
# dual_orchestrator.py
class DualOrchestrator:
    def __init__(self):
        self.sdxl_worker = SDXLWorker()
        self.wan_worker = EnhancedWANWorker()
        self.redis_client = RedisClient()
        
    def start_workers(self):
        # Start both workers concurrently
        # Monitor processes and restart if needed
        # Report status to monitoring system
        
    def process_jobs(self):
        # Poll sdxl_queue and wan_queue
        # Route jobs to appropriate workers
        # Handle job completion callbacks
```

---

## **Data Flow Architecture**

### **Job Processing Flow**
```yaml
1. User Input:
   Frontend: User enters prompt and selects job type
   Validation: Client-side validation of input

2. Job Creation:
   Edge Function: queue-job.ts creates job record
   Database: Job stored in jobs table
   Queue: Job added to appropriate Redis queue

3. Worker Processing:
   Worker: Polls queue for new jobs
   Enhancement: Qwen 7B enhances prompt (if enhanced job)
   Generation: Model generates content
   Storage: Content uploaded to Supabase bucket

4. Completion:
   Callback: job-callback.ts updates job status
   Database: Asset metadata stored in assets table
   Frontend: Real-time status updates via polling
```

### **Asset Management Flow**
```yaml
1. Generation Complete:
   Worker: Uploads generated content to bucket
   Metadata: Stores asset information in database
   Status: Updates job status to completed

2. Frontend Display:
   React Query: Fetches assets from database
   Grid Display: MediaGrid shows assets
   Filtering: AssetFilters allow sorting/filtering

3. User Interaction:
   Preview: AssetPreviewModal shows full-size content
   Download: Direct download from Supabase bucket
   Delete: Asset deletion with confirmation
```

---

## **Performance Architecture**

### **GPU Memory Management**
```yaml
RTX 6000 ADA (48GB VRAM):
  SDXL Worker:
    Model Load: 6.6GB
    Generation Peak: 10.5GB
    Cleanup: 0GB (perfect cleanup)
    
  WAN Worker:
    Model Load: ~15GB
    Generation Peak: 15-30GB
    Qwen Enhancement: 8-12GB
    
  Concurrent Operation:
    Total Peak: ~35GB
    Available: 13GB headroom
    Strategy: Sequential loading/unloading
```

### **Optimization Strategies**
```yaml
Model Loading:
  Lazy Loading: Models loaded only when needed
  Persistence: All models stored on network volume
  Caching: Models remain in memory during session
  
Queue Management:
  Polling Intervals: SDXL (2s), WAN (5s)
  Job Batching: SDXL generates 6 images per job
  Priority Handling: Fast jobs processed first
  
Storage Optimization:
  Compression: Videos compressed for storage
  Cleanup: Temporary files removed after processing
  Bucket Organization: Separate buckets by job type
```

---

## **Security Architecture**

### **Authentication & Authorization**
```yaml
Supabase Auth:
  Provider: Supabase Auth with email/password
  Session Management: JWT tokens
  RLS Policies: Row-level security on all tables
  
Access Control:
  User Isolation: Users can only access their own data
  Job Security: Jobs tied to authenticated users
  Asset Protection: Assets protected by user ownership
```

### **API Security**
```yaml
Edge Functions:
  Authentication: Required for all job operations
  Rate Limiting: Built into Supabase
  Input Validation: Server-side validation
  
Worker Security:
  Environment Variables: Sensitive data in env vars
  Network Isolation: Workers in secure environment
  Model Access: Models stored in secure volume
```

---

## **Monitoring & Observability**

### **System Monitoring**
```yaml
Worker Health:
  Process Monitoring: Dual orchestrator tracks worker processes
  Auto-Restart: Failed workers automatically restarted
  Status Reporting: Real-time status updates
  
Performance Tracking:
  Job Timing: Generation time tracking per job type
  Success Rates: Job completion success rates
  Resource Usage: GPU memory and utilization monitoring
  
Error Handling:
  Job Failures: Failed jobs logged with error details
  Retry Logic: Automatic retry for transient failures
  User Notifications: Error messages sent to users
```

### **Logging Strategy**
```yaml
Application Logs:
  Frontend: Console logs for debugging
  Backend: Supabase logs for API calls
  Workers: File-based logging for job processing
  
Monitoring Tools:
  Supabase Dashboard: Database and API monitoring
  RunPod Dashboard: GPU and resource monitoring
  Custom Metrics: Job success rates and performance
```

---

## **Deployment Architecture**

### **Environment Configuration**
```yaml
Development:
  Frontend: Local development server
  Backend: Supabase development project
  Workers: Local testing environment
  
Production:
  Frontend: Vercel/Netlify deployment
  Backend: Supabase production project
  Workers: RunPod production environment
  
Environment Variables:
  SUPABASE_URL: Backend connection
  SUPABASE_ANON_KEY: Frontend authentication
  SUPABASE_SERVICE_KEY: Backend operations
  UPSTASH_REDIS_REST_URL: Queue connection
  UPSTASH_REDIS_REST_TOKEN: Queue authentication
```

### **Scaling Considerations**
```yaml
Current Capacity:
  Single GPU: RTX 6000 ADA (48GB)
  Concurrent Jobs: 1 SDXL + 1 WAN simultaneously
  Queue Capacity: Unlimited (Redis-based)
  
Future Scaling:
  Multi-GPU: Additional RunPod instances
  Load Balancing: Multiple worker instances
  Auto-Scaling: Dynamic worker allocation based on queue depth
```

---

## **Integration Points**

### **External Services**
```yaml
Supabase:
  Database: PostgreSQL with RLS
  Storage: Object storage with policies
  Auth: User authentication and sessions
  Edge Functions: Serverless API endpoints
  
Upstash Redis:
  Queue Management: Job queuing and processing
  REST API: HTTP-based queue operations
  Persistence: Queue data persistence
  
RunPod:
  GPU Infrastructure: RTX 6000 ADA instances
  Network Storage: Persistent model storage
  Container Management: Worker deployment
```

### **API Endpoints**
```yaml
Frontend → Backend:
  POST /api/queue-job: Create new generation job
  GET /api/jobs: Fetch user's jobs
  GET /api/assets: Fetch user's assets
  DELETE /api/assets/:id: Delete asset
  
Backend → Workers:
  Redis Queues: Job distribution
  HTTP Callbacks: Job completion notifications
  
Workers → Backend:
  POST /api/job-callback: Update job status
  Storage Upload: Upload generated content
```

---

## **Development Workflow**

### **Code Organization**
```yaml
Frontend Structure:
  src/
    components/: Reusable UI components
    pages/: Route components
    hooks/: Custom React hooks
    contexts/: React context providers
    lib/: Utility functions and services
    types/: TypeScript type definitions
    
Backend Structure:
  supabase/
    functions/: Edge functions
    migrations/: Database migrations
    config.toml: Supabase configuration
    
Worker Structure:
  workers/: Python worker scripts
  models/: Model storage and configuration
  requirements.txt: Python dependencies
```

### **Testing Strategy**
```yaml
Frontend Testing:
  Unit Tests: Component testing with Jest
  Integration Tests: API integration testing
  E2E Tests: Full workflow testing
  
Backend Testing:
  Edge Functions: Function testing
  Database: Migration testing
  API: Endpoint testing
  
Worker Testing:
  Model Loading: Model initialization testing
  Generation: Output quality testing
  Performance: Timing and resource usage testing
```

**Status: 🏗️ ARCHITECTURE COMPLETE - READY FOR IMPLEMENTATION** 