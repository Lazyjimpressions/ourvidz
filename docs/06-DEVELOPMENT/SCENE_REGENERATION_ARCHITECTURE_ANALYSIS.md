# Scene Regeneration Architecture Analysis

**Date:** 2026-01-08  
**Status:** 🔄 Analysis & Recommendations

## Executive Summary

Current implementation has architectural issues:
1. **Using Seedream v4 (text-to-image)** for every scene → loses consistency
2. **Reprompting entire scene** when modifying → inefficient
3. **Should use i2i models** (v4/edit, v4.5/edit) for modifications
4. **UI/UX issues** - admin features too prominent, breaking user experience

---

## 1. Current Problem Analysis

### Issue 1: Using Seedream v4 (T2I) for Every Scene

**Current Behavior:**
- Every scene generation uses `seedream/v4/text-to-image`
- This is a **text-to-image** model (no reference image)
- Each scene is generated from scratch
- **Result:** Character appearance drifts between scenes

**Why This Happens:**
- System treats every scene as a "new" generation
- No continuity from previous scene to next scene
- Character reference image is only used for initial character consistency, not scene-to-scene consistency

### Issue 2: Modification Flow is Wrong

**Current Behavior:**
- User edits prompt → System regenerates entire scene from scratch
- Uses same T2I model (v4) → loses previous scene context
- **Result:** Modified scene doesn't build on previous scene

**What Should Happen:**
- User edits prompt → System uses **i2i** to modify previous scene
- Uses v4/edit or v4.5/edit → maintains previous scene as base
- **Result:** Modified scene preserves previous scene context

---

## 2. Seedream Model Architecture

### Available Seedream Models

| Model | Type | Use Case | Reference Image? |
|-------|------|----------|------------------|
| `v4/text-to-image` | T2I | New scene generation | ❌ No |
| `v4/edit` | I2I | Modify existing image | ✅ Yes |
| `v4.5/edit` | I2I | Higher quality editing | ✅ Yes |

### Key Insight

**Seedream v4/edit and v4.5/edit ARE i2i models** - they require:
- `image_urls` (array) - the previous scene image
- `prompt` - modification instructions
- `strength` - how much to modify (0.0-1.0)

---

## 3. Recommended Architecture

### Scene Generation Flow

```
First Scene:
  → Use v4/text-to-image (T2I)
  → Save generated image
  → Store as "previous scene image"

Subsequent Scenes:
  → Use v4.5/edit (I2I)
  → Pass previous scene image as reference
  → Pass new scene prompt
  → Maintains visual continuity

Modification:
  → Use v4.5/edit (I2I)
  → Pass current scene image as reference
  → Pass edited prompt
  → Preserves scene context
```

### Implementation Strategy

1. **Track Previous Scene Image**
   - Store `previous_scene_image_url` in `character_scenes` table
   - Link scenes in sequence via `previous_scene_id`

2. **Model Selection Logic**
   ```typescript
   if (isFirstScene || !previousSceneImage) {
     model = 'seedream/v4/text-to-image'; // T2I
   } else {
     model = 'seedream/v4.5/edit'; // I2I
   }
   ```

3. **Modification Flow**
   ```typescript
   if (isModification) {
     model = 'seedream/v4.5/edit'; // Always I2I for modifications
     referenceImage = currentSceneImage; // Use current scene, not character reference
   }
   ```

---

## 4. UI/UX Best Practices

### Current Issues

1. **Admin Debug Panel Too Prominent**
   - Always visible for admins
   - Takes up space
   - Breaks visual flow

2. **Edit Button Too Visible**
   - Always shown on scene images
   - Clutters interface
   - Not subtle

3. **Info Boxes Too Large**
   - Reference image info box is prominent
   - Takes up modal space
   - Could be tooltip or collapsible

### Recommended UI/UX Improvements

#### 1. Admin Debug Panel - Subtle & Expandable

**Current:** Always visible card
**Recommended:** Collapsible section with subtle trigger

```tsx
// Subtle admin indicator
{isAdmin && (
  <button 
    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-500/20 hover:bg-purple-500/40 
               flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
    onClick={() => setShowDebug(!showDebug)}
    title="Admin Debug"
  >
    <Code className="w-3 h-3 text-purple-400" />
  </button>
)}

// Expandable debug panel (only when clicked)
{showDebug && isAdmin && (
  <SceneDebugPanel ... />
)}
```

**Benefits:**
- ✅ Doesn't break visual flow
- ✅ Only visible when needed
- ✅ Subtle hover indicator
- ✅ Expandable on demand

#### 2. Edit Button - Context Menu or Hover

**Current:** Always visible button
**Recommended:** Context menu or hover reveal

```tsx
// Option A: Context menu (right-click)
<div 
  onContextMenu={(e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }}
>
  <img src={sceneImage} />
</div>

// Option B: Hover reveal
<div className="group relative">
  <img src={sceneImage} />
  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors 
                  flex items-center justify-center opacity-0 group-hover:opacity-100">
    <Button size="sm" variant="ghost">Edit</Button>
  </div>
</div>
```

**Benefits:**
- ✅ Cleaner interface
- ✅ Edit available when needed
- ✅ Doesn't clutter scene display

