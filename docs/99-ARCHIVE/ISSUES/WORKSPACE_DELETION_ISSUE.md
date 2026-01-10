# Workspace Image Deletion Issue - Analysis

## Problem
Workspace images cannot be deleted.

## Current Architecture

### Frontend Flow
1. **Service**: `WorkspaceAssetService.discardAsset(assetId)` 
   - Location: `src/lib/services/WorkspaceAssetService.ts:162`
   - Calls: `supabase.functions.invoke('workspace-actions', { action: 'discard_asset', assetId })`

2. **UI Components**:
   - `SharedGrid` - Shows delete button (Trash2 icon) when `actions.onDiscard` is provided
   - `SimplifiedWorkspace` - Maps `handleDeleteItem` to `onDiscard` action
   - `MobileSimplifiedWorkspace` - Maps `handleDiscard` to `deleteItem` from hook

### Backend Flow
1. **Edge Function**: `workspace-actions`
   - Location: `supabase/functions/workspace-actions/index.ts`
   - Action: `discard_asset` (line 751)
   - Expected behavior: Delete from `workspace_assets` table and remove files from storage

## Root Cause Analysis

### Issue 1: Table Mismatch
- **`delete-workspace-item` edge function** (line 35) queries `workspace_items` table
- **Actual table**: `workspace_assets` (confirmed via database query)
- **Status**: This function appears to be unused/legacy

### Issue 2: RLS Policy
- **Policy**: `workspace_policy` on `workspace_assets` table
- **Rule**: `auth.uid() = user_id` for ALL operations
- **Status**: ✅ Policy exists and should allow deletion

### Issue 3: Edge Function Implementation
- **Action**: `discard_asset` (line 751-823)
- **Expected**: Delete from `workspace_assets` and remove storage files
- **Need to verify**: Actual implementation and error handling

## Next Steps

1. **Verify `discard_asset` implementation** in `workspace-actions` edge function
2. **Check error logs** for deletion failures
3. **Test deletion flow** end-to-end
4. **Check storage permissions** for `workspace-temp` bucket



