# Edge Functions Overview

**Last Updated:** August 30, 2025  
**Status:** ✅ Active - All functions operational

## **Architecture**

OurVidz uses Supabase Edge Functions for all server-side operations. These functions provide a scalable, serverless backend that handles job queuing, content generation, user management, and system monitoring.

### **Key Patterns**
- **Job Queuing**: Redis-based job management for AI generation
- **Real-time Updates**: WebSocket subscriptions for live status
- **Template System**: Database-driven prompting with caching
- **Fallback Strategy**: 3rd party API integration for reliability
- **Monitoring**: Comprehensive logging and performance tracking

---

## **Active Functions**

### **queue-job** (`supabase/functions/queue-job/`)
- **Purpose**: Creates and routes generation jobs to workers
- **Status**: ✅ Active
- **Integration**: SDXL Worker, WAN Worker, Chat Worker
- **Key Features**: 
  - Job queuing with Redis
  - Parameter validation and conversion
  - Worker routing and load balancing
  - I2I mode detection and processing
  - Reference strength to denoise_strength conversion
- **Code Reference**: `supabase/functions/queue-job/index.ts`
- **Usage**: All image and video generation requests

### **job-callback** (`supabase/functions/job-callback/`)
- **Purpose**: Handles job completion and routes results to workspace/library
- **Status**: ✅ Active
- **Integration**: All workers, workspace system, library system
- **Key Features**:
  - Result processing and validation
  - Storage management (workspace-temp bucket)
  - Real-time updates via WebSocket
  - Error handling and retry logic
  - Metadata extraction and storage
- **Code Reference**: `supabase/functions/job-callback/index.ts`
- **Usage**: All worker completion notifications

### **enhance-prompt** (`supabase/functions/enhance-prompt/`)
- **Purpose**: Dynamic prompt enhancement using database templates
- **Status**: ✅ Active
- **Integration**: Prompting system, template system, content detection
- **Key Features**:
  - 12+ specialized templates
  - SFW/NSFW content detection
  - Template selection with fallbacks
  - Token optimization
  - Performance monitoring and caching
- **Code Reference**: `supabase/functions/enhance-prompt/index.ts`
- **Usage**: All prompt enhancement requests

### **playground-chat** (`supabase/functions/playground-chat/`)
- **Purpose**: Chat functionality for playground page
- **Status**: ✅ Active
- **Integration**: Chat Worker, roleplay system, template system
- **Key Features**:
  - Real-time chat processing
  - Roleplay scenario management
  - Template-based responses
  - Character context handling
  - Conversation history management
- **Code Reference**: `supabase/functions/playground-chat/index.ts`
- **Usage**: Playground page chat and roleplay

### **workspace-actions** (`supabase/functions/workspace-actions/`)
- **Purpose**: Workspace item management (save to library, discard)
- **Status**: ✅ Active
- **Integration**: Workspace system, library system, storage system
- **Key Features**:
  - Save items to user library
  - Discard items from workspace
  - Storage bucket management
  - Metadata updates
  - Real-time workspace updates
- **Code Reference**: `supabase/functions/workspace-actions/index.ts`
- **Usage**: Workspace save/discard operations

### **replicate-image** (`supabase/functions/replicate-image/`)
- **Purpose**: Replicate API integration for image generation
- **Status**: ✅ Active
- **Integration**: Replicate API, image generation system
- **Key Features**:
  - RV5.1 model integration
  - Parameter mapping and conversion
  - Fallback handling
  - Cost tracking and monitoring
  - Webhook integration
- **Code Reference**: `supabase/functions/replicate-image/index.ts`
- **Usage**: Alternative image generation via Replicate

### **replicate-webhook** (`supabase/functions/replicate-webhook/`)
- **Purpose**: Handles Replicate webhook callbacks
- **Status**: ✅ Active
- **Integration**: Replicate API, job system
- **Key Features**:
  - Webhook validation and processing
  - Result handling and storage
  - Error handling and retries
  - Status updates and notifications
- **Code Reference**: `supabase/functions/replicate-webhook/index.ts`
- **Usage**: Replicate job completion notifications

### **replicate-callback** (`supabase/functions/replicate-callback/`)
- **Purpose**: Processes Replicate job completion
- **Status**: ✅ Active
- **Integration**: Replicate API, workspace system
- **Key Features**:
  - Result processing and validation
  - Storage management
  - Metadata updates
  - Real-time notifications
- **Code Reference**: `supabase/functions/replicate-callback/index.ts`
- **Usage**: Replicate job result processing

