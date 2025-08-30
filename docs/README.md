# OurVidz Documentation

**Last Updated:** January 2025  
**Status:** Streamlined documentation structure for AI assistance and development

## **📚 Documentation Structure**

### **00-OVERVIEW/** - High-level context and system overview
- **AI_CONTEXT.md** - Current system state for AI assistance
- **PRD.md** - Product Requirements Document (updated)
- **ARCHITECTURE.md** - High-level system architecture
- **ENVIRONMENT.md** - Environment configuration and setup

### **01-PAGES/** - Individual page mini-PRDs and implementation status
- **01-WORKSPACE.md** - Workspace page purpose & implementation status
- **02-LIBRARY.md** - Library page purpose & implementation status
- **03-STORYBOARD.md** - Storyboard page purpose & implementation status
- **04-PLAYGROUND.md** - Playground page purpose & implementation status
- **05-ADMIN.md** - Admin page purpose & implementation status
- **06-DASHBOARD.md** - Dashboard page purpose & implementation status
- **07-ROLEPLAY.md** - Roleplay page purpose & implementation status
- **07-PAGE_DEVELOPMENT_STATUS.md** - Master tracking of all page development

### **02-COMPONENTS/** - Component documentation and inventory
- **INVENTORY.md** - Master component inventory with AI instructions
- **SHARED/** - Shared component documentation
- **WORKSPACE/** - Workspace-specific components
- **LIBRARY/** - Library-specific components
- **ARCHIVED/** - Deprecated components with reasons

### **03-SYSTEMS/** - System-level functionality
- **I2I_SYSTEM.md** - Image-to-image functionality (shared across pages)
- **ROLEPLAY_SYSTEM.md** - Roleplay/storytelling functionality (shared)
- **DATABASE_SCHEMA.md** - Consolidated database schema documentation
- **STORAGE_SYSTEM.md** - Storage & URL conventions
- **PROMPTING_SYSTEM.md** - Dynamic prompting system
- **PROMPT_BUILDER.md** - Prompt builder functionality

### **04-WORKERS/** - Worker system documentation
- **OVERVIEW.md** - Triple worker system overview
- **SDXL_WORKER.md** - SDXL worker setup & i2i handling
- **WAN_WORKER.md** - WAN worker setup & video generation
- **CHAT_WORKER.md** - Chat worker setup & roleplay
- **API.md** - Worker API documentation
- **EXTERNAL_REPO.md** - Link to worker repo for detailed implementation

### **05-APIS/** - 3rd party API documentation
- **REPLICATE_API.md** - Replicate integration (RV5.1, etc.)
- **OPENROUTER_API.md** - OpenRouter integration (chat alternatives)
- **API_PROVIDERS.md** - Supabase API provider & model tables
- **LEGACY_API.md** - Previous API documentation (archived)
- **SECURITY_FIX.md** - API security fixes and updates

### **06-DEVELOPMENT/** - Development and operational guides
- **SETUP.md** - Development environment setup
- **DEPLOYMENT.md** - Deployment procedures
- **TESTING.md** - Testing strategies
- **TROUBLESHOOTING.md** - Common issues & solutions
- **ADMIN.md** - Admin functionality documentation
- **RUNPOD_SETUP.md** - RunPod infrastructure setup
- **SUPABASE_SETUP.md** - Supabase configuration

### **07-ARCHIVE/** - Superseded approaches (for reference)
- **LEGACY_SYSTEMS.md** - Previous system architectures
- **OLD_APPROACHES.md** - What didn't work & why
- **DEPRECATED_FEATURES.md** - Superseded features with reasons
- **CHANGELOG.md** - Historical changelog
- **DOCUMENTATION_CONSOLIDATION_SUMMARY.md** - Previous documentation organization
- **DOCUMENTATION_UPDATE_SUMMARY.md** - Previous documentation updates
- **IMPLEMENTATION_PLAN.md** - Previous implementation plans

---

## **🎯 Current Development Status**

### **✅ Production Ready**
- **Workspace Page** - Fully implemented with i2i functionality
- **Playground Page** - Dynamic prompting system complete
- **Admin Page** - Comprehensive admin tools implemented

### **🔄 In Development**
- **Library Page** - Basic implementation, enhancements in progress
- **Storyboard Page** - Core functionality, UI enhancements needed
- **Dashboard Page** - Basic implementation, analytics enhancements needed

### **🚧 Major Systems in Progress**
- **I2I System** - SDXL worker integration complete, 3rd party API integration planned
- **3rd Party APIs** - Replicate (RV5.1) integrated, OpenRouter integration planned
- **Roleplay System** - Chat worker functional, cross-page integration planned

---

## **🔧 Key Technical Systems**

### **Triple Worker System** (External Repo)
- **SDXL Worker**: Image generation with i2i capabilities
- **WAN Worker**: Video generation with Qwen enhancement
- **Chat Worker**: Chat and roleplay functionality

### **3rd Party API Integration**
- **Replicate API**: RV5.1 model for alternative image generation
- **OpenRouter API**: Alternative chat models for roleplay/storytelling
- **Supabase API Providers**: Centralized API management

### **Shared Systems**
- **I2I System**: Image-to-image functionality across pages
- **Roleplay System**: Storytelling and roleplay across pages
- **Storage System**: workspace-temp and user-library buckets

---

## **📋 For AI Assistance**

### **Quick Context**
1. **Current Focus**: I2I system improvements and 3rd party API integration
2. **Architecture**: Triple worker system (external repo) + 3rd party APIs
3. **Storage**: Staging-first approach (workspace-temp → user-library)
4. **Components**: Shared grid system across workspace and library

### **Key Files for Context**
- **AI_CONTEXT.md** - Current system state and development priorities
- **PRD.md** - Product requirements and roadmap
- **01-PAGES/07-PAGE_DEVELOPMENT_STATUS.md** - Implementation status
- **02-COMPONENTS/INVENTORY.md** - Component inventory and status

### **Development Guidelines**
- **Simplicity First**: Avoid unnecessary complexity
- **Shared Components**: Use existing shared components when possible
- **Archive Strategy**: Keep old approaches for reference but mark as superseded
- **Worker Integration**: Document worker system separately, reference external repo

---

## **🚀 Getting Started**

1. **For AI Context**: Start with `00-OVERVIEW/AI_CONTEXT.md`
2. **For Page Development**: Check `01-PAGES/` for specific page documentation
3. **For Component Work**: Review `02-COMPONENTS/INVENTORY.md`
4. **For System Integration**: Check `03-SYSTEMS/` for shared functionality
5. **For Worker Integration**: Review `04-WORKERS/` and external repo
6. **For API Integration**: Check `05-APIS/` for 3rd party integrations

---

**Note**: This documentation structure is designed for AI assistance and development efficiency. All superseded approaches are preserved in the archive for reference while maintaining clear separation from active development. 