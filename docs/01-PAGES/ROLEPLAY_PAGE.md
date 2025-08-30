# Roleplay Page - Complete Implementation Guide

**Last Updated:** August 30, 2025  
**Status:** 🚧 **PRD Implementation Phase**  
**Priority:** **HIGH** - Core MVP Feature

## **🎯 Page Overview**

### **Purpose**
Mobile-first character-consistent chat experience with integrated visual scene generation, enabling users to engage in immersive roleplay conversations with AI characters while maintaining visual continuity across scenes.

### **User Flow**
```
Login → Dashboard → Character Selection → Scene Selection (optional) → Chat Interface
```

### **Success Metrics**
- **Flow Completion**: 90%+ success rate from login to chat
- **Character Consistency**: 70%+ visual consistency across scenes
- **Mobile Performance**: <3 second load times on mobile devices
- **User Engagement**: 15+ minute average session duration

---

## **📁 Current Implementation Analysis**

### **Existing Files (26 total)**
```
src/pages/
├── RoleplayDashboard.tsx (714 lines) - NEEDS REFACTORING
└── RoleplayChat.tsx (714 lines) - NEEDS MAJOR REFACTORING

src/components/roleplay/ (24 files)
├── CharacterBrowser.tsx (285 lines) - MODIFY SIGNIFICANTLY
├── MinimalCharacterCard.tsx (180 lines) - KEEP & REFACTOR
├── MultiCharacterSceneCard.tsx (157 lines) - ARCHIVE
├── RoleplayHeader.tsx (116 lines) - KEEP & REFACTOR
├── RoleplayLeftSidebar.tsx (215 lines) - ARCHIVE
├── RoleplayPromptInput.tsx (119 lines) - KEEP & REFACTOR
├── RoleplaySettingsModal.tsx (306 lines) - MODIFY SIGNIFICANTLY
├── RoleplaySidebar.tsx (295 lines) - ARCHIVE
├── SceneCard.tsx (83 lines) - KEEP & REFACTOR
├── SceneContextHeader.tsx (226 lines) - ARCHIVE
├── SceneGenerationModal.tsx (229 lines) - MODIFY SIGNIFICANTLY
├── SectionHeader.tsx (23 lines) - ARCHIVE
├── UnifiedSceneCard.tsx (120 lines) - ARCHIVE
├── UserCharacterSelector.tsx (182 lines) - MODIFY SIGNIFICANTLY
├── UserCharacterSetup.tsx (441 lines) - ARCHIVE
├── AddCharacterModal.tsx (324 lines) - MODIFY SIGNIFICANTLY
├── CharacterDetailPane.tsx (627 lines) - MODIFY SIGNIFICANTLY
├── CharacterEditModal.tsx (433 lines) - ARCHIVE
├── CharacterMultiSelector.tsx (229 lines) - ARCHIVE
├── CharacterPreviewModal.tsx (368 lines) - KEEP & REFACTOR
├── CharacterSelector.tsx (167 lines) - KEEP & REFACTOR
├── ConversationManager.tsx (279 lines) - KEEP & REFACTOR
└── HorizontalScroll.tsx (63 lines) - KEEP & REFACTOR

src/hooks/ (15+ roleplay-related)
├── usePublicCharacters.ts (170 lines) - KEEP & ENHANCE
├── useCharacterData.ts (89 lines) - KEEP & ENHANCE
├── useSceneGeneration.ts (401 lines) - KEEP & ENHANCE
├── useCharacterScenes.ts (77 lines) - KEEP & ENHANCE
├── useUserCharacters.ts (165 lines) - KEEP & ENHANCE
├── useConversations.ts (112 lines) - KEEP & ENHANCE
├── useSceneManagement.ts (181 lines) - KEEP & ENHANCE
├── useCharacterDatabase.ts (174 lines) - KEEP & ENHANCE
├── useSceneNavigation.ts (38 lines) - MODIFY
├── useSceneNarration.ts (129 lines) - MODIFY
├── useSceneNarrative.ts (76 lines) - MODIFY
├── useAutoSceneGeneration.ts (68 lines) - MODIFY
├── useRecentScenes.ts (84 lines) - ARCHIVE
└── useCharacterSessions.ts (3.1KB) - ARCHIVE
```

### **Action Summary**
- **🟢 KEEP & REFACTOR**: 8 components + 8 hooks = 16 files
- **🟡 MODIFY SIGNIFICANTLY**: 6 components + 4 hooks = 10 files  
- **🔴 ARCHIVE/REPLACE**: 10 components + 2 pages + 3 hooks = 15 files

