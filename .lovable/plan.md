
# Duo Auto-Tagging + Character/Position Filtering — DONE

All 4 changes implemented:

1. **`useLibraryFirstWorkspace.ts`** — Passes `num_characters: 2` in metadata when Quick Scene has both char slots filled
2. **`fal-webhook/index.ts`** — Stores `num_characters` in `workspace_assets.generation_settings`
3. **`workspace-actions/index.ts`** — Auto-tags `['role:position', 'duo']` on save/clear when `num_characters >= 2`
4. **`PositionsGrid.tsx`** — Shows "Duo Poses" section querying `user_library` for `role:position` + `duo` tagged assets
