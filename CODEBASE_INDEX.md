# OurVidz.com - Codebase Index

**Last Updated:** July 7, 2025  
**Status:** Production Ready - 9/10 Job Types Verified  
**System:** Dual Worker (SDXL + WAN) on RTX 6000 ADA (48GB VRAM)  
**Deployment:** Production on Lovable (https://ourvidz.lovable.app/)

---

## 📋 Project Overview

OurVidz.com is an AI-powered platform for generating adult content videos and images. The system features:

- **Ultra-Fast Images**: SDXL generation in 3-8 seconds (6-image batches)
- **AI Video Generation**: WAN 2.1 with Qwen 7B enhancement
- **NSFW-Capable**: Apache 2.0 licensed models, no content restrictions
- **Preview-Approve Workflow**: User approval before final generation
- **Mobile-First Design**: Optimized for modern usage patterns

---

## 🏗️ System Architecture

### **Technology Stack**
```yaml
Frontend:
  Framework: React 18.x with TypeScript
  Build Tool: Vite
  Styling: Tailwind CSS + shadcn/ui components
  State Management: React Context + React Query
  Routing: React Router DOM
  Deployment: Lovable (https://ourvidz.lovable.app/)

Backend:
  Database: Supabase (PostgreSQL)
  Authentication: Supabase Auth
  Storage: Supabase Storage (12 buckets)
  Edge Functions: Deno runtime
  Queue: Upstash Redis (REST API)

AI Workers:
  Platform: RunPod RTX 6000 ADA (48GB VRAM)
  Models: SDXL + WAN 2.1 + Qwen 7B enhancement
  Architecture: Dual worker system
```

### **Dual Worker System**
```yaml
SDXL Worker:
  Queue: sdxl_queue (2s polling)
  Job Types: sdxl_image_fast, sdxl_image_high
  Performance: 29.9s-42.4s (6-image batches)
  VRAM Usage: 6.6GB loaded, 10.5GB peak
  Status: ✅ Fully operational

WAN Worker:
  Queue: wan_queue (5s polling)
  Job Types: 8 types (4 standard + 4 enhanced)
  Performance: 233s-370s (single files)
  VRAM Usage: 15-30GB peak
  Enhancement: Qwen 7B (14.6s) - Currently disabled
  Status: ✅ Operational (9/10 job types tested)
```

---

## 📊 Current Performance Status

### **✅ Tested Job Types (9/10)**
| Job Type | Status | Performance | Output | Quality |
|----------|--------|-------------|--------|---------|
| **sdxl_image_fast** | ✅ Tested | 29.9s (3.1s per image) | 6 images | Excellent |
| **sdxl_image_high** | ✅ Tested | 42.4s (5.0s per image) | 6 images | Premium |
| **video_fast** | ✅ Tested | 251.5s average | 1 video | Good |
| **video_high** | ✅ Tested | 359.7s | 1 video | Better |
| **video7b_fast_enhanced** | ✅ Tested | 263.9s average | 1 video | Enhanced |
| **video7b_high_enhanced** | ✅ Tested | 370.0s average | 1 video | Enhanced |
| **image7b_fast_enhanced** | ✅ Tested | 233.5s | 1 image | Enhanced |

### **❌ Pending Testing (3/10)**
| Job Type | Expected Time | Priority |
|----------|---------------|----------|
| **image_fast** | 73s | Medium |
| **image_high** | 90s | Medium |
| **image7b_high_enhanced** | 104s | Low |

---

## 📁 Project Structure

### **Root Directory**
```
ourvidz-1/
├── docs/                    # Project documentation (consolidated structure)
├── src/                     # Frontend source code
├── supabase/               # Backend configuration
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── README.md              # Project overview
└── CODEBASE_INDEX.md      # This file
```

### **Frontend Structure (`src/`)**
```
src/
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── generation/        # Generation components
│   ├── workspace/         # Workspace components
│   ├── admin/            # Admin components
│   └── library/          # Library components
├── pages/                 # Route components
├── hooks/                 # Custom React hooks
├── contexts/              # React context providers
├── lib/                   # Utility functions and services
├── types/                 # TypeScript type definitions
├── integrations/          # External service integrations
├── App.tsx               # Main app component
└── main.tsx              # App entry point
```

### **Backend Structure (`supabase/`)**
```
supabase/
├── functions/             # Edge functions
│   ├── queue-job/        # Job creation and routing
│   ├── job-callback/     # Job completion handling
│   └── generate-admin-image/ # Admin image generation
├── migrations/           # Database migrations
└── config.toml          # Supabase configuration
```

---

## 📚 Documentation Status

### **Final Documentation Structure (Consolidated & Cleaned)**
```yaml
docs/
├── README.md               # Main project overview and entry point
├── ARCHITECTURE.md         # Technical architecture and system design
├── API.md                  # API reference (edge functions + worker API)
├── PERFORMANCE.md          # Performance data, benchmarks, and quality improvements
├── SERVICES.md             # Service configurations and setup
├── CHANGELOG.md            # Version history, milestones, and dependency resolution
├── DEPLOYMENT.md           # Deployment and operational guides
├── WORKER_API.md           # Worker API reference (separate from API.md)
├── EDGE_FUNCTIONS.md       # Supabase edge functions (separate from API.md)
├── PROJECT.md              # Complete project context
├── PROJECT_STATUS.md       # Current development status
├── PROMPTING_REFERENCE_GUIDE.md # Comprehensive prompting best practices
└── MASTER_PROMPTING_GUIDE.md # Expert-level master prompting system
```

### **Documentation Consolidation Status**
- ✅ **Core Documentation**: README.md, ARCHITECTURE.md, API.md, PERFORMANCE.md, SERVICES.md, CHANGELOG.md, DEPLOYMENT.md
- ✅ **Specialized Docs**: EDGE_FUNCTIONS.md (current Supabase functions), WORKER_API.md (worker API reference)
- ✅ **Project Context**: PROJECT.md, PROJECT_STATUS.md (kept for reference)
- ✅ **Consolidation Complete**: All duplicative files removed

---

## 🔧 Key Components

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

### **Workspace Components**
```typescript
// Workspace management
- WorkspaceHeader.tsx        # Workspace navigation
- WorkspaceInputControls.tsx # Input controls
- WorkspaceContentModal.tsx  # Content modal
- ImageInputControls.tsx     # Image generation controls
- VideoInputControls.tsx     # Video generation controls
- AdvancedControlsSection.tsx # Advanced settings
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

### **UI Components (`src/components/ui/`)**
```typescript
// shadcn/ui component library
- button.tsx, card.tsx, dialog.tsx
- input.tsx, select.tsx, textarea.tsx
- toast.tsx, toaster.tsx, sonner.tsx
- progress.tsx, skeleton.tsx
- And 30+ other UI components
```

---

## 🪝 Custom Hooks

### **Generation Hooks**
```typescript
useGeneration()                    # Main generation workflow
useGenerationStatus()              # Real-time status updates
useRealtimeGenerationStatus()      # Enhanced real-time tracking
useGenerationWorkspace()           # Auto-add to workspace
useJobQueue()                      # Job queue management
```

### **Asset Management Hooks**
```typescript
useAssets()                        # Asset management with React Query
useLazyAssets()                    # Lazy loading for large datasets
useVirtualizedWorkspace()          # Virtualized workspace management
```

### **Workspace Hooks**
```typescript
useWorkspace()                     # Workspace state management
useRealtimeWorkspace()             # Real-time workspace updates
useProject()                       # Project-level state
```

### **Utility Hooks**
```typescript
useAuth()                          # Authentication state
useToast()                         # Toast notifications
use-mobile.tsx                     # Mobile detection
```

---

## 🔌 Services & Integrations

### **Supabase Integration**
```typescript
// src/integrations/supabase/
- client.ts                       # Supabase client configuration
- types.ts                        # Generated TypeScript types
```

### **Core Services**
```typescript
// src/lib/services/
- AssetService.ts                 # Asset management service
- OptimizedAssetService.ts        # Optimized asset operations
- GenerationService.ts            # Generation workflow service
```

### **Database Layer**
```typescript
// src/lib/
- database.ts                     # Database utilities
- storage.ts                      # Storage operations
- utils.ts                        # Utility functions
```

---

## 📊 Database Schema

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

## 🎯 Job Types (10 Total)

### **SDXL Jobs (2) - Ultra-Fast Images (6-Image Batches)**
```yaml
sdxl_image_fast:
  performance: 29.9s total (3.1s per image)
  resolution: 1024x1024
  quality: excellent NSFW
  storage: sdxl_image_fast bucket (5MB limit)
  credits: 1
  status: ✅ Tested

sdxl_image_high:
  performance: 42.4s total (5.0s per image)
  resolution: 1024x1024
  quality: premium NSFW
  storage: sdxl_image_high bucket (10MB limit)
  credits: 2
  status: ✅ Tested
```

### **WAN Standard Jobs (4) - Videos + Backup Images (Single Files)**
```yaml
image_fast: 73s, backup images, 1 credit, ❌ Not tested
image_high: 90s, backup images, 2 credits, ❌ Not tested
video_fast: 251.5s average, 5s videos, 3 credits, ✅ Tested
video_high: 359.7s, 6s videos, 5 credits, ✅ Tested
```

### **WAN Enhanced Jobs (4) - AI-Enhanced with Qwen 7B**
```yaml
image7b_fast_enhanced: 233.5s, 2 credits, ✅ Tested
image7b_high_enhanced: 104s, 3 credits, ❌ Not tested
video7b_fast_enhanced: 263.9s average, 4 credits, ✅ Tested
video7b_high_enhanced: 370.0s average, 6 credits, ✅ Tested
```

---

## 🔐 Authentication & Authorization

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

## 🚀 Edge Functions

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

## 📱 State Management

### **React Context Providers**
```typescript
// Main providers in App.tsx
<QueryClientProvider>           // React Query for server state
<TooltipProvider>               // Tooltip context
<AuthProvider>                  // Authentication state
<BrowserRouter>                 // Routing
```

### **Key State Patterns**
```typescript
// Generation state
const [isGenerating, setIsGenerating] = useState(false);
const [generationProgress, setGenerationProgress] = useState(0);
const [currentJob, setCurrentJob] = useState<GenerationStatus | null>(null);

// Workspace state
const [workspaceAssets, setWorkspaceAssets] = useState<UnifiedAsset[]>([]);
const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

// UI state
const [showLibraryModal, setShowLibraryModal] = useState(false);
const [quality, setQuality] = useState<'fast' | 'high'>('fast');
const [enhanced, setEnhanced] = useState<boolean>(false);
```

---

## 🎨 UI/UX Patterns

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

## 🔧 Development Scripts

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

## 📈 Performance Optimizations

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

## 🔒 Security Features

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

## 🚀 Deployment Architecture

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

## 📊 Monitoring & Logging

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

## 🔄 Development Workflow

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

## 📚 Documentation

### **Current Documentation Structure**
```markdown
docs/
├── PROJECT.md              # Complete project context
├── ARCHITECTURE.md         # Technical architecture
├── SERVICES.md             # Service configurations
├── PROJECT_STATUS.md       # Current development status
├── SERVERCODEBASE_OVERVIEW.md # Server-side overview
├── EDGE_FUNCTIONS.md       # Supabase edge functions
├── WORKER_API.md           # Worker API reference
├── PERFORMANCE_BENCHMARKS.md # Detailed performance data
├── PERFORMANCE_SUMMARY.md  # Quick performance reference
├── NEGATIVE_PROMPT_IMPROVEMENTS.md # Prompt optimization
└── ourvidz_status_update.md # Status updates
```

### **Planned Documentation Consolidation**
```markdown
docs/
├── README.md               # Main project overview (consolidated)
├── ARCHITECTURE.md         # Technical architecture (keep)
├── API.md                  # API reference (consolidated)
├── PERFORMANCE.md          # Performance data (consolidated)
├── SERVICES.md             # Service configurations (keep)
├── CHANGELOG.md            # Version history (new)
└── DEPLOYMENT.md           # Deployment guides (new)
```

### **Code Documentation**
```typescript
// Comprehensive JSDoc comments for complex functions
/**
 * Generates content using the specified format and prompt
 * @param request - The generation request parameters
 * @returns Promise that resolves when generation is complete
 */
async function generateContent(request: GenerationRequest): Promise<void>
```

---

## 🎯 Current Status & Next Steps

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

## 🤝 Contributing

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

*This index is automatically generated and should be updated as the codebase evolves.* 