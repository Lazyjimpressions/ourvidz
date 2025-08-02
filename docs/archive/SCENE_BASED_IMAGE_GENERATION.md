# Scene-Based Image Generation System

**Last Updated:** January 2025  
**Purpose:** Automatic scene visualization for roleplay conversations using SDXL Lustify  
**Integration:** AI Playground → Roleplay Mode → Scene Detection → Image Generation

---

## 🎯 Overview

The Scene-Based Image Generation System automatically detects visual scenes in AI roleplay responses and provides one-click generation of optimized SDXL Lustify images that accurately represent the described scene while maintaining character consistency and narrative coherence.

## 🔧 System Architecture

### Core Components

1. **SceneImageGenerator** (`src/components/playground/SceneImageGenerator.tsx`)
   - Detects scenes in AI responses
   - Provides UI for scene visualization options
   - Integrates with existing generation system

2. **useSceneGeneration** (`src/hooks/useSceneGeneration.ts`)
   - Scene analysis and context extraction
   - SDXL prompt optimization (75-token limit)
   - Character reference integration (planned)

3. **MessageBubble Integration**
   - Automatically appears on AI messages in roleplay mode
   - Only shows when scene content is detected
   - Seamless workflow integration

## 🎨 Scene Detection

### Detection Patterns

The system identifies scenes using multiple pattern categories:

**Roleplay Action Patterns:**
- `*actions in asterisks*`
- `(action descriptions)`

**Movement & Positioning:**
- moves, walks, sits, stands, leans, approaches, steps, turns

**Physical Interactions:**
- touches, kisses, embraces, holds, caresses, grabs, pulls

**Environmental Descriptions:**
- "in the", "at the", "on the" + location
- bedroom, kitchen, bathroom, hotel, car, etc.

**Visual Descriptions:**
- wearing, dressed, naked, nude, clothing, outfit, lingerie

**Emotional/Sensual Indicators:**
- passionate, intimate, romantic, seductive, sensual, aroused

## 📊 Scene Analysis Process

### 1. Character Extraction
```typescript
// From roleplay template
const characters = roleplayTemplate?.characters?.map(char => ({
  name: char.name,
  visualDescription: char.visualDescription || 'attractive person',
  role: char.role
})) || [];
```

### 2. Action Detection
- Extracts actions from asterisks and natural language
- Focuses on visual, physical actions
- Limits to top 3 most relevant actions

### 3. Setting & Environment
- Pattern matching for locations and settings
- Context-aware environment detection
- Default: "intimate indoor setting"

### 4. Mood & Atmosphere
- Emotional tone extraction
- Sensual/romantic context detection
- Influences lighting and atmosphere in prompt

### 5. NSFW Content Classification
- Automatic NSFW detection based on content
- Roleplay template adult flag consideration
- Affects prompt optimization strategy

## 🎯 SDXL Lustify Optimization

### Prompt Structure (75 Token Limit)

1. **Quality Tags (12 tokens)** - HIGHEST Priority
   ```
   score_9, score_8_up, masterpiece, best quality, ultra detailed
   ```

2. **Character Description (15-20 tokens)**
   ```
   beautiful [character_visual_description]
   ```

3. **NSFW Anatomical Accuracy (if applicable)**
   ```
   perfect anatomy, natural proportions, detailed intimate anatomy
   ```

4. **Scene Context (10-15 tokens)**
   ```
   [mood] [setting] [visual_elements]
   ```

5. **Technical Specifications (remaining tokens)**
   ```
   professional photography, 4K, sharp focus, warm lighting
   ```

### Token Management Strategy

- **Smart prioritization** - Quality tags always included
- **Dynamic allocation** - Adjusts based on content type
- **NSFW optimization** - Enhanced anatomical accuracy for adult content
- **Character focus** - Prioritizes main character visual details
- **Technical excellence** - Professional photography terms for quality

## 🔄 User Workflow

### Automatic Detection
1. User engages in roleplay conversation
2. AI responds with scene description
3. System automatically detects visual scene content
4. Scene generation card appears below AI message

