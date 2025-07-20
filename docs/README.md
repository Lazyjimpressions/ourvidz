# OurVidz.com - Project Documentation

**Last Updated:** July 20, 2025  
**Current Status:** ✅ Production Ready - All 10 Job Types Operational + Multi-Reference System Live  
**System:** Dual Worker (SDXL + WAN) on RTX 6000 ADA (48GB VRAM)  
**Deployment:** Production on Lovable (https://ourvidz.lovable.app/)  
**Backend:** Supabase Online (PostgreSQL + Edge Functions + Storage)

---

## **📋 Project Overview**

OurVidz.com is an AI-powered platform for generating adult content videos and images. The system features:

- **Ultra-Fast Images**: SDXL generation in 3-8 seconds (flexible quantities: 1,3,6 images)
- **WAN Video Generation**: 135-240+ seconds per video
- **Multi-Reference System**: Optional image-to-image with style, composition, and character references
- **Seed Control**: Reproducible generation with user-controlled seeds
- **Enhanced Negative Prompts**: Intelligent generation for SDXL with multi-party scene detection
- **NSFW-Capable**: Apache 2.0 licensed models, no content restrictions
- **Preview-Approve Workflow**: User approval before final generation
- **Mobile-First Design**: Optimized for modern usage patterns

---

## **🎯 Current System Status**

### **✅ PRODUCTION READY**
- **Dual Worker System**: SDXL + WAN workers operational on RTX 6000 ADA
- **All 10 Job Types**: Live and operational with flexible SDXL quantities
- **Multi-Reference System**: Style, composition, and character references
- **Enhanced Negative Prompts**: Intelligent SDXL generation with multi-party scene detection
- **Seed Control**: Reproducible generation with user-controlled seeds
- **Backend**: Supabase Online + Upstash Redis fully operational
- **Frontend**: Deployed on Lovable production
- **Edge Functions**: All 4 functions operational (queue-job, job-callback, enhance-prompt, generate-admin-image)

### **✅ ALL FEATURES OPERATIONAL**
- **SDXL Jobs**: sdxl_image_fast, sdxl_image_high (flexible 1,3,6 images)
- **WAN Standard Jobs**: image_fast, image_high, video_fast, video_high
- **WAN Enhanced Jobs**: All 4 enhanced job types with Qwen enhancement
- **Prompt Enhancement**: AI-powered prompt enhancement via edge function
- **File Storage**: Proper bucket mapping and URL generation
- **Real-time Updates**: WebSocket connections for live status updates

---

## **📊 Performance Baselines**

### **✅ All Job Types Operational (July 20, 2025)**
| Job Type | Status | Performance | Output | Features |
|----------|--------|-------------|--------|----------|
| **sdxl_image_fast** | ✅ Live | 3-8s per image | 1,3,6 images | Negative prompts, seeds, references |
| **sdxl_image_high** | ✅ Live | 5-12s per image | 1,3,6 images | Negative prompts, seeds, references |
| **image_fast** | ✅ Live | 25-40s | 1 image | Reference images |
| **image_high** | ✅ Live | 40-100s | 1 image | Reference images |
| **video_fast** | ✅ Live | 135-180s | 1 video | Reference frames |
| **video_high** | ✅ Live | 180-240s | 1 video | Reference frames |
| **image7b_fast_enhanced** | ✅ Live | 85-100s | 1 image | Qwen enhancement |
| **image7b_high_enhanced** | ✅ Live | 100-240s | 1 image | Qwen enhancement |
| **video7b_fast_enhanced** | ✅ Live | 195-240s | 1 video | Qwen enhancement |
| **video7b_high_enhanced** | ✅ Live | 240+ seconds | 1 video | Qwen enhancement |

---

## **🏗️ System Architecture**

### **Technology Stack**
```yaml
Frontend:
  Framework: React 18.x with TypeScript
  Build Tool: Vite
  Styling: Tailwind CSS + shadcn/ui components
  State Management: React Context + React Query
  Routing: React Router DOM
  Deployment: Lovable (https://ourvidz.lovable.app/)

Backend (Supabase Online):
  Database: Supabase PostgreSQL (Online)
  Authentication: Supabase Auth (Online)
  Storage: Supabase Storage (Online - 12 buckets)
  Edge Functions: Deno runtime (Online)
  Queue: Upstash Redis (REST API)

AI Workers (RunPod):
  Platform: RunPod RTX 6000 ADA (48GB VRAM)
  Models: SDXL + WAN 2.1 + Qwen 7B enhancement
  Architecture: Dual worker system
  Location: Remote cloud deployment
```

### **Dual Worker System**
```yaml
SDXL Worker:
  Queue: sdxl_queue (2s polling)
  Job Types: sdxl_image_fast, sdxl_image_high
  Performance: 3-12s per image (flexible quantities: 1,3,6)
  VRAM Usage: 6.6GB loaded, 10.5GB peak
  Features: Enhanced negative prompts, seed control, reference images
  Status: ✅ Fully operational

WAN Worker:
  Queue: wan_queue (5s polling)
  Job Types: 8 types (4 standard + 4 enhanced)
  Performance: 25-370s (single files)
  VRAM Usage: 15-30GB peak
  Enhancement: Qwen 7B (rule-based enhancement via edge function)
  Features: Video generation, enhanced image processing
  Status: ✅ Operational (all job types tested)
```

---

## **📁 Documentation Structure**

### **Current Documentation (12 Files)**
```markdown
docs/
├── README.md                    # Main project overview & current status
├── ARCHITECTURE.md              # Technical architecture & job standardization
├── API.md                       # API particulars and endpoints
├── EDGE_FUNCTIONS.md            # Full edge function implementations
├── PROMPTS.md                   # NSFW prompting best practices & reference workflows
├── TESTING.md                   # Standalone testing framework
├── ADMIN.md                     # Admin portal functionality guide
├── ourvidz-admin-prd.md         # Admin portal requirements & implementation tracking
├── updated_implementation_guide.md # Current sprint: prompt enhancement features
├── worker_api.md                # Shared worker API (cross-repo)
├── DEPLOYMENT.md                # Deployment guides
└── CHANGELOG.md                 # Version history
```

### **Key File Purposes**
- **PROMPTS.md**: NSFW prompting best practices, learnings, and reference workflows
- **TESTING.md**: Standalone testing framework for all 10 job types
- **ADMIN.md**: How admin portal functions and current capabilities
- **ourvidz-admin-prd.md**: Product requirements and implementation tracking
- **updated_implementation_guide.md**: Current sprint work for adding features
- **EDGE_FUNCTIONS.md**: Clean documentation with full edge function code
- **worker_api.md**: Shared between two GitHub repos for cross-repo context

---

## **🎯 Job Types (10 Total)**

### **SDXL Jobs (2) - Ultra-Fast Images (Flexible Quantities)**
```yaml
sdxl_image_fast:
  performance: 3-8s per image (flexible: 1,3,6 images)
  resolution: 1024x1024
  quality: excellent NSFW
  storage: sdxl_image_fast bucket
  features: Enhanced negative prompts, seed control, reference images
  credits: 1
  status: ✅ Live

sdxl_image_high:
  performance: 5-12s per image (flexible: 1,3,6 images)
  resolution: 1024x1024
  quality: premium NSFW
  storage: sdxl_image_high bucket
  features: Enhanced negative prompts, seed control, reference images
  credits: 2
  status: ✅ Live
```

### **WAN Standard Jobs (4) - Videos + Images (Single Files)**
```yaml
image_fast: 25-40s, 1 image, 1 credit, ✅ Live
image_high: 40-100s, 1 image, 2 credits, ✅ Live
video_fast: 135-180s, 1 video, 3 credits, ✅ Live
video_high: 180-240s, 1 video, 5 credits, ✅ Live
```

### **WAN Enhanced Jobs (4) - AI-Enhanced with Qwen 7B**
```yaml
image7b_fast_enhanced: 85-100s, 1 image, 2 credits, ✅ Live
image7b_high_enhanced: 100-240s, 1 image, 3 credits, ✅ Live
video7b_fast_enhanced: 195-240s, 1 video, 4 credits, ✅ Live
video7b_high_enhanced: 240+ seconds, 1 video, 6 credits, ✅ Live
```

---

## **🔧 Key Components**

### **Core Pages**
```typescript
// Main application routes
- Index.tsx              # Landing page
- Auth.tsx               # Authentication page
- Dashboard.tsx          # User dashboard
- Workspace.tsx          # Main generation interface
- Library.tsx            # Asset management
- Profile.tsx            # User profile
- Pricing.tsx            # Subscription plans
- Storyboard.tsx         # Storyboard interface
- NotFound.tsx           # 404 page
```

### **Generation Components**
```typescript
// Image and video generation
- FastImageGenerator.tsx     # SDXL fast generation (6-image batch)
- HighImageGenerator.tsx     # SDXL high-quality generation (6-image batch)
- FastVideoGenerator.tsx     # WAN fast video generation
- HighVideoGenerator.tsx     # WAN high-quality video generation
- GeneratedImageGallery.tsx  # Generated content display
- GenerationProgressIndicator.tsx # Progress tracking
```

### **Asset Management**
```typescript
// Asset handling and display
- MediaGrid.tsx              # Asset grid display
- VirtualizedMediaGrid.tsx   # Optimized grid for large datasets
- AssetCard.tsx              # Individual asset display
- AssetFilters.tsx           # Filtering and sorting
- AssetTableView.tsx         # Table view of assets
- AssetPreviewModal.tsx      # Asset preview modal
- ImageLibrary.tsx           # Image library management
- VideoCard.tsx              # Video asset display
- VideoModal.tsx             # Video preview modal
```

---

## **🚀 Edge Functions**

### **queue-job**
```typescript
// supabase/functions/queue-job/index.ts
- Validates job types (10 supported)
- Routes to appropriate queue (sdxl_queue or wan_queue)
- Generates negative prompts based on job type
- Creates database records and Redis queue entries
- Handles authentication and error responses
```

### **job-callback**
```typescript
// supabase/functions/job-callback/index.ts
- Processes completed jobs
- Updates database status
- Handles file uploads to storage
- Manages error states
```

### **generate-admin-image**
```typescript
// supabase/functions/generate-admin-image/index.ts
- Admin-only image generation
- Bypasses user authentication
- Used for testing and admin operations
```

---

## **📊 Database Schema**

### **Core Tables**
```sql
-- User management
profiles: User profiles and subscription data
user_roles: Role-based access control

-- Content generation
jobs: Job tracking and status
images: Generated image metadata
videos: Generated video metadata
projects: Project management
scenes: Scene management for storyboards

-- Content management
characters: Character definitions
usage_logs: Usage tracking and billing
```

### **Key Relationships**
```yaml
profiles (1) → (N) jobs
profiles (1) → (N) images
profiles (1) → (N) videos
profiles (1) → (N) projects
projects (1) → (N) scenes
projects (1) → (1) characters
```

---

## **🔐 Authentication & Authorization**

### **Auth Context**
```typescript
// src/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isSubscribed: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}
```

### **Role-Based Access**
```sql
-- User roles enum
app_role: "admin" | "moderator" | "premium_user" | "basic_user" | "guest"

-- Role functions
get_user_role_priority(_user_id: string) → number
has_role(_user_id: string, _role: app_role) → boolean
```

---

## **🎨 UI/UX Patterns**

### **Design System**
```yaml
Framework: shadcn/ui + Tailwind CSS
Theme: Dark mode optimized
Colors: Black background with white text
Components: Consistent design language
Responsive: Mobile-first approach
```

### **Key UI Patterns**
```typescript
// Modal patterns
- AssetPreviewModal: Image/video preview
- DeleteConfirmationModal: Confirmation dialogs
- LibraryImportModal: Import from library
- PromptInfoModal: Generation information

// Layout patterns
- OurVidzDashboardLayout: Main dashboard layout
- PortalLayout: Modal/overlay layouts
- Responsive containers for mobile/desktop

// Navigation patterns
- ScrollNavigation: Smooth scrolling
- AuthHeader: Authentication header
- WorkspaceHeader: Workspace navigation
```

---

## **🔧 Development Scripts**

### **Available Commands**
```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Supabase types
npm run db:push          # Push migrations to Supabase
npm run db:reset         # Reset database
```

---

## **📈 Performance Optimizations**

### **Frontend Optimizations**
```typescript
// Virtualization for large datasets
VirtualizedMediaGrid: Handles thousands of assets efficiently
useLazyAssets: Lazy loading for asset data
React Query: Intelligent caching and background updates

// Bundle optimization
Vite: Fast development and optimized builds
Tree shaking: Unused code elimination
Code splitting: Route-based splitting
```

### **Backend Optimizations**
```yaml
Database:
  - Indexed queries for performance
  - RLS policies for security
  - Efficient storage bucket organization

Queue System:
  - Redis for fast job processing
  - Separate queues for different job types
  - Optimized polling intervals
```

---

## **📁 Key File Locations**

### **Frontend (React/TypeScript)**
```
src/
├── components/
│   ├── PromptEnhancementModal.tsx    # AI prompt enhancement interface
│   ├── workspace/
│   │   ├── MultiReferencePanel.tsx   # Multi-reference image management
│   │   ├── CharacterReferenceWarning.tsx
│   │   ├── EnhancedSeedInput.tsx     # Seed input controls
│   │   └── SeedDisplay.tsx           # Seed display
│   ├── generation/                   # Generation components
│   ├── admin/                        # Admin components
│   └── library/                      # Asset management
├── hooks/
│   ├── useGeneration.ts              # Main generation workflow
│   ├── useRealtimeGenerationStatus.ts # Real-time status updates
│   └── useJobQueue.ts                # Job queue management
├── pages/
│   ├── Workspace.tsx                 # Main generation interface
│   ├── Library.tsx                   # Asset management
│   └── Admin.tsx                     # Admin dashboard
└── integrations/supabase/
    ├── client.ts                     # Supabase client configuration
    └── types.ts                      # Generated TypeScript types
```

### **Backend (Supabase Online)**
```
supabase/
├── functions/                        # Edge Functions (Online)
│   ├── queue-job/index.ts           # Job submission and routing
│   ├── job-callback/index.ts        # Worker callback processing
│   ├── enhance-prompt/index.ts      # AI prompt enhancement service
│   └── generate-admin-image/index.ts # Admin image generation
├── migrations/                       # Database migrations
└── config.toml                      # Supabase configuration
```

### **Critical Integrations**

#### **Supabase Online (Backend)**
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with JWT tokens
- **Storage**: 12 buckets for different job types
- **Edge Functions**: Deno runtime for serverless functions
- **Real-time**: WebSocket connections for live updates

#### **RunPod Workers (AI Processing)**
- **SDXL Worker**: Lustify SDXL model for image generation
- **WAN Worker**: WAN 2.1 model for video generation
- **Enhancement**: Qwen 7B rule-based enhancement via edge function
- **Queue Management**: Redis-based job queuing

### **Edge Functions (Supabase Online)**

#### **queue-job** (`/functions/v1/queue-job`)
- **Purpose**: Job submission and queue routing
- **Authentication**: Required (JWT verification)
- **Features**: 
  - Validates 10 job types
  - Routes to appropriate queue (SDXL vs WAN)
  - Generates enhanced negative prompts for SDXL
  - Supports flexible quantities (1,3,6 images for SDXL)
  - Manages reference images and seed control

#### **job-callback** (`/functions/v1/job-callback`)
- **Purpose**: Worker callback processing
- **Authentication**: Service role key (internal)
- **Features**:
  - Standardized parameters (`job_id`, `assets` array)
  - Multi-asset support for SDXL jobs
  - Metadata preservation and merging
  - Enhanced error handling and debugging

#### **enhance-prompt** (`/functions/v1/enhance-prompt`)
- **Purpose**: AI prompt enhancement service
- **Features**:
  - Rule-based enhancement for SDXL, WAN images, and videos
  - Quality-specific enhancement strategies
  - Used by PromptEnhancementModal component

#### **generate-admin-image** (`/functions/v1/generate-admin-image`)
- **Purpose**: Admin-only image generation
- **Features**: Bypasses user authentication for testing

---

## **🔒 Security Features**

### **Authentication Security**
```typescript
// Supabase Auth integration
- JWT token management
- Session refresh handling
- Secure password requirements
- Google OAuth integration
```

### **Data Security**
```sql
-- Row Level Security (RLS)
- Users can only access their own data
- Job status updates restricted to workers
- Asset access controlled by ownership
- Admin functions protected by role checks
```

### **API Security**
```typescript
// Edge function security
- Authentication required for all endpoints
- CORS headers properly configured
- Input validation and sanitization
- Error handling without information leakage
```

---

## **🚀 Deployment Architecture**

### **Frontend Deployment**
```yaml
Platform: Lovable
URL: https://ourvidz.lovable.app/
Build: npm run build
Output: dist/ directory
Environment: Production Supabase credentials
```

### **Backend Deployment**
```yaml
Platform: Supabase
Database: PostgreSQL with RLS
Storage: 12 buckets with policies
Functions: Deno runtime edge functions
```

### **Worker Deployment**
```yaml
Platform: RunPod
Instance: RTX 6000 ADA (48GB VRAM)
Models: Persistent storage on network volume
Orchestration: dual_orchestrator.py
```

---

## **📊 Monitoring & Logging**

### **Frontend Logging**
```typescript
// Comprehensive logging throughout the app
console.log('🚀 Generation started:', { format, prompt });
console.log('✅ Job queued successfully:', { jobId, format });
console.log('❌ Generation failed:', { error, jobId });
```

### **Backend Logging**
```typescript
// Edge function logging
console.log('🚀 Queue-job function called');
console.log('✅ User authenticated:', user.id);
console.log('📋 Creating job:', { jobType, userId });
```

### **Performance Monitoring**
```yaml
Generation Times:
  - SDXL: 29.9-42.4 seconds (measured)
  - WAN Standard: 251-360 seconds (measured)
  - WAN Enhanced: 233-370 seconds (measured)

VRAM Usage:
  - SDXL: 6.6GB loaded, 10.5GB peak
  - WAN: 15-30GB peak
  - Total: ~35GB (13GB headroom)
```

---

## **🔄 Development Workflow**

### **Git Workflow**
```bash
# Feature development
git checkout -b feature/your-feature-name
# Make changes and commit
git add .
git commit -m "feat: add your feature description"
# Push and create PR
git push origin feature/your-feature-name
```

### **Code Quality**
```yaml
Linting: ESLint with TypeScript rules
Formatting: Prettier integration
Type Safety: Strict TypeScript configuration
Testing: Component testing (to be implemented)
```

---

## **🎯 Current Status & Next Steps**

### **✅ Completed Features**
- Dual worker system operational
- All 10 job types supported
- Frontend UI components complete
- Authentication system working
- Asset management system
- Real-time status updates
- Mobile-responsive design
- Production deployment on Lovable

### **🚧 In Progress**
- Complete testing of remaining job types (1/10 pending)
- Performance optimization
- Documentation consolidation
- User experience improvements

### **📋 Planned Features**
- Character consistency with IP-Adapter
- Extended video generation (15s-30s)
- Full 30-minute video productions
- Advanced storyboard features
- Enhanced mobile experience

---

## **🤝 Contributing**

### **Development Setup**
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start development server: `npm run dev`

### **Code Standards**
- Follow TypeScript best practices
- Use shadcn/ui components for consistency
- Implement proper error handling
- Add comprehensive logging
- Write clear commit messages

### **Testing Strategy**
- Component testing with React Testing Library
- Integration testing for generation workflows
- End-to-end testing for critical user journeys
- Performance testing for large datasets

---

## **📚 Documentation Navigation**

### **Quick Reference**
- **[API Reference](API.md)** - Complete API documentation and examples
- **[Performance Data](PERFORMANCE.md)** - Performance benchmarks and optimization
- **[Architecture](ARCHITECTURE.md)** - Technical system architecture
- **[Services](SERVICES.md)** - Service configurations and setup
- **[Changelog](CHANGELOG.md)** - Version history and changes

### **Development Guides**
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Worker Setup](WORKER_API.md)** - Worker configuration and API
- **[Edge Functions](EDGE_FUNCTIONS.md)** - Supabase edge function details

