

# Add "Copy Prompt" to Portrait Dropdown and Fix Icon

## Summary

Add a "Copy Prompt" option to the portrait dropdown menu that copies the generation prompt to clipboard AND populates the prompt bar for easy iteration. Also fix the misleading icon on "Use as Reference".

## Changes

### 1. Add "Copy Prompt" menu item to PortraitGallery.tsx

Add a new dropdown item between "Use as Reference" and "Download" that:
- Reads `portrait.enhanced_prompt || portrait.prompt` (prefer enhanced since that is what produced the image)
- Copies the text to the clipboard via `navigator.clipboard.writeText()`
- Calls a new `onCopyPrompt` callback to populate the prompt bar
- Shows a toast: "Prompt copied and loaded"
- Is hidden when neither `prompt` nor `enhanced_prompt` exists (uploaded/legacy portraits)

New prop: `onCopyPrompt?: (prompt: string) => void`

Icon: `ClipboardCopy` from lucide-react (distinct from the reference action)

### 2. Fix "Use as Reference" icon

Change the icon from `Copy` to `ImageIcon` (or `Lock`) to align with the "Style Lock" terminology established in the sidebar. `Copy` is misleading -- it suggests clipboard copying, not image referencing.

### 3. Wire onCopyPrompt in StudioWorkspace.tsx and CharacterStudioV3.tsx

- `StudioWorkspace` accepts a new `onCopyPrompt` prop and passes it to `PortraitGallery`
- `CharacterStudioV3` provides the handler: `(prompt: string) => setPromptText(prompt)` -- this populates the prompt bar directly
- A toast confirms the action so users know both clipboard and prompt bar were updated

## Technical Details

### File: src/components/character-studio/PortraitGallery.tsx

- Add `onCopyPrompt?: (prompt: string) => void` to `PortraitGalleryProps`
- Import `ClipboardCopy` and `ImageIcon` (or `Lock`) from lucide-react, remove unused `Copy` import
- Change "Use as Reference" icon from `Copy` to `ImageIcon`
- Add new menu item after "Use as Reference":

```tsx
{(portrait.enhanced_prompt || portrait.prompt) && onCopyPrompt && (
  <>
    <DropdownMenuItem onClick={() => {
      const text = portrait.enhanced_prompt || portrait.prompt || '';
      navigator.clipboard.writeText(text);
      onCopyPrompt(text);
    }}>
      <ClipboardCopy className="w-4 h-4 mr-2" />
      Copy Prompt
    </DropdownMenuItem>
  </>
)}
```

### File: src/components/character-studio-v3/StudioWorkspace.tsx

- Add `onCopyPrompt?: (prompt: string) => void` to `StudioWorkspaceProps`
- Pass it through to both `PortraitGallery` instances (mobile and desktop)

### File: src/pages/CharacterStudioV3.tsx

- Add handler and pass via workspace props:

```typescript
onCopyPrompt: (prompt: string) => {
  setPromptText(prompt);
  toast({ title: 'Prompt copied', description: 'Loaded into prompt bar and copied to clipboard.' });
}
```

## No changes needed for

- "Use as Reference" behavior -- it already works correctly (sets ref image directly, no lightbox)
- Prompt bar component -- it already handles controlled `value` changes
- Database -- portraits already store `prompt` and `enhanced_prompt`

