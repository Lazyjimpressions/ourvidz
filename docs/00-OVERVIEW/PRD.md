# **Product Requirements Document (PRD) v4.0**
**OurVidz.com - AI Video Generation Platform**

## **Executive Summary**

OurVidz.com is a web-based platform enabling users to generate personalized adult content using AI, with a focused approach to achieving the MVP goal of 30-second videos with character continuity.

**Current Status (January 2025):**
- **MVP Goal**: Generate 30-second videos with character continuity
- **Current Capability**: Single 5-second videos implemented
- **Architecture**: Triple worker system + 3rd party API fallbacks
- **Documentation**: Streamlined structure for AI assistance and development

The platform uses advanced AI models including WAN 2.1 T2V 1.3B, SDXL Lustify, and Qwen 2.5-7B models running on RunPod RTX 6000 ADA infrastructure, with 3rd party API integrations for enhanced reliability.

---

## **1. Product Overview**

### **1.1 Vision Statement**

Create an accessible, user-friendly platform that democratizes adult content creation through AI video generation, ensuring character consistency and creative control while scaling from simple to sophisticated workflows.

### **1.2 Core Value Propositions**

- **Progressive Complexity**: Start simple (5s videos) → Scale to full productions (30s+)
- **Character Persistence**: Maintain consistent characters across scenes and videos
- **Creative Control**: Preview-approve workflow before final generation
- **Cost Efficiency**: Pay-per-use model with transparent credit system
- **Privacy First**: No data retention, encrypted processing, NSFW-friendly
- **Quality Output**: Cinema-quality videos powered by WAN 2.1 T2V 1.3B
- **Advanced AI Integration**: Multi-model system with SDXL, WAN, and Qwen models
- **Reliability**: 3rd party API fallbacks ensure system availability

### **1.3 Target Users**

- **Primary**: Independent adult content creators seeking AI-powered production tools
- **Secondary**: Couples creating personalized content for private use
- **Future**: Small adult entertainment studios, artists, and animators

---

## **2. Product Strategy & Phased Development**

### **2.1 Phase 1: Core Platform Development (Current)**
**Target**: Complete core functionality with image generation, chat, roleplay, and video generation

**Current Status:**
- ✅ **Infrastructure**: RunPod RTX 6000 ADA, Supabase, Upstash Redis
- ✅ **Models**: WAN 2.1 T2V 1.3B, SDXL Lustify, Qwen 2.5-7B Base/Instruct
- ✅ **Worker System**: Triple worker architecture (SDXL, WAN, Chat)
- ✅ **Base Functionality**: Image generation, video generation, chat, roleplay
- ✅ **I2I System**: Image-to-image modification and exact copying
- ✅ **3rd Party APIs**: Replicate RV5.1 integration, OpenRouter planned
- 🔄 **In Development**: Library page enhancements, storyboard functionality
- 🚧 **Planned**: Video stitching, character consistency, 30-second videos

**Features:**
- Image generation (SDXL Lustify model)
- Video generation (WAN 2.1 T2V 1.3B)
- Chat and roleplay functionality (Qwen 2.5-7B Instruct)
- Image-to-image and image-to-video capabilities
- Unified workspace and library interface
- Dynamic prompting system with 12+ templates
- 3rd party API fallbacks for reliability

**Success Criteria:**
- 100% functionality across all core features
- <6 minutes total generation time for videos
- Seamless workspace and library integration
- Mobile-responsive experience
- Stable chat and roleplay functionality
- Reliable fallback systems

### **2.2 Phase 2: Character System & Extended Videos (Month 2)**
**Target**: Enhanced character management and extended video capabilities

**Features:**
- Character image uploads and management
- IP-Adapter integration for visual consistency
- Character library management
- Multi-length videos (5s, 15s, 30s via stitching)
- Advanced character creation tools
- Storyboard page implementation

**Success Criteria:**
- 90%+ character consistency across videos
- 20+ active users
- Extended video lengths working
- Character library fully functional
- Storyboard creation workflow

