# Roleplay Development Plan - Technical Implementation Roadmap

**Last Updated:** August 30, 2025  
**Status:** 🚧 **Development Planning Phase**  
**Priority:** **HIGH** - Core MVP Feature

## **🎯 Development Overview**

### **Objective**
Transform the existing roleplay system into a mobile-first, character-consistent chat experience following the PRD requirements. This document provides the detailed technical implementation roadmap.

### **Development Phases**
- **Phase 1**: Core Infrastructure & Mobile-First UI (Weeks 1-2)
- **Phase 2**: Advanced Features & Integration (Weeks 3-4)
- **Phase 3**: Performance Optimization & Polish (Week 5)

### **Key Success Metrics**
- **User Flow Completion**: 90%+ success rate from login to chat
- **Character Consistency**: 70%+ visual consistency across scenes
- **Mobile Performance**: <3 second load times on mobile devices
- **User Engagement**: 15+ minute average session duration

---

## **🏗️ Technical Architecture**

### **Core User Flow**
```
Login → Dashboard → Character Selection → Scene Selection (optional) → Chat Interface
```

### **Technical Stack**
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Image Generation**: SDXL Worker (local) + Replicate API (fallback)
- **Chat**: Chat Worker (local) + API integrations (OpenRouter, Claude, GPT)
- **Storage**: Supabase Storage + CDN

### **Database Schema Extensions**
```sql
-- Character table enhancements
ALTER TABLE characters ADD COLUMN IF NOT EXISTS consistency_method TEXT DEFAULT 'i2i_reference';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS seed_locked INTEGER;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS base_prompt TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS preview_image_url TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS quick_start BOOLEAN DEFAULT false;

-- Memory system to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS memory_tier TEXT DEFAULT 'conversation';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS memory_data JSONB DEFAULT '{}';

-- Enhance user_library for roleplay content
ALTER TABLE user_library ADD COLUMN IF NOT EXISTS content_category TEXT DEFAULT 'general';
ALTER TABLE user_library ADD COLUMN IF NOT EXISTS roleplay_metadata JSONB DEFAULT '{}';
```

---

## **📋 Phase 1: Core Infrastructure (Weeks 1-2)**

### **Week 1: Foundation & Database**

#### **Day 1-2: Database & Edge Functions**
**Tasks:**
- [ ] Execute database schema extensions
- [ ] Create new `roleplay-chat` edge function
- [ ] Archive deprecated components and pages
- [ ] Set up development environment

**Edge Function Creation:**
```typescript
// supabase/functions/roleplay-chat/index.ts
interface RoleplayChatRequest {
  message: string;
  conversation_id: string;
  character_id: string;
  model_provider: 'chat_worker' | 'openrouter' | 'claude' | 'gpt';
  model_variant?: string;
  memory_tier: 'conversation' | 'character' | 'profile';
  content_tier: 'sfw' | 'nsfw';
  scene_generation?: boolean;
}
```

**Component Archiving:**
```bash
# Archive deprecated components
mkdir -p src/components/roleplay/ARCHIVED
mv src/components/roleplay/RoleplayLeftSidebar.tsx src/components/roleplay/ARCHIVED/
mv src/components/roleplay/RoleplaySidebar.tsx src/components/roleplay/ARCHIVED/
mv src/components/roleplay/MultiCharacterSceneCard.tsx src/components/roleplay/ARCHIVED/
mv src/components/roleplay/SceneContextHeader.tsx src/components/roleplay/ARCHIVED/
mv src/components/roleplay/SectionHeader.tsx src/components/roleplay/ARCHIVED/
mv src/components/roleplay/UnifiedSceneCard.tsx src/components/roleplay/ARCHIVED/
mv src/components/roleplay/UserCharacterSetup.tsx src/components/roleplay/ARCHIVED/
mv src/components/roleplay/CharacterEditModal.tsx src/components/roleplay/ARCHIVED/
mv src/components/roleplay/CharacterMultiSelector.tsx src/components/roleplay/ARCHIVED/

# Archive old pages
mkdir -p src/pages/ARCHIVED
mv src/pages/RoleplayDashboard.tsx src/pages/ARCHIVED/
mv src/pages/RoleplayChat.tsx src/pages/ARCHIVED/
```