---

## **🏗️ New Architecture**

### **Target File Structure**
```
src/pages/roleplay/
├── MobileRoleplayDashboard.tsx (NEW - mobile-first dashboard)
├── MobileRoleplayChat.tsx (NEW - mobile-first chat)
├── RoleplayDashboard.tsx (ARCHIVE - old desktop version)
└── RoleplayChat.tsx (ARCHIVE - old desktop version)

src/components/roleplay/
├── mobile/
│   ├── MobileCharacterCard.tsx (REFACTORED from MinimalCharacterCard)
│   ├── MobileChatInput.tsx (REFACTORED from RoleplayPromptInput)
│   ├── MobileCharacterModal.tsx (REFACTORED from CharacterPreviewModal)
│   ├── TouchOptimizedInput.tsx (NEW)
│   ├── SwipeGestures.tsx (NEW)
│   └── BottomNavigation.tsx (NEW)
├── consistency/
│   ├── ImageConsistencyService.ts (NEW)
│   ├── ReferenceImageManager.ts (NEW)
│   └── ConsistencySettings.tsx (NEW)
├── memory/
│   ├── ConversationMemory.ts (NEW)
│   ├── CharacterMemory.ts (NEW)
│   ├── ProfileMemory.ts (NEW)
│   └── MemoryManager.tsx (NEW)
└── archived/ (MOVE OLD COMPONENTS)
    ├── RoleplayLeftSidebar.tsx
    ├── RoleplaySidebar.tsx
    ├── MultiCharacterSceneCard.tsx
    └── ... (other archived components)
```

---

## **🔧 Technical Implementation**

### **Core Features**

#### **1. Character Selection Dashboard**
```typescript
// Mobile-first character grid
interface MobileCharacterCard {
  character: Character;
  onSelect: (characterId: string) => void;
  onPreview: (characterId: string) => void;
  isSelected?: boolean;
}

// Character data structure
interface Character {
  id: string;
  name: string;
  description: string;
  preview_image_url: string;
  quick_start: boolean;
  seed_locked?: number;
  base_prompt: string;
  consistency_method: 'seed_lock' | 'i2i_reference' | 'ip_adapter';
}
```

#### **2. Chat Interface**
```typescript
// Mobile-optimized chat
interface MobileChatInterface {
  characterId: string;
  sceneId?: string;
  onSendMessage: (message: string) => void;
  onGenerateScene: () => void;
  onToggleMemory: (type: 'conversation' | 'character' | 'profile') => void;
}

// Message structure
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'character';
  timestamp: Date;
  scene_image?: string;
  consistency_score?: number;
}
```

#### **3. Image Consistency System**
```typescript
// Hybrid consistency approach
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

#### **4. Memory System**
```typescript
// Three-tier memory management
class MemoryManager {
  // Conversation Memory (default)
  async getConversationMemory(conversationId: string): Promise<Memory> {
    return await this.db.getConversationMemory(conversationId);
  }
  
  // Character Memory (optional)
  async getCharacterMemory(characterId: string, userId: string): Promise<Memory> {
    return await this.db.getCharacterMemory(characterId, userId);
  }
  
  // Profile Memory (optional)
  async getProfileMemory(userId: string): Promise<Memory> {
    return await this.db.getProfileMemory(userId);
  }
}
```

### **Database Schema Updates**
```sql
-- Character table enhancements
ALTER TABLE characters ADD COLUMN preview_image_url TEXT;
ALTER TABLE characters ADD COLUMN quick_start BOOLEAN DEFAULT false;
ALTER TABLE characters ADD COLUMN seed_locked INTEGER;
ALTER TABLE characters ADD COLUMN base_prompt TEXT;
ALTER TABLE characters ADD COLUMN consistency_method TEXT DEFAULT 'i2i_reference';

-- Memory system tables
CREATE TABLE conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  memory_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE character_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id),
  user_id UUID REFERENCES auth.users(id),
  memory_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profile_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  memory_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## **📋 Implementation Plan**

### **Phase 1: Core Infrastructure (Week 1)**

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

### **Phase 2: Advanced Features (Week 2)**

#### **Day 1-2: Image Consistency System**
**Tasks:**
- [ ] Create `ImageConsistencyService.ts`
- [ ] Create `ReferenceImageManager.ts`
- [ ] Create `ConsistencySettings.tsx`
- [ ] Implement i2i reference system

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

#### **Day 5: Mobile Optimization**
**Tasks:**
- [ ] Performance optimization
- [ ] Error handling and recovery
- [ ] Loading states and feedback
- [ ] User testing and refinement

