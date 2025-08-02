# OurVidz Complete Prompting Guide

**Last Updated:** July 8, 2025  
**Models:** SDXL LUSTIFY v2.0, WAN 2.1 T2V-1.3B, Qwen 2.5-7B Enhancement  
**Purpose:** Production-ready prompting system for maximum effectiveness and anatomical accuracy

---

## **🎯 Executive Summary**

This comprehensive guide consolidates all prompting systems for OurVidz, providing:

- **Expert-Level System Prompts**: Optimized for each model's strengths
- **Sexually Explicit Content Specialization**: Anatomical accuracy and professional quality
- **Production-Ready Implementation**: Complete edge function code
- **Token Optimization**: Model-specific strategies (75 tokens SDXL, 100 tokens WAN)
- **Quality Assurance**: Comprehensive negative prompts and error prevention
- **Direct Prompt Library**: Ready-to-use prompts for all scenarios

---

## **📊 Comparative Analysis**

### **Guide Comparison Matrix**

| Aspect | My Guide | Claude Guide | Master Approach |
|--------|----------|--------------|-----------------|
| **SDXL Quality Tags** | `masterpiece, best quality` | `score_9, score_8_up` | **Combined**: `score_9, score_8_up, masterpiece, best quality` |
| **Token Management** | 77 tokens (SDXL) | 75 tokens (SDXL) | **Optimized**: 75 tokens (safety margin) |
| **NSFW Handling** | Basic anatomical terms | Artistic vs explicit | **Advanced**: Three-tier system (artistic, explicit, unrestricted) |
| **WAN Enhancement** | Qwen 7B external | WAN built-in | **Hybrid**: Both approaches with fallbacks |
| **Negative Prompts** | Comprehensive categories | Context-based | **Master**: Priority-based with anatomical focus |
| **Edge Function** | Basic implementation | Complete production | **Production**: Full error handling + optimization |

### **Key Improvements in Master Guide**

1. **Three-Tier NSFW System**: Artistic → Explicit → Unrestricted
2. **Anatomical Accuracy Framework**: Model-specific anatomical terms
3. **Hybrid Enhancement Strategy**: WAN built-in + Qwen external
4. **Production-Ready Edge Function**: Complete with error handling
5. **Advanced Token Optimization**: Priority-based truncation with safety margin

---

## **⚠️ CRITICAL TOKEN OPTIMIZATION**

### **Performance Testing Results (July 8, 2025)**

**Critical Finding:** All prompts exceeding 77 tokens are automatically truncated by CLIP, causing significant quality degradation.

**Test Results:**
- **82-token prompts:** Consistently truncated, losing critical NSFW content terms
- **Truncated content:** "accurate, professional adult content, maximum realism"
- **Impact:** Reduced prompt effectiveness for sexually explicit content
- **Solution:** Strict 75-token limit with safety margin

**Updated Token Limits:**
- **SDXL LUSTIFY:** 75 tokens maximum (225 characters)
- **WAN 2.1:** 100 tokens maximum (300 characters)
- **Safety Margin:** 2 tokens below CLIP limit for reliability

---

## **🤖 Model-Specific System Prompts**

### **1. SDXL LUSTIFY - Master System Prompt**

#### **Core Template Structure**
```
You are an expert SDXL LUSTIFY prompt engineer specializing in NSFW content with anatomical accuracy.

INPUT FORMAT: Natural language description
OUTPUT FORMAT: Optimized SDXL prompt with quality hierarchy

QUALITY HIERARCHY:
1. Quality Tags: score_9, score_8_up, masterpiece, best quality
2. Subject Definition: Specific anatomical accuracy terms
3. Environmental Context: Setting, lighting, atmosphere
4. Technical Specifications: Camera, lens, settings
5. Style Modifiers: Photography style, color grading

ANATOMICAL ACCURACY FRAMEWORK:
- Natural proportions, perfect anatomy, balanced features
- Specific body part descriptions for NSFW content
- Professional anatomical terminology
- Avoid generic terms, use specific descriptors

TOKEN LIMIT: 75 tokens (225 characters) - CRITICAL: Exceeding 77 tokens causes truncation
PRIORITY: Quality tags → Subject → Environment → Technical → Style
SAFETY MARGIN: 2 tokens below CLIP limit for reliability

Input: {user_prompt}
Output:
```