### One-Click Generation
1. User clicks "Generate Scene Image"
2. System analyzes scene context
3. Converts to optimized SDXL prompt
4. Generates image using existing pipeline
5. Image appears in user's library

### Advanced Options
- **Quality Selection:** Fast (~15s) vs High (~45s)
- **Scene Analysis:** Manual scene re-analysis
- **Prompt Preview:** View optimized SDXL prompt
- **Character Context:** Display detected characters and elements

## 🎭 Roleplay Integration

### Character Consistency
- Uses roleplay template character descriptions
- Maintains visual consistency across scenes
- Preserves character relationships and context

### Narrative Coherence
- Considers conversation history
- Maintains scene continuity
- Respects established setting and mood

### NSFW Content Handling
- Automatic adult content detection
- Preserves explicit terminology
- Optimizes for SDXL Lustify model capabilities
- Respects user content preferences

## 🔮 Advanced Features

### Scene Context Preservation
```typescript
interface SceneContext {
  characters: Array<{
    name: string;
    visualDescription: string;
    role: string;
  }>;
  setting: string;
  mood: string;
  actions: string[];
  isNSFW: boolean;
  visualElements: string[];
}
```

### Quality Options
- **Fast Generation:** SDXL Fast (~15 seconds)
- **High Quality:** SDXL High (~45 seconds)
- **Style Options:** Realistic, Artistic, Anime, Lustify (planned)

### Character Reference Integration (Planned)
- Upload character reference images
- Maintain visual consistency across scenes
- Reference strength adjustment
- Multiple character handling

## 📈 Performance Optimization

### Efficient Scene Detection
- Pattern-based detection (minimal processing)
- Smart caching of scene context
- Lazy analysis (only when needed)

### Token Optimization
- 75-token hard limit compliance
- Smart token prioritization
- Dynamic content adaptation
- Quality preservation

### Generation Pipeline Integration
- Uses existing generation infrastructure
- Seamless asset management
- Automatic library integration
- Event-based completion handling

## 🔧 Technical Implementation

### Component Structure
```
SceneImageGenerator
├── Scene Detection Logic
├── Analysis UI Controls
├── Quality Selection
├── Generation Button
└── Status Display

useSceneGeneration Hook
├── detectScene()
├── analyzeScene()
├── generateSDXLPrompt()
├── generateSceneImage()
└── State Management
```

### Integration Points
- **MessageBubble:** Scene detection and UI
- **Generation System:** Image creation pipeline
- **Roleplay Context:** Character and template data
- **Asset Management:** Library integration

### Error Handling
- Graceful fallbacks for missing context
- User feedback for generation failures
- Retry mechanisms for analysis errors
- Performance monitoring and logging

## 🎯 Success Metrics

### User Experience
- ✅ Automatic scene detection in roleplay
- ✅ One-click scene visualization
- ✅ Character consistency maintenance
- ✅ NSFW content optimization
- ✅ Quality options (fast/high)

### Technical Performance
- ✅ 75-token SDXL prompt compliance
- ✅ Efficient scene analysis
- ✅ Seamless generation pipeline integration
- ✅ Robust error handling

### Content Quality
- ✅ Accurate scene representation
- ✅ Character visual consistency
- ✅ Appropriate NSFW handling
- ✅ Professional image quality

## 🚀 Future Enhancements

### Phase 2: Character Reference System
- Upload character images for consistency
- Reference strength adjustment
- Multi-character scene handling
- Visual style consistency

### Phase 3: Advanced Scene Control
- Manual prompt editing
- Style preset system
- Multiple angle generation
- Scene continuity tracking

### Phase 4: AI-Powered Enhancements
- Automatic prompt enhancement
- Style adaptation based on content
- Character appearance learning
- Dynamic quality optimization

---

**Note:** This system is specifically optimized for the SDXL Lustify model and NSFW roleplay content. It maintains all explicit terminology while ensuring maximum visual quality and character consistency within the strict 75-token prompt limit.