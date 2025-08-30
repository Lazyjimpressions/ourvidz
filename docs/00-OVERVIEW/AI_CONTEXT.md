# AI Context - OurVidz Platform

**Last Updated:** January 2025  
**Status:** Current system state for AI assistance

## **🎯 Platform Overview**

OurVidz is an adult content creation platform focused on generating 30-second videos with continuity. The platform uses a **triple worker system** (external repo) combined with **3rd party APIs** for comprehensive content generation capabilities.

### **Core Mission**
- **MVP Goal**: Generate 30-second videos with character continuity
- **Current Status**: Single 5-second videos implemented, storyboarding in development
- **Architecture**: Triple worker system + 3rd party API fallbacks

---

## **🏗️ System Architecture**

### **Triple Worker System** (External Repo: `ourvidz-worker`)
1. **SDXL Worker**: Image generation with i2i capabilities
2. **WAN Worker**: Video generation with Qwen enhancement  
3. **Chat Worker**: Roleplay and conversation with Qwen 2.5-7B Instruct

### **3rd Party API Integration**
1. **Replicate API**: RV5.1 model for alternative image generation
2. **OpenRouter API**: Chat model alternatives (Claude, GPT, etc.)

### **Frontend Architecture**
- **React + TypeScript**: Modern frontend with shared components
- **Supabase**: Database, authentication, and edge functions
- **Shared Grid System**: Unified grid for workspace and library
- **Staging-First**: workspace-temp → user-library workflow

---

## **📱 Page Status & Development**

### **✅ Production Ready**
- **Workspace Page**: Fully implemented with i2i functionality
- **Playground Page**: Dynamic prompting with 4 modes and 12+ templates
- **Admin Page**: Comprehensive admin tools and API management

### **🔄 In Development**
- **Library Page**: Basic implementation, enhancements in progress
- **Storyboard Page**: Core functionality, UI enhancements needed
- **Dashboard Page**: Basic implementation, analytics enhancements needed

### **🚧 Planned**
- **Video Stitching**: Multiple clip continuity
- **Character Consistency**: Advanced character preservation
- **30-Second Videos**: Extended video generation

---

## **🔧 Key Systems**

### **I2I System** (`03-SYSTEMS/I2I_SYSTEM.md`)
- **Status**: ✅ Active - SDXL worker implementation complete
- **Features**: Modify/copy modes, reference strength controls
- **Future**: 3rd party API integration (Replicate RV5.1)
- **Usage**: Workspace, Library, Storyboard pages

### **Prompting System** (`03-SYSTEMS/PROMPTING_SYSTEM.md`)
- **Status**: ✅ Active - Pure inference engine architecture
- **Features**: 12 database-driven templates, SFW/NSFW detection
- **Architecture**: Edge function control, no worker overrides
- **Usage**: All pages (Workspace, Playground, Storyboard, etc.)

### **Roleplay System** (Planned: `03-SYSTEMS/ROLEPLAY_SYSTEM.md`)
- **Status**: 🚧 Planned - Shared across pages
- **Features**: Character consistency, scenario management
- **Usage**: Playground, Storyboard, Workspace pages

### **Storage System** (`03-SYSTEMS/STORAGE_SYSTEM.md`)
- **Status**: ✅ Active - Staging-first approach
- **Buckets**: workspace-temp, user-library, system-assets
- **Workflow**: Generate → workspace-temp → user-library (on save)

---

## **🎨 Component Architecture**

### **Shared Components** (`02-COMPONENTS/INVENTORY.md`)
- **SharedGrid**: Unified grid for workspace and library
- **SharedLightbox**: Unified image/video preview
- **SimplePromptInput**: I2I-capable prompt input
- **NegativePromptPresets**: Negative prompt selection

### **Page-Specific Components**
- **Workspace**: SimplifiedWorkspace, WorkspaceControls
- **Library**: LibraryGrid, LibraryControls (planned)
- **Playground**: ChatInterface, RoleplayInterface
- **Storyboard**: SceneEditor (planned)

---

## **🤖 Worker Integration**

### **SDXL Worker** (`04-WORKERS/SDXL_WORKER.md`)
- **Model**: SDXL Lustify (NSFW-optimized)
- **Capabilities**: Image generation, i2i processing
- **I2I Modes**: Modify (default), Copy (manual toggle)
- **Parameters**: denoise_strength, guidance_scale, steps

### **WAN Worker** (`04-WORKERS/WAN_WORKER.md`)
- **Model**: WAN 2.1 T2V 1.3B
- **Capabilities**: Video generation, image-to-video
- **Enhancement**: Qwen 2.5-7B Base integration
- **Output**: 5-second videos (extending to 30s)

