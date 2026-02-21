# Character Studio Technical Architecture

**Last Updated:** February 6, 2026
**Status:** Complete - Reference Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Hierarchy](#component-hierarchy)
3. [State Management](#state-management)
4. [Database Schema](#database-schema)
5. [Edge Functions](#edge-functions)
6. [Storage Architecture](#storage-architecture)
7. [Realtime Subscriptions](#realtime-subscriptions)
8. [Model Routing](#model-routing)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [API Contracts](#api-contracts)
11. [Error Handling Patterns](#error-handling-patterns)
12. [Performance Optimization](#performance-optimization)

---

## System Overview

The Character Studio feature is a comprehensive character development system consisting of:

- **2 Pages**: CharacterStudio (workspace), CreateCharacter (form)
- **11 Custom Components**: Sidebar, galleries, lightbox, prompt bar, selectors, pose presets, template selector
- **3 Primary Hooks**: useCharacterStudio (state), usePortraitVersions (portraits), useCharacterTemplates (templates)
- **1 Edge Function**: character-portrait (generation pipeline)
- **5 Database Tables**: characters, character_portraits, character_scenes, character_templates, api_models
- **2 Storage Buckets**: reference_images, user-library

### Architecture Pattern

**Hybrid State Management**: Combines local React state (form fields) with Supabase Realtime subscriptions (portraits) and database queries (characters, scenes).

**Debounced Auto-Save**: Character changes auto-save after 2-second delay for existing characters, reducing manual save burden.

**Event-Driven Generation**: Portrait generation triggers sync edge function, returning image URL directly. Realtime subscription updates UI when portrait inserted.

**Multi-Provider Model Routing**: Dynamically selects image generation provider (fal.ai, Replicate, local RunPod) based on model availability and I2I capability.

**Image Match Mode**: When reference image is set, system automatically switches to I2I-capable model and displays compatible model count.

---

## Component Hierarchy

### CharacterStudio Page

```
CharacterStudio.tsx (~858 lines)
├── CharacterSelector (dropdown)
│   └── List of user's characters + "Create New"
│
├── Header Section
│   ├── Back button
│   ├── CharacterSelector dropdown
│   ├── "Start from Template" button (new characters only)
│   ├── Save Status Badge (Saving/Saved/Unsaved)
│   ├── "Start Chat" button → /roleplay/chat/:id
│   └── "Preview" button → /roleplay/character/:id (new window)
│
├── Desktop Layout (flex)
│   ├── CharacterStudioSidebar (left, resizable 280-480px)
│   │   ├── Resize Handle (drag to adjust width)
│   │   ├── Header with Save button
│   │   ├── Avatar Preview (64x64px)
│   │   │   └── Loading spinner (isGenerating)
│   │   ├── SuggestButton "all" (enhance all fields)
│   │   ├── Collapsible: Basic Info
│   │   │   ├── Name input
│   │   │   ├── Gender select (female/male/non-binary/unspecified)
│   │   │   ├── Rating select (SFW/NSFW)
│   │   │   ├── Description textarea
│   │   │   └── SuggestButton (description)
│   │   ├── Collapsible: Appearance
│   │   │   ├── PresetChipCarousel (8 presets)
│   │   │   ├── Appearance Details textarea (traits)
│   │   │   ├── Add Appearance Tag input
│   │   │   ├── Current tags (removable chips)
│   │   │   ├── Reference Image preview + Image Match Mode indicator
│   │   │   │   └── Badge showing I2I model count
│   │   │   ├── Upload / Library buttons
│   │   │   ├── ModelSelector dropdown (with I2I badges)
│   │   │   ├── SuggestButton (appearance)
│   │   │   └── "Generate Portrait" button
│   │   ├── Collapsible: Personality & Voice
│   │   │   ├── Persona textarea + SuggestButton
│   │   │   ├── Voice Tone select
│   │   │   ├── Mood select
│   │   │   ├── Personality Traits input + SuggestButton
│   │   │   └── First Message textarea
│   │   └── Collapsible: Advanced
│   │       ├── AI Model selector (for suggestions)
│   │       ├── Public toggle
│   │       └── System Prompt textarea
│   │
│   └── Center Workspace (flex-1)
│       ├── Tab Navigation (Portraits / Scenes)
│       ├── PosePresets (when tab=portraits)
│       │   └── Quick pose chips: Standing, Profile, Back, Sitting, Lying, Close-up
│       ├── PortraitGallery (when tab=portraits)
│       │   ├── Grid (auto-fill, min 130px)
│       │   ├── Portrait Tiles
│       │   │   ├── Image (aspect-square, object-cover)
│       │   │   ├── Primary Badge (gold star, top-left)
│       │   │   ├── Options Menu (three dots, top-right)
│       │   │   │   ├── Set as Primary
│       │   │   │   ├── Use as Reference
│       │   │   │   ├── Download
│       │   │   │   └── Delete
│       │   │   └── onClick → PortraitLightbox
│       │   └── Add New Tile (dashed border)
│       └── ScenesGallery (when tab=scenes)
│           ├── Grid (2-4 cols, aspect-video)
│           ├── Scene Cards
│           │   ├── Image or placeholder
│           │   ├── Scene name overlay
│           │   ├── Hover overlay
│           │   │   ├── "Start Chat" button
│           │   │   └── Options (Edit, Delete)
│           │   └── onClick → SceneGenerationModal
│           └── Add Scene button
│
├── CharacterStudioPromptBar (bottom, sticky, portraits tab only)
│   ├── Textarea (custom prompt, 44-100px, controlled value)
│   ├── Reference dropdown (Upload, Library, Remove)
│   ├── ModelSelector dropdown (with I2I badges)
│   └── Generate button (with progress %)
│
├── MobileCharacterStudio (~212 lines inline)
│   ├── Header with CharacterSelector + Save button
│   ├── Tab Navigation (Details / Portraits / Scenes)
│   ├── Details tab: Full CharacterStudioSidebar
│   ├── Portraits tab: PosePresets + PortraitGallery + PromptBar
│   ├── Scenes tab: ScenesGallery
│   └── Bottom bar (context-aware)
│
└── Modals (conditional render)
    ├── PortraitLightbox
    │   ├── Fullscreen image
    │   ├── Navigation arrows (prev/next)
    │   ├── Actions bar
    │   │   ├── Regenerate with prompt
    │   │   ├── Set as Primary
    │   │   ├── Use as Reference
    │   │   ├── Download
    │   │   └── Delete
    │   └── Close button
    ├── SceneGenerationModal
    │   ├── Scene name input
    │   ├── Scene description textarea
    │   ├── Scene starters array
    │   ├── System prompt textarea
    │   └── Create/Update button
    ├── ImagePickerDialog (library browser)
    └── CharacterTemplateSelector (template dialog)
        ├── Grid of character templates
        ├── Template cards with icon/name/description
        └── onClick → applies template data to character
```

### CreateCharacter Page

```
CreateCharacter.tsx (532 lines)
├── Sticky Header
│   ├── Page title ("Create Character" / "Edit Character")
│   └── Save button (primary)
│
├── Desktop Layout (grid grid-cols-[400px_1fr])
│   ├── PortraitPanel (left, max 400px)
│   │   ├── Portrait Preview (aspect-square)
│   │   ├── Loading overlay (isGenerating)
│   │   ├── PresetChipCarousel
│   │   │   └── 8 chips (elegant, casual, athletic, etc.)
│   │   ├── ModelSelector dropdown
│   │   └── "Generate Portrait" button
│   │
│   └── Form Sections (right, flex-1)
│       ├── Basic Info (always expanded)
│       │   ├── Name input (required)
│       │   ├── Gender select (female/male/unspecified)
│       │   ├── Description textarea (required, 50-500 chars)
│       │   └── Content Rating toggle (SFW/NSFW)
│       ├── Collapsible: Appearance Tags
│       │   ├── Tag input (+ button, Enter key)
│       │   ├── Current tags (removable chips)
│       │   └── Reference image upload
│       ├── Collapsible: Greetings
│       │   ├── CharacterGreetingsEditor
│       │   │   ├── First Message textarea
│       │   │   └── Alternate Greetings list
│       │   │       ├── Greeting 1 textarea
│       │   │       ├── Greeting 2 textarea
│       │   │       └── Add Greeting button
│       └── Collapsible: Advanced Settings
│           ├── Persona textarea
│           ├── Personality Traits input
│           ├── System Prompt textarea
│           └── Public toggle
│
└── Mobile Bottom Save Bar (sticky)
```

---

## State Management

### useCharacterStudio Hook Architecture

**Location**: [src/hooks/useCharacterStudio.ts](../../../src/hooks/useCharacterStudio.ts)

**Purpose**: Central state management for CharacterStudio page

**Interface**:

```typescript
function useCharacterStudio(options?: {
  characterId?: string
  /** Default role for new characters: 'user' for persona, 'ai' for companion */
  defaultRole?: 'user' | 'ai'
}): {
  // Character State
  character: CharacterData
  updateCharacter: (updates: Partial<CharacterData>) => void
  saveCharacter: (options?: { silent?: boolean }) => Promise<string | null>
  publishCharacter: () => Promise<boolean>
  loadCharacter: () => Promise<void>
  isNewCharacter: boolean

  // Portrait Management (delegated to usePortraitVersions)
  portraits: CharacterPortrait[]
  primaryPortrait: CharacterPortrait | null
  portraitsLoading: boolean
  setPrimaryPortrait: (id: string) => Promise<void>
  deletePortrait: (id: string) => Promise<void>
  addPortrait: (portrait: Partial<CharacterPortrait>) => Promise<void>
  fetchPortraits: () => Promise<void>

  // Generation
  generatePortrait: (prompt: string, options?: {
    referenceImageUrl?: string
    model?: string  // api_models.id from database
  }) => Promise<string | null>
  isGenerating: boolean
  activeJobId: string | null
  generationProgress: {
    percent: number
    estimatedTimeRemaining: number
    stage: 'queued' | 'processing' | 'finalizing'
  } | null

  // Scenes
  scenes: CharacterScene[]
  loadScenes: () => Promise<void>

  // Selection State
  selectedItemId: string | null
  selectedItemType: 'portrait' | 'scene' | null
  selectItem: (id: string | null, type: 'portrait' | 'scene' | null) => void
  getSelectedItem: () => CharacterPortrait | CharacterScene | null

  // Loading State
  isLoading: boolean
  isSaving: boolean
  isDirty: boolean
  savedCharacterId: string | undefined
}
```

**State Variables**:

```typescript
const [character, setCharacter] = useState<CharacterData>({
  name: '',
  description: '',
  gender: 'female',
  content_rating: 'nsfw',
  is_public: false,
  traits: '',
  persona: '',
  first_message: '',
  system_prompt: '',
  image_url: null,
  reference_image_url: null,
  appearance_tags: [],
  voice_tone: 'warm',
  mood: 'friendly',
  alternate_greetings: [],
  forbidden_phrases: [],
  voice_examples: [],
  default_presets: {} as Json
})

const [scenes, setScenes] = useState<CharacterScene[]>([])
const [isDirty, setIsDirty] = useState(false)
const [isLoading, setIsLoading] = useState(false)
const [isSaving, setIsSaving] = useState(false)
const [savedCharacterId, setSavedCharacterId] = useState<string | undefined>(characterId)
const [isGenerating, setIsGenerating] = useState(false)
const [activeJobId, setActiveJobId] = useState<string | null>(null)
const [generationProgress, setGenerationProgress] = useState<{
  percent: number
  estimatedTimeRemaining: number
  stage: 'queued' | 'processing' | 'finalizing'
} | null>(null)
const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
const [selectedItemType, setSelectedItemType] = useState<'portrait' | 'scene' | null>(null)
```

**Key Methods**:

#### `updateCharacter(updates)`

```typescript
const updateCharacter = useCallback((updates: Partial<CharacterData>) => {
  setCharacter(prev => ({ ...prev, ...updates }))
  setIsDirty(true)
}, [])
```

#### `saveCharacter(options?)`

```typescript
const saveCharacter = useCallback(async (options?: { silent?: boolean }) => {
  setIsSaving(true)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Insert or update
    if (savedCharacterId) {
      const { error } = await supabase
        .from('characters')
        .update(character)
        .eq('id', savedCharacterId)
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('characters')
        .insert({ ...character, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      setSavedCharacterId(data.id)
    }

    setIsDirty(false)
    if (!options?.silent) {
      toast.success('Character saved')
    }
  } catch (error) {
    console.error('Save error:', error)
    toast.error('Failed to save character')
  } finally {
    setIsSaving(false)
  }
}, [character, savedCharacterId])
```

#### `generatePortrait(prompt, options?)`

```typescript
const generatePortrait = useCallback(async (
  prompt: string,
  options?: { referenceImageUrl?: string, model?: string }
) => {
  // Validate required fields before saving
  let charId = savedCharacterId
  if (!charId || isDirty) {
    if (!character.name?.trim() || !character.description?.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: isNewCharacter
          ? 'New characters need a name and description before generating portraits'
          : 'Please add a character name and description to continue',
        variant: 'destructive'
      })
      return null
    }

    // Silent auto-save
    charId = await saveCharacter({ silent: true })
    if (!charId) return null

    // Notify user of auto-save on first generation
    if (!savedCharacterId) {
      toast({
        title: 'Character Auto-Saved',
        description: 'Generating your first portrait...',
        duration: 2000
      })
    }
  }

  setIsGenerating(true)

  // Initialize progress tracking
  const estimatedDuration = 20 // seconds
  const startTime = Date.now()
  setGenerationProgress({
    percent: 0,
    estimatedTimeRemaining: estimatedDuration,
    stage: 'queued'
  })

  // Simulate progress updates every 500ms
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000
    const progress = Math.min(95, (elapsed / estimatedDuration) * 100)
    const remaining = Math.max(0, estimatedDuration - elapsed)

    setGenerationProgress({
      percent: Math.round(progress),
      estimatedTimeRemaining: Math.round(remaining),
      stage: progress < 30 ? 'queued' : progress < 80 ? 'processing' : 'finalizing'
    })
  }, 500)

  try {
    const effectiveReferenceUrl = options?.referenceImageUrl || character.reference_image_url || undefined

    // Call character-portrait edge function via supabase.functions.invoke
    const { data, error } = await supabase.functions.invoke('character-portrait', {
      body: {
        characterId: charId,
        referenceImageUrl: effectiveReferenceUrl,
        contentRating: character.content_rating,
        apiModelId: options?.model || undefined,
        presets: {},
        characterData: null,
        promptOverride: prompt || undefined
      }
    })

    if (error) throw new Error(error.message || 'Edge function failed')

    if (data?.success && data?.imageUrl) {
      clearInterval(progressInterval)
      setGenerationProgress({ percent: 100, estimatedTimeRemaining: 0, stage: 'finalizing' })

      await fetchPortraits()
      updateCharacter({ image_url: data.imageUrl })

      toast({
        title: 'Portrait generated',
        description: `Completed in ${Math.round((data.generationTimeMs || 0) / 1000)}s`
      })
      setIsGenerating(false)
      setGenerationProgress(null)
      return data.imageUrl
    } else if (data?.error) {
      throw new Error(data.error)
    }

    throw new Error('Unexpected response from generation service')
  } catch (error) {
    clearInterval(progressInterval)
    setGenerationProgress(null)
    toast({
      title: 'Generation failed',
      description: error instanceof Error ? error.message : 'Failed to generate portrait',
      variant: 'destructive'
    })
    setIsGenerating(false)
    return null
  }
}, [savedCharacterId, isDirty, character, saveCharacter, fetchPortraits, updateCharacter])
```

**Effects**:

```typescript
// Load character on mount
useEffect(() => {
  if (characterId) {
    loadCharacter()
  }
}, [characterId, loadCharacter])

// Load scenes when characterId available
useEffect(() => {
  if (savedCharacterId) {
    loadScenes()
  }
}, [savedCharacterId])
```

---

### usePortraitVersions Hook Architecture

**Location**: [src/hooks/usePortraitVersions.ts](../../../src/hooks/usePortraitVersions.ts)

**Purpose**: Manage portrait versioning with Realtime subscriptions

**Interface**:

```typescript
function usePortraitVersions(options?: {
  characterId?: string
  enabled?: boolean
}): {
  portraits: CharacterPortrait[]
  primaryPortrait: CharacterPortrait | null
  isLoading: boolean
  error: Error | null
  fetchPortraits: () => Promise<void>
  setPrimaryPortrait: (portraitId: string) => Promise<void>
  deletePortrait: (portraitId: string) => Promise<void>
  addPortrait: (portrait: Partial<CharacterPortrait>) => Promise<void>
  reorderPortraits: (newOrder: Array<{ id: string, sort_order: number }>) => Promise<void>
}
```

**Realtime Subscription**:

```typescript
useEffect(() => {
  if (!characterId || !enabled) return

  // Subscribe to character_portraits changes
  const channel = supabase
    .channel(`character_portraits:${characterId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'character_portraits',
        filter: `character_id=eq.${characterId}`
      },
      (payload) => {
        console.log('Portrait change:', payload.eventType, payload.new)

        if (payload.eventType === 'INSERT') {
          setPortraits(prev => [payload.new as CharacterPortrait, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setPortraits(prev => prev.map(p =>
            p.id === payload.new.id ? payload.new as CharacterPortrait : p
          ))
        } else if (payload.eventType === 'DELETE') {
          setPortraits(prev => prev.filter(p => p.id !== payload.old.id))
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [characterId, enabled])
```

**Key Methods**:

#### `setPrimaryPortrait(portraitId)`

```typescript
const setPrimaryPortrait = useCallback(async (portraitId: string) => {
  try {
    // Atomic operation: unset previous primary, set new primary
    const { error: unsetError } = await supabase
      .from('character_portraits')
      .update({ is_primary: false })
      .eq('character_id', characterId)
      .eq('is_primary', true)

    if (unsetError) throw unsetError

    const { error: setError } = await supabase
      .from('character_portraits')
      .update({ is_primary: true })
      .eq('id', portraitId)

    if (setError) throw setError

    // Update character.image_url
    const portrait = portraits.find(p => p.id === portraitId)
    if (portrait) {
      await supabase
        .from('characters')
        .update({ image_url: portrait.image_url })
        .eq('id', characterId)
    }

    toast.success('Primary portrait updated')
  } catch (error) {
    console.error('Set primary error:', error)
    toast.error('Failed to set primary portrait')
  }
}, [characterId, portraits])
```

---

## Database Schema

### characters Table

```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'female',
  content_rating TEXT NOT NULL DEFAULT 'nsfw',
  is_public BOOLEAN NOT NULL DEFAULT false,
  traits TEXT,
  persona TEXT,
  image_url TEXT,
  reference_image_url TEXT,
  appearance_tags TEXT[] DEFAULT '{}',
  clothing_tags TEXT[] DEFAULT '{}',       -- Added Feb 2026: outfit/clothing tags
  voice_tone TEXT DEFAULT 'warm',
  mood TEXT DEFAULT 'friendly',
  first_message TEXT,
  system_prompt TEXT,
  alternate_greetings TEXT[] DEFAULT '{}',
  forbidden_phrases TEXT[] DEFAULT '{}',
  voice_examples TEXT[] DEFAULT '{}',
  default_presets JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_gender CHECK (gender IN ('female', 'male', 'unspecified')),
  CONSTRAINT valid_content_rating CHECK (content_rating IN ('sfw', 'nsfw')),
  CONSTRAINT valid_voice_tone CHECK (voice_tone IN ('warm', 'playful', 'confident', 'teasing', 'direct')),
  CONSTRAINT valid_mood CHECK (mood IN ('friendly', 'flirty', 'mysterious', 'dominant', 'submissive'))
)

CREATE INDEX idx_characters_user_id ON characters(user_id)
CREATE INDEX idx_characters_is_public ON characters(is_public) WHERE is_public = true
CREATE INDEX idx_characters_created_at ON characters(created_at DESC)
```

### character_portraits Table

```sql
CREATE TABLE character_portraits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT,
  enhanced_prompt TEXT,
  generation_metadata JSONB DEFAULT '{}',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_primary_per_character UNIQUE (character_id, is_primary)
    WHERE is_primary = true
)

CREATE INDEX idx_character_portraits_character_id ON character_portraits(character_id)
CREATE INDEX idx_character_portraits_is_primary ON character_portraits(character_id, is_primary)
  WHERE is_primary = true
CREATE INDEX idx_character_portraits_sort_order ON character_portraits(character_id, sort_order, created_at DESC)
```

**generation_metadata Structure**:

```typescript
{
  model: string                      // api_models.display_name
  model_key: string                  // api_models.model_key
  generation_mode: 'i2i' | 'txt2img'
  generation_time_ms: number
  presets?: {
    pose?: string
    expression?: string
    outfit?: string
    camera?: string
  }
  job_id: string                     // jobs.id
  storage_path: string               // user-library bucket path
}
```

### character_scenes Table

```sql
CREATE TABLE character_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  scene_name TEXT NOT NULL,
  scene_description TEXT,
  scene_prompt TEXT,
  image_url TEXT,
  scene_type TEXT DEFAULT 'custom',
  scene_starters TEXT[] DEFAULT '{}',
  system_prompt TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

CREATE INDEX idx_character_scenes_character_id ON character_scenes(character_id)
CREATE INDEX idx_character_scenes_priority ON character_scenes(character_id, priority DESC)
```

### api_models Table

```sql
CREATE TABLE api_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES api_providers(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  model_key TEXT NOT NULL,
  modality TEXT NOT NULL,
  capabilities JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  input_defaults JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_modality CHECK (modality IN ('chat', 'image', 'video'))
)

CREATE INDEX idx_api_models_provider_id ON api_models(provider_id)
CREATE INDEX idx_api_models_modality ON api_models(modality)
CREATE INDEX idx_api_models_is_active ON api_models(is_active) WHERE is_active = true
```

**capabilities Structure** (for image models):

```typescript
{
  supports_i2i: boolean          // Enables I2I filtering
  max_resolution?: string        // e.g. "1024x1024"
  supported_formats?: string[]   // e.g. ["png", "jpg"]
}
```

---

## Tag Architecture (Feb 2026)

Character visual attributes are split into two categories for better prompt construction and outfit flexibility:

### Physical Appearance (`appearance_tags`)

- Hair color, style, length
- Eye color, facial features
- Body type, skin tone
- Permanent physical attributes

### Clothing/Outfit (`clothing_tags`)

- Current outfit, dress, attire
- Accessories (jewelry, glasses)
- Footwear
- Contextual/changeable items

### UI Implementation

`StudioSidebar.tsx` provides separate input sections:

- "Physical Appearance" - manages `appearance_tags`
- "Default Outfit" - manages `clothing_tags`

AI suggestions automatically categorize using keyword detection.

### Prompt Construction

`characterPromptBuilder.ts` includes both tag types:

```typescript
// Add appearance tags (physical) - up to 6 tags
if (character.appearance_tags?.length > 0) {
  characterTokens.push(...character.appearance_tags.slice(0, 6));
}

// Add clothing tags - up to 4 tags
if (character.clothing_tags?.length > 0) {
  characterTokens.push(...character.clothing_tags.slice(0, 4));
}
```

### Roleplay Scene Generation

`roleplay-chat` edge function constructs visual description:

```typescript
const physicalAppearance = (character.appearance_tags || []).slice(0, 5).join(', ');
const outfitTags = sceneContext?.clothing || (character.clothing_tags || []).join(', ');
const characterAppearance = outfitTags
  ? `${physicalAppearance}, wearing ${outfitTags}`
  : physicalAppearance;
```

---

## Edge Functions

### character-portrait Edge Function

**Location**: [supabase/functions/character-portrait/index.ts](../../../supabase/functions/character-portrait/index.ts)

**Purpose**: Generate character portraits with I2I support and multi-provider routing

**Request Contract**:

```typescript
interface CharacterPortraitRequest {
  characterId?: string                 // Existing character ID
  presets?: SelectedPresets            // Visual presets (pose, expression, etc.)
  referenceImageUrl?: string           // I2I reference image
  contentRating?: 'sfw' | 'nsfw'
  apiModelId?: string                  // Specific model ID from api_models table
  characterData?: {                    // For new characters (not yet saved)
    name: string
    gender: string
    appearance_tags: string[]
    description: string
  }
  promptOverride?: string              // User-typed custom prompt (max 200 chars)
}
```

**Response Contract**:

```typescript
interface CharacterPortraitResponse {
  success: true
  imageUrl: string                     // Final signed URL
  jobId: string                        // jobs.id
  portraitId?: string                  // character_portraits.id (if character-specific)
  generationTimeMs: number
  storagePath?: string                 // user-library bucket path
}
```

**Workflow** (6 phases):

#### Phase 1: Authentication & Authorization

```typescript
const authHeader = req.headers.get('Authorization')
if (!authHeader) return new Response('Missing auth', { status: 401 })

const token = authHeader.replace('Bearer ', '')
const { data: { user }, error: authError } = await supabase.auth.getUser(token)
if (authError || !user) return new Response('Unauthorized', { status: 401 })
```

#### Phase 2: Character Resolution

```typescript
let character: Character | null = null

if (characterId) {
  // Fetch existing character
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .single()

  if (error || !data) return new Response('Character not found', { status: 404 })
  character = data
} else if (characterData) {
  // Use provided character data (for new characters)
  character = {
    ...characterData,
    content_rating: contentRating || 'nsfw'
  } as Character
} else {
  return new Response('Missing characterId or characterData', { status: 400 })
}
```

#### Phase 3: Model Resolution

```typescript
let selectedModel: ApiModel | null = null

if (apiModelId) {
  // User-specified model
  const { data, error } = await supabase
    .from('api_models')
    .select('*, api_providers(*)')
    .eq('id', apiModelId)
    .eq('is_active', true)
    .single()

  if (error || !data) return new Response('Model not found or inactive', { status: 400 })
  selectedModel = data
} else {
  // Auto-select model based on I2I mode
  const isI2I = !!referenceImageUrl

  if (isI2I) {
    // I2I: Find model with supports_i2i capability
    const { data, error } = await supabase
      .from('api_models')
      .select('*, api_providers(*)')
      .eq('modality', 'image')
      .eq('is_active', true)
      .contains('capabilities', { supports_i2i: true })
      .order('priority', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return new Response('No I2I-capable models available', { status: 503 })
    selectedModel = data
  } else {
    // T2I: Default fal.ai model
    const { data, error } = await supabase
      .from('api_models')
      .select('*, api_providers(*)')
      .eq('modality', 'image')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return new Response('No image models available', { status: 503 })
    selectedModel = data
  }
}
```

#### Phase 4: Prompt Construction

```typescript
const buildPrompt = (): string => {
  const parts: string[] = []

  // Base quality tags
  parts.push('masterpiece, best quality, photorealistic')

  // Gender-aware subject
  const genderTag =
    character.gender === 'female' ? '1girl, beautiful woman' :
    character.gender === 'male' ? '1boy, handsome man' :
    '1person, portrait'
  parts.push(genderTag)

  // Appearance tags (max 8 to avoid token overflow)
  if (character.appearance_tags?.length > 0) {
    parts.push(...character.appearance_tags.slice(0, 8))
  }

  // Preset tags (if provided)
  if (presets) {
    if (presets.pose) parts.push(presets.pose)
    if (presets.expression) parts.push(presets.expression)
    if (presets.outfit) parts.push(presets.outfit)
    if (presets.camera) parts.push(presets.camera)
  }

  // User prompt override (max 200 chars)
  if (promptOverride) {
    parts.push(promptOverride.slice(0, 200))
  }

  // I2I identity preservation
  if (referenceImageUrl) {
    parts.push('maintain same character identity, consistent features')
  }

  // Quality enhancers
  parts.push('studio photography, professional lighting, sharp focus, detailed face')

  return parts.join(', ')
}

const finalPrompt = buildPrompt()
```

#### Phase 5: Job Creation & Generation

```typescript
// Create job record
const { data: job, error: jobError } = await supabase
  .from('jobs')
  .insert({
    user_id: user.id,
    job_type: 'character_portrait',
    status: 'queued',
    original_prompt: finalPrompt,
    api_model_id: selectedModel.id,
    metadata: {
      character_id: characterId,
      reference_image_url: referenceImageUrl,
      generation_mode: referenceImageUrl ? 'i2i' : 'txt2img'
    }
  })
  .select()
  .single()

if (jobError) throw jobError

// Update job to processing
await supabase
  .from('jobs')
  .update({ status: 'processing', started_at: new Date().toISOString() })
  .eq('id', job.id)

// Call fal.ai sync endpoint
const startTime = Date.now()
const response = await fetch(`https://fal.run/${selectedModel.model_key}`, {
  method: 'POST',
  headers: {
    'Authorization': `Key ${FAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: finalPrompt,
    image_url: referenceImageUrl,  // Only for I2I models
    enable_safety_checker: character.content_rating === 'sfw',
    num_images: 1,
    ...selectedModel.input_defaults  // Model-specific defaults
  })
})

const result = await response.json()
if (!response.ok) throw new Error(result.error || 'Generation failed')

const generationTimeMs = Date.now() - startTime
const imageUrl = result.images[0].url  // fal.ai format

// Update job to completed
await supabase
  .from('jobs')
  .update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    metadata: {
      ...job.metadata,
      generation_time_ms: generationTimeMs,
      fal_request_id: result.request_id
    }
  })
  .eq('id', job.id)
```

#### Phase 6: Storage & Database Persistence

```typescript
let finalImageUrl = imageUrl
let storagePath: string | undefined

try {
  // Download image from fal.ai
  const imageResponse = await fetch(imageUrl)
  const imageBlob = await imageResponse.blob()

  // Upload to user-library bucket
  const fileName = `${user.id}/portraits/${character.id || 'temp'}/${job.id}.png`
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('user-library')
    .upload(fileName, imageBlob, {
      contentType: 'image/png',
      upsert: false
    })

  if (uploadError) throw uploadError

  storagePath = uploadData.path

  // Generate 1-year signed URL
  const { data: signedData, error: signError } = await supabase
    .storage
    .from('user-library')
    .createSignedUrl(storagePath, 31536000)  // 1 year

  if (signError) throw signError

  finalImageUrl = signedData.signedUrl
} catch (storageError) {
  console.error('Storage upload failed, using fal.ai URL as fallback:', storageError)
  // Fallback to fal.ai URL (already set)
}

// Insert into character_portraits (if character exists)
let portraitId: string | undefined

if (characterId) {
  // Check if this is the first portrait
  const { count } = await supabase
    .from('character_portraits')
    .select('id', { count: 'exact', head: true })
    .eq('character_id', characterId)

  const isFirstPortrait = count === 0

  const { data: portrait, error: portraitError } = await supabase
    .from('character_portraits')
    .insert({
      character_id: characterId,
      image_url: finalImageUrl,
      prompt: finalPrompt,
      generation_metadata: {
        model: selectedModel.display_name,
        model_key: selectedModel.model_key,
        generation_mode: referenceImageUrl ? 'i2i' : 'txt2img',
        generation_time_ms: generationTimeMs,
        presets: presets,
        job_id: job.id,
        storage_path: storagePath
      },
      is_primary: isFirstPortrait,  // First portrait is primary
      sort_order: count || 0
    })
    .select()
    .single()

  if (portraitError) throw portraitError
  portraitId = portrait.id

  // Update character.image_url to latest portrait
  await supabase
    .from('characters')
    .update({ image_url: finalImageUrl })
    .eq('id', characterId)
}

return new Response(JSON.stringify({
  success: true,
  imageUrl: finalImageUrl,
  jobId: job.id,
  portraitId,
  generationTimeMs,
  storagePath
}), {
  headers: { 'Content-Type': 'application/json' }
})
```

---

## Storage Architecture

### Buckets

#### reference_images Bucket

- **Purpose**: User-uploaded reference images for I2I generation
- **Path Structure**: `{user_id}/{character_id}/{filename}.{ext}`
- **Security**: RLS policies ensure user can only access own images
- **Upload Flow**:
  1. User selects image (HEIC supported)
  2. Frontend converts HEIC to PNG if needed
  3. Upload to reference_images bucket
  4. Generate signed URL (1 year expiration)
  5. Store URL in character.reference_image_url

#### user-library Bucket

- **Purpose**: Permanent storage for generated character portraits
- **Path Structure**: `{user_id}/portraits/{character_id}/{job_id}.png`
- **Security**: RLS policies ensure user can only access own library
- **Upload Flow**:
  1. Edge function downloads image from fal.ai
  2. Upload to user-library bucket
  3. Generate signed URL (1 year expiration)
  4. Store URL in character_portraits.image_url
  5. Fallback to fal.ai URL if upload fails

### URL Signing & Caching

**UrlSigningService** ([src/lib/services/UrlSigningService.ts](../../../src/lib/services/UrlSigningService.ts)):

```typescript
class UrlSigningService {
  static async signUrl(
    bucket: string,
    path: string,
    expiresIn: number = 31536000  // 1 year default
  ): Promise<string> {
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) throw error
    return data.signedUrl
  }

  static async signBatch(
    bucket: string,
    paths: string[],
    expiresIn: number = 31536000
  ): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrls(paths, expiresIn)

    if (error) throw error
    return data.reduce((acc, item) => {
      acc[item.path] = item.signedUrl
      return acc
    }, {} as Record<string, string>)
  }
}
```

**UrlCache** ([src/lib/services/UrlCache.ts](../../../src/lib/services/UrlCache.ts)):

```typescript
class UrlCache {
  private static cache = new Map<string, { url: string, expiry: number }>()

  static get(key: string): string | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    // Check expiry (invalidate 1 hour before actual expiry)
    if (Date.now() > cached.expiry - 3600000) {
      this.cache.delete(key)
      return null
    }

    return cached.url
  }

  static set(key: string, url: string, expiresIn: number): void {
    this.cache.set(key, {
      url,
      expiry: Date.now() + (expiresIn * 1000)
    })
  }

  static clear(): void {
    this.cache.clear()
  }
}
```

---

## Realtime Subscriptions

### Portrait Updates Channel

**Setup** (in usePortraitVersions):

```typescript
const channel = supabase
  .channel(`character_portraits:${characterId}`)
  .on(
    'postgres_changes',
    {
      event: '*',  // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'character_portraits',
      filter: `character_id=eq.${characterId}`
    },
    (payload) => {
      console.log('🔔 Portrait change:', payload.eventType)

      switch (payload.eventType) {
        case 'INSERT':
          setPortraits(prev => [payload.new as CharacterPortrait, ...prev])
          break

        case 'UPDATE':
          setPortraits(prev => prev.map(p =>
            p.id === payload.new.id ? payload.new as CharacterPortrait : p
          ))
          break

        case 'DELETE':
          setPortraits(prev => prev.filter(p => p.id !== payload.old.id))
          break
      }
    }
  )
  .subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Portrait channel subscribed')
    } else if (error) {
      console.error('❌ Portrait channel error:', error)
    }
  })
```

**Cleanup**:

```typescript
useEffect(() => {
  // ... subscription setup

  return () => {
    console.log('🔌 Unsubscribing portrait channel')
    supabase.removeChannel(channel)
  }
}, [characterId])
```

**Race Condition Prevention**:

- Check channel status before removeChannel
- Track subscription state with isSubscribed flag
- Handle TIMEOUT events gracefully

---

## Model Routing

### Portrait Routing (Feb 2026 Update)

Character portraits now bypass the queue-job/SDXL path and route directly to cloud providers:

1. Query `api_models` table for default image model with `default_for_tasks` containing `generation`
2. Resolve provider from joined `api_providers.name`
3. Route to `fal-image` (provider = 'fal') or `replicate-image` (provider = 'replicate')
4. No Redis queue involved - direct edge function invocation

**File:** `src/components/roleplay/CharacterEditModal.tsx`

This ensures character portraits always work regardless of local worker health.

### Dynamic Model Selection Algorithm

**Location**: character-portrait edge function, Phase 3

**Decision Tree**:

```
User specifies apiModelId?
├─ YES → Fetch that model
│   ├─ Model found & active?
│   │   ├─ YES → Use specified model
│   │   └─ NO → Return 400 error "Model not found or inactive"
│   └─ End
│
└─ NO → Auto-select based on context
    ├─ Has referenceImageUrl? (I2I mode)
    │   ├─ YES → Query for I2I-capable models
    │   │   ├─ Filter: modality=image, is_active=true, capabilities->supports_i2i=true
    │   │   ├─ Order by: priority DESC
    │   │   ├─ Limit: 1
    │   │   ├─ Found?
    │   │   │   ├─ YES → Use I2I model
    │   │   │   └─ NO → Return 503 error "No I2I-capable models available"
    │   │   └─ End
    │   └─ NO (T2I mode)
    │       ├─ Query for any active image model
    │       ├─ Filter: modality=image, is_active=true
    │       ├─ Order by: priority DESC
    │       ├─ Limit: 1
    │       ├─ Found?
    │       │   ├─ YES → Use highest priority model
    │       │   └─ NO → Return 503 error "No image models available"
    │       └─ End
```

**Capabilities Schema**:

```typescript
// api_models.capabilities (JSONB)
{
  supports_i2i: boolean        // I2I filtering flag
  max_resolution?: string      // e.g. "1024x1024", "2048x2048"
  supported_formats?: string[] // e.g. ["png", "jpg", "webp"]
  aspect_ratios?: string[]     // e.g. ["1:1", "16:9", "9:16"]
}
```

**Provider Priority** (api_models.priority):

- Higher priority = preferred
- Example: Seedream (priority: 10), SDXL (priority: 5), Replicate FLUX (priority: 8)

---

## Data Flow Diagrams

### Portrait Generation Flow

```
┌─────────────────┐
│ User clicks     │
│ "Generate       │
│  Portrait"      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CharacterStudio │ useCharacterStudio.generatePortrait()
│ or              │
│ CreateCharacter │
└────────┬────────┘
         │
         ▼
    ┌───────────────┐
    │ Character     │ NO
    │ saved?        ├─────► Auto-save character (silent mode)
    └───┬───────────┘
        │ YES
        ▼
┌─────────────────┐
│ Call            │ POST /functions/v1/character-portrait
│ character-      │ Body: {
│ portrait edge   │   characterId,
│ function        │   promptOverride,
│                 │   referenceImageUrl,
│                 │   apiModelId,
│                 │   contentRating
└────────┬────────┘ }
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ 1. Auth check   │
│ 2. Resolve char │
│ 3. Select model │ (I2I capability matching)
│ 4. Build prompt │ (quality tags + appearance + user override)
│ 5. Create job   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call fal.ai     │ POST https://fal.run/{model_key}
│ sync endpoint   │ Body: {
│                 │   prompt,
│                 │   image_url (I2I),
│                 │   enable_safety_checker
└────────┬────────┘ }
         │ (5-15s generation time)
         ▼
┌─────────────────┐
│ fal.ai returns  │ Response: {
│ image URL       │   images: [{ url }]
│                 │ }
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function:  │
│ 1. Download     │ fetch(imageUrl)
│    image         │
│ 2. Upload to    │ supabase.storage.upload()
│    user-library │
│ 3. Generate     │ createSignedUrl() (1 year)
│    signed URL   │
│ 4. Insert to    │ character_portraits.insert()
│    DB           │ (is_primary = true if first)
│ 5. Update       │ characters.update({ image_url })
│    character    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return response │ { imageUrl, jobId, portraitId }
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Frontend:       │
│ 1. Update       │ updateCharacter({ image_url })
│    character    │
│    state        │
│ 2. Show toast   │ "Portrait generated in 7.3s"
└─────────────────┘
         │
         │ (parallel, via Realtime)
         ▼
┌─────────────────┐
│ Realtime:       │ postgres_changes event
│ INSERT event    │ { eventType: 'INSERT', new: portrait }
│ received        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ usePortrait-    │ setPortraits([new, ...prev])
│ Versions updates│
│ portraits array │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PortraitGallery │ Re-renders with new portrait
│ displays new    │
│ portrait        │
└─────────────────┘
```

### Primary Portrait Selection Flow

```
┌─────────────────┐
│ User clicks     │
│ "Set as Primary"│
│ in gallery or   │
│ lightbox        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ usePortrait-    │ setPrimaryPortrait(portraitId)
│ Versions hook   │
└────────┬────────┘
         │
         ▼
    ┌───────────────┐
    │ Atomic DB     │ transaction (pseudo-code)
    │ operations:   │
    │               │
    │ 1. UPDATE     │ character_portraits
    │    SET        │ SET is_primary = false
    │    WHERE      │ WHERE character_id = X
    │               │   AND is_primary = true
    │               │
    │ 2. UPDATE     │ character_portraits
    │    SET        │ SET is_primary = true
    │    WHERE      │ WHERE id = portraitId
    │               │
    │ 3. UPDATE     │ characters
    │    SET        │ SET image_url = portrait.image_url
    │    WHERE      │ WHERE id = character_id
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Realtime:     │ 2x UPDATE events
    │ Updates fired │ { eventType: 'UPDATE', new: portrait }
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ usePortrait-  │ setPortraits(prev => prev.map(...))
    │ Versions      │ (updates is_primary flags)
    │ updates state │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ PortraitGallery│ Gold star badge moves to new primary
    │ re-renders    │
    └───────────────┘
```

---

## API Contracts

### character-portrait Edge Function

**Endpoint**: `POST /functions/v1/character-portrait`

**Request**:

```typescript
{
  // Character identifier (one required)
  characterId?: string                 // Existing character UUID
  characterData?: {                    // For new/unsaved characters
    name: string
    gender: 'female' | 'male' | 'unspecified'
    appearance_tags: string[]
    description: string
  }

  // Generation options
  promptOverride?: string              // User custom prompt (max 200 chars)
  referenceImageUrl?: string           // I2I reference (storage path or signed URL)
  contentRating?: 'sfw' | 'nsfw'      // Safety checker toggle
  apiModelId?: string                  // Specific model UUID from api_models

  // Presets (optional)
  presets?: {
    pose?: string                       // e.g. "standing", "sitting"
    expression?: string                 // e.g. "smiling", "serious"
    outfit?: string                     // e.g. "casual", "formal"
    camera?: string                     // e.g. "portrait", "close-up"
  }
}
```

**Response (Success 200)**:

```typescript
{
  success: true
  imageUrl: string                     // Signed URL (1 year expiry)
  jobId: string                        // jobs.id UUID
  portraitId?: string                  // character_portraits.id (if character exists)
  generationTimeMs: number             // e.g. 7234
  storagePath?: string                 // e.g. "user123/portraits/char456/job789.png"
}
```

**Response (Error 4xx/5xx)**:

```typescript
{
  success: false
  error: string                        // Human-readable error message
  code?: string                        // Error code for client handling
}
```

**Error Codes**:

- `400` - Missing required fields, invalid model ID
- `401` - Unauthorized (invalid/missing JWT)
- `404` - Character not found
- `503` - No available models, API unavailable

---

## Error Handling Patterns

### Frontend Error Handling

**Pattern 1: Toast Notifications**

```typescript
try {
  await someAsyncOperation()
  toast.success('Operation completed')
} catch (error) {
  console.error('Operation failed:', error)
  toast.error('Operation failed. Please try again.')
}
```

**Pattern 2: Inline Field Errors**

```typescript
const [errors, setErrors] = useState<Record<string, string>>({})

const validate = () => {
  const newErrors: Record<string, string> = {}

  if (!character.name) {
    newErrors.name = 'Name is required'
  } else if (character.name.length > 50) {
    newErrors.name = 'Name must be 50 characters or less'
  }

  if (!character.description) {
    newErrors.description = 'Description is required'
  } else if (character.description.length < 50) {
    newErrors.description = 'Description must be at least 50 characters'
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}

// Render
<Input
  value={character.name}
  onChange={(e) => updateCharacter({ name: e.target.value })}
  error={errors.name}
/>
{errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
```

**Pattern 3: Retry Mechanism**

```typescript
const [retryCount, setRetryCount] = useState(0)

const generateWithRetry = async () => {
  try {
    await generatePortrait(prompt)
  } catch (error) {
    if (retryCount < 3) {
      toast.error(`Generation failed. Retrying... (${retryCount + 1}/3)`)
      setRetryCount(prev => prev + 1)
      setTimeout(() => generateWithRetry(), 2000)
    } else {
      toast.error('Generation failed after 3 attempts. Please try again later.')
      setRetryCount(0)
    }
  }
}
```

### Edge Function Error Handling

**Pattern 1: Early Return with Status Codes**

```typescript
if (!authHeader) {
  return new Response(JSON.stringify({
    success: false,
    error: 'Missing Authorization header',
    code: 'MISSING_AUTH'
  }), { status: 401 })
}
```

**Pattern 2: Try-Catch with Fallback**

```typescript
let finalImageUrl = imageUrl

try {
  // Attempt storage upload
  const { data, error } = await supabase.storage.upload(...)
  if (error) throw error

  finalImageUrl = signedUrl
} catch (storageError) {
  console.error('Storage upload failed, using fal.ai URL:', storageError)
  // Fallback to fal.ai URL (already set)
}
```

**Pattern 3: Transactional Rollback**

```typescript
try {
  // Phase 1: Create job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({ status: 'queued' })
    .select()
    .single()

  if (jobError) throw jobError

  // Phase 2: Call external API
  const result = await callFalAI()

  // Phase 3: Update job
  await supabase
    .from('jobs')
    .update({ status: 'completed' })
    .eq('id', job.id)

} catch (error) {
  // Rollback: Mark job as failed
  if (job?.id) {
    await supabase
      .from('jobs')
      .update({ status: 'failed', error_message: error.message })
      .eq('id', job.id)
  }

  throw error
}
```

---

## Performance Optimization

### Portrait Gallery Optimization

**Virtual Scrolling** (future enhancement):

```typescript
// For galleries with 50+ portraits
import { useVirtualizer } from '@tanstack/react-virtual'

const parentRef = useRef<HTMLDivElement>(null)

const virtualizer = useVirtualizer({
  count: portraits.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 150,  // Portrait tile height
  overscan: 5
})
```

**Image Lazy Loading** (current):

```typescript
<img
  src={portrait.image_url}
  loading="lazy"
  decoding="async"
  alt={character.name}
/>
```

**URL Caching** (current):

```typescript
// UrlCache prevents repeated signed URL generation
const getCachedUrl = (path: string): string => {
  const cached = UrlCache.get(path)
  if (cached) return cached

  const signed = await UrlSigningService.signUrl('user-library', path)
  UrlCache.set(path, signed, 31536000)
  return signed
}
```

### Realtime Subscription Optimization

**Debouncing Updates**:

```typescript
const debouncedUpdate = useCallback(
  debounce((payload) => {
    setPortraits(prev => [...prev, payload.new])
  }, 300),
  []
)
```

**Selective Subscription** (enabled flag):

```typescript
usePortraitVersions({
  characterId,
  enabled: activeTab === 'portraits'  // Only subscribe when viewing portraits
})
```

### Form Performance

**Controlled Input Optimization**:

```typescript
// Use uncontrolled inputs for large textareas
const descriptionRef = useRef<HTMLTextAreaElement>(null)

const handleSave = () => {
  const description = descriptionRef.current?.value
  updateCharacter({ description })
}

<textarea ref={descriptionRef} defaultValue={character.description} />
```

**Debounced Auto-Save** (future):

```typescript
const debouncedSave = useCallback(
  debounce(() => {
    if (isDirty) {
      saveCharacter({ silent: true })
    }
  }, 3000),
  [isDirty, saveCharacter]
)

useEffect(() => {
  debouncedSave()
}, [character, debouncedSave])
```

---

## Related Documentation

- [CHARACTER_STUDIO_PAGE.md](CHARACTER_STUDIO_PAGE.md) - User-facing feature documentation
- [CREATE_CHARACTER_PAGE.md](CREATE_CHARACTER_PAGE.md) - Form-based character creation
- [Model Routing Architecture](../../CLAUDE.md#model-routing-architecture) - Model selection strategy
- [Roleplay System Documentation](../07-ROLEPLAY/) - Integration with roleplay features

---

**Maintainers**: This document should be updated when:

- New components added to character studio
- Database schema changes (add fields, indexes)
- Edge function workflow modifications
- New model providers integrated
- Performance optimizations implemented

**Last Review**: February 20, 2026
