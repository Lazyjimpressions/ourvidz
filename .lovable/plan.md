

# Unify Scoring: Remove Admin/User Distinction

## Overview

Remove all separation between "admin" and "user" in the scoring UI and service layer. Everyone sees the same controls -- ratings, feedback tags, comment, preserve toggle -- with no admin-gated sections or separate admin columns.

## Changes

### 1. PromptDetailsSlider.tsx (UI)

- **Remove the `isAdmin` gate** on the entire "Admin Controls Section" (lines 851-944). Move feedback tags, comment, and preserve toggle into the main section visible to all users.
- **Remove the duplicate admin star rows** (lines 859-882) -- the unified "Your Rating" stars already handle this.
- **Remove the `isAdmin` gate** on the Score/Re-score button (line 838) -- all users can trigger scoring.
- **Remove admin-specific state variables**: `adminActionRating`, `adminAppearanceRating`, `adminQualityRating` (lines 616-618).
- **Rename labels**: Remove "Admin Scoring" header and Shield icon. The section header becomes just "Feedback" or similar. "Save Admin Scoring" becomes "Save Feedback". `adminComment` state renamed to `comment`. Placeholder text changes from "Admin notes..." to "Notes...".
- **Remove `isAdmin` import dependency** for this section (keep if used elsewhere in the component).
- **Remove the no-score conditional** that references `isAdmin` (line 950) -- simplify message since everyone can score.

### 2. PromptScoringService.ts (Service)

- **Rename `updateAdminScoring`** to `updateScoringMetadata` (or similar).
- **Remove the 3 admin rating fields** from its parameter type and payload logic (`admin_action_rating`, `admin_appearance_rating`, `admin_quality_rating`).
- **Keep**: `feedback_tags`, `admin_comment`, `preserve_image`, `preserve_reason` in the payload (these column names stay as-is in the DB to avoid a migration, but the method accepts them without admin naming).
- **Update the payload**: Change `admin_rated_by` to just use the `userId` param, keep `admin_rated_at` timestamp.

### 3. handleSaveAdmin callback (in PromptDetailsSlider.tsx)

- Rename to `handleSaveFeedback`.
- Remove the 3 admin rating fields from the call.
- Call the renamed `updateScoringMetadata` instead of `updateAdminScoring`.
- Remove `adminActionRating`, `adminAppearanceRating`, `adminQualityRating` from its dependency array.

## Result

After this change, the Prompt Score section shows:
1. Three star rating rows (Action Match, Appearance, Quality) -- for everyone
2. Vision Analysis scores (if available) -- for everyone
3. Score/Re-score button -- for everyone
4. Feedback tags, comment box, preserve toggle, and Save Feedback button -- for everyone, shown when a score record exists

No admin/user distinction anywhere in the scoring flow.

## Technical Details

### State variables to remove
- `adminActionRating`, `setAdminActionRating`
- `adminAppearanceRating`, `setAdminAppearanceRating`
- `adminQualityRating`, `setAdminQualityRating`

### State variables to rename
- `adminComment` -> `comment`
- `isSavingAdmin` -> `isSavingFeedback`

### Lines affected in PromptDetailsSlider.tsx
- Lines 616-618: Delete admin rating states
- Lines 634-636: Delete admin rating initialization in fetchScore
- Lines 714-733: Rewrite handleSaveAdmin -> handleSaveFeedback without admin ratings
- Lines 837-849: Remove `isAdmin &&` gate on Score button
- Lines 851-944: Remove `isAdmin &&` gate; delete admin star rows (859-882); keep tags/comment/preserve; remove Shield icon and "Admin Scoring" label
- Line 950: Simplify no-score message

### PromptScoringService.ts
- Lines 113-162: Rename method, remove admin rating params and payload lines

