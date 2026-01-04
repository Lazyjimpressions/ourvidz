# Roleplay Purpose & PRD (Product Requirements Document)

**Last Updated:** January 4, 2026
**Status:** ✅ **85% Complete - Production Ready**
**Priority:** **HIGH** - Core MVP Feature

## **🎯 Purpose Statement**
Provide a mobile-first, character-consistent chat experience with integrated visual scene generation, enabling users to engage in immersive roleplay conversations with AI characters while maintaining visual continuity across scenes.

## **👤 User Intent & Business Goals**

### **Primary User Intent**
- **Entertainment**: Engage in immersive roleplay conversations with AI characters
- **Creative Expression**: Generate and share visual scenes from conversations
- **Social Sharing**: Create shareable content for social media platforms
- **Mobile-First**: On-the-go entertainment and storytelling

### **Secondary User Intent**
- **Character Customization**: Create and personalize AI characters
- **Story Development**: Build persistent narratives across conversations
- **Community Engagement**: Share characters and scenes with other users
- **Premium Features**: Access advanced consistency and memory systems

### **Business Value**
- **Competitive Differentiation**: Integrated scene generation vs. Character.ai
- **User Engagement**: Visual storytelling increases session duration (target: 15+ minutes)
- **Viral Potential**: Scene images create shareable content for social media
- **Revenue Opportunity**: Premium features for advanced consistency and memory
- **User Retention**: Target 70%+ day 7 retention through engaging experience

## **🏗️ Core Functionality Requirements**

### **Primary Features (MVP)**
1. **Character Selection Dashboard** - Mobile-first grid, immediate chat start
2. **Chat Interface** - Responsive chat with character avatars and streaming
3. **Scene Integration** - Auto-selected scenes, optional manual selection in chat
4. **Memory System** - Three-tier memory (conversation, character, profile)
5. **Image Consistency** - Hybrid approach using i2i reference (70%+ consistency)
6. **Non-Blocking UI** - Drawers for character info, scenes, and settings (no modal blockers)

### **Secondary Features (Phase 2)**
1. **Custom Character Creation** - Character builder with real-time preview
2. **Scene Generation** - Dynamic scene creation with consistency controls
3. **Model Management** - Admin/power user model selection and configuration
4. **Advanced Mobile Gestures** - Swipe navigation, advanced touch gestures, pinch-to-zoom
5. **Long-Press Actions** - Context menus and advanced message actions

## **🎨 UX/UI Design Requirements**

### **Layout Structure**
- **Mobile-First Dashboard**: Grid layout with character cards optimized for touch (44px minimum)
- **Responsive Chat**: Full-screen chat view with bottom input bar, immediate start
- **Slide-out Drawers**: Non-blocking drawers for character info, scenes, and settings
- **Bottom Navigation**: Mobile-optimized navigation bar
- **No Blocking Modals**: All advanced features accessible via drawers, not modals

### **User Flow**
1. **Login → Dashboard**: Grid of character cards with "Quick Start" section
2. **Character Selection**: Tap character card → start chat immediately (preview optional via long-press or button)
3. **Scene Integration**: Auto-select best available scene, or start without scene (select later in chat)
4. **Chat Interface**: Full-screen chat with character avatars, scene integration, and optional drawers
5. **Scene Generation**: Automatic scene generation with consistency controls (Phase 2)

### **Key Interactions**
- **Touch-Optimized Cards**: Large touch targets with proper spacing (44px minimum)
- **Immediate Chat Start**: Single tap on character card starts chat (<1 second)
- **Optional Preview**: Long-press (500ms) or preview button opens character info drawer
- **Drawer Gestures**: Swipe from edges to open character info or settings drawers
- **Pinch-to-Zoom**: Image viewing and scene preview (Phase 2)
- **Swipe Gestures**: Advanced navigation gestures (Phase 2)

## **🔌 3rd Party API Integration (Active)**

### **Model Providers**
| Modality | Primary (Cloud) | Fallback | Local (when available) |
|----------|-----------------|----------|------------------------|
| **Chat** | OpenRouter (Dolphin, etc.) | OpenRouter defaults | Qwen 2.5-7B |
| **Images** | Replicate, fal.ai | Seedream, RV5.1 | SDXL Lustify |
| **Video** | fal.ai (WAN I2V) | - | WAN 2.1 |

### **Routing Strategy**
- **Default to cloud models** for reliability
- Local models only used when:
  1. Admin enables health check toggle
  2. Health check confirms worker availability
  3. User explicitly selects local model
- Automatic fallback to cloud on local failure

### **Content Rating**
- All roleplay defaults to **NSFW** content tier
- SFW option available for users who prefer it
- Content rating affects: prompt templates, voice examples, scene suggestions

## **🔧 Technical Requirements**

### **Performance Requirements**
- **Page Load**: <3 seconds on mobile devices
- **Image Generation**: <5 seconds for scene generation
- **Memory Usage**: <100MB on mobile devices
- **API Response**: <2 seconds for chat responses

### **Integration Requirements**
- **Database**: Leverage existing `characters`, `conversations`, `messages`, `scenes` tables
- **Edge Functions**: Use existing `queue-job`, `replicate-image`, `roleplay-chat`
- **Storage**: Use existing `user_library` table with roleplay category
- **Workers**: Chat Worker (local), SDXL Worker (images), API integrations (OpenRouter, Replicate, fal.ai)

## **📊 Success Criteria & Metrics**

### **User Experience Metrics**
- **Flow Completion**: 95%+ success rate from login to chat (improved by removing blockers)
- **Character Selection**: <5 seconds average selection time (immediate start)
- **Chat Initiation**: <1 second to start conversation (direct navigation, no modals)
- **Session Duration**: 15+ minutes average session length

