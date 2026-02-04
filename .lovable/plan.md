
# Audit: Image Generation Mode UI Missing

## Issue Identified
The Phase 1 implementation of Manual vs Auto Image Generation Mode added the **state management and logic correctly**, but the **UI element is missing** in one key location:

### What Was Implemented Correctly
| Component | Status | Details |
|-----------|--------|---------|
| `src/types/roleplay.ts` | ✅ Complete | Added `ImageGenerationMode` type |
| `src/pages/MobileRoleplayDashboard.tsx` | ✅ Complete | State management + localStorage persistence |
| `src/components/roleplay/DashboardSettings.tsx` | ✅ Complete | Has Image Generation selector (lines 189-211) |
| `src/pages/MobileRoleplayChat.tsx` | ✅ Complete | Respects mode in `handleSendMessage` |
| `src/components/roleplay/ChatMessage.tsx` | ✅ Complete | Manual generate button on messages |

### What Is Missing
| Component | Status | Issue |
|-----------|--------|-------|
| `src/components/roleplay/RoleplaySettingsModal.tsx` | ❌ Missing UI | Has state (line 98), saves to localStorage (line 429), calls callback (line 457), but **NO UI selector rendered** |

## Where to Find the Working UI

**From the Dashboard** (`/roleplay`):
- **Desktop**: Click the gear icon in the top-right header
- **Mobile**: Tap "Settings" in the bottom navigation bar

This opens `DashboardSettings` sheet which **does have** the Image Generation selector:

```text
┌─────────────────────────────────────┐
│ Settings                        [X] │
├─────────────────────────────────────┤
│ Image Model: [Seedream v4     ▼]    │
│ Chat Model:  [Local Worker    ▼]    │
│ Memory Tier: [Conversation    ▼]    │
│ Scene Style: [Character Only  ▼]    │
│ Image Generation: [Auto       ▼]  ← │
│ Content Filter: [All] [NSFW] [SFW]  │
└─────────────────────────────────────┘
```

## What Needs to Be Fixed

Add the Image Generation Mode selector UI to `RoleplaySettingsModal.tsx` (used in chat page):

**Location**: After the Scene Style section (around line 917)

**UI to Add**:
```tsx
{/* Image Generation Mode */}
<div className="space-y-3">
  <Label className="flex items-center gap-2">
    <Sparkles className="w-4 h-4" />
    Image Generation
  </Label>
  <p className="text-xs text-muted-foreground mb-2">
    Control when scene images are generated during chat.
  </p>
  <div className="space-y-2">
    <button
      onClick={() => setLocalImageGenerationMode('auto')}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors",
        localImageGenerationMode === 'auto'
          ? "bg-blue-600/20 border-blue-500"
          : "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
      )}
    >
      <div className="flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <div>
          <div className="font-medium text-white text-sm">Auto</div>
          <div className="text-xs text-gray-400">
            Generate images with each AI response
          </div>
        </div>
      </div>
    </button>

    <button
      onClick={() => setLocalImageGenerationMode('manual')}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors",
        localImageGenerationMode === 'manual'
          ? "bg-blue-600/20 border-blue-500"
          : "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
      )}
    >
      <div className="flex items-center gap-3">
        <Camera className="w-5 h-5 text-blue-400" />
        <div>
          <div className="font-medium text-white text-sm">Manual</div>
          <div className="text-xs text-gray-400">
            Faster chat, tap camera icon to generate
          </div>
        </div>
      </div>
    </button>
  </div>
</div>
```

## Immediate Action

If you want to test the existing functionality now:
1. Go to `/roleplay` (dashboard)
2. Click Settings (gear icon on desktop, "Settings" button on mobile bottom bar)
3. Scroll down to find "Image Generation" dropdown
4. Switch between "Auto" and "Manual"

## Files to Modify
- `src/components/roleplay/RoleplaySettingsModal.tsx`: Add Image Generation Mode UI element after Scene Style section