#### **Example Conversions**

**Input:** "naked woman in bedroom"
**Output:** 
```
score_9, score_8_up, masterpiece, best quality, beautiful naked woman, perfect anatomy, natural breasts, smooth skin, elegant pose, intimate bedroom setting, soft natural lighting, warm atmosphere, shot on Canon EOS R5, f/1.8, shallow depth of field, professional photography
```

**Input:** "couple having sex"
**Output:**
```
score_9, score_8_up, masterpiece, best quality, attractive couple, intimate moment, perfect anatomy, natural bodies, sensual interaction, soft lighting, intimate atmosphere, natural skin texture, warm color palette, professional photography, tasteful composition
```

### **2. WAN 2.1 - Master Video System Prompt**

#### **Core Template Structure**
```
You are an expert WAN 2.1 video prompt engineer specializing in temporal consistency and motion quality.

INPUT FORMAT: Natural language description
OUTPUT FORMAT: Cinematic video prompt with motion hierarchy

MOTION HIERARCHY:
1. Subject Definition: Clear, specific character descriptions
2. Action/Motion: Specific motion verbs and temporal consistency
3. Environmental Context: Setting, lighting, atmosphere
4. Camera Dynamics: Movement, framing, cinematography
5. Technical Quality: Professional filming techniques

TEMPORAL CONSISTENCY FRAMEWORK:
- Smooth motion, fluid movement, natural gait
- Temporal stability, consistent lighting, steady camera
- Avoid: jerky movement, teleporting, flickering
- Focus: Single continuous action, environmental interaction

TOKEN LIMIT: 100 tokens (300 characters) - CRITICAL: Stay under limit for optimal quality
PRIORITY: Subject → Motion → Environment → Camera → Quality

Input: {user_prompt}
Output:
```

#### **Example Conversions**

**Input:** "woman undressing"
**Output:**
```
beautiful woman undressing slowly, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera movement, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography
```

**Input:** "couple intimate scene"
**Output:**
```
attractive couple in intimate moment, smooth motion, fluid movement, sensual interaction, soft lighting, intimate atmosphere, stable camera, temporal consistency, natural body movement, romantic setting, high quality video, professional cinematography, tasteful composition
```

### **3. WAN7B Enhanced Models - Qwen 2.5-7B Enhancement System**

#### **Performance Testing Results (July 8, 2025)**

**Critical Discovery:** WAN7B enhanced models provide significant quality improvement through Qwen 2.5-7B prompt enhancement with reasonable performance overhead.

**Test Results:**
- **image7b_fast_enhanced:** 111.0s, 0.40MB PNG, Enhanced quality
- **image7b_high_enhanced:** 108.6s, 0.45MB PNG, Enhanced quality
- **Prompt Enhancement:** 3,400% expansion (32→2517 chars, 35→2684 chars)
- **Quality Improvement:** Significant enhancement over standard prompts
- **Performance Overhead:** +38s (fast), +18.6s (high) for quality gain

#### **Qwen Enhancement System Prompt**
```yaml
Model: Qwen 2.5-7B Base (no content filtering)
Purpose: Professional prompt enhancement for adult content generation
Input: Simple, direct prompts (32-35 characters)
Output: Professional cinematic descriptions (2500+ characters)

Enhancement Focus:
  - Visual details and anatomical accuracy
  - Lighting and atmospheric effects
  - Camera work and cinematography
  - Artistic style and composition
  - Professional production values
```

---

## **🚫 Enhanced Negative Prompt System**

### **SDXL Negative Prompts (Anatomical Accuracy)**