### **Chat Worker** (`04-WORKERS/CHAT_WORKER.md`)
- **Model**: Qwen 2.5-7B Instruct
- **Capabilities**: Chat, roleplay, storytelling
- **Features**: Character management, scenario generation
- **Usage**: Playground page, prompt enhancement

---

## **🔌 API Integrations**

### **Replicate API** (`05-APIS/REPLICATE_API.md`)
- **Status**: ✅ Active - RV5.1 model integrated
- **Use Case**: Alternative to SDXL worker
- **Features**: High-quality realistic image generation
- **Fallback**: Automatic fallback to SDXL worker

### **OpenRouter API** (`05-APIS/OPENROUTER_API.md`)
- **Status**: 🚧 Planned - Chat alternatives
- **Models**: Claude 3.5, GPT-4, Llama 3.1
- **Use Cases**: Roleplay, storytelling, prompt enhancement
- **Fallback**: Automatic fallback to Chat worker

---

## **🗄️ Database Schema**

### **Core Tables** (`03-SYSTEMS/DATABASE_SCHEMA.md`)
- **workspace_assets**: Temporary workspace content
- **user_library**: Saved user content
- **jobs**: Generation job tracking
- **prompt_templates**: Database-driven prompting system
- **api_providers**: 3rd party API management
- **api_models**: Available models per provider

### **Storage Buckets**
- **workspace-temp**: Staging area for generated content
- **user-library**: Permanent user content storage
- **system-assets**: Platform assets and placeholders

---

## **🚀 Development Priorities**

### **Immediate (Next 2-4 weeks)**
1. **Complete Library Page**: Enhanced functionality and controls
2. **I2I System Improvements**: Refine settings and UI
3. **3rd Party API Integration**: Complete Replicate and OpenRouter

### **Short Term (1-2 months)**
1. **Storyboard Page**: Scene management and project organization
2. **Video Stitching**: Multiple clip continuity
3. **Character Consistency**: Advanced character preservation

### **Long Term (3-6 months)**
1. **30-Second Videos**: Extended video generation
2. **Advanced Storyboarding**: Multi-scene projects
3. **AI-Powered Continuity**: Automated character consistency

---

## **🔍 Development Guidelines**

### **Component Development**
- **Check Component Inventory**: Always review `02-COMPONENTS/INVENTORY.md`
- **Use Shared Components**: Prefer SharedGrid, SharedLightbox, etc.
- **Avoid Duplication**: Check existing components before creating new ones
- **Document Changes**: Update component inventory when adding/modifying

### **System Integration**
- **Worker System**: Reference external repo for detailed implementation
- **3rd Party APIs**: Use as fallbacks, not primary systems
- **Prompting**: Use database-driven templates, not hardcoded prompts
- **Storage**: Follow staging-first workflow (workspace-temp → user-library)

### **Architecture Principles**
- **Simplicity First**: Avoid unnecessary complexity
- **Shared Systems**: Use I2I, Roleplay, and Prompting systems across pages
- **Fallback Strategy**: Always provide fallback options
- **Performance**: Monitor and optimize generation times

---

## **📊 Current Metrics**

### **Generation Performance**
- **SDXL Images**: 3-8 seconds per image
- **WAN Videos**: 25-240 seconds for 5-second video
- **Chat Responses**: 5-15 seconds per response
- **I2I Processing**: 5-12 seconds per modification

### **System Status**
- **Worker Uptime**: High availability with fallback options
- **API Integration**: Replicate active, OpenRouter planned
- **Storage**: Efficient staging-first workflow
- **Components**: Shared system reducing duplication

---

## **🎯 AI Assistance Focus Areas**

### **Current Development Tasks**
1. **Component Enhancement**: Improve existing components and create new ones
2. **System Integration**: Connect I2I, Roleplay, and Prompting systems
3. **API Integration**: Complete 3rd party API implementations
4. **Performance Optimization**: Improve generation times and quality

### **Documentation Maintenance**
1. **Component Inventory**: Keep `02-COMPONENTS/INVENTORY.md` updated
2. **System Documentation**: Update system docs as features evolve
3. **Page Documentation**: Maintain individual page mini-PRDs
4. **Worker Documentation**: Keep worker docs current with external repo

### **Quality Assurance**
1. **Code Review**: Ensure shared component usage
2. **Performance Monitoring**: Track generation times and quality
3. **User Experience**: Maintain consistent UI/UX across pages
4. **System Reliability**: Ensure fallback strategies work

---

**Note**: This context is updated as the system evolves. Always check the latest documentation for current status and development priorities. 