### **Project Information**
- **[Project Status](PROJECT_STATUS.md)** - Current development status
- **[Performance Benchmarks](PERFORMANCE_BENCHMARKS.md)** - Detailed performance analysis
- **[Server Overview](SERVERCODEBASE_OVERVIEW.md)** - Server-side codebase overview

---

## **📋 Success Metrics**

### **Phase 1 Complete ✅**
- [x] Dual worker system operational
- [x] SDXL batch generation working (6 images per job)
- [x] All 10 job types defined and supported
- [x] Storage buckets properly configured
- [x] Frontend deployed to production
- [x] Authentication system implemented

### **Phase 2 Success Criteria**
- [ ] All 10 job types tested and verified
- [ ] Performance benchmarks established
- [ ] Qwen worker integrated and tested
- [ ] Enhanced job quality improved
- [ ] Admin dashboard implemented
- [ ] System reliability >99% uptime

### **Business Impact Projections**
```yaml
Enhanced Features Value:
  Quality Improvement: Professional vs amateur prompts
  User Experience: Simple input → cinema-quality output
  Competitive Advantage: Only platform with AI prompt enhancement
  Revenue Impact: Premium features justify higher pricing

Technical Performance:
  Job Success Rate: >95% for all job types
  Average Generation Time: SDXL <10s, WAN <300s
  System Reliability: >99% uptime
  User Satisfaction: >4.5/5.0 for enhanced jobs
```

