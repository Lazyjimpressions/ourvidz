# UI Consolidation Plan — Complete

## Foundation Components (Phase 1) ✅
- `src/hooks/useSignedUrl.ts` — shared URL signing hook wrapping UrlSigningService
- `src/components/shared/AssetTile.tsx` — pure tile renderer (fixes iOS Safari zoom bug)
- `src/components/shared/UnifiedLightbox.tsx` — Radix Dialog lightbox with slot-based actions
- `src/components/shared/LightboxActions.tsx` — extracted WorkspaceAssetActions & LibraryAssetActions

## Consumer Migrations (Phase 2) ✅
- PortraitGallery → AssetTile + UnifiedLightbox (with bottomSlot for prompt editor)
- SharedGrid → AssetTile (aspect ratio changed 1:1 → 3:4)
- CharacterCard → AssetTile + useSignedUrl internally
- SimplifiedWorkspace → UnifiedLightbox
- MobileSimplifiedWorkspace → UnifiedLightbox
- UpdatedOptimizedLibrary → UnifiedLightbox

## Legacy Cleanup (Phase 3) ✅
Deleted:
- `src/components/shared/PortraitTile.tsx`
- `src/components/character-studio/PortraitLightbox.tsx`
- `src/components/shared/SharedLightbox.tsx`
- `src/components/playground/ImageLightbox.tsx`
- `src/components/workspace/SimpleLightbox.tsx`
- `src/components/library/LibraryLightbox.tsx`
- `src/components/library/legacy/LibraryLightboxStatic.tsx`
- `src/components/ui/Lightbox.tsx`
- `src/components/roleplay/MinimalCharacterCard.tsx`
- `src/pages/ARCHIVED/RoleplayDashboard.tsx`

## Design Decisions
- All grids use 3:4 aspect ratio for visual consistency
- AssetTile is a pure renderer — zero business logic, no nested h-full div
- useSignedUrl wraps existing UrlSigningService (no new caching)
- UnifiedLightbox uses Radix Dialog for accessibility (scroll lock, focus trap)
- Context-specific actions passed via slots (actionsSlot, bottomSlot, headerSlot)
