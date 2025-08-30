# Component Inventory - Master Tracking

**Last Updated:** January 2025  
**Status:** Active component tracking for AI assistance and development

## **🎯 AI Instructions**

### **Purpose of This Document**
This inventory tracks all active components in the OurVidz codebase, their current status, and development priorities. Use this to:
1. **Identify shared component opportunities** - Look for similar functionality across components
2. **Track development status** - Understand what's implemented vs. in progress
3. **Avoid duplication** - Check existing components before creating new ones
4. **Maintain consistency** - Use shared components when possible

### **Component Status Legend**
- ✅ **ACTIVE** - Fully implemented and in use
- 🔄 **IN DEVELOPMENT** - Partially implemented, work in progress
- 🚧 **PLANNED** - Designed but not yet implemented
- ❌ **DEPRECATED** - No longer in use, superseded by newer components
- 🔍 **NEEDS REVIEW** - Requires assessment for consolidation or refactoring

---

## **📋 Active Components**

### **Shared Components** ✅ **ACTIVE**

#### **Grid & Display Components**
- **SharedGrid** (`src/components/shared/SharedGrid.tsx`)
  - **Purpose**: Unified grid system for workspace and library
  - **Status**: ✅ ACTIVE - Replaces separate workspace and library grids
  - **Usage**: Used by Workspace and Library pages
  - **Features**: Responsive grid, lazy loading, thumbnail support

- **SharedLightbox** (`src/components/shared/SharedLightbox.tsx`)
  - **Purpose**: Unified lightbox for image/video preview
  - **Status**: ✅ ACTIVE - Replaces separate lightbox components
  - **Usage**: Used by Workspace and Library pages
  - **Features**: Image/video preview, zoom, navigation

#### **Input & Control Components**
- **SimplePromptInput** (`src/components/workspace/SimplePromptInput.tsx`)
  - **Purpose**: Unified prompt input with i2i capabilities
  - **Status**: ✅ ACTIVE - Enhanced with i2i functionality
  - **Usage**: Used by Workspace page
  - **Features**: Reference image upload, i2i mode switching, style controls

- **MobileSimplePromptInput** (`src/components/workspace/MobileSimplePromptInput.tsx`)
  - **Purpose**: Mobile-optimized prompt input
  - **Status**: ✅ ACTIVE - Mobile version of SimplePromptInput
  - **Usage**: Used by mobile workspace
  - **Features**: Touch-optimized, simplified controls

#### **UI Components**
- **NegativePromptPresets** (`src/components/ui/negative-prompt-presets.tsx`)
  - **Purpose**: Negative prompt preset selection
  - **Status**: ✅ ACTIVE - Recently added for i2i improvements
  - **Usage**: Used by SimplePromptInput
  - **Features**: Preset selection, custom input

### **Workspace-Specific Components** ✅ **ACTIVE**

#### **Page Components**
- **SimplifiedWorkspace** (`src/pages/SimplifiedWorkspace.tsx`)
  - **Purpose**: Main workspace page implementation
  - **Status**: ✅ ACTIVE - Uses SharedGrid and SharedLightbox
  - **Features**: Grid display, realtime updates, i2i functionality

- **MobileSimplifiedWorkspace** (`src/pages/MobileSimplifiedWorkspace.tsx`)
  - **Purpose**: Mobile workspace page
  - **Status**: ✅ ACTIVE - Mobile-optimized workspace
  - **Features**: Touch interface, simplified controls

#### **Control Components**
- **WorkspaceControls** (Integrated in SimplePromptInput)
  - **Purpose**: Workspace-specific generation controls
  - **Status**: ✅ ACTIVE - Part of SimplePromptInput
  - **Features**: Batch generation, quality settings, i2i modes

### **Library-Specific Components** 🔄 **IN DEVELOPMENT**

#### **Page Components**
- **Library** (`src/pages/Library.tsx`)
  - **Purpose**: Library page for saved assets
  - **Status**: 🔄 IN DEVELOPMENT - Basic implementation complete
  - **Features**: Asset management, filtering, bulk operations

#### **Control Components**
- **LibraryControls** (Planned)
  - **Purpose**: Library-specific controls
  - **Status**: 🚧 PLANNED - Not yet implemented
  - **Features**: Bulk operations, filtering, organization

### **Playground Components** ✅ **ACTIVE**

#### **Page Components**
- **Playground** (`src/pages/Playground.tsx`)
  - **Purpose**: Dynamic prompting and chat interface
  - **Status**: ✅ ACTIVE - Fully implemented
  - **Features**: 4 modes (Chat, Roleplay, Creative Writing, Admin), 12+ templates