### **delete-workspace-item** (`supabase/functions/delete-workspace-item/`)
- **Purpose**: Deletes workspace items with storage cleanup
- **Status**: ✅ Active
- **Integration**: Workspace system, storage system
- **Key Features**:
  - Item deletion with metadata cleanup
  - Storage bucket cleanup
  - Real-time workspace updates
  - Error handling and validation
- **Code Reference**: `supabase/functions/delete-workspace-item/index.ts`
- **Usage**: Workspace item deletion

### **refresh-prompt-cache** (`supabase/functions/refresh-prompt-cache/`)
- **Purpose**: Manages prompt template cache
- **Status**: ✅ Active
- **Integration**: Prompting system, cache system
- **Key Features**:
  - Template cache refresh
  - Cache invalidation
  - Performance optimization
  - Template version management
- **Code Reference**: `supabase/functions/refresh-prompt-cache/index.ts`
- **Usage**: Template cache management

### **system-metrics** (`supabase/functions/system-metrics/`)
- **Purpose**: Provides system metrics for admin dashboard
- **Status**: ✅ Active
- **Integration**: Admin system, monitoring system
- **Key Features**:
  - Worker health monitoring
  - Queue depth tracking
  - Performance metrics
  - System status reporting
- **Code Reference**: `supabase/functions/system-metrics/index.ts`
- **Usage**: Admin dashboard metrics

### **health-check-workers** (`supabase/functions/health-check-workers/`)
- **Purpose**: Monitors worker system health
- **Status**: ✅ Active
- **Integration**: Worker system, monitoring system
- **Key Features**:
  - Worker availability checking
  - Response time monitoring
  - Health status reporting
  - Automatic failover detection
- **Code Reference**: `supabase/functions/health-check-workers/index.ts`
- **Usage**: Worker health monitoring

### **get-negative-prompt** (`supabase/functions/get-negative-prompt/`)
- **Purpose**: Retrieves negative prompt presets
- **Status**: ✅ Active
- **Integration**: Prompting system, UI components
- **Key Features**:
  - Preset retrieval and caching
  - Category-based organization
  - Performance optimization
  - Template integration
- **Code Reference**: `supabase/functions/get-negative-prompt/index.ts`
- **Usage**: Negative prompt preset selection

### **get-active-worker-url** (`supabase/functions/get-active-worker-url/`)
- **Purpose**: Retrieves active worker URLs
- **Status**: ✅ Active
- **Integration**: Worker system, job routing
- **Key Features**:
  - Worker URL management
  - Load balancing support
  - Health-based routing
  - Configuration management
- **Code Reference**: `supabase/functions/get-active-worker-url/index.ts`
- **Usage**: Worker URL discovery

### **update-worker-url** (`supabase/functions/update-worker-url/`)
- **Purpose**: Updates worker URLs in configuration
- **Status**: ✅ Active
- **Integration**: Worker system, configuration management
- **Key Features**:
  - URL updates and validation
  - Configuration persistence
  - Health status updates
  - Admin interface integration
- **Code Reference**: `supabase/functions/update-worker-url/index.ts`
- **Usage**: Worker configuration management

### **register-chat-worker** (`supabase/functions/register-chat-worker/`)
- **Purpose**: Registers chat worker with the system
- **Status**: ✅ Active
- **Integration**: Chat worker, worker management
- **Key Features**:
  - Worker registration and validation
  - Health monitoring setup
  - Configuration management
  - Status tracking
- **Code Reference**: `supabase/functions/register-chat-worker/index.ts`
- **Usage**: Chat worker registration

### **get-schema-info** (`supabase/functions/get-schema-info/`)
- **Purpose**: Retrieves database schema information
- **Status**: ✅ Active
- **Integration**: Database system, admin tools
- **Key Features**:
  - Schema discovery and reporting
  - Table metadata retrieval
  - Column information
  - Relationship mapping
- **Code Reference**: `supabase/functions/get-schema-info/index.ts`
- **Usage**: Database schema exploration

### **generate-admin-image** (`supabase/functions/generate-admin-image/`)
- **Purpose**: Generates images for admin purposes
- **Status**: ✅ Active
- **Integration**: Image generation, admin system
- **Key Features**:
  - Admin-specific image generation
  - Testing and validation
  - System verification
  - Performance testing
- **Code Reference**: `supabase/functions/generate-admin-image/index.ts`
- **Usage**: Admin testing and validation

