

# Compact Roleplay Settings Modal - Models Tab Redesign

## Current State

The Models tab in the settings gear has 3 model selectors (Chat, Image, I2I) plus a large "Chat Model Information Card" with speed/cost/quality badges, and verbose offline banners. The sheet spans `w-[90vw] sm:w-[500px] max-w-2xl`.

## Changes

### 1. Relabel and clarify model selectors

**File: `src/components/roleplay/RoleplaySettingsModal.tsx`**

- Rename "Image Model" (line 1095) to **"T2I Model"** with a small `(Text-to-Image)` subtitle
- Rename "Scene Iteration Model (I2I)" (line 1165) to **"I2I Model"** with a `(Image-to-Image)` subtitle
- Both selectors already pull from their respective hooks (`useImageModels`, `useI2IModels`) which are fully dynamic and include local + cloud options -- no logic changes needed

### 2. Remove the Chat Model Information Card

Remove the large capability card (lines 1217-1405) that shows speed/cost/quality/NSFW badges. This is ~190 lines of verbose UI. The model name in the dropdown is sufficient context.

### 3. Remove verbose offline banners

- Remove the "Local AI Workers Offline" card banner (lines 1025-1037) -- the inline "Offline" badges on each model item already communicate this
- Remove the "Local SDXL offline" inline banner (lines 1096-1101) -- same reason

### 4. Compact the sheet width

Change `w-[90vw] sm:w-[500px] max-w-2xl` to `w-[85vw] sm:w-[400px] max-w-md` for a tighter panel.

### 5. Use compact label style

Switch model labels from `<Label>` to a smaller `text-xs font-medium uppercase tracking-wide text-muted-foreground` style for a utility-first look. Add `text-xs` to helper text below selectors.

### 6. Reduce select trigger height

Add `h-9 text-sm` to all `SelectTrigger` elements in the Models tab for compact selectors.

## Files to Change

| File | Change |
|---|---|
| `src/components/roleplay/RoleplaySettingsModal.tsx` | Relabel selectors, remove info card + offline banners, compact width + styling |

## Result

- Models tab becomes a clean stack of 3 compact dropdowns: Chat Model, T2I Model, I2I Model
- No more large info cards or redundant banners
- Sheet is narrower and more focused
- All model options remain fully dynamic (local + cloud) from database hooks
- Mobile gets proportionally tighter with `w-[85vw]`

