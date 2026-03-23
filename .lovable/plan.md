
Goal: stop the tag editor from auto-closing on mobile by replacing the fragile “hover overlay + nested popover” pattern with a device-appropriate interaction model, while preserving fast desktop behavior.

What’s actually happening
- The current tag trigger lives inside a hover-driven action overlay on each tile.
- On touch devices, hover state is unstable and event order differs (tap/pointer/click + viewport shifts), so the trigger/open state and tile click behavior race each other.
- The tag editor is also tied to per-tile local state, making it easy to unmount/close during list re-renders.
- Desktop works mostly because hover + pointer model is stable; mobile does not.

Holistic design decision
- Desktop: keep inline, contextual editing (popover anchored to tile action).
- Mobile: use a dedicated bottom-sheet tag editor (Drawer/ResponsiveModal), not a popover inside a hover overlay.
- Centralize tag-editor open state at PositionsGrid level (single source of truth), not inside each tile.

Implementation plan

1) Refactor tag editor state ownership (PositionsGrid)
- Add grid-level state:
  - `activeTagEditorCanonId: string | null`
  - `activeTagDraft: string[]`
- Pass handlers into `CanonThumbnail`:
  - `onOpenTagEditor(canonId)`
  - remove per-thumbnail `editingTags/localTags` ownership
- Keep saves explicit:
  - live-save on change (current behavior) or “Apply” button in mobile sheet (recommended for stability + fewer writes).

2) Split mobile vs desktop interaction model
- Detect touch/mobile (`useMobileDetection` or `useIsMobile`).
- In `CanonThumbnail`:
  - Desktop: retain hover actions and popover trigger.
  - Mobile/touch: show persistent action affordance (visible tag button or kebab), no hover dependency.
- Increase mobile action hit targets to >=44px.

3) Move mobile tag editor to ResponsiveModal/Drawer
- Render one shared editor outside tile grid in `PositionsGrid`:
  - `ResponsiveModal open={!!activeTagEditorCanonId}`
  - `ResponsiveModalContent` with safe-area spacing (`pb-safe`, top inset handling).
- Inside modal, render `UnifiedTagPicker` bound to selected canon draft tags.
- Close only via modal close/Apply/Cancel; no dependency on tile hover state.

4) Harden event boundaries to prevent unintended tile/lightbox clicks
- For action buttons (tag/delete/star/send/assign):
  - stop propagation on both trigger and interaction start path used by touch.
- Guard tile open handler:
  - ignore open-lightbox when action UI is active for that tile.
- Ensure modal open does not mutate hover/action visibility state unexpectedly.

5) Keep desktop UX intact and predictable
- Desktop continues to use popover for quick inline edits.
- Optionally still centralize data updates via parent callbacks, but do not change desktop visual flow.
- Ensure assign-position popover and tag editor do not conflict (mutual exclusivity per tile).

6) Accessibility + UX polish
- Add clear mobile editor header: image label/type + active tag count.
- Provide explicit close/Apply actions.
- Maintain scrollable content and keyboard-safe behavior in drawer.
- Preserve custom-tag-per-group placement in `UnifiedTagPicker` while open.

Files to update
- `src/components/character-studio-v3/PositionsGrid.tsx`
  - lift tag editor state
  - mobile drawer integration
  - touch-safe action rendering + event guards
- `src/components/shared/UnifiedTagPicker.tsx`
  - no structural rewrite, but ensure it works well in modal context (height/scroll/focus)
- `src/hooks/useMobileDetection.ts` or `src/hooks/use-mobile.tsx`
  - reuse existing detection consistently (no duplicate ad-hoc checks)
- (Optional) `src/components/ui/responsive-modal.tsx`
  - only if small safe-area/focus tweaks are needed for this use-case

Validation plan (must pass before closing issue)
- Mobile (<=767px):
  - tap Edit Tags → drawer opens and stays open
  - select/unselect preset tags, add/remove custom tags, close/reopen: state persists correctly
  - tapping around inside editor does not dismiss unexpectedly
- Desktop (>=1024px):
  - hover actions still work
  - popover opens/closes normally and doesn’t trigger lightbox
- Cross-check:
  - no console errors
  - no regression in delete/set-primary/send-to-workspace/assign-position actions
  - test end-to-end on the same route the issue was reported (`/character-studio/:id`, Positions tab)

Why this is the right fix
- It removes the root architectural mismatch (hover popover inside tile overlays) instead of patching symptoms.
- It aligns with mobile UX standards (sheet/drawer + larger targets).
- It keeps desktop speed while giving mobile a stable, deliberate interaction model.