### **generate-avatars** (`supabase/functions/generate-avatars/`)
- **Purpose**: Generates user avatars
- **Status**: ✅ Active
- **Integration**: Avatar system, image generation
- **Key Features**:
  - Avatar generation and customization
  - User preference handling
  - Storage management
  - Real-time updates
- **Code Reference**: `supabase/functions/generate-avatars/index.ts`
- **Usage**: User avatar generation

---

## **Deprecated Functions**

### **enhance-prompt-old** (`supabase/functions/enhance-prompt-old/`)
- **Purpose**: Original prompt enhancement implementation
- **Status**: ❌ Deprecated
- **Replaced By**: `enhance-prompt`
- **Deprecation Date**: August 2025
- **Reason**: Superseded by improved template system and pure inference architecture

### **generate-content** (`supabase/functions/generate-content/`)
- **Purpose**: Original content generation endpoint
- **Status**: ❌ Deprecated
- **Replaced By**: `queue-job`
- **Deprecation Date**: August 2025
- **Reason**: Consolidated into unified job queuing system

### **test-edge-functions** (`supabase/functions/test-edge-functions/`)
- **Purpose**: Testing and validation functions
- **Status**: ❌ Deprecated
- **Deprecation Date**: August 2025
- **Reason**: Replaced by dedicated testing functions and monitoring

### **validate-enhancement-fix** (`supabase/functions/validate-enhancement-fix/`)
- **Purpose**: Enhancement system validation
- **Status**: ❌ Deprecated
- **Deprecation Date**: August 2025
- **Reason**: Superseded by improved monitoring and validation systems

---

## **Shared Utilities**

### **cache-utils.ts** (`supabase/functions/_shared/cache-utils.ts`)
- **Purpose**: Intelligent caching system for templates and prompts
- **Features**:
  - Template caching with TTL
  - Content detection (SFW/NSFW)
  - Performance optimization (80% reduction in DB calls)
  - Fallback mechanisms
  - Cache invalidation strategies
- **Code Reference**: `supabase/functions/_shared/cache-utils.ts`
- **Usage**: All functions requiring template or content caching

### **monitoring.ts** (`supabase/functions/_shared/monitoring.ts`)
- **Purpose**: Performance tracking and error monitoring
- **Features**:
  - Execution time monitoring
  - Cache hit/miss tracking
  - Error logging and reporting
  - System health validation
  - Performance metrics collection
- **Code Reference**: `supabase/functions/_shared/monitoring.ts`
- **Usage**: All functions requiring monitoring and logging

---

## **Development Notes**

### **Code Location**
- **All Functions**: `supabase/functions/`
- **Shared Utilities**: `supabase/functions/_shared/`
- **Deployment**: Automatic with project deployment
- **Runtime**: Deno with TypeScript

### **Testing & Development**
```bash
# Local testing
supabase functions serve

# View logs
supabase functions logs

# Deploy specific function
supabase functions deploy [function-name]
```

### **Integration Patterns**
- **Job Flow**: queue-job → worker → job-callback
- **Prompt Flow**: enhance-prompt → template selection → enhancement
- **Storage Flow**: workspace-temp → user-library (on save)
- **API Flow**: replicate-image → replicate-webhook → replicate-callback

### **Performance Considerations**
- **Caching**: Extensive use of template and content caching
- **Monitoring**: Real-time performance tracking
- **Fallbacks**: Multiple levels of fallback for reliability
- **Optimization**: Token limits and parameter optimization

### **Security**
- **RLS**: Row-level security on all database operations
- **Validation**: Input validation and sanitization
- **Authentication**: Supabase Auth integration
- **Authorization**: Role-based access control

---

## **Best Practices for AI Development**

### **When Working with Edge Functions**
1. **Check Existing Functions**: Always review existing functions before creating new ones
2. **Use Shared Utilities**: Leverage cache-utils.ts and monitoring.ts
3. **Follow Patterns**: Use established patterns for job queuing and result handling
4. **Test Locally**: Use `supabase functions serve` for local testing
5. **Monitor Performance**: Include performance monitoring in new functions
6. **Handle Errors**: Implement proper error handling and fallbacks
7. **Update Documentation**: Keep this overview updated with new functions

### **Common Integration Points**
- **Database**: Use Supabase client for database operations
- **Storage**: Use Supabase Storage for file management
- **Auth**: Use Supabase Auth for user authentication
- **Real-time**: Use Supabase real-time for live updates
- **External APIs**: Use fetch() for external API calls

---

**Note**: This overview provides guidance for AI development. Always reference the actual code files for implementation details and current functionality.