### **2.3 Phase 3: Advanced Production (Month 3)**
**Target**: Professional-grade video creation capabilities

**Features:**
- Storyboard generation workflow
- Multi-scene videos up to 5 minutes
- Advanced editing capabilities
- Scene transition optimization
- Professional-quality output
- 30-second video MVP achievement

**Success Criteria:**
- 100+ videos generated monthly
- $500+ Monthly Recurring Revenue
- User satisfaction >4.0/5.0
- 30-second videos with character continuity

### **2.4 Phase 4: Scale & Enterprise (Month 4+)**
**Target**: Full PRD vision with enterprise capabilities

**Features:**
- Enterprise user management
- Advanced analytics and reporting
- Custom model training
- API access for third-party integrations
- White-label solutions

**Success Criteria:**
- 1000+ active users
- $10,000+ Monthly Recurring Revenue
- Enterprise partnerships established

---

## **3. Technical Architecture**

### **3.1 System Overview**

**Frontend**: React + TypeScript with shared component architecture
**Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
**AI Workers**: Triple worker system (SDXL, WAN, Chat) on RunPod RTX 6000 ADA
**3rd Party APIs**: Replicate (RV5.1), OpenRouter (Chat alternatives)
**Storage**: Staging-first workflow (workspace-temp → user-library)

### **3.2 Key Systems**

#### **I2I System** (`03-SYSTEMS/I2I_SYSTEM.md`)
- **Status**: ✅ Active - SDXL worker implementation complete
- **Features**: Modify/copy modes, reference strength controls
- **Future**: 3rd party API integration (Replicate RV5.1)
- **Usage**: Workspace, Library, Storyboard pages

#### **Prompting System** (`03-SYSTEMS/PROMPTING_SYSTEM.md`)
- **Status**: ✅ Active - Pure inference engine architecture
- **Features**: 12 database-driven templates, SFW/NSFW detection
- **Architecture**: Edge function control, no worker overrides
- **Usage**: All pages (Workspace, Playground, Storyboard, etc.)

#### **Roleplay System** (Planned: `03-SYSTEMS/ROLEPLAY_SYSTEM.md`)
- **Status**: 🚧 Planned - Shared across pages
- **Features**: Character consistency, scenario management
- **Usage**: Playground, Storyboard, Workspace pages

### **3.3 Component Architecture**

#### **Shared Components** (`02-COMPONENTS/INVENTORY.md`)
- **SharedGrid**: Unified grid for workspace and library
- **SharedLightbox**: Unified image/video preview
- **SimplePromptInput**: I2I-capable prompt input
- **NegativePromptPresets**: Negative prompt selection

#### **Page-Specific Components**
- **Workspace**: SimplifiedWorkspace, WorkspaceControls
- **Library**: LibraryGrid, LibraryControls (planned)
- **Playground**: ChatInterface, RoleplayInterface
- **Storyboard**: SceneEditor (planned)

---

## **4. Page Development Status**

### **4.1 Production Ready Pages**

#### **Workspace Page** (`01-PAGES/01-WORKSPACE.md`)
- **Status**: ✅ Production Ready
- **Features**: I2I functionality, unified grid system, staging-first workflow
- **Components**: SharedGrid, SimplePromptInput, WorkspaceControls
- **Integration**: SDXL worker, I2I system, prompting system

#### **Playground Page** (`01-PAGES/03-PLAYGROUND.md`)
- **Status**: ✅ Production Ready
- **Features**: Dynamic prompting with 4 modes and 12+ templates
- **Components**: ChatInterface, RoleplayInterface
- **Integration**: Chat worker, prompting system, roleplay system

#### **Admin Page** (`01-PAGES/05-ADMIN.md`)
- **Status**: ✅ Production Ready
- **Features**: User management, API provider management, system metrics
- **Components**: UserManagement, APIProviderManagement
- **Integration**: Database management, API integrations

### **4.2 In Development Pages**

