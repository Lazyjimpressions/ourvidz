# Create Character Purpose & Implementation

**Last Updated:** January 26, 2026
**Status:** Complete
**Priority:** High

## **🎯 Purpose Statement**
Create Character is a form-based interface for quickly setting up new AI roleplay characters or editing existing ones before detailed iteration in Character Studio.

## **👤 User Intent**
- **Primary**: Rapidly create a new character with essential details (name, description, appearance) and generate an initial portrait
- **Secondary**:
  - Edit existing character basic information
  - Upload reference images for consistent portrait generation
  - Select visual presets (elegant, casual, athletic) for quick styling
  - Define character personality traits and greetings
  - Generate initial portrait before moving to studio
- **Context**: Users access this page when creating a new character or when they want a simpler form-based editing experience instead of the studio workspace

## **💼 Business Value**
- **Onboarding Efficiency**: Streamlined form reduces barrier to entry for new users
- **Conversion**: Fast path from idea to portrait generation increases completion rates
- **User Experience**: Provides choice between quick form (CreateCharacter) vs. advanced workspace (CharacterStudio)
- **Revenue**: Each character creation typically generates 1-3 initial portraits
- **Success Metrics**:
  - Character creation completion rate: 75%+ save after starting form
  - Portrait generation rate: 60%+ of new characters generate initial portrait
  - Studio navigation rate: 80%+ navigate to studio after creation
  - Time to first portrait: < 3 minutes from page entry

## **🏗️ Core Functionality**

### **Primary Features**
1. **Basic Character Information** - Status: Complete
   - Name input (required, max 50 chars)
   - Gender selection (female, male, unspecified)
   - Description textarea (required, 50-500 chars)
   - Content rating (SFW/NSFW toggle)

2. **Appearance Configuration** - Status: Complete
   - Appearance tags input (add/remove keywords)
   - Visual preset chips (8 presets: elegant, casual, athletic, glamorous, mysterious, innocent, bold, natural)
   - Detailed appearance description textarea
   - Reference image upload (HEIC support)
   - Image picker from library

3. **Portrait Generation** - Status: Complete
   - Integrated PortraitPanel on left side
   - Live preview of generated portrait
   - Model selection dropdown
   - Generate button with loading state
   - Uses character-portrait edge function

### **Secondary Features**
1. **Greetings Editor** - Status: Complete
   - First message textarea (required for roleplay)
   - Alternate greetings array (add/remove)
   - CharacterGreetingsEditor component

