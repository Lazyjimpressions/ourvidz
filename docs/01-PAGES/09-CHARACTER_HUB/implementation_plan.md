Character Hub & Character Studio Implementation Plan
This plan implements the approved Character Hub and Character Studio designs based on 
character_research.md
, 
character_prd.md
, and the locked visual references (
character_hub.png
, 
character_studio.png
).

User Review Required
IMPORTANT

Fresh Start Strategy: This implementation creates NEW independent pages based on the approved designs from 
09-CHARACTER_HUB
. Existing pages (
CharacterStudio.tsx
, 
CreateCharacter.tsx
) remain untouched and will be deprecated only when the new implementation is fully validated.

NOTE

Parallel Routes: New routes (/character-hub-v2, /character-studio-v2) will run alongside existing routes. This allows side-by-side comparison and zero-risk development.

CAUTION

Database Schema Changes: New tables for portraits/anchors and canon outputs will require database migrations. These additions extend the schema without breaking existing functionality.

Proposed Changes
Database Layer
[NEW] 
20260207_character_hub_schema.sql
Purpose: Extend database schema to support new character features (backward compatible)

Add character_anchors table for reference images (renamed from portraits)
Fields: 
id
, character_id, image_url, is_primary, created_at, updated_at
Foreign key to characters table with CASCADE delete
RLS policies for user isolation
Add character_canon table for pinned outputs
Fields: 
id
, character_id, output_url, output_type, is_pinned, created_at
Stores curated reference outputs (separate from character_scenes history)
Extend characters table with new JSONB columns:
style_preset (text): Default style (realistic, anime, cinematic)
locked_traits (text[]): Must-keep traits for consistency
media_defaults (jsonb): Video framing, motion intensity, loop-safe
personality_traits (jsonb): Personality sliders data
physical_traits (jsonb): Structured appearance data
outfit_defaults (text): Signature outfit description
Add indexes for performance:
idx_character_anchors_character_id on character_anchors
idx_character_anchors_primary on primary anchors
idx_character_canon_character_id on character_canon
idx_character_canon_pinned on character_canon(is_pinned)
Type Definitions
[MODIFY] 
types/character.ts
Purpose: Update TypeScript types to match new schema

Extend 
Character
 interface with new fields
Add 
CharacterPortrait
, 
CharacterCanon
, 
MediaDefaults
, 
PersonalityTraits
, 
PhysicalTraits
 interfaces
Update existing hooks to use new types
Character Components (Unified)
IMPORTANT

Unified Component Strategy: Refactor existing 
MobileCharacterCard
 into base 
CharacterCard
 component with context-aware behavior. This eliminates duplication while allowing page-specific customization.

[REFACTOR] 
CharacterCard.tsx
Extracted from: 
MobileCharacterCard.tsx

Strategy: Base component with context prop (
roleplay
 | hub | 
library
)
Features:

Shared: Image, name, description, stats display
Context-aware quick action overlay (replaces individual hover actions)
Composition pattern for extensibility
[NEW] 
CharacterCardOverlay.tsx
Purpose: Quick action overlay for character cards
Interaction:

Desktop: Hover → fade in overlay
Mobile: Tap → slide up overlay from bottom
Actions vary by context (roleplay: preview/chat, hub: edit/generate/duplicate)
[NEW] 
CharacterFilters.tsx
Purpose: Filter bar for Character Hub
Features: Search input, genre chips, media type filters, style preset filters

Character Hub Page
[NEW] 
CharacterHubV2.tsx
Purpose: Main character library and management page
Features:

Grid layout using 
CharacterCard
 with context='hub'
CharacterFilters
 bar (sticky header)
Empty state with creation CTA
"Create Character" button → Direct navigation to /character-studio-v2?mode=from-images
Filters out user personas (role='user'), shows only AI characters
Character Studio Components
[NEW] 
CharacterStudioV2.tsx
Fresh implementation of three-column layout with tab system, preview area, and prompt panel. Built independently from existing CharacterStudio.

[NEW] 
StudioLayout.tsx
Layout wrapper for three-column responsive design.

[NEW] Tab Components
IdentityTab.tsx
 - Name, bio, personality
AppearanceTab.tsx
 - Physical traits, anchors
StyleTab.tsx
 - Style presets, rendering
MediaTab.tsx
 - Video/voice defaults
[NEW] Supporting Components
PersonalitySliders.tsx
 - Trait sliders
AnchorManager.tsx
 - Upload/manage anchors
StylePresetSelector.tsx
 - Visual style picker
CharacterHistoryStrip.tsx
 - Output history carousel
[NEW] Modified Components for V2
PortraitGalleryV2.tsx
 - New implementation with view modes
CharacterStudioPromptBarV2.tsx
 - New implementation with consistency controls
Hooks & Services
[NEW] 
useCharacterStudioV2.ts
New hook with tab state, portraits, canon outputs, and save functionality. Independent from existing useCharacterStudio.

[MODIFY] 
useUserCharacters.ts
Extend (non-breaking) to support new fields and filtering. Backward compatible.

[NEW] 
CharacterServiceV2.ts
New service layer for v2 character features. Independent from existing services.

Routing & Styling
[MODIFY] 
App.tsx
Add new parallel routes:

/character-hub-v2 → 
CharacterHubV2
/character-studio-v2 → 
CharacterStudioV2
/character-studio-v2/:id → 
CharacterStudioV2
 (edit mode)
Existing routes remain unchanged for comparison.

NOTE

Creation Flow: "Create Character" button in Hub navigates directly to Studio with mode parameter, no modal blocker. Studio handles both "from images" and "from description" flows via query param.

[MODIFY] 
index.css
Add overlay animations, card transitions matching roleplay dark theme.

Verification Plan
Automated Tests
NOTE

The current codebase does not have comprehensive React component tests. Verification will rely on manual browser testing.

Manual Verification
1. Database Migration
IMPORTANT

Deployment Method: Use Supabase online dashboard or MCP apply_migration tool. This project does not use local Supabase CLI.

Option A: MCP Tool (Recommended)

bash
# Use Supabase MCP server to apply migration
mcp_supabase-mcp-server_apply_migration(
  project_id: "ulmdmzhcdwfadbvfpckt",
  name: "character_hub_schema",
  query: <contents of 20260207_character_hub_schema.sql>
)
Option B: Supabase Dashboard

Navigate to Supabase Dashboard → SQL Editor
Copy contents of 
supabase/migrations/20260207_character_hub_schema.sql
Execute in SQL Editor
Verify tables created: character_anchors, character_canon
Verify new columns on characters table
2. Character Hub Testing
Navigate to /character-hub
Test empty state with CTA
Test creation modal ("Start from Images" vs "Description")
Create characters and verify grid display
Test search and genre filters
Test card actions (Open, Generate, Delete)
3. Character Studio Testing
Verify three-column layout (desktop/mobile)
Test all four tabs (Identity, Appearance, Style, Media)
Test anchor upload and primary selection
Test style preset selection
Test preview mode switching (Single/Grid/Compare)
Test history strip and actions
Test prompt panel with consistency controls
Test generation with anchors
Test state persistence and unsaved changes warning
4. Integration Testing
Full flow: Hub → Create → Edit → Save → Return to Hub
Generation with consistency mode
Cross-page navigation
5. Browser Compatibility
Test on Chrome, Firefox, Safari (desktop + mobile)

6. Visual QA
Glassmorphism effects
Color consistency
Typography and spacing
Animations and transitions
Dark mode compatibility
Success Criteria
✅ Character Hub displays grid, search, filters, and creation flow works
✅ Character Studio has three-column layout with all tabs functional
✅ Anchor manager uploads and selects primary anchors
✅ Generation uses consistency controls with anchors
✅ All data persists correctly to database
✅ UX is intuitive with smooth performance

Notes
Existing routes (
/character-studio
, /create-character) remain functional during development
New v2 pages are completely independent implementations
Database schema extensions are backward compatible
After validation, can deprecate old routes by updating navigation/links
Implementation prioritizes visual excellence per research findings
Phase 6: Generation & Completion Strategy
1. Prompt & Generation UI
[NEW] CharacterStudioPromptBarV2:

Implement in right column (Column C).
Scene prompt textarea.
Consistency toggle (using primary anchor).
Generation controls (Aspect ratio override, Model selection).
[MODIFY] CharacterStudioV2.tsx:

Update layout to house PromptBar in right column.
Move History to bottom of right column or a separate drawer.
2. Logic Integration
[MODIFY] useCharacterStudioV2:
Add generatePreview(prompt, settings) function.
Connect to existing 
CharacterImageService
 or generateImage API.
Handle loading states (isGenerating).
optimistic UI updates for history.
3. Output Management
[NEW] CharacterHistoryStrip:
Display recently generated images.
Actions: "Pin as Anchor" (promotes to anchor list), "Download", "Delete".
Persist to character_scenes or character_canon tables.
4. Verification
Test generation with and without consistency mode.
Verify "Pin as Anchor" flow.