# Component Inventory & Management

**Last Updated:** August 2, 2025  
**Purpose:** Track component usage and identify refactoring opportunities

##  **Component Usage Analysis**

### **Workspace Page Components (Current)**

#### **Primary Components Used**
| Component | Size | Purpose | Status | Refactoring Priority |
|-----------|------|---------|---------|---------------------|
| `WorkspaceHeader.tsx` | 2.4KB | Page header with clear workspace |  Working | Low |
| `ImageInputControls.tsx` | 19KB | Image generation controls |  Overly Complex | High |
| `VideoInputControls.tsx` | 17KB | Video generation controls |  Overly Complex | High |
| `WorkspaceContentModal.tsx` | 31KB | Content viewing modal |  Too Large | High |
| `LibraryImportModal.tsx` | 26KB | Library import functionality |  Large | Medium |

#### **Reference System Components (Scope Creep)**
| Component | Size | Purpose | Status | Refactoring Priority |
|-----------|------|---------|---------|---------------------|
| `MultiReferencePanel.tsx` | 20KB | Multiple reference types |  Overly Complex | High |
| `VideoReferencePanel.tsx` | 12KB | Video reference handling |  Overly Complex | High |
| `UnifiedReferencePanel.tsx` | 11KB | Unified reference system |  Overly Complex | High |
| `CompactReferenceUpload.tsx` | 5.0KB | Compact reference upload |  Redundant | High |
| `ReferenceImageBox.tsx` | 3.0KB | Reference image display |  Simple | Medium |

#### **Workspace Management Components**
| Component | Size | Purpose | Status | Refactoring Priority |
|-----------|------|---------|---------|---------------------|
| `SeedDisplay.tsx` | 2.5KB | Seed information display |  Working | Low |
| `ScrollNavigation.tsx` | 2.0KB | Navigation controls |  Working | Low |

### **Components to Create (New Simplified Architecture)**

#### **Phase 1: Core UI Components**
| Component | Purpose | Priority | Status |
|-----------|---------|----------|---------|
| `SimplePromptInput.tsx` | Natural language prompt field | High |  To Create |
| `ModeToggle.tsx` | Image/Video mode selection | High |  To Create |
| `ContentTypeToggle.tsx` | SFW/NSFW selection | High |  To Create |
| `ReferenceImageUpload.tsx` | Simple drag & drop upload | High |  To Create |
| `WorkspaceGrid.tsx` | Display staged content | High |  To Create |
| `ContentActions.tsx` | Edit, save, delete buttons | High |  To Create |

#### **Phase 2: Workspace Management**
| Component | Purpose | Priority | Status |
|-----------|---------|----------|---------|
| `WorkspaceStaging.tsx` | Temporary content staging | High |  To Create |
| `ContentCard.tsx` | Individual content item display | Medium |  To Create |
| `SaveToLibrary.tsx` | Library integration | Medium |  To Create |

##  **Refactoring Plan**

### **Phase 1: Component Simplification (Week 1)**

#### **1. Remove Complex Reference Components**
- **Remove**: `MultiReferencePanel.tsx`, `VideoReferencePanel.tsx`, `UnifiedReferencePanel.tsx`
- **Replace**: Single `ReferenceImageUpload.tsx` component
- **Benefit**: Eliminate scope creep, simplify state management

#### **2. Simplify Input Controls**
- **Refactor**: `ImageInputControls.tsx` and `VideoInputControls.tsx`
- **Create**: Single `SimplePromptInput.tsx` with mode toggle
- **Benefit**: Consistent UI, reduced complexity

#### **3. Streamline Modal System**
- **Refactor**: `WorkspaceContentModal.tsx` (31KB  15KB)
- **Create**: Simple `ContentCard.tsx` for inline actions
- **Benefit**: Better performance, simpler interactions

### **Phase 2: New Component Creation (Week 2)**