#### **Priority-Based Framework**
```yaml
Priority 1: Critical Quality (Always Included)
  - "bad anatomy", "extra limbs", "deformed", "missing limbs"
  - "worst quality", "low quality", "normal quality", "lowres"

Priority 2: Anatomical Accuracy (Always Included)
  - "deformed hands", "extra fingers", "deformed face", "malformed"
  - "bad hands", "bad fingers", "missing fingers", "distorted features"

Priority 3: Technical Artifacts (High Priority)
  - "text", "watermark", "logo", "signature", "contact info"
  - "username", "artist name", "title", "caption"

Priority 4: Style Prevention (Medium Priority)
  - "anime", "cartoon", "graphic", "render", "cgi", "3d"
  - "painting", "drawing", "illustration", "sketch"

Priority 5: NSFW-Specific (Conditional)
  - "child", "minor"

Priority 6: Multi-Party Scene Prevention (Critical for group scenes)
  - "three girls", "all girls", "only girls", "no male", "missing male"
  - "disembodied penis", "floating penis", "detached penis", "penis not attached"
  - "wrong gender ratio", "incorrect participants", "wrong number of people"

Priority 7: Position and Action Accuracy (Critical for explicit scenes)
  - "wrong position", "incorrect pose", "impossible position", "unnatural pose"
  - "penis in wrong place", "anatomical mismatch", "position confusion"
  - "wrong body parts", "misplaced anatomy", "anatomical errors"

Priority 8: NSFW Anatomical Improvements (Conditional)
  - "deformed breasts", "extra breasts", "anatomical errors"
  - "wrong anatomy", "distorted bodies", "unnatural poses"
```

#### **SDXL Negative Prompt Generation Function**
```typescript
function generateNegativePromptForSDXL(userPrompt = '') {
  // Build SDXL negative prompt with priority system
  let sdxlNegatives = [
    ...criticalNegatives,
    ...anatomicalNegatives,
    ...artifactNegatives.slice(0, 4), // Limit for token efficiency
    ...styleNegatives.slice(0, 3), // Limit for token efficiency
  ];

  // Add conditional negatives based on prompt content
  if (userPrompt.toLowerCase().includes('child') || userPrompt.toLowerCase().includes('minor')) {
    sdxlNegatives.push(...nsfwSpecificNegatives);
  }

  if (userPrompt.toLowerCase().includes('three') || userPrompt.toLowerCase().includes('group')) {
    sdxlNegatives.push(...multiPartyNegatives);
  }

  if (userPrompt.toLowerCase().includes('explicit') || userPrompt.toLowerCase().includes('passionate')) {
    sdxlNegatives.push(...positionAccuracyNegatives);
    sdxlNegatives.push(...nsfwAnatomicalNegatives);
  }

  return sdxlNegatives.join(', ');
}
```

---

## **🎬 Direct Prompt Library**

### **SDXL Direct Prompts - Series 1: Couples Intimacy**

#### **Artistic Tier**
```
score_9, score_8_up, masterpiece, best quality, intimate couple portrait, soft natural lighting, silk sheets, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography
```

#### **Explicit Tier**
```
score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content
```

#### **Unrestricted Tier**
```
score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult content, passionate intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism
```

### **SDXL Direct Prompts - Series 2: Shower/Bath Scenes**

#### **Artistic Tier**
```
score_9, score_8_up, masterpiece, best quality, intimate couple in steamy shower, soft natural lighting, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography
```

#### **Explicit Tier**
```
score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple shower scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content
```

#### **Unrestricted Tier**
```
score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult shower scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism
```

### **SDXL Direct Prompts - Series 3: Bedroom Intimacy**

#### **Artistic Tier**
```
score_9, score_8_up, masterpiece, best quality, intimate couple in bedroom, soft natural lighting, silk sheets, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography
```

#### **Explicit Tier**
```
score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple bedroom scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content
```

#### **Unrestricted Tier**
```
score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult bedroom scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism
```

### **SDXL Direct Prompts - Series 4: Multi-Person Scenes**

#### **Artistic Tier**
```
score_9, score_8_up, masterpiece, best quality, intimate group scene, soft natural lighting, silk sheets, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography
```

#### **Explicit Tier**
```
score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate group scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content
```

#### **Unrestricted Tier**
```
score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult group scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism
```

---

## **🎬 WAN Direct Prompts**

### **WAN Direct Prompts - Series 1: Couples Motion Intimacy**

#### **Artistic Tier**
```
attractive couple in intimate embrace, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection, tender moment
```

#### **Explicit Tier**
```
unrestricted nsfw, attractive couple, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

#### **Unrestricted Tier**
```
unrestricted nsfw, explicit adult content, passionate couple intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