#### **Library Page** (`01-PAGES/02-LIBRARY.md`)
- **Status**: 🔄 In Development
- **Features**: Asset management, filtering, bulk operations
- **Components**: LibraryGrid, LibraryControls (planned)
- **Integration**: Storage system, workspace integration

#### **Storyboard Page** (`01-PAGES/03-STORYBOARD.md`)
- **Status**: 🚧 Planned
- **Features**: Scene management, project organization, continuity
- **Components**: SceneEditor (planned)
- **Integration**: I2I system, roleplay system, video stitching

#### **Dashboard Page** (`01-PAGES/06-DASHBOARD.md`)
- **Status**: 🔄 In Development
- **Features**: Usage statistics, recent activity
- **Components**: Analytics components (planned)
- **Integration**: System metrics, user activity tracking

---

## **5. Development Priorities**

### **5.1 Immediate (Next 2-4 weeks)**
1. **Complete Library Page**: Enhanced functionality and controls
2. **I2I System Improvements**: Refine settings and UI
3. **3rd Party API Integration**: Complete Replicate and OpenRouter

### **5.2 Short Term (1-2 months)**
1. **Storyboard Page**: Scene management and project organization
2. **Video Stitching**: Multiple clip continuity
3. **Character Consistency**: Advanced character preservation

### **5.3 Long Term (3-6 months)**
1. **30-Second Videos**: Extended video generation
2. **Advanced Storyboarding**: Multi-scene projects
3. **AI-Powered Continuity**: Automated character consistency

---

## **6. Success Metrics**

### **6.1 Technical Metrics**
- **Generation Performance**: SDXL (3-8s), WAN (25-240s), Chat (5-15s)
- **System Uptime**: 99.9% availability with fallback systems
- **API Response Times**: <2s for edge functions, <30s for generation
- **Storage Efficiency**: Staging-first workflow optimization

### **6.2 Business Metrics**
- **User Growth**: 20+ active users (Phase 2), 100+ (Phase 3)
- **Revenue**: $500+ MRR (Phase 3), $10,000+ MRR (Phase 4)
- **User Satisfaction**: >4.0/5.0 rating
- **Content Generation**: 100+ videos monthly (Phase 3)

### **6.3 Quality Metrics**
- **Character Consistency**: 90%+ consistency across videos
- **Video Quality**: Cinema-quality output standards
- **System Reliability**: <1% error rate with fallback systems
- **User Experience**: Mobile-responsive, intuitive interface

---

## **7. Risk Management**

### **7.1 Technical Risks**
- **Worker System Failures**: Mitigated by 3rd party API fallbacks
- **Model Performance**: Optimized through parameter tuning and monitoring
- **Storage Costs**: Controlled through staging-first workflow
- **API Rate Limits**: Managed through intelligent queuing and fallbacks

### **7.2 Business Risks**
- **Market Competition**: Differentiated through character consistency focus
- **Regulatory Changes**: NSFW-friendly architecture with privacy focus
- **User Adoption**: Progressive complexity approach reduces barriers
- **Revenue Model**: Pay-per-use with transparent pricing

---

## **8. Documentation Strategy**

### **8.1 Organized Structure**
- **00-OVERVIEW**: High-level context and system overview
- **01-PAGES**: Individual page mini-PRDs and implementation status
- **02-COMPONENTS**: Component documentation and inventory
- **03-SYSTEMS**: System-level functionality (I2I, Roleplay, etc.)
- **04-WORKERS**: Worker system documentation
- **05-APIS**: 3rd party API documentation
- **06-DEVELOPMENT**: Development and operational guides
- **07-ARCHIVE**: Superseded approaches (for reference)

### **8.2 AI Assistance Focus**
- **Component Inventory**: Master tracking with AI instructions
- **System Documentation**: Cross-cutting concerns (prompting, I2I, roleplay)
- **Page Documentation**: Individual page mini-PRDs
- **Worker Documentation**: External repo integration

---

**Note**: This PRD reflects the current organized documentation structure and streamlined development approach. The focus is on achieving the MVP goal of 30-second videos with character continuity while maintaining system reliability and user experience quality.