#### **1. Core UI Components**
```typescript
// SimplePromptInput.tsx
interface SimplePromptInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  mode: 'image' | 'video';
  contentType: 'sfw' | 'nsfw';
  isGenerating: boolean;
  onGenerate: () => void;
}

// ModeToggle.tsx
interface ModeToggleProps {
  mode: 'image' | 'video';
  onModeChange: (mode: 'image' | 'video') => void;
}

// ContentTypeToggle.tsx
interface ContentTypeToggleProps {
  contentType: 'sfw' | 'nsfw';
  onContentTypeChange: (type: 'sfw' | 'nsfw') => void;
}
```

#### **2. Workspace Management Components**
```typescript
// WorkspaceGrid.tsx
interface WorkspaceGridProps {
  items: WorkspaceItem[];
  onEdit: (item: WorkspaceItem) => void;
  onSave: (item: WorkspaceItem) => void;
  onDelete: (item: WorkspaceItem) => void;
}

// ContentCard.tsx
interface ContentCardProps {
  item: WorkspaceItem;
  onEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
}
```

### **Phase 3: State Management Simplification**

#### **Current State (20+ variables)**
```typescript
// Current complex state
const [quality, setQuality] = useState<'fast' | 'high'>('fast');
const [enhanced, setEnhanced] = useState<boolean>(false);
const [selectedMode, setSelectedMode] = useState<GenerationFormat>();
const [prompt, setPrompt] = useState('');
const [originalPrompt, setOriginalPrompt] = useState('');
const [isEnhanced, setIsEnhanced] = useState(false);
const [isUsingEnhancement, setIsUsingEnhancement] = useState(false);
const [lastEnhancedPrompt, setLastEnhancedPrompt] = useState('');
const [activeReferences, setActiveReferences] = useState<any[]>([]);
const [referenceStrength, setReferenceStrength] = useState(0.85);
const [videoReferences, setVideoReferences] = useState<Array<{...}>>();
const [referenceImage, setReferenceImage] = useState<File | null>(null);
const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
const [referenceType, setReferenceType] = useState<'style' | 'composition' | 'character'>('character');
const [optimizeForCharacter, setOptimizeForCharacter] = useState(false);
const [seed, setSeed] = useState<number | undefined>();
const [compelEnabled, setCompelEnabled] = useState(false);
const [compelWeights, setCompelWeights] = useState('');
const [showLibraryModal, setShowLibraryModal] = useState(false);
const [numImages, setNumImages] = useState<number>(1);
```

#### **Simplified State (8 variables)**
```typescript
// Simplified state
const [mode, setMode] = useState<'image' | 'video'>('image');
const [prompt, setPrompt] = useState('');
const [referenceImage, setReferenceImage] = useState<File | null>(null);
const [referenceStrength, setReferenceStrength] = useState(0.85);
const [contentType, setContentType] = useState<'sfw' | 'nsfw'>('nsfw');
const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([]);
const [isGenerating, setIsGenerating] = useState(false);
const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
```

##  **Impact Metrics**

### **Before Refactoring**
- **Total Components**: 15+ complex components
- **State Variables**: 20+ overlapping variables
- **Component Size**: 1,018 lines in main component
- **Performance**: Slow rendering, complex state updates
- **Maintainability**: Difficult to debug and modify

### **After Refactoring**
- **Total Components**: 8 focused components
- **State Variables**: 8 clear, purpose-driven variables
- **Component Size**: ~400 lines in main component
- **Performance**: Fast rendering, simple state updates
- **Maintainability**: Easy to debug and modify

##  **Implementation Timeline**

### **Week 1: Component Simplification**
- [ ] Remove complex reference components
- [ ] Create simple prompt input component
- [ ] Create mode and content type toggles
- [ ] Simplify state management

### **Week 2: New Component Creation**
- [ ] Create workspace grid component
- [ ] Create content card component
- [ ] Create reference image upload
- [ ] Implement workspace staging

### **Week 3: Integration & Testing**
- [ ] Integrate new components
- [ ] Test workspace-first storage
- [ ] Optimize performance
- [ ] Fix any issues

### **Week 4: Polish & Launch**
- [ ] Final UI/UX refinements
- [ ] User testing
- [ ] Performance optimization
- [ ] Launch simplified workspace

---

**Current Status**: Ready to begin Phase 1 component simplification
**Next Action**: Remove complex reference components and create simple prompt input