#### **Chat Components**
- **ChatInterface** (Integrated in Playground)
  - **Purpose**: Chat and roleplay interface
  - **Status**: ✅ ACTIVE - Part of Playground page
  - **Features**: Real-time chat, roleplay modes, template system

### **Admin Components** ✅ **ACTIVE**

#### **Page Components**
- **Admin** (`src/pages/Admin.tsx`)
  - **Purpose**: Admin dashboard and tools
  - **Status**: ✅ ACTIVE - Fully implemented
  - **Features**: User management, content moderation, analytics

#### **Admin Tools**
- **UserManagement** (Integrated in Admin)
  - **Purpose**: User management interface
  - **Status**: ✅ ACTIVE - Part of Admin page
  - **Features**: User list, role management, activity tracking

### **Storyboard Components** 🚧 **PLANNED**

#### **Page Components**
- **Storyboard** (`src/pages/Storyboard.tsx`)
  - **Purpose**: Storyboard creation and management
  - **Status**: 🚧 PLANNED - Not yet implemented
  - **Features**: Scene management, project organization, continuity

#### **Storyboard Tools**
- **SceneEditor** (Planned)
  - **Purpose**: Scene creation and editing
  - **Status**: 🚧 PLANNED - Not yet implemented
  - **Features**: Scene composition, character placement, continuity

### **Dashboard Components** 🔄 **IN DEVELOPMENT**

#### **Page Components**
- **Dashboard** (`src/pages/Dashboard.tsx`)
  - **Purpose**: User dashboard and analytics
  - **Status**: 🔄 IN DEVELOPMENT - Basic implementation
  - **Features**: Usage statistics, recent activity

---

## **🔍 Components Needing Review**

### **Potential Consolidation Opportunities**
1. **Prompt Input Components**
   - **SimplePromptInput** and **MobileSimplePromptInput** could potentially share more logic
   - **Status**: 🔍 NEEDS REVIEW - Consider creating shared base component

2. **Grid Components**
   - **SharedGrid** is working well, but monitor for workspace/library specific needs
   - **Status**: ✅ ACTIVE - Working well, continue monitoring

3. **Control Components**
   - **WorkspaceControls** and planned **LibraryControls** may have overlap
   - **Status**: 🔍 NEEDS REVIEW - Plan for shared control patterns

---

## **❌ Deprecated Components**

### **Replaced by Shared Components**
- **OldWorkspaceGrid** - Replaced by SharedGrid
  - **Reason**: Duplicate functionality, maintenance overhead
  - **Replacement**: SharedGrid component

- **OldLibraryGrid** - Replaced by SharedGrid
  - **Reason**: Duplicate functionality, maintenance overhead
  - **Replacement**: SharedGrid component

- **OldLightbox** - Replaced by SharedLightbox
  - **Reason**: Duplicate functionality, inconsistent UX
  - **Replacement**: SharedLightbox component

### **Superseded by New Architecture**
- **JobThumbnailSelector** - Removed from workspace
  - **Reason**: Simplified to grid-only approach
  - **Status**: ❌ DEPRECATED - No longer needed

- **WorkspaceTempGrid** - Replaced by staging-first approach
  - **Reason**: New architecture uses workspace-temp bucket directly
  - **Status**: ❌ DEPRECATED - Superseded by new approach

---

## **🚀 Development Priorities**

### **Immediate Priorities**
1. **Complete Library Page** - Enhance library functionality and controls
2. **I2I System Improvements** - Continue refining i2i settings and UI
3. **3rd Party API Integration** - Complete Replicate and OpenRouter integration

### **Component Consolidation Opportunities**
1. **Prompt Input Base Component** - Create shared base for prompt inputs
2. **Control Component Patterns** - Establish shared patterns for page controls
3. **UI Component Library** - Expand shared UI component library

### **New Component Development**
1. **Storyboard Components** - Develop storyboard creation tools
2. **Dashboard Analytics** - Enhance dashboard with better analytics
3. **Admin API Management** - Create components for API provider management

---

## **📊 Component Statistics**

- **Total Active Components**: 15
- **Shared Components**: 5
- **Page-Specific Components**: 10
- **Deprecated Components**: 5
- **Components in Development**: 3
- **Planned Components**: 4

---

**Note**: This inventory is updated as components are added, modified, or deprecated. Always check this document before creating new components to avoid duplication and ensure consistency.