#### **Day 3-4: Mobile-First Dashboard**
**Tasks:**
- [ ] Create `MobileRoleplayDashboard.tsx`
- [ ] Create `CharacterGrid.tsx` component
- [ ] Create `MobileCharacterCard.tsx` component
- [ ] Create `QuickStartSection.tsx` component

**New Dashboard Component:**
```typescript
// src/pages/MobileRoleplayDashboard.tsx
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { CharacterGrid } from '@/components/roleplay/CharacterGrid';
import { QuickStartSection } from '@/components/roleplay/QuickStartSection';
import { SearchAndFilters } from '@/components/roleplay/SearchAndFilters';

const MobileRoleplayDashboard = () => {
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  
  return (
    <OurVidzDashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Roleplay</h1>
          <p className="text-gray-400 mt-2">Chat with AI characters and generate scenes</p>
        </div>
        
        {/* Quick Start Section */}
        <QuickStartSection />
        
        {/* Search and Filters */}
        <SearchAndFilters />
        
        {/* Character Grid */}
        <CharacterGrid />
      </div>
    </OurVidzDashboardLayout>
  );
};
```

#### **Day 5: Mobile Character Components**
**Tasks:**
- [ ] Create responsive character grid
- [ ] Implement touch-optimized character cards
- [ ] Add quick start section
- [ ] Create search and filter components

**Character Grid Implementation:**
```typescript
// src/components/roleplay/CharacterGrid.tsx
const CharacterGrid = () => {
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  
  return (
    <div className={`
      grid gap-4
      ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : ''}
      ${isTablet ? 'grid-cols-2 md:grid-cols-3' : ''}
      ${isDesktop ? 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : ''}
    `}>
      {characters.map(character => (
        <MobileCharacterCard key={character.id} character={character} />
      ))}
    </div>
  );
};
```

### **Week 2: Chat Interface & Mobile Optimization**

#### **Day 1-2: Mobile Chat Interface** ✅
**Tasks:**
- [x] Create `MobileRoleplayChat.tsx`
- [x] Create `MobileChatInput.tsx` component
- [x] Create `MobileCharacterSheet.tsx` component
- [x] Create `ContextMenu.tsx` component
- [x] Implement responsive chat layout
- [x] Wire up gear icon (settings) and three-dot menu (context menu)

**Chat Interface Implementation:**
```typescript
// src/pages/MobileRoleplayChat.tsx
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { ChatInterface } from '@/components/roleplay/ChatInterface';
import { CharacterInfo } from '@/components/roleplay/CharacterInfo';
import { MobileCharacterSheet } from '@/components/roleplay/MobileCharacterSheet';

const MobileRoleplayChat = () => {
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  
  return (
    <OurVidzDashboardLayout>
      <div className="flex h-screen bg-background">
        {/* Character Info - Collapsible on mobile */}
        {!isMobile && (
          <div className="w-80 border-r border-border bg-card">
            <CharacterInfo character={selectedCharacter} />
          </div>
        )}
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            <ChatInterface messages={messages} />
          </div>
          
          {/* Input Area */}
          <div className="border-t border-border p-4">
            <MobileChatInput 
              onSend={handleSendMessage}
              onGenerateScene={handleGenerateScene}
              isMobile={isMobile}
            />
          </div>
        </div>
        
        {/* Mobile Character Info - Bottom Sheet */}
        {isMobile && (
          <MobileCharacterSheet character={selectedCharacter} />
        )}
      </div>
    </OurVidzDashboardLayout>
  );
};
```

#### **Day 3-4: Touch Interactions & Mobile Optimization** ✅
**Tasks:**
- [x] Implement touch gestures and animations
- [x] Create swipe navigation components
- [x] Add long-press context menus
- [x] Optimize for mobile performance

**Touch-Optimized Components:**
```typescript
// src/components/roleplay/MobileCharacterCard.tsx
const MobileCharacterCard = ({ character, onSelect }) => {
  const { isMobile, isTouchDevice } = useMobileDetection();
  
  return (
    <div 
      className={`
        relative group cursor-pointer
        ${isMobile ? 'aspect-square' : 'aspect-[4/5]'}
        rounded-lg overflow-hidden
        bg-card border border-border
        transition-all duration-200
        hover:shadow-lg hover:scale-[1.02]
        ${isTouchDevice ? 'touch-manipulation' : ''}
      `}
      onClick={onSelect}
      onTouchStart={isTouchDevice ? handleTouchStart : undefined}
      onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
    >
      {/* Character Image */}
      <div className="relative w-full h-full">
        <img 
          src={character.preview_image_url || character.image_url} 
          alt={character.name}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <h3 className="text-white font-semibold">{character.name}</h3>
            <p className="text-white/80 text-sm line-clamp-2">{character.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### **Day 5: Hook Enhancement & Data Integration**
**Tasks:**
- [ ] Enhance existing hooks for mobile-first loading
- [ ] Implement character consistency tracking
- [ ] Add image-to-image reference system
- [ ] Optimize data fetching for mobile

---

## **📋 Phase 2: Advanced Features (Weeks 3-4)**

### **Week 3: Image Consistency & Memory Systems**

#### **Day 1-2: Image Consistency System** ✅
**Tasks:**
- [x] Create `ImageConsistencyService.ts`
- [x] Create `ReferenceImageManager.ts`
- [x] Create `ConsistencySettings.tsx`
- [x] Implement i2i reference system
- [x] Integrate with chat interface
- [x] Connect to existing edge functions

**Image Consistency Implementation:**
```typescript
// src/services/ImageConsistencyService.ts
class ImageConsistencyService {
  async generateConsistentScene(characterId: string, scenePrompt: string, modelChoice: 'sdxl' | 'replicate') {
    if (modelChoice === 'sdxl') {
      // Use queue-job for SDXL worker
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          prompt: scenePrompt,
          job_type: 'sdxl_image_fast',
          metadata: {
            destination: 'roleplay_scene',
            character_id: characterId,
            scene_type: 'chat_scene',
            consistency_method: 'i2i_reference',
            reference_strength: 0.35
          }
        }
      });
      return data;
    } else {
      // Use replicate-image for Replicate API
      const { data, error } = await supabase.functions.invoke('replicate-image', {
        body: {
          prompt: scenePrompt,
          apiModelId: 'replicate-rv5.1-model-id',
          jobType: 'image_generation',
          metadata: {
            destination: 'roleplay_scene',
            character_id: characterId,
            scene_type: 'chat_scene'
          }
        }
      });
      return data;
    }
  }
}
```

#### **Day 3-4: Memory Management System**
**Tasks:**
- [ ] Create `ConversationMemory.ts`
- [ ] Create `CharacterMemory.ts`
- [ ] Create `ProfileMemory.ts`
- [ ] Create `MemoryManager.tsx`

**Memory System Implementation:**
```typescript
// src/services/MemoryManager.ts
class MemoryManager {
  async getConversationMemory(conversationId: string): Promise<Memory> {
    const { data } = await supabase
      .from('conversations')
      .select('memory_data')
      .eq('id', conversationId)
      .single();
    
    return data?.memory_data || {};
  }
  
  async getCharacterMemory(characterId: string, userId: string): Promise<Memory> {
    // Character-specific memory implementation
    return {};
  }
  
  async getProfileMemory(userId: string): Promise<Memory> {
    // User profile memory implementation
    return {};
  }
}
```

#### **Day 5: Library Integration**
**Tasks:**
- [ ] Update library page with roleplay tab
- [ ] Create roleplay-specific library components
- [ ] Implement roleplay content categorization
- [ ] Add roleplay scene management

### **Week 4: Model Management & Performance**

#### **Day 1-2: Model Management Interface**
**Tasks:**
- [ ] Create model selection interface
- [ ] Implement model switching UI
- [ ] Add model performance monitoring
- [ ] Create admin model management

#### **Day 3-4: Performance Optimization**
**Tasks:**
- [ ] Implement performance monitoring
- [ ] Add lazy loading for components
- [ ] Optimize image loading and caching
- [ ] Implement intelligent caching

#### **Day 5: Testing & Bug Fixes**
**Tasks:**
- [ ] Comprehensive testing across devices
- [ ] Fix identified bugs and issues
- [ ] Optimize error handling
- [ ] Add comprehensive loading states

---

## **🔧 Technical Implementation Details**

### **Image Consistency Implementation**

#### **Hybrid Consistency Approach**
```typescript
// Tiered consistency system
const consistencyMethods = {
  basic: {
    method: "seed_lock",
    use_case: "background_scenes",
    consistency: "40%",
    speed: "fast"
  },
  standard: {
    method: "i2i_reference",
    use_case: "character_chat",
    consistency: "70%",
    speed: "medium",
    settings: {
      denoise: 0.35,
      cfg_scale: 7,
      reference_weight: 0.65
    }
  },
  premium: {
    method: "ip_adapter_face",
    use_case: "character_portraits",
    consistency: "90%",
    speed: "slow"
  }
};
```

### **Mobile-First Design Patterns**

#### **Responsive Layout**
```css
/* Mobile-first responsive design */
.roleplay-dashboard {
  @apply grid grid-cols-1 gap-4 p-4;
}

@media (min-width: 768px) {
  .roleplay-dashboard {
    @apply grid-cols-2 gap-6 p-6;
  }
}

@media (min-width: 1024px) {
  .roleplay-dashboard {
    @apply grid-cols-3 gap-8 p-8;
  }
}
```

#### **Touch-Optimized Components**
```typescript
// Touch-optimized character card
const MobileCharacterCard = ({ character, onSelect }) => {
  return (
    <div 
      className="touch-manipulation min-h-[200px] rounded-lg shadow-md"
      onClick={onSelect}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Card content */}
    </div>
  );
};
```

---

## **📊 Success Metrics & Monitoring**

### **User Experience Metrics**
- **Flow Completion Rate**: Target 90%+ from login to chat
- **Character Selection Time**: Target <30 seconds
- **Chat Initiation Time**: Target <10 seconds
- **Session Duration**: Target 15+ minutes average

### **Technical Performance**
- **Page Load Time**: Target <3 seconds on mobile
- **Image Generation Time**: Target <5 seconds
- **Memory Usage**: Target <100MB on mobile
- **API Response Time**: Target <2 seconds

### **Business Metrics**
- **User Retention**: Target 70%+ day 7 retention
- **Feature Adoption**: Target 80%+ character usage
- **User Satisfaction**: Target 4.5+ star rating
- **Revenue Impact**: Track premium feature adoption

---

## **🚨 Risk Mitigation**

### **Technical Risks**
- **Breaking Changes**: Gradual migration with feature flags
- **Data Loss**: Comprehensive backup before refactoring
- **Performance Regression**: Continuous performance monitoring
- **User Disruption**: Beta testing with power users

### **Development Risks**
- **Scope Creep**: Strict adherence to PRD requirements
- **Timeline Overrun**: Phased approach with clear milestones
- **Quality Issues**: Comprehensive testing at each phase
- **Integration Problems**: Thorough integration testing

---

## **📈 Future Enhancements (Phase 2+)**

### **Advanced Features**
- **Multi-modal Interactions**: Generate images/videos from chat
- **Advanced Analytics**: Detailed usage analytics and insights
- **Collaborative Features**: Multi-user roleplay sessions
- **AI Narrator**: Advanced scene description generation

### **Premium Features**
- **High Consistency**: IP-Adapter for premium users
- **Advanced Memory**: Unlimited cross-conversation memory
- **Custom Models**: User-specific model training
- **Priority Generation**: Faster generation for premium users

---

## **📝 Implementation Notes**

### **Critical Decisions**
1. **Image Consistency**: Start with i2i reference method as default
2. **Memory System**: Implement three-tier memory with user controls
3. **Mobile Priority**: Design mobile-first with desktop enhancement
4. **Performance**: Optimize for speed over advanced features initially

### **Technical Considerations**
- **API Integration**: Support multiple image generation APIs
- **Storage Optimization**: Implement efficient image storage and caching
- **Error Handling**: Comprehensive error recovery and user feedback
- **Security**: Proper user data protection and privacy controls

### **Development Guidelines**
- **Component Reusability**: Design components for reuse across pages
- **State Management**: Use consistent state management patterns
- **Testing**: Comprehensive testing at each development phase
- **Documentation**: Maintain up-to-date documentation throughout

---

**Next Steps**: Begin Phase 1 implementation with Week 1 tasks, focusing on core infrastructure and mobile-first design.

**Document Purpose**: This is the detailed technical implementation roadmap that provides specific tasks, timelines, and code examples for developers to follow during the roleplay feature implementation.