#### 3. Info Boxes - Tooltips or Collapsible

**Current:** Large info boxes in modal
**Recommended:** Tooltips or collapsible sections

```tsx
// Tooltip approach
<Tooltip>
  <TooltipTrigger>
    <Info className="w-4 h-4 text-muted-foreground" />
  </TooltipTrigger>
  <TooltipContent>
    Uses character reference image (not previous scene) for consistency
  </TooltipContent>
</Tooltip>

// Or collapsible
<details className="text-xs">
  <summary className="text-muted-foreground cursor-pointer">
    ℹ️ Reference Image Info
  </summary>
  <p className="mt-2 text-muted-foreground">
    Uses character reference image...
  </p>
</details>
```

**Benefits:**
- ✅ Less modal clutter
- ✅ Info available when needed
- ✅ Cleaner editing experience

---

## 5. Technical Implementation Plan

### Phase 1: Track Previous Scene

```sql
-- Add to character_scenes table
ALTER TABLE character_scenes 
ADD COLUMN previous_scene_id UUID REFERENCES character_scenes(id),
ADD COLUMN previous_scene_image_url TEXT;
```

### Phase 2: Model Selection Logic

```typescript
// In roleplay-chat edge function
const isFirstScene = !previousSceneId;
const hasPreviousScene = !!previousSceneImageUrl;
const isModification = !!scenePromptOverride;

let selectedModel: string;
if (isModification && currentSceneImageUrl) {
  // Modification: always use i2i
  selectedModel = 'seedream/v4.5/edit';
  referenceImage = currentSceneImageUrl; // Use current scene
} else if (hasPreviousScene) {
  // Subsequent scene: use i2i with previous scene
  selectedModel = 'seedream/v4.5/edit';
  referenceImage = previousSceneImageUrl; // Use previous scene
} else {
  // First scene: use t2i
  selectedModel = 'seedream/v4/text-to-image';
  referenceImage = character.reference_image_url; // Use character reference
}
```

### Phase 3: Update fal-image Edge Function

```typescript
// In fal-image/index.ts
if (modelKey.includes('seedream') && modelKey.includes('edit')) {
  // Seedream edit models require image_urls (array)
  if (referenceImage) {
    input.image_urls = [referenceImage]; // Array format
    input.strength = refStrength ?? 0.5; // Modification strength
  }
}
```

---

## 6. UX Flow Recommendations

### Scene Generation Flow

1. **First Scene**
   - User triggers scene generation
   - System uses v4/text-to-image
   - Character reference image ensures character consistency
   - Scene saved with image URL

2. **Subsequent Scenes**
   - User triggers next scene
   - System detects previous scene exists
   - System uses v4.5/edit with previous scene as reference
   - Maintains visual continuity
   - Scene saved with link to previous scene

3. **Modification**
   - User clicks edit (subtle, hover-revealed)
   - Modal opens with current prompt
   - User edits prompt
   - System uses v4.5/edit with current scene as reference
   - Preserves scene context while applying changes

### UI States

**Default State:**
- Scene image displayed
- No buttons visible
- Clean, minimal interface

**Hover State:**
- Edit button fades in (top-right corner)
- Subtle admin debug indicator (if admin)
- Non-intrusive

**Edit State:**
- Modal opens
- Clean editing interface
- Info available via tooltips/collapsible
- No clutter

---

## 7. Migration Strategy

### Step 1: Database Migration
- Add `previous_scene_id` and `previous_scene_image_url` columns
- Backfill existing scenes (set to null for now)

### Step 2: Model Selection Update
- Update `roleplay-chat` to detect previous scenes
- Route to appropriate model (v4 vs v4.5/edit)

### Step 3: UI Refinement
- Make admin features subtle
- Add hover states
- Collapsible info sections

### Step 4: Testing
- Test first scene generation (T2I)
- Test subsequent scenes (I2I with previous)
- Test modifications (I2I with current)

---

## 8. Key Takeaways

1. **Use I2I for continuity** - v4.5/edit maintains scene-to-scene consistency
2. **Track scene sequence** - Link scenes to enable I2I chain
3. **Modifications = I2I** - Always use edit models for modifications
4. **Subtle admin features** - Don't break user experience
5. **Clean UI** - Hover reveals, tooltips, collapsible sections

---

## 9. Questions to Resolve

1. **Should we always use I2I after first scene?**
   - ✅ Yes - maintains consistency
   - Consider: What if user wants "fresh start"?

2. **What strength for scene-to-scene I2I?**
   - Recommended: 0.3-0.5 (moderate modification)
   - Allows scene changes while preserving character/scene context

3. **What strength for modifications?**
   - Recommended: 0.4-0.6 (moderate-high modification)
   - Allows prompt changes while preserving scene context

4. **Should we show model being used?**
   - Only in admin debug panel
   - Not in main UI (too technical)

---

## Conclusion

The current architecture needs refinement:
- ✅ Use I2I models (v4.5/edit) for scene continuity
- ✅ Track previous scenes for I2I chain
- ✅ Make UI subtle and expandable
- ✅ Preserve user experience while enabling power features

**Next Steps:**
1. Review this analysis
2. Decide on implementation approach
3. Implement database changes
4. Update model selection logic
5. Refine UI/UX