---

## **Quick Reference**

### **System Specifications**
- **GPU**: RTX 6000 ADA (48GB VRAM)
- **Queues**: sdxl_queue (2s polling), wan_queue (5s polling)
- **Storage**: 48GB network volume with all models
- **Frontend**: React + TypeScript + Tailwind + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Queue**: Upstash Redis (REST API)
- **Deployment**: Lovable (https://ourvidz.lovable.app/)

### **Current Status Summary**
- **Infrastructure**: ✅ Complete and operational
- **Backend Integration**: ✅ All services working
- **Worker System**: ✅ Dual workers operational
- **Frontend Integration**: ✅ All 10 job types available
- **Testing Status**: 🚧 9/10 job types verified
- **Production Deployment**: ✅ Live on Lovable

### **Known Issues**
```yaml
Enhanced Video Quality:
  Issue: Enhanced video generation working but quality not great
  Problem: Adult/NSFW enhancement doesn't work well out of the box
  Impact: Adds 60 seconds to video generation
  Solution: Planning to use Qwen for prompt enhancement instead

File Storage Mapping:
  Issue: Job types to storage bucket mapping complexity
  Problem: URL generation and file presentation on frontend
  Impact: SDXL returns 6 images vs WAN returns single file
  Solution: Proper array handling for SDXL, single URL for WAN
```

**Status: 🚧 TESTING PHASE - 9/10 Job Types Verified** 