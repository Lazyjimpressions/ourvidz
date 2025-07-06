# OurVidz.com - Codebase Index

**Last Updated:** July 5, 2025  
**Status:** Production Ready - Frontend Integration Pending  
**System:** Dual Worker (SDXL + WAN) on RTX 6000 ADA (48GB VRAM)

---

## 📋 Project Overview

OurVidz.com is an AI-powered platform for generating adult content videos and images. The system features:

- **Ultra-Fast Images**: SDXL generation in 3-8 seconds
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

Backend:
  Database: Supabase (PostgreSQL)
  Authentication: Supabase Auth
  Storage: Supabase Storage (8 buckets)
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
```

---

## 📁 Project Structure

### **Root Directory**
```
ourvidz-1/
├── docs/                    # Project documentation
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
- FastImageGenerator.tsx     # SDXL fast generation
- HighImageGenerator.tsx     # SDXL high-quality generation
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

### **SDXL Jobs (2) - Ultra-Fast Images**
```yaml
sdxl_image_fast:
  performance: 3-8 seconds
  resolution: 1024x1024
  quality: excellent NSFW
  storage: sdxl_fast bucket
  credits: 1

sdxl_image_high:
  performance: 8-15 seconds
  resolution: 1024x1024
  quality: premium NSFW
  storage: sdxl_high bucket
  credits: 2
```

### **WAN Standard Jobs (4) - Videos + Backup Images**
```yaml
image_fast: 73s, backup images, 1 credit
image_high: 90s, backup images, 2 credits
video_fast: 180s, 5s videos, 3 credits
video_high: 280s, 6s videos, 5 credits
```

### **WAN Enhanced Jobs (4) - AI-Enhanced with Qwen 7B**
```yaml
image7b_fast_enhanced: 87s (73s + 14s), 2 credits
image7b_high_enhanced: 104s (90s + 14s), 3 credits
video7b_fast_enhanced: 194s (180s + 14s), 4 credits
video7b_high_enhanced: 294s (280s + 14s), 6 credits
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
Platform: Vercel/Netlify
Build: npm run build
Output: dist/ directory
Environment: Production Supabase credentials
```

### **Backend Deployment**
```yaml
Platform: Supabase
Database: PostgreSQL with RLS
Storage: 8 buckets with policies
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
  - SDXL: 3-8 seconds (measured)
  - WAN Standard: 67-280 seconds (measured)
  - WAN Enhanced: +14 seconds (Qwen 7B)

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

### **Project Documentation**
```markdown
docs/
├── PROJECT.md              # Complete project context
├── ARCHITECTURE.md         # Technical architecture
├── SERVICES.md             # Service configurations
├── PROJECT_STATUS.md       # Current development status
└── SERVERCODEBASE_OVERVIEW.md # Server-side overview
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

### **🚧 In Progress**
- Enhanced job type UI integration
- End-to-end testing
- Performance optimization
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