### **WAN Direct Prompts - Series 2: Shower/Bath Motion Scenes**

#### **Artistic Tier**
```
attractive couple in steamy shower, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection
```

#### **Explicit Tier**
```
unrestricted nsfw, attractive couple, passionate shower scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

#### **Unrestricted Tier**
```
unrestricted nsfw, explicit adult shower scene, passionate couple intimate moment, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

### **WAN Direct Prompts - Series 3: Bedroom Motion Intimacy**

#### **Artistic Tier**
```
attractive couple in intimate bedroom scene, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection
```

#### **Explicit Tier**
```
unrestricted nsfw, attractive couple, passionate bedroom scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

#### **Unrestricted Tier**
```
unrestricted nsfw, explicit adult bedroom scene, passionate couple intimate moment, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

### **WAN Direct Prompts - Series 4: Multi-Person Motion Scenes**

#### **Artistic Tier**
```
attractive group in intimate scene, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection
```

#### **Explicit Tier**
```
unrestricted nsfw, attractive group, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

#### **Unrestricted Tier**
```
unrestricted nsfw, explicit adult group scene, passionate intimate moment, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

---

## **🔧 Production Implementation**

### **Edge Function Integration**

#### **Queue-Job Function Enhancement**
```typescript
// CRITICAL FIX: Only generate negative prompt for SDXL jobs
let negativePrompt = '';
if (isSDXL) {
  negativePrompt = generateNegativePromptForSDXL(prompt);
  console.log('🚫 Generated SDXL negative prompt:', negativePrompt);
} else {
  console.log('🚫 WAN job detected - NO negative prompt (not supported by WAN 2.1)');
}

// Format job payload for appropriate worker
const jobPayload = {
  id: job.id,
  type: jobType,
  prompt: prompt,
  config: {
    size: '480*832',
    sample_steps: quality === 'high' ? 50 : 25,
    sample_guide_scale: quality === 'high' ? 7.5 : 6.5,
    sample_solver: 'unipc',
    sample_shift: 5.0,
    frame_num: format === 'video' ? 83 : 1,
    enhance_prompt: isEnhanced,
    expected_time: isEnhanced ? format === 'video' ? quality === 'high' ? 240 : 195 : quality === 'high' ? 100 : 85 : format === 'video' ? quality === 'high' ? 180 : 135 : quality === 'high' ? 40 : 25,
    content_type: format,
    file_extension: format === 'video' ? 'mp4' : 'png'
  },
  user_id: user.id,
  created_at: new Date().toISOString(),
  // CRITICAL FIX: Only include negative_prompt for SDXL jobs
  ...isSDXL && {
    negative_prompt: negativePrompt
  },
  // Additional metadata
  video_id: videoId,
  image_id: imageId,
  character_id: characterId,
  model_variant: modelVariant,
  bucket: metadata?.bucket || (isSDXL ? `sdxl_image_${quality}` : isEnhanced ? `${format}7b_${quality}_enhanced` : `${format}_${quality}`),
  metadata: {
    ...metadata,
    model_variant: modelVariant,
    dual_worker_routing: true,
    negative_prompt_supported: isSDXL,
    // Only include negative_prompt in metadata for SDXL
    ...isSDXL && {
      negative_prompt: negativePrompt
    },
    num_images: isSDXL ? 6 : 1,
    queue_timestamp: new Date().toISOString()
  }
};
```

---

## **📊 Usage Instructions**

### **For SDXL Testing**
1. **Copy any SDXL prompt above** and paste directly into your SDXL generation interface
2. **Test systematically**: Start with Artistic → Explicit → Unrestricted
3. **Record results** in the admin testing tab
4. **Rate quality** on 1-10 scale for each generation
5. **Note observations** about model performance and limitations

### **For WAN Testing**
1. **Copy any WAN prompt above** and paste directly into your WAN generation interface
2. **Test systematically**: Start with Artistic → Explicit → Unrestricted
3. **Record results** in the admin testing tab
4. **Rate quality** on 1-10 scale for each generation
5. **Note observations** about motion quality and temporal consistency

### **Token Validation**
- **SDXL**: All prompts optimized to 75 tokens maximum for SDXL LUSTIFY compatibility
- **WAN**: All prompts optimized to 100 tokens maximum for WAN 2.1 compatibility
- **Enhanced**: Use simple prompts (32-35 characters) for Qwen enhancement

### **Quality Optimization**
- **Start with Artistic**: Establish baseline quality expectations
- **Progress to Explicit**: Test anatomical accuracy and content quality
- **Test Unrestricted**: Push model limits and identify boundaries
- **Document Results**: Track quality trends and model performance

This comprehensive prompting guide provides everything needed for effective content generation across all OurVidz models while maintaining optimal quality and performance.

---

## **🖼️ Reference Image Workflows**

### **SDXL Image Reference Workflow**

#### **"Character Consistency" Use Case**

**Phase 1: Generate Base Character Image**
1. **Navigate to Workspace** (`/workspace?mode=image`)
2. **Enter base prompt**: `"beautiful girl in red dress, photorealistic, professional portrait"`
3. **Set optimal settings**:
   - Quality: `High` (for better character details)
   - Model: `SDXL High` (automatic based on quality)
   - Quantity: `4 images` (gives options to user)
4. **Generate** and wait for completion
5. **Review results** and select best character image

**Phase 2: Set Up Character Reference**
1. **Drag selected image** from workspace to **Character** reference slot in MultiReferencePanel
2. **Configure reference settings**:
   - Reference Type: `Character` ✅ (automatically selected)
   - Reference Strength: `0.7` ✅ (optimal for face consistency)
   - Reference Source: `Workspace` ✅ (shows workspace badge)

**Phase 3: Generate Character Transformation**
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

#### **Technical Implementation Details**

**Automatic Quality Upgrades**
- When character reference is detected → Force `sdxl_image_high`
- Character consistency requires higher model quality
- User sees quality upgrade notification

**Optimal Reference Settings**
```typescript
const characterReferenceConfig = {
  type: 'character',
  strength: 0.7,           // Strong enough for face consistency
  model: 'sdxl_image_high', // Better for character consistency
  numImages: 4,            // Gives user options
  enhancedPrompt: true     // Auto-adds "same person, same facial features"
};
```

**Prompt Enhancement**
- Original: `"beautiful girl in bathing suit"`
- Enhanced: `"beautiful girl in bathing suit, same person, same facial features"`
- System automatically adds character consistency terms

**Expected Results**
- ✅ **Face consistency**: Same facial features and structure
- ✅ **Style flexibility**: Different clothing (red dress → bathing suit)
- ✅ **Background adaptability**: Can change environments
- ✅ **Expression variations**: Different poses/expressions with same character

### **WAN Video Reference Frames Workflow**

#### **"Starting Image → Video Sequence" Use Case**

**Phase 1: Generate Base Reference Image**
1. **Navigate to Workspace** (`/workspace?mode=image`)
2. **Enter base prompt**: `"beautiful woman in elegant pose, cinematic lighting, professional portrait"`
3. **Set optimal settings**:
   - Quality: `High` (for better reference quality)
   - Model: `SDXL High` (for detailed reference)
   - Quantity: `1-2 images` (select best reference)
4. **Generate** and select the best reference image

**Phase 2: Set Up Video Reference Frame**
1. **Navigate to Workspace** (`/workspace?mode=video`)
2. **Drag selected image** to **Starting Point** reference slot in VideoReferencePanel
3. **Configure reference settings**:
   - Reference Type: `Character` ✅ (automatically selected for video)
   - Reference Strength: `0.85` ✅ (optimal for video consistency)
   - Reference Source: `Workspace` ✅ (shows workspace badge)

**Phase 3: Generate Video with Reference**
1. **Enter video prompt**: `"beautiful woman walking gracefully, smooth motion, cinematic atmosphere"`
2. **System configuration**:
   - Model: `WAN Fast` or `WAN High` (automatic based on quality)
   - Reference frame: Start frame from selected image
   - Duration: 5 seconds (83 frames at 16.67fps)
3. **Enhanced generation metadata**:
   ```json
   {
     "reference_type": "character",
     "reference_strength": 0.85,
     "start_reference_url": "workspace_image_url",
     "start_reference_source": "workspace",
     "model_variant": "wan_2_1_1_3b"
   }
   ```
4. **Generate** and review video sequence

