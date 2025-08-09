# OurVidz.com - Project Documentation

**Last Updated:** August 4, 2025  
**Current Status:** ✅ Production Ready - LTX-Style Workspace System Active, All 10 Job Types Operational  
**System:** Triple Worker (SDXL + Chat + WAN) on RTX 6000 ADA (48GB VRAM)  
**Deployment:** Production on Lovable (https://ourvidz.lovable.app/)  
**Backend:** Supabase Online (PostgreSQL + Edge Functions + Storage)

---

## **📋 Project Overview**

OurVidz.com is an AI-powered platform for generating adult content videos and images. The system features:

- **Ultra-Fast Images**: SDXL generation in 3-8 seconds (flexible quantities: 1,3,6 images)
- **WAN Video Generation**: 135-240+ seconds per video
- **LTX-Style Workspace System**: Job-level grouping with thumbnail selector and hover-to-delete functionality
- **Dynamic Prompting System**: 12 specialized templates for all models and use cases
- **Multi-Reference System (SDXL Only)**: Optional image-to-image with separate style, composition, and character references
- **Reference Image Storage**: Dedicated Supabase bucket for user-uploaded/third-party reference images
- **Seed Control**: Reproducible generation with user-controlled seeds
- **Enhanced Negative Prompts**: Intelligent generation for SDXL with multi-party scene detection
- **AI-Powered Enhancement**: Model-specific optimization with Qwen Base/Instruct
- **Auto-Enhancement**: Intelligent triggers based on prompt quality analysis
- **NSFW-Capable**: Apache 2.0 licensed models, no content restrictions
- **Preview-Approve Workflow**: User approval before final generation
- **Mobile-First Design**: Optimized for modern usage patterns

---

## **🎯 Current System Status**

### **✅ PRODUCTION READY**
- **Triple Worker System**: SDXL + Chat + WAN workers operational on RTX 6000 ADA
- **LTX-Style Workspace System**: Job-level grouping with thumbnail selector and hover-to-delete functionality
- **Dynamic Prompting System**: 12 specialized templates for all models and use cases
- **All 10 Job Types**: Live and operational with flexible SDXL quantities
- **Multi-Reference System (SDXL Only)**: Style, composition, and character references
- **Reference Image Storage**: Dedicated bucket for user/third-party reference images
- **Enhanced Negative Prompts**: Intelligent SDXL generation with multi-party scene detection
- **Seed Control**: Reproducible generation with user-controlled seeds
- **Backend**: Supabase Online + Upstash Redis fully operational
- **Frontend**: Deployed on Lovable production
- **Edge Functions**: All functions operational including enhance-prompt with dynamic templates
- **Callback & Queue Standardization**: All edge functions and workers use standardized parameters

### **✅ ALL FEATURES OPERATIONAL**
- **SDXL Jobs**: sdxl_image_fast, sdxl_image_high (flexible 1,3,6 images)
- **WAN Standard Jobs**: image_fast, image_high, video_fast, video_high
- **WAN Enhanced Jobs**: All 4 enhanced job types with Qwen enhancement
- **AI-Powered Enhancement**: ContentCompliantEnhancementOrchestrator with system prompts
- **Auto-Enhancement**: Intelligent triggers and quality-based decisions
- **File Storage**: Proper bucket mapping and URL generation
- **Real-time Updates**: WebSocket connections for live status updates
- **LTX-Style Workspace**: Job-level grouping with thumbnail navigation and hover-to-delete

---

## **🆕 Notable Improvements in 1.3.0 (August 4, 2025)**
- **LTX-Style Workspace Refactoring**: Complete workspace system overhaul with job-level grouping
- **Job-Level Management**: Items grouped by `job_id` with thumbnail navigation
- **Two-Level Deletion**: Dismiss (hide) vs Delete (permanent removal) functionality
- **Thumbnail Selector**: Right-side navigation with job thumbnails and hover-to-delete
- **Storage Path Normalization**: Fixed signed URL generation across all components
- **Legacy Component Cleanup**: Removed old workspace system (6 files deleted)
- **Code Reduction**: 718 lines of code removed (net reduction)
- **Dynamic Prompting System**: 12+ specialized templates for all models and use cases
- **Model-Specific Optimization**: Tailored for Qwen Base vs Instruct behaviors
- **Content Mode Awareness**: Appropriate language for SFW/NSFW contexts
- **Token Limit Enforcement**: Prevents CLIP truncation and ensures quality
- **Professional Comments**: Design decisions documented for each template
- **Version Control**: Template versioning and update tracking
- **Admin Control**: Real-time template management via admin interface
- **Comprehensive Coverage**: Enhancement, chat, roleplay, and admin use cases

---

## **📊 Performance Baselines**

### **✅ All Job Types Operational (August 4, 2025)**
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

### **🚀 Hybrid Enhancement System Performance**
- **Enhancement Success Rate**: >95% (multi-tier fallback system)
- **Token Optimization**: <77 tokens for SDXL ✅, appropriate limits for WAN ✅
- **Response Time**: <3 seconds (worker health monitoring)
- **Fallback Rate**: <10% (intelligent worker selection)

### **🎯 LTX-Style Workspace Performance**
- **Job-Level Grouping**: Items automatically grouped by `job_id`
- **Thumbnail Navigation**: Right-side selector for job navigation
- **Hover-to-Delete**: Delete entire jobs by hovering over thumbnails
- **Two-Level Deletion**: Dismiss (hide) vs Delete (permanent removal)
- **Storage Path Normalization**: Fixed signed URL generation across all components
- **Real-time Updates**: Live workspace updates via WebSocket

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
  Enhancement Hooks: useEnhancementAnalytics, useEnhancementQuality, useAutoEnhancement
  LTX-Style Workspace: useSimplifiedWorkspaceState, useRealtimeWorkspace
  Deployment: Lovable (https://ourvidz.lovable.app/)

Backend (Supabase Online):
  Database: Supabase PostgreSQL (Online)
  Authentication: Supabase Auth (Online)
  Storage: Supabase Storage (Online - 13 buckets)
  Edge Functions: Deno runtime (Online)
  Enhancement: ContentCompliantEnhancementOrchestrator
  Queue: Upstash Redis (REST API)

AI Workers (RunPod RTX 6000 ADA):
  SDXL Worker: Fast image generation (3-8s per image)
  Chat Worker: Qwen 2.5-7B Instruct for prompt enhancement
  WAN Worker: Video generation with Qwen 7B Base enhancement
```

### **Triple Worker System**
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

Chat Worker:
  API: Flask API on Port 7861
  Model: Qwen 2.5-7B Instruct
  Features: Chat, roleplay, prompt enhancement
  Status: ✅ Fully operational
```

---

## **📁 Documentation Structure**

### **Current Documentation (16 Files)**
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
├── CHANGELOG.md                 # Version history
├── 12-SDXL_PROMPTING_GUIDE.md   # Comprehensive SDXL image generation guide
├── 13-WAN_PROMPTING_GUIDE.md    # Comprehensive WAN video generation guide
├── 14-PROMPT_BUILDER_USAGE_GUIDE.md # AI prompt builder assistant usage guide
└── 15-PROMPT_BUILDER_ENHANCEMENT_SUMMARY.md # Summary of prompt builder improvements
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
- SimplifiedWorkspace.tsx # LTX-style workspace interface
- Library.tsx            # Asset management
- Profile.tsx            # User profile
- Pricing.tsx            # Subscription plans
- Storyboard.tsx         # Storyboard interface
- NotFound.tsx           # 404 page
```

### **LTX-Style Workspace Components**
```typescript
// Workspace components with job-level grouping
- WorkspaceGrid.tsx      # LTX-style grid layout with job grouping
- ContentCard.tsx        # Individual cards with dismiss/delete actions
- SimplePromptInput.tsx  # Generation controls
- useSimplifiedWorkspaceState.ts # LTX-style state management
- useRealtimeWorkspace.ts # Real-time updates
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
- Supports workspace destination routing
```

### **job-callback**
```typescript
// supabase/functions/job-callback/index.ts
- Processes completed jobs
- Updates database status
- Handles file uploads to storage
- Manages error states
- Routes to workspace or library based on destination
```

### **generate-admin-image**
```typescript
// supabase/functions/generate-admin-image/index.ts
- Admin-only image generation
- Bypasses user authentication
- Used for testing and admin operations
```

### **delete-workspace-item**
```typescript
// supabase/functions/delete-workspace-item/index.ts
- Deletes workspace items and associated storage files
- Handles both individual item and job-level deletion
- Supports dismiss vs delete functionality
```

---

## **📊 Database Schema**

### **Core Tables**
```sql
-- User management
profiles: User profiles and subscription data
user_roles: Role-based access control

-- Content generation
jobs: Job tracking and status management (with workspace support)
images: Generated image metadata
videos: Generated video metadata
projects: Project management
scenes: Scene management for storyboards

-- LTX-Style Workspace System
workspace_sessions: Temporary user workspace sessions
workspace_items: Temporary workspace content items with dismiss/delete status

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
profiles (1) → (N) workspace_sessions
workspace_sessions (1) → (N) workspace_items
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

### **LTX-Style Workspace Patterns**
```typescript
// Job-level grouping patterns
- WorkspaceGrid: Job-based layout with thumbnail selector
- ContentCard: Individual cards with dismiss/delete actions
- Thumbnail Selector: Right-side navigation with hover-to-delete
- Job Headers: Prompt preview and delete options

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

// LTX-Style Workspace Optimizations
useSimplifiedWorkspaceState: Efficient state management with job grouping
useRealtimeWorkspace: Real-time updates for workspace items
Storage Path Normalization: Consistent signed URL generation

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
  - Workspace indexes for job-level queries

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
│   ├── workspace/                    # LTX-style workspace components
│   │   ├── WorkspaceGrid.tsx         # Job-level grouping with thumbnail selector
│   │   ├── ContentCard.tsx           # Individual cards with dismiss/delete actions
│   │   ├── SimplePromptInput.tsx     # Generation controls
│   │   ├── MultiReferencePanel.tsx   # Multi-reference image management
│   │   ├── CharacterReferenceWarning.tsx
│   │   ├── EnhancedSeedInput.tsx     # Seed input controls
│   │   └── SeedDisplay.tsx           # Seed display
│   ├── generation/                   # Generation components
│   ├── admin/                        # Admin components
│   └── library/                      # Asset management
├── hooks/
│   ├── useGeneration.ts              # Main generation workflow
│   ├── useSimplifiedWorkspaceState.ts # LTX-style state management
│   ├── useRealtimeWorkspace.ts       # Real-time workspace updates
│   └── useJobQueue.ts                # Job queue management
├── pages/
│   ├── SimplifiedWorkspace.tsx       # LTX-style workspace interface
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
│   ├── delete-workspace-item/index.ts # Workspace item deletion
│   └── generate-admin-image/index.ts # Admin image generation
├── migrations/                       # Database migrations
└── config.toml                      # Supabase configuration
```

### **Critical Integrations**

#### **Supabase Online (Backend)**
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with JWT tokens
- **Storage**: 13 buckets for different job types
- **Edge Functions**: Deno runtime for serverless functions
- **Real-time**: WebSocket connections for live updates

#### **RunPod Workers (AI Processing)**
- **SDXL Worker**: Lustify SDXL model for image generation
- **WAN Worker**: WAN 2.1 model for video generation
- **Chat Worker**: Qwen 2.5-7B Instruct for chat and enhancement
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
  - Supports workspace destination routing

#### **job-callback** (`/functions/v1/job-callback`)
- **Purpose**: Worker callback processing
- **Authentication**: Service role key (internal)
- **Features**:
  - Standardized parameters (`job_id`, `assets` array)
  - Multi-asset support for SDXL jobs
  - Metadata preservation and merging
  - Enhanced error handling and debugging
  - Routes to workspace or library based on destination

#### **enhance-prompt** (`/functions/v1/enhance-prompt`)
- **Purpose**: AI prompt enhancement service
- **Features**:
  - Rule-based enhancement for SDXL, WAN images, and videos
  - Quality-specific enhancement strategies
  - Used by PromptEnhancementModal component

#### **delete-workspace-item** (`/functions/v1/delete-workspace-item`)
- **Purpose**: Workspace item deletion with storage cleanup
- **Features**:
  - Deletes workspace items and associated storage files
  - Handles both individual item and job-level deletion
  - Supports dismiss vs delete functionality

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
- Workspace items protected by user ownership
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
Storage: 13 buckets with policies
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
console.log('👋 WORKSPACE: Dismissing item:', { itemId });
console.log('🗑️ WORKSPACE: Deleting job:', { jobId });
```

### **Backend Logging**
```typescript
// Edge function logging
console.log('🚀 Queue-job function called');
console.log('✅ User authenticated:', user.id);
console.log('📋 Creating job:', { jobType, userId });
console.log('🔐 WORKSPACE: Path normalization:', { originalPath, cleanPath });
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

LTX-Style Workspace:
  - Job Grouping: Real-time updates
  - Thumbnail Navigation: Responsive design
  - Storage Path Normalization: Consistent URL generation
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
- Triple worker system operational
- All 10 job types supported
- Frontend UI components complete
- Authentication system working
- Asset management system
- Real-time status updates
- Mobile-responsive design
- Production deployment on Lovable
- **LTX-Style Workspace System**: Job-level grouping with thumbnail selector
- **Two-Level Deletion**: Dismiss vs Delete functionality
- **Storage Path Normalization**: Fixed signed URL generation
- **Legacy Component Cleanup**: Removed old workspace system

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
- [x] Triple worker system operational
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

### **Phase 3 Success Criteria (LTX-Style Workspace)**
- [x] Job-level grouping implemented
- [x] Thumbnail selector navigation working
- [x] Hover-to-delete functionality working
- [x] Two-level deletion (dismiss vs delete) implemented
- [x] Storage path normalization fixed
- [x] Legacy component cleanup completed
- [x] Code reduction achieved (718 lines removed)

### **Business Impact Projections**
```yaml
Enhanced Features Value:
  Quality Improvement: Professional vs amateur prompts
  User Experience: Simple input → cinema-quality output
  Competitive Advantage: Only platform with AI prompt enhancement
  Revenue Impact: Premium features justify higher pricing

LTX-Style Workspace Value:
  User Experience: Job-level organization with thumbnail navigation
  Content Management: Two-level deletion prevents library bloat
  Workflow Efficiency: Hover-to-delete for quick cleanup
  Competitive Advantage: Professional workspace management

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
- **Worker System**: ✅ Triple workers operational
- **Frontend Integration**: ✅ All 10 job types available
- **Testing Status**: 🚧 9/10 job types verified
- **Production Deployment**: ✅ Live on Lovable
- **LTX-Style Workspace**: ✅ Fully implemented and operational

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

Storage Path Normalization:
  Issue: Fixed signed URL generation across all components
  Problem: Storage paths sometimes include bucket prefixes
  Impact: Signed URL generation failures
  Solution: ✅ Implemented normalizeStoragePath helper function
```

**Status: 🚧 TESTING PHASE - 9/10 Job Types Verified, LTX-Style Workspace ✅ Complete** 