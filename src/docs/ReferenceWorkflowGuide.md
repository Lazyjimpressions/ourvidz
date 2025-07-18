
# Character Reference Workflow Guide

## "Girl in Red Dress → Bathing Suit" Use Case

### Step-by-Step User Flow

#### Phase 1: Generate Base Character Image
1. **Navigate to Workspace** (`/workspace?mode=image`)
2. **Enter base prompt**: `"beautiful girl in red dress, photorealistic, professional portrait"`
3. **Set optimal settings**:
   - Quality: `High` (for better character details)
   - Model: `SDXL High` (automatic based on quality)
   - Quantity: `4 images` (gives options to user)
4. **Generate** and wait for completion
5. **Review results** and select best character image

#### Phase 2: Set Up Character Reference
1. **Drag selected image** from workspace to **Character** reference slot in MultiReferencePanel
2. **Configure reference settings**:
   - Reference Type: `Character` ✅ (automatically selected)
   - Reference Strength: `0.7` ✅ (optimal for face consistency)
   - Reference Source: `Workspace` ✅ (shows workspace badge)

#### Phase 3: Generate Character Transformation
1. **Enter transformation prompt**: `"beautiful girl in bathing suit, same person, same facial features, beach background"`
2. **System auto-optimization**:
   - Quality automatically upgraded to `High` for character consistency
   - Model: `SDXL High` (forced for character references)
   - Quantity: `4-6 images` (provides options)
3. **Enhanced generation metadata**:
   ```json
   {
     "reference_type": "character",
     "reference_strength": 0.7,
     "character_consistency": true,
     "reference_source": "workspace",
     "model_variant": "lustify_sdxl"
   }
   ```
4. **Generate** and compare results

### Technical Implementation Details

#### Automatic Quality Upgrades
- When character reference is detected → Force `sdxl_image_high`
- Character consistency requires higher model quality
- User sees quality upgrade notification

#### Optimal Reference Settings
```typescript
const characterReferenceConfig = {
  type: 'character',
  strength: 0.7,           // Strong enough for face consistency
  model: 'sdxl_image_high', // Better for character consistency
  numImages: 4,            // Gives user options
  enhancedPrompt: true     // Auto-adds "same person, same facial features"
};
```

#### Prompt Enhancement
- Original: `"beautiful girl in bathing suit"`
- Enhanced: `"beautiful girl in bathing suit, same person, same facial features"`
- System automatically adds character consistency terms

### Expected Results
- ✅ **Face consistency**: Same facial features and structure
- ✅ **Style flexibility**: Different clothing (red dress → bathing suit)
- ✅ **Background adaptability**: Can change environments
- ✅ **Expression variations**: Different poses/expressions with same character

### Quality Assurance Checklist
- [ ] Character reference shows "Workspace" badge
- [ ] Reference strength set to 0.7
- [ ] Quality automatically upgraded to "High"
- [ ] Model shows "SDXL High"
- [ ] Prompt includes character consistency terms
- [ ] Generated images maintain facial consistency
- [ ] New outfit/setting successfully applied

### Troubleshooting
**Problem**: Generated images don't look like reference character
- **Solution**: Increase reference strength to 0.8-0.9

**Problem**: Generated images too similar to reference (same dress)
- **Solution**: Decrease reference strength to 0.5-0.6, enhance prompt specificity

**Problem**: Poor quality results
- **Solution**: Ensure SDXL High model is selected, increase num_images to 6