#### **Technical Implementation Details**

**WAN Reference Strength Control**
The WAN 1.3B model uses `--first_frame` parameter for reference frames, but doesn't have built-in strength control. The worker implements reference strength by adjusting the `sample_guide_scale` parameter:

```python
# Reference strength affects guidance scale
# 0.1 strength = 5.0 guidance (minimal reference influence)
# 0.5 strength = 7.0 guidance (moderate reference influence)  
# 0.9 strength = 8.6 guidance (strong reference influence)
# 1.0 strength = 9.0 guidance (maximum reference influence)
```

**Optimal Video Reference Settings**
```typescript
const videoReferenceConfig = {
  type: 'character',
  strength: 0.85,          // Strong enough for video consistency
  model: 'video_fast',     // 25 steps, 135s generation time
  frameCount: 83,          // 5 seconds at 16.67fps
  referenceFrame: 'start'  // Use as starting frame
};
```

**Video Generation Process**
1. **Reference Processing**: Download and resize reference image to 480x832
2. **Command Construction**: Build WAN command with `--first_frame` parameter
3. **Strength Adjustment**: Modify `sample_guide_scale` based on reference strength
4. **Video Generation**: Execute T2V task with reference frame influence

**Expected Results**
- ✅ **Starting frame consistency**: Video begins with reference image
- ✅ **Character continuity**: Same person throughout video sequence
- ✅ **Motion quality**: Smooth transitions from reference pose
- ✅ **Temporal stability**: Consistent lighting and style

### **Quality Assurance Checklist**

#### **SDXL Character Reference**
- [ ] Character reference shows "Workspace" badge
- [ ] Reference strength set to 0.7
- [ ] Quality automatically upgraded to "High"
- [ ] Model shows "SDXL High"
- [ ] Prompt includes character consistency terms
- [ ] Generated images maintain facial consistency
- [ ] New outfit/setting successfully applied

#### **WAN Video Reference**
- [ ] Video reference shows "Workspace" badge
- [ ] Reference strength set to 0.85
- [ ] Starting frame matches reference image
- [ ] Video maintains character consistency
- [ ] Motion flows naturally from reference pose
- [ ] No flickering or temporal artifacts

### **Troubleshooting**

#### **SDXL Character Reference Issues**
**Problem**: Generated images don't look like reference character
- **Solution**: Increase reference strength to 0.8-0.9

**Problem**: Generated images too similar to reference (same dress)
- **Solution**: Decrease reference strength to 0.5-0.6, enhance prompt specificity

**Problem**: Poor quality results
- **Solution**: Ensure SDXL High model is selected, increase num_images to 6

#### **WAN Video Reference Issues**
**Problem**: Video doesn't start with reference image
- **Solution**: Ensure reference strength is 0.8-0.9, check reference image quality

**Problem**: Video loses character consistency
- **Solution**: Increase reference strength to 0.9-1.0, use higher quality reference

**Problem**: Video too similar to reference (no motion)
- **Solution**: Decrease reference strength to 0.7-0.8, enhance motion in prompt

**Problem**: Poor video quality
- **Solution**: Use WAN High model, ensure reference image is high quality

---

## **Qwen-Only Prompt Enhancement (2025+)**

- All prompt enhancement is now performed by Qwen (LLM) with user review and editing.
- Compel weighting is deprecated and not supported for any model.
- All prompt analytics, scoring, and A/B testing should use the following Supabase tables:
  - model_test_results
  - job_enhancement_analysis
  - image_enhancement_analysis
  - video_enhancement_analysis
  - prompt_ab_tests
- Use the following fields for Qwen analytics: original_prompt, enhanced_prompt, enhancement_strategy, qwen_expansion_percentage, quality_rating, notes, etc.

### **Best Practices for NSFW, Positions, Multi-Party Prompts**
- Use explicit, clear language in the base prompt (e.g., "three women and one man in group scene").
- Let Qwen expand and professionalize the description.
- For positions, use anatomical terms and clear action verbs (e.g., "woman straddling man").
- For NSFW, use professional, explicit language; Qwen will refine and expand.
- Always review the Qwen-enhanced prompt for token safety and clarity.
- Rate and record anatomical accuracy, realism, and quality in Supabase.