---

## **🎨 UX/UI Design**

### **Mobile-First Layout**
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

### **Touch-Optimized Components**
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

### **Key Interactions**
- **Touch-Optimized Cards**: Large touch targets with proper spacing (44px minimum)
- **Swipe Gestures**: Swipe for navigation and quick actions
- **Long-Press Actions**: Context menus for message actions (500ms threshold)
- **Pinch-to-Zoom**: Image viewing and scene preview

---

## **📊 Success Metrics**

### **Technical Performance**
- **Mobile Load Time**: <3 seconds on mobile devices
- **Image Generation Time**: <5 seconds for scene generation
- **Memory Usage**: <100MB on mobile devices
- **API Response Time**: <2 seconds for chat responses

### **User Experience**
- **Flow Completion**: 90%+ success rate from login to chat
- **Character Selection**: <30 seconds average selection time
- **Chat Initiation**: <10 seconds to start conversation
- **Session Duration**: 15+ minutes average session length

### **Business Metrics**
- **User Retention**: 70%+ day 7 retention
- **Feature Adoption**: 80%+ character usage rate
- **User Satisfaction**: 4.5+ star rating
- **Revenue Impact**: Premium feature adoption tracking

---

## **�� Risk Mitigation**

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

## **📈 Future Enhancements**

### **Phase 2 Features**
- **Multi-modal Interactions**: Generate images/videos from chat
- **Advanced Analytics**: Detailed usage analytics and insights
- **Collaborative Features**: Multi-user roleplay sessions
- **AI Narrator**: Advanced scene description generation

### **Phase 3 Features**
- **Premium Consistency**: IP-Adapter for 90%+ consistency
- **Advanced Memory**: Unlimited cross-conversation memory
- **Custom Models**: User-specific model training
- **Priority Generation**: Faster generation for premium users

---

## **📝 Development Guidelines**

### **Code Standards**
- **Mobile-First**: Design for mobile, enhance for desktop
- **Performance**: Optimize for speed and reliability
- **Accessibility**: Ensure touch targets are 44px minimum
- **Error Handling**: Comprehensive error recovery and user feedback

### **Testing Strategy**
- **Mobile Testing**: Test on various mobile devices and screen sizes
- **Performance Testing**: Monitor load times and memory usage
- **User Testing**: Regular user testing and feedback collection
- **Integration Testing**: Test all integration points thoroughly

### **Documentation**
- **Component Documentation**: Document all new components
- **API Documentation**: Document all new APIs and services
- **User Guides**: Create user guides for new features
- **Developer Guides**: Create guides for future development

---

## **🔗 Integration Points**

### **Existing Systems**
- **OurVidzDashboardLayout**: Use existing layout component
- **SharedGrid**: Leverage existing grid component for library integration
- **useMobileDetection**: Use existing mobile detection hook
- **Edge Functions**: Use existing `queue-job` and `replicate-image` functions

### **New Systems**
- **roleplay-chat**: New edge function for chat processing
- **Image Consistency**: New service for character consistency
- **Memory Management**: New three-tier memory system
- **Mobile Components**: New mobile-first component library

---

## **📋 Implementation Checklist**

### **Phase 1: Core Infrastructure (Week 1)**
- [ ] Database schema extensions executed
- [ ] Edge function `roleplay-chat` created
- [ ] Deprecated components archived
- [ ] `MobileRoleplayDashboard.tsx` created
- [ ] `MobileCharacterCard.tsx` created
- [ ] `CharacterGrid.tsx` created
- [ ] `QuickStartSection.tsx` created

### **Phase 2: Advanced Features (Week 2)**
- [ ] `ImageConsistencyService.ts` created
- [ ] `ReferenceImageManager.ts` created
- [ ] `ConsistencySettings.tsx` created
- [ ] `ConversationMemory.ts` created
- [ ] `CharacterMemory.ts` created
- [ ] `ProfileMemory.ts` created
- [ ] `MemoryManager.tsx` created
- [ ] Mobile optimization completed

### **Phase 3: Testing & Polish (Week 3)**
- [ ] Comprehensive testing across devices
- [ ] Performance optimization completed
- [ ] Error handling implemented
- [ ] User testing completed
- [ ] Documentation updated

---

**Status**: Ready for Phase 1 implementation. All existing files analyzed and categorized. New architecture designed for mobile-first approach with character consistency and memory systems.

**Document Purpose**: This is the complete implementation guide that combines the PRD, audit analysis, and development plan into a single actionable document for the development team.
