# Legacy Library Components

This folder contains library components that are no longer in active use but are preserved for historical reference.

## Archived Components

- `AssetSkeleton.tsx` - Old skeleton loader for assets
- `BulkActionBar.tsx` - Original bulk action bar (replaced by CompactBulkActionBar)
- `LibraryFilters.tsx` - Original filter component (replaced by CompactLibraryFilters)
- `LibraryHeader.tsx` - Original header component (replaced by CompactLibraryHeader)
- `LibraryLightboxStatic.tsx` - Static lightbox implementation (unused)
- `SortableGridHeader.tsx` - Sortable grid header (unused)
- `StorageUsageIndicator.tsx` - Storage usage display component (unused)

## Current Active Components

The following components are currently in use by `OptimizedLibrary.tsx`:
- `CompactLibraryHeader.tsx`
- `CompactLibraryFilters.tsx`
- `CompactAssetCard.tsx`
- `CompactBulkActionBar.tsx`
- `AssetListView.tsx`
- `LibraryLightbox.tsx`
- `MobileFullScreenViewer.tsx`

## Migration Notes

These components were archived during the library consolidation effort that unified the library system around the `user_library` table and `LibraryAssetService`.