

# Add Clear Prompt Button

## What Changes

Add a small "X" button next to the existing Sparkles (enhance) and Settings buttons in the top-right corner of the prompt textarea. It only appears when there's text in the prompt, keeping the UI clean.

## Approach

**File:** `src/components/workspace/SimplePromptInput.tsx`

Inside the existing button group at line 999 (`<div className="absolute right-0.5 top-0.5 flex items-center gap-0.5">`), add a new tooltip-wrapped button **before** the Sparkles button:

- Icon: `X` from lucide-react (size 12, matching the other icons)
- Visibility: Only rendered when `prompt.trim()` is non-empty
- Action: `onPromptChange('')`
- Style: Same classes as the adjacent buttons (`text-muted-foreground hover:text-primary p-0.5 rounded transition-colors`)
- Tooltip: "Clear prompt"

This follows the exact same pattern as the existing enhance and settings buttons, requires no new state or props, and stays visually consistent.

## Technical Details

| Detail | Value |
|--------|-------|
| File | `src/components/workspace/SimplePromptInput.tsx` (around line 999) |
| Icon import | `X` from `lucide-react` (already imported in the file) |
| Lines changed | ~12 lines inserted |
| Mobile version | `MobileSimplePromptInput.tsx` -- same pattern if it has a similar button group |