2. **Advanced Settings** - Status: Complete (collapsible)
   - Persona textarea (character's internal identity)
   - Personality traits input (comma-separated)
   - System prompt override textarea
   - Public visibility toggle

3. **Preset Selection** - Status: Complete
   - PresetChipCarousel component
   - Visual feedback for selected preset
   - Auto-applies appearance tags based on preset
   - Quick-start templates

## **🎨 UX/UI Design**

### **Layout Structure**
**Desktop (Grid Layout)**:
- **Sticky Header** (top):
  - Page title "Create Character" or "Edit Character"
  - Save button (primary, right-aligned)
  - Unsaved changes indicator

- **Main Grid** (2-column):
  - **Left Column** (40%, max 400px): PortraitPanel
    - Character portrait preview (aspect-square)
    - Preset chip carousel (8 visual presets)
    - Model selector dropdown
    - Generate portrait button
    - Loading spinner during generation

  - **Right Column** (60%, flex-1): Form Sections
    - **Basic Info** (always expanded)
      - Name, gender, description, content rating
    - **Appearance Tags** (collapsible)
      - Tag input with +/Enter to add
      - Current tags as removable chips
    - **Greetings** (collapsible)
      - First message textarea
      - Alternate greetings list with add/remove
    - **Advanced Settings** (collapsible)
      - Persona, traits, system prompt
      - Public toggle

**Mobile (Stacked Layout)**:
- Portrait panel full-width (top)
- Form sections stacked below
- Bottom sticky save bar
- Reduced padding for mobile constraints

### **User Flow**
1. **Entry Point**:
   - New character: Navigate to `/create-character`
   - Edit existing: Navigate to `/create-character/:id`
   - Or click "Create New Character" from CharacterStudio selector

2. **Form Fill** (linear flow):
   - Step 1: Enter name (required, auto-focus)
   - Step 2: Select gender (defaults to female)
   - Step 3: Write description (AI suggestion button available)
   - Step 4: Add appearance tags or select preset
   - Step 5: Optional - Upload reference image

3. **Portrait Generation** (optional, encouraged):
   - Click "Generate Portrait" in PortraitPanel
   - Select model if desired (defaults to highest priority)
   - Wait for generation (5-15s)
   - Preview appears in panel
   - Auto-saves character before generation if new

4. **Save & Navigate**:
   - Click "Save" button (header or bottom bar)
   - Character saved to database
   - Redirects to CharacterStudio page for advanced editing

5. **Alternative Exit**:
   - Navigate away with unsaved changes → confirmation dialog
   - Cancel → returns to form
   - Leave → discards changes

### **Key Interactions**
- **Preset Selection**: Click preset chip → auto-fills appearance tags → visual feedback (blue ring)
- **Appearance Tags**: Type keyword + Enter/+ button → adds chip, max 20 tags
- **Reference Image**: Upload → HEIC conversion → preview thumbnail → enables I2I models
- **AI Suggestions**: Click sparkles icon → calls character-suggestions edge function → populates field
- **Auto-Save on Generate**: Portrait generation auto-saves character silently if not yet saved
- **Unsaved Indicator**: Orange dot on header when form dirty
- **Loading States**:
  - Character loading (edit mode): Skeleton loader
  - Portrait generating: Spinner in panel, disabled generate button
  - Saving: Disabled save button, spinner icon
- **Error Handling**:
  - Validation errors: Inline red text below field
  - Generation errors: Toast notification
  - Save errors: Toast notification, retry button

## **🔧 Technical Architecture**

### **Core Components**
**Page Component**: [CreateCharacter.tsx](src/pages/CreateCharacter.tsx:1) (532 lines)
- Route: `/create-character` (new) or `/create-character/:id` (edit)
- Local state management (not using useCharacterStudio hook)
- Form validation before save
- HEIC image handling

**Sub-Components**:
- [PortraitPanel.tsx](src/components/roleplay/PortraitPanel.tsx:1) (186 lines)
  - Portrait preview (square aspect, object-cover)
  - PresetChipCarousel integration
  - Model selector dropdown
  - Generate button
  - Loading state

- [PresetChipCarousel.tsx](src/components/roleplay/PresetChipCarousel.tsx:1) (64 lines)
  - Horizontal scroll carousel
  - 8 preset chips: elegant, casual, athletic, glamorous, mysterious, innocent, bold, natural
  - Selection state (blue ring indicator)
  - Click to select/deselect

- [CharacterGreetingsEditor.tsx](src/components/roleplay/CharacterGreetingsEditor.tsx:1) (106 lines)
  - First message textarea
  - Alternate greetings array editor
  - Add/remove buttons
  - Validation: first message required

**State Management**:
- **Local State** (useState):
  - `character: CharacterFormData` - all form fields
  - `isDirty: boolean` - tracks unsaved changes
  - `isGenerating: boolean` - portrait generation in progress
  - `isSaving: boolean` - save operation in progress
  - `selectedPreset: string | null` - currently selected visual preset
  - `referenceImage: File | null` - uploaded reference file
  - `referenceImageUrl: string | null` - preview URL or library path

- **Form Validation**:
  - Name: required, 1-50 chars
  - Description: required, 50-500 chars
  - First message: required for save
  - Appearance tags: optional, max 20

**Data Flow**:
1. **New Character**:
   - Form fields default to empty
   - Gender defaults to "female"
   - Content rating defaults to "nsfw"
   - is_public defaults to false

2. **Edit Existing**:
   - Load character from DB on mount (characterId param)
   - Populate form fields
   - Load existing reference_image_url if present

3. **User Edits**:
   - onChange handlers update local state
   - Mark isDirty on any change
   - No auto-save (explicit save button only)

4. **Portrait Generation**:
   - Click "Generate" → validate required fields
   - If new character → auto-save to get characterId
   - Call character-portrait edge function with:
     - characterId (if exists)
     - or characterData (name, description, gender, appearance_tags)
     - referenceImageUrl (if uploaded)
     - contentRating
     - selectedPreset (mapped to preset tags)
   - Update character.image_url on success
   - Show toast with generation time

5. **Save**:
   - Validate all required fields
   - If new: INSERT into characters table
   - If edit: UPDATE characters table
   - Redirect to CharacterStudio page after save

### **Integration Points**

**Database Tables**:
- `characters` - Main table
  - Insert on new character save
  - Update on existing character edit
  - Fields populated from form state

- `character_portraits` - Portrait versioning
  - Automatically created by character-portrait edge function
  - First portrait sets is_primary: true

**Edge Functions**:
- [character-portrait](supabase/functions/character-portrait/index.ts:1)
  - Called when "Generate Portrait" clicked
  - Accepts characterId OR characterData (for unsaved characters)
  - Returns imageUrl, portraitId, jobId

**Storage Buckets**:
- `reference_images` - Uploaded reference images
- `user-library` - Generated portraits

**Hooks Used**:
- `useImageModels` - Fetch available image generation models
- `useAuth` - User context
- `useToast` - Notifications
- `useNavigate` - Routing after save

### **Performance Requirements**
- **Form Load**: < 500ms for new character, < 1s for edit (character fetch)
- **Portrait Generation**: 5-15s (model-dependent, shown in toast)
- **Save Operation**: < 1s for database insert/update
- **Image Upload**: < 2s for reference image upload + HEIC conversion

## **📊 Success Criteria**

### **User Experience Metrics**
- **Completion Rate**: 75%+ of started forms result in saved character
- **Portrait Generation**: 60%+ of new characters generate initial portrait in CreateCharacter page
- **Form Abandonment**: < 25% of users leave without saving
- **Time to Save**: < 3 minutes median time from page entry to first save
- **Studio Navigation**: 80%+ navigate to CharacterStudio after save

### **Technical Performance**
- **Page Load**: < 1s (p95)
- **Portrait Generation**: < 20s (p95)
- **Save Latency**: < 1s (p95)
- **HEIC Conversion**: < 2s (p95)
- **Error Rate**: < 2% for portrait generation, < 1% for saves

### **Business Metrics**
- **Character Creation Volume**: Track daily new characters vs. edits
- **Feature Adoption**: Preset selection vs. manual tags
- **AI Suggestion Usage**: % of characters using AI-enhanced descriptions
- **Reference Image Upload**: % of characters with I2I reference

## **🚨 Error Scenarios & Handling**

### **Common Failure Modes**
- **Validation Errors**:
  - Missing required fields (name, description, first message)
  - Name too long (>50 chars)
  - Description too short (<50 chars) or too long (>500 chars)
  - Handler: Inline error text below field, prevent save, scroll to error

- **Portrait Generation Failures**:
  - Model unavailable: Toast error, suggest alternative model
  - API timeout: Toast error, retry button
  - Content moderation block: Toast error, suggest SFW mode
  - Handler: Enable retry, maintain form state

- **Save Failures**:
  - Network error: Toast error, retry button
  - Validation error: Toast error, scroll to invalid field
  - Unique constraint: Character name conflict, suggest alternatives
  - Handler: Preserve form state, enable retry

- **Image Upload Failures**:
  - HEIC conversion error: Toast error, suggest JPG/PNG
  - File too large (>10MB): Toast error, suggest compression
  - Upload timeout: Toast error, retry button
  - Handler: Clear file input, allow re-upload

### **Error Handling Strategy**
- **Validation**: Client-side validation before save/generate
- **User Feedback**: Inline errors + toast notifications
- **Retry Mechanisms**: Enable retry for transient failures
- **State Preservation**: Never lose user input on error
- **Logging**: All edge function errors logged to Supabase
- **Graceful Degradation**: Portrait generation optional, can save without portrait

## **📋 Implementation Progress**

### **✅ Completed Features**
- [x] CreateCharacter page layout (desktop + mobile) - Jan 13, 2026
- [x] Basic info form section - Jan 13, 2026
- [x] Appearance tags editor - Jan 13, 2026
- [x] PortraitPanel integration - Jan 14, 2026
- [x] PresetChipCarousel - Jan 14, 2026
- [x] CharacterGreetingsEditor - Jan 14, 2026
- [x] Advanced settings section - Jan 13, 2026
- [x] Reference image upload with HEIC support - Jan 14, 2026
- [x] Portrait generation integration - Jan 13, 2026
- [x] Form validation - Jan 13, 2026
- [x] Save to database - Jan 13, 2026
- [x] Redirect to CharacterStudio after save - Jan 13, 2026
- [x] Mobile responsive layout - Jan 14, 2026
- [x] Unsaved changes dialog - Jan 13, 2026

### **🔄 In Progress**
- [ ] AI suggestion integration - Planned - Suggestion buttons exist but not fully wired
- [ ] Preset tag mapping - Partially complete - Presets apply visual styles but tags not fully mapped

### **🚧 Planned**
- [ ] Character templates (pre-filled forms) - Medium - User request
- [ ] Bulk appearance tag import - Low - Power user feature
- [ ] Voice sample upload - High - Phase 2 feature
- [ ] Character duplication/cloning - Medium - Quality of life

### **🐛 Known Issues**
- [ ] HEIC conversion can be slow on large files - Medium impact - Consider compression
- [ ] Preset selection doesn't auto-generate portrait - Low impact - Intentional, user must click generate
- [ ] No undo for tag removal - Low impact - User can re-add

## **🔗 Dependencies**

### **Technical Dependencies**
- **Required Hooks**:
  - useImageModels (model selection)
  - useAuth (user context)
  - useToast (notifications)
  - useNavigate (routing)

- **Edge Functions**:
  - character-portrait (required for portrait generation)
  - character-suggestions (optional, for AI enhancements)

- **Database Tables**:
  - characters (insert/update)
  - character_portraits (indirect, via edge function)
  - api_models (read-only, for model selection)

- **Storage**:
  - reference_images bucket (reference uploads)
  - user-library bucket (generated portraits)

### **Business Dependencies**
- **API Credits**: Requires active fal.ai or Replicate API keys for portrait generation
- **User Authentication**: Must be logged in to create characters
- **Model Availability**: At least one active image model in api_models table

## **📈 Future Enhancements**

### **Phase 2 Features**
- [ ] Character templates - Pre-built character archetypes (detective, fantasy elf, sci-fi pilot)
- [ ] AI-powered description writer - Full description generation from 2-3 keywords
- [ ] Voice sample integration - Upload voice sample for character (future TTS)
- [ ] Social features - Browse and clone public characters from community

### **Phase 3 Features**
- [ ] Collaborative editing - Multi-user character creation
- [ ] Character versioning - Track edit history, restore previous versions
- [ ] Advanced preset editor - Create custom presets with saved appearance tags
- [ ] Import from JSON - Import character cards from other platforms

## **📝 Notes**

**Design Decisions**:
- **Form-Based vs. Workspace**: CreateCharacter optimized for speed (form), CharacterStudio for iteration (workspace). Users can choose based on workflow preference.
- **Optional Portrait Generation**: Portrait generation not required for save, reducing friction. Users can generate later in studio.
- **Auto-Save on Generate**: If user generates portrait before saving, character auto-saves to prevent orphaned portraits. Silent mode avoids confusing toast notifications.
- **Preset System**: Visual presets provide quick-start templates while allowing full customization. Balances ease-of-use and flexibility.

**Technical Notes**:
- HEIC conversion uses browser APIs (modern iOS support)
- Reference image upload creates temporary preview URL (object URL)
- Form validation runs on blur + submit
- characterData parameter to character-portrait enables generation before DB save
- Redirect to CharacterStudio after save provides natural transition to advanced editing

**UX Considerations**:
- Sticky header save button always accessible
- Mobile bottom save bar for thumb-friendly interaction
- Collapsible sections reduce visual clutter
- Preset chips provide visual browsing vs. text-based tags
- Reference image upload supports drag-drop + file picker

**Comparison to CharacterStudio**:
| Feature | CreateCharacter | CharacterStudio |
|---------|----------------|-----------------|
| **Purpose** | Quick setup | Iterative refinement |
| **Layout** | Form-based | Workspace with galleries |
| **Portrait** | Single generation | Version management |
| **Scenes** | Not available | Full scene editor |
| **AI Suggestions** | Limited | Comprehensive |
| **Mobile UX** | Optimized form | Tab-based workspace |
| **Save Model** | Explicit save | Explicit + auto-save on generate |

---

**Related Documentation**:
- [CHARACTER_STUDIO_PAGE.md](CHARACTER_STUDIO_PAGE.md) - Iterative character workspace
- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) - Deep technical implementation details
