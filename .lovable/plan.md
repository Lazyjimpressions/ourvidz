

# Fix Toast UX: Eliminate Blocking, Non-Dismissing Notifications

## Problem

The project runs **two separate toast systems** simultaneously, and the primary one is configured to never auto-dismiss:

- **Radix `useToast`** (used by 60+ files): Has `TOAST_REMOVE_DELAY = 1,000,000ms` (~16 minutes). Toasts effectively never go away on their own, blocking UI on both mobile and desktop.
- **Sonner** (used by ~8 files): Works fine with sensible auto-dismiss defaults (~4 seconds).

Both `<Toaster />` and `<Sonner />` are mounted in `App.tsx`, meaning users can see overlapping toasts from two different systems.

## Solution

Consolidate onto **Sonner only** and remove the Radix toast system entirely. Sonner is already installed, already mounted, and provides better UX out of the box (auto-dismiss, stacking, swipe-to-dismiss on mobile).

### Step 1: Update `src/hooks/use-toast.ts`

Replace the entire 191-line Radix-based implementation with a thin wrapper around Sonner's `toast()`:

```
import { toast as sonnerToast } from "sonner";

function toast({ title, description, variant, ...props }) {
  if (variant === "destructive") {
    sonnerToast.error(title, { description });
  } else {
    sonnerToast(title, { description });
  }
}

function useToast() {
  return { toast, toasts: [], dismiss: () => {} };
}
```

This way, all 60+ files that import `useToast` or `toast` from this hook will automatically start using Sonner without any import changes.

### Step 2: Remove the Radix Toaster from `App.tsx`

- Remove `import { Toaster } from "@/components/ui/toaster"` (line 5)
- Remove `<Toaster />` from the JSX
- Keep only `<Sonner />` (already imported as line 7)

### Step 3: Configure Sonner for better UX

Update `src/components/ui/sonner.tsx` to set:
- `duration={3000}` — 3-second auto-dismiss (short, non-blocking)
- `position="bottom-center"` — less intrusive on mobile
- `closeButton` — always show close button for manual dismiss
- `visibleToasts={2}` — limit stack to avoid UI clutter

### Step 4: Reduce toast noise in generation flow

In `src/hooks/useGeneration.ts`, remove or downgrade low-value toasts:
- Remove "SDXL Generation Started" toast (user already sees the generating state in the UI)
- Remove "Generation Resumed" toast (unnecessary noise on page reload)
- Keep "Generation Complete", "Generation Failed", and "Generation Timeout" (these are actionable)

### Files Changed

1. **`src/hooks/use-toast.ts`** — Replace Radix implementation with Sonner wrapper
2. **`src/App.tsx`** — Remove Radix `<Toaster />`
3. **`src/components/ui/sonner.tsx`** — Add duration, position, close button config
4. **`src/hooks/useGeneration.ts`** — Remove low-value "started" and "resumed" toasts
5. **`src/components/ui/toaster.tsx`** — Can be deleted (no longer used)
6. **`src/components/ui/use-toast.ts`** — Keep as-is (it re-exports from the hook)