### **Technical Performance Metrics**
- **Mobile Load Time**: <3 seconds on low-end devices
- **Image Consistency**: 70%+ visual consistency across scenes
- **Memory Efficiency**: Optimized memory usage and management
- **Error Recovery**: <5% error rate with proper recovery

### **Business Metrics**
- **User Retention**: 70%+ day 7 retention
- **Feature Adoption**: 80%+ character usage rate
- **User Satisfaction**: 4.5+ star rating
- **Revenue Impact**: Premium feature adoption tracking

## **🚨 Error Scenarios & Handling**

### **Common Failure Modes**
- **Network Failures**: Offline mode with message queuing
- **API Errors**: Fallback to alternative models and services
- **Image Generation Failures**: Graceful degradation to text-only mode
- **Memory Issues**: Automatic cleanup and optimization

### **Error Handling Strategy**
- **Error Boundaries**: React error boundaries for component recovery
- **User Feedback**: Clear error messages with recovery options
- **Automatic Retry**: Intelligent retry logic for transient failures
- **Graceful Degradation**: Fallback modes for partial failures

## **🔗 Dependencies & Constraints**

### **Technical Dependencies**
- **SDXL Worker**: Image generation and consistency management
- **Chat Worker**: Conversation processing and streaming
- **Supabase**: Database, authentication, and real-time features
- **API Integrations**: OpenAI, Anthropic, and other chat models

### **Business Dependencies**
- **User Permissions**: Role-based access for admin features
- **Content Moderation**: Character and scene content filtering
- **Privacy Controls**: User data protection and memory management
- **Legal Compliance**: Content guidelines and user agreements

## **📈 Future Enhancements (Phase 2+)**

### **Advanced Features**
- **Multi-modal Interactions**: Generate images/videos from chat
- **Advanced Analytics**: Detailed usage analytics and insights
- **Collaborative Features**: Multi-user roleplay sessions
- **AI Narrator**: Advanced scene description generation

### **Premium Features**
- **High Consistency**: IP-Adapter for 90%+ consistency
- **Advanced Memory**: Unlimited cross-conversation memory
- **Custom Models**: User-specific model training
- **Priority Generation**: Faster generation for premium users

## **📝 Implementation Guidelines**

### **Critical Technical Decisions**
1. **Image Consistency Method**: Hybrid approach using i2i reference as default (70% consistency)
2. **Memory Architecture**: Three-tier system with user controls and optimization
3. **Mobile Priority**: Design mobile-first with progressive desktop enhancement
4. **Performance Focus**: Optimize for speed and reliability over advanced features
5. **UI/UX Philosophy**: Immediate action, optional complexity, no blocking modals

### **UI/UX Principles**
- **Immediate Action**: Click → Chat starts instantly
- **Optional Complexity**: Advanced features in drawers, not blockers
- **Mobile-First**: Touch-optimized, no modal stacking
- **Progressive Disclosure**: Simple by default, advanced when needed

### **Development Guidelines**
- **Component Reusability**: Design components for reuse across pages
- **State Management**: Use consistent patterns with React hooks
- **Testing Strategy**: Comprehensive testing at each development phase
- **Documentation**: Maintain up-to-date documentation throughout development

### **Quality Assurance**
- **Mobile Testing**: Extensive testing on various mobile devices
- **Performance Monitoring**: Continuous monitoring of load times and memory usage
- **User Testing**: Regular user testing and feedback collection
- **Error Tracking**: Comprehensive error tracking and resolution

---

## **📋 Refactor Notes (December 2025)**

**Refactor Rationale:** Based on user feedback and competitor analysis (Character.ai, Janitor.ai, Chub.ai), the roleplay flow has been simplified to eliminate modal blockers and enable immediate chat start. This refactor addresses:
- Dark screen overlay persistence issues
- Complex workflow with too many modals
- Mobile-unfriendly modal stacking
- User confusion about required vs optional steps

**Key Refactor Changes:**
- Preview modal is now optional (long-press or button), not required
- Scenes auto-select or are optional (can start without scene)
- All advanced features moved to non-blocking drawers
- Direct navigation eliminates modal/navigation race conditions
- Improved metrics: <1s chat initiation, <5s character selection, 95%+ flow completion

**Refactor Plan:** See `.cursor/plans/roleplay_refactor_-_simple_mobile-first_16bb523a.plan.md`

---

## **🚀 Upcoming Features (Q1 2026)**

### **Phase 2: Enhanced Character Creation**
- **Structured character wizard**: 6-layer character creation (identity, personality, appearance, voice, role, constraints)
- **AI suggestions ("Sprinkle")**: AI-generated suggestions for traits, voice, appearance
- **Content rating toggle**: SFW/NSFW with NSFW default
- **Character templates**: Pre-built character archetypes

### **Phase 2: Scenario Setup Wizard**
- **8-screen guided flow**: Mode select → Age gate → Scenario type → Characters → Setting → Consent → Style → Hook
- **5 scenario types**: Stranger, Relationship, Power Dynamic, Fantasy, Slow Burn
- **AI-generated hooks**: Scenario opening suggestions based on character/type
- **Quick Start mode**: Minimal setup for fast session start

### **Phase 3: Advanced Features**
- **Multi-character scenarios**: Support for multiple AI characters
- **Memory anchors**: Key facts characters remember across sessions
- **Scenario templates**: Save and reuse scenario configurations

---

**Status**: PRD updated January 2026. 85% complete, production ready. This document serves as the strategic foundation for all roleplay development decisions and success metrics.

**Document Purpose**: This is the definitive Product Requirements Document (PRD) that defines the business goals, user requirements, and success criteria for the roleplay feature. It serves as the strategic foundation for all development decisions.