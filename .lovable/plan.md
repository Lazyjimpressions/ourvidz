

# Align Playground Image Compare Tiles with App-Wide Standards

## Current State

The playground's `ImageCompareView` renders generated images using raw `<img>` tags with `w-full h-auto` sizing, a basic hover overlay with a zoom icon, and a minimal `Dialog` lightbox that only shows the image -- no generation details, no scoring, no consistent tile treatment.

This is inconsistent with every other page (Library, Workspace, Studio) which all use:
- **AssetTile** -- 3:4 aspect ratio, consistent border/shadow/hover styling, iOS Safari safe layout
- **UnifiedLightbox** -- full-featured preview with navigation, pinch-to-zoom, PromptDetailsSlider for generation details
- **QuickRating** -- 5-star overlay for scoring images

## Proposed Changes

### 1. Replace raw img/video rendering with AssetTile

In the `renderPanel` function (lines 512-557), replace the current inline `<div>` + `<img>` rendering for each generation with the shared `AssetTile` component.

Each generation tile will:
- Use `AssetTile` with `aspectRatio="3/4"` for visual consistency
- Pass the generation's `mediaUrl` as `src`
- Pass `videoSrc` and `isVideo` props for video generations
- Include a `QuickRating` overlay as a child (bottom-left positioned), using the generation's `id` as `jobId`
- Include a small model-name + time badge overlay as a child
- On click, open the UnifiedLightbox at the correct index instead of the basic Dialog

### 2. Replace basic Dialog lightbox with UnifiedLightbox

Remove the current `Dialog`-based lightbox (lines 608-619) and replace it with `UnifiedLightbox`:

- Map each panel's `generations` array to `LightboxItem[]`, populating `id`, `url`, `type`, `prompt`, `modelType`, and `metadata` (seed, time, template)
- This automatically provides: keyboard navigation between generated images, pinch-to-zoom, swipe gestures, and the PromptDetailsSlider (generation details panel)
- Track `lightboxPanelKey` ('a' | 'b') alongside `lightboxIndex` so the lightbox knows which panel's generations to navigate

### 3. Add QuickRating to generation tiles

- Import `QuickRating` component
- Render it as a child of each `AssetTile`, positioned at bottom-left
- The `jobId` will be the generation's `id` (which comes from `data.jobId` returned by the edge function)
- The `userId` will come from the current auth session (add a `useSession` or `supabase.auth.getUser()` call)
- This allows users to rate playground generations the same way they rate images everywhere else

### 4. Generation metadata display

Below each `AssetTile`, keep the existing compact metadata line (model name, generation time, seed) but style it consistently with other grid captions in the app.

## Technical Details

### File: `src/components/playground/ImageCompareView.tsx`

**New imports:**
```typescript
import { AssetTile } from '@/components/shared/AssetTile';
import { UnifiedLightbox, LightboxItem } from '@/components/shared/UnifiedLightbox';
import { QuickRating } from '@/components/QuickRating';
```

**State changes:**
- Remove: `lightboxUrl`, `lightboxIsVideo`
- Add: `lightboxIndex: number | null`, `lightboxPanel: 'a' | 'b' | null`
- Add: `userId` from auth session (via `useEffect` on mount)

**Generation tile rendering** (replacing lines 512-557):
```text
{panel.generations.map((gen, idx) => (
  <div key={gen.id} className="space-y-1">
    <p className="text-[11px] text-muted-foreground truncate">{gen.prompt}</p>
    <AssetTile
      src={gen.mediaUrl}
      alt={gen.prompt}
      aspectRatio="3/4"
      isVideo={gen.isVideo}
      videoSrc={gen.isVideo ? gen.mediaUrl : undefined}
      onClick={() => {
        setLightboxIndex(idx);
        setLightboxPanel(panelKey);
      }}
    >
      {/* Quick Rating overlay */}
      {userId && (
        <div className="absolute bottom-2 left-2 z-10
                        opacity-0 group-hover:opacity-100 transition-opacity">
          <QuickRating jobId={gen.id} userId={userId} />
        </div>
      )}
    </AssetTile>
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <span>{gen.modelName}</span>
      <span>-</span>
      <span>{(gen.time / 1000).toFixed(1)}s</span>
      {gen.seed && <><span>-</span><span>Seed: {gen.seed}</span></>}
    </div>
  </div>
))}
```

**Lightbox replacement** (replacing lines 608-619):
```text
{lightboxIndex !== null && lightboxPanel && (
  <UnifiedLightbox
    items={(lightboxPanel === 'a' ? panelA : panelB).generations.map(g => ({
      id: g.id,
      url: g.mediaUrl,
      type: g.isVideo ? 'video' : 'image',
      title: g.modelName,
      prompt: g.prompt,
      modelType: g.modelName,
      metadata: { seed: g.seed, generationTime: g.time },
    }))}
    startIndex={lightboxIndex}
    onClose={() => { setLightboxIndex(null); setLightboxPanel(null); }}
    onIndexChange={setLightboxIndex}
  />
)}
```

**Auth session** (for QuickRating userId):
```text
const [userId, setUserId] = useState<string | null>(null);
useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    if (data.user) setUserId(data.user.id);
  });
}, []);
```

## Summary of Consistency Gains

| Feature | Before | After |
|---------|--------|-------|
| Tile component | Raw img/div | AssetTile (3:4 aspect, consistent styling) |
| Lightbox | Basic Dialog (image only) | UnifiedLightbox (nav, zoom, swipe, details) |
| Generation details | None in lightbox | PromptDetailsSlider via UnifiedLightbox |
| Scoring | Not available | QuickRating 5-star overlay |
| Video support | Inline video tag | AssetTile hover-to-play + UnifiedLightbox video player |
| iOS Safari | Potential layout bugs | Fixed via AssetTile's absolute inset-0 pattern |

