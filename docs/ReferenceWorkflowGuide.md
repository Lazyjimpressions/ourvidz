# Reference Workflow Guide

**Last Updated:** July 19, 2025  
**Status:** ✅ Production Ready - SDXL & WAN Reference Systems Live  
**Purpose:** Complete guide for using reference images in image and video generation

---

## **🎯 Overview**

OurVidz supports reference-based generation for both images (SDXL) and videos (WAN), allowing you to maintain character consistency, transfer styles, or guide composition. This guide covers all reference workflows and optimal settings.

---

## **🖼️ SDXL Image Reference Workflow**

### **"Character Consistency" Use Case**

#### **Phase 1: Generate Base Character Image**
1. **Navigate to Workspace** (`/workspace?mode=image`)
2. **Enter base prompt**: `"beautiful girl in red dress, photorealistic, professional portrait"`
3. **Set optimal settings**:
   - Quality: `High` (for better character details)
   - Model: `SDXL High` (automatic based on quality)
   - Quantity: `4 images` (gives options to user)
4. **Generate** and wait for completion
5. **Review results** and select best character image

#### **Phase 2: Set Up Character Reference**
1. **Drag selected image** from workspace to **Character** reference slot in MultiReferencePanel
2. **Configure reference settings**:
   - Reference Type: `Character` ✅ (automatically selected)
   - Reference Strength: `0.7` ✅ (optimal for face consistency)
   - Reference Source: `Workspace` ✅ (shows workspace badge)

#### **Phase 3: Generate Character Transformation**
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

### **Technical Implementation Details**

#### **Automatic Quality Upgrades**
- When character reference is detected → Force `sdxl_image_high`
- Character consistency requires higher model quality
- User sees quality upgrade notification

#### **Optimal Reference Settings**
```typescript
const characterReferenceConfig = {
  type: 'character',
  strength: 0.7,           // Strong enough for face consistency
  model: 'sdxl_image_high', // Better for character consistency
  numImages: 4,            // Gives user options
  enhancedPrompt: true     // Auto-adds "same person, same facial features"
};
```

#### **Prompt Enhancement**
- Original: `"beautiful girl in bathing suit"`
- Enhanced: `"beautiful girl in bathing suit, same person, same facial features"`
- System automatically adds character consistency terms

### **Expected Results**
- ✅ **Face consistency**: Same facial features and structure
- ✅ **Style flexibility**: Different clothing (red dress → bathing suit)
- ✅ **Background adaptability**: Can change environments
- ✅ **Expression variations**: Different poses/expressions with same character

### **Quality Assurance Checklist**
- [ ] Character reference shows "Workspace" badge
- [ ] Reference strength set to 0.7
- [ ] Quality automatically upgraded to "High"
- [ ] Model shows "SDXL High"
- [ ] Prompt includes character consistency terms
- [ ] Generated images maintain facial consistency
- [ ] New outfit/setting successfully applied

### **Troubleshooting**
**Problem**: Generated images don't look like reference character
- **Solution**: Increase reference strength to 0.8-0.9

**Problem**: Generated images too similar to reference (same dress)
- **Solution**: Decrease reference strength to 0.5-0.6, enhance prompt specificity

**Problem**: Poor quality results
- **Solution**: Ensure SDXL High model is selected, increase num_images to 6

---

## **🎬 WAN Video Reference Frames Workflow**

### **"Starting Image → Video Sequence" Use Case**

#### **Phase 1: Generate Base Reference Image**
1. **Navigate to Workspace** (`/workspace?mode=image`)
2. **Enter base prompt**: `"beautiful woman in elegant pose, cinematic lighting, professional portrait"`
3. **Set optimal settings**:
   - Quality: `High` (for better reference quality)
   - Model: `SDXL High` (for detailed reference)
   - Quantity: `1-2 images` (select best reference)
4. **Generate** and select the best reference image

#### **Phase 2: Set Up Video Reference Frame**
1. **Navigate to Workspace** (`/workspace?mode=video`)
2. **Drag selected image** to **Starting Point** reference slot in VideoReferencePanel
3. **Configure reference settings**:
   - Reference Type: `Character` ✅ (automatically selected for video)
   - Reference Strength: `0.85` ✅ (optimal for video consistency)
   - Reference Source: `Workspace` ✅ (shows workspace badge)

#### **Phase 3: Generate Video with Reference**
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

### **Technical Implementation Details**

#### **WAN Reference Strength Control**
The WAN 1.3B model uses `--first_frame` parameter for reference frames, but doesn't have built-in strength control. The worker implements reference strength by adjusting the `sample_guide_scale` parameter:

```python
# Reference strength affects guidance scale
# 0.1 strength = 5.0 guidance (minimal reference influence)
# 0.5 strength = 7.0 guidance (moderate reference influence)  
# 0.9 strength = 8.6 guidance (strong reference influence)
# 1.0 strength = 9.0 guidance (maximum reference influence)
```

#### **Optimal Video Reference Settings**
```typescript
const videoReferenceConfig = {
  type: 'character',
  strength: 0.85,          // Strong enough for video consistency
  model: 'video_fast',     // 25 steps, 135s generation time
  frameCount: 83,          // 5 seconds at 16.67fps
  referenceFrame: 'start'  // Use as starting frame
};
```

#### **Video Generation Process**
1. **Reference Processing**: Download and resize reference image to 480x832
2. **Command Construction**: Build WAN command with `--first_frame` parameter
3. **Strength Adjustment**: Modify `sample_guide_scale` based on reference strength
4. **Video Generation**: Execute T2V task with reference frame influence

### **Expected Results**
- ✅ **Starting frame consistency**: Video begins with reference image
- ✅ **Character continuity**: Same person throughout video sequence
- ✅ **Motion quality**: Smooth transitions from reference pose
- ✅ **Temporal stability**: Consistent lighting and style

### **Quality Assurance Checklist**
- [ ] Video reference shows "Workspace" badge
- [ ] Reference strength set to 0.85
- [ ] Starting frame matches reference image
- [ ] Video maintains character consistency
- [ ] Motion flows naturally from reference pose
- [ ] No flickering or temporal artifacts

### **Troubleshooting**

**Problem**: Video doesn't start with reference image
- **Solution**: Ensure reference strength is 0.8-0.9, check reference image quality

**Problem**: Video loses character consistency
- **Solution**: Increase reference strength to 0.9-1.0, use higher quality reference

**Problem**: Video too similar to reference (no motion)
- **Solution**: Decrease reference strength to 0.7-0.8, enhance motion in prompt

**Problem**: Poor video quality
- **Solution**: Use WAN High model, ensure reference image is high quality

---

## **🎯 Reference Strength Guidelines**

### **For Character Consistency**
- **0.7-0.8**: Moderate character influence, good for style changes
- **0.8-0.9**: Strong character influence, optimal for same person
- **0.9-1.0**: Maximum character influence, best for exact consistency

### **For Motion Quality (Video Only)**
- **0.6-0.7**: More creative freedom, better for complex motion
- **0.7-0.8**: Balanced approach, good motion with character consistency
- **0.8-0.9**: Strong reference influence, may limit motion creativity

### **For Different Content Types**

#### **SDXL Images**
- **Portrait consistency**: 0.7-0.8 (maintain facial features)
- **Style transfer**: 0.6-0.7 (preserve style while allowing changes)
- **Character transformation**: 0.7-0.8 (same person, different setting)

#### **WAN Videos**
- **Portrait videos**: 0.8-0.9 (maintain facial features)
- **Action sequences**: 0.7-0.8 (allow motion flexibility)
- **Style transfers**: 0.6-0.7 (preserve style while allowing changes)

---

## **🔧 Advanced Reference Techniques**

### **Multi-Reference Workflows**
- **Style + Character**: Use style reference for artistic treatment, character reference for consistency
- **Composition + Style**: Use composition reference for layout, style reference for visual treatment
- **Multiple Characters**: Use character references for each person in the scene

### **Reference Image Quality Tips**
- **High Resolution**: Use high-quality reference images (1024x1024 or higher)
- **Good Lighting**: Well-lit reference images produce better results
- **Clear Subject**: Ensure the main subject is clearly visible
- **Consistent Style**: Match reference image style to desired output

### **Prompt Optimization with References**
- **Character References**: Add "same person, same facial features" to prompts
- **Style References**: Include style-specific terms in prompts
- **Composition References**: Describe desired layout changes in prompts

---

## **📊 Performance Considerations**

### **Generation Times**
- **SDXL with Reference**: +10-20% generation time
- **WAN Video with Reference**: +5-10% generation time
- **High Reference Strength**: May increase generation time slightly

### **Quality Impact**
- **Optimal Strength Range**: 0.7-0.9 for most use cases
- **Too High Strength**: May reduce creativity and variety
- **Too Low Strength**: May not maintain desired consistency

### **Best Practices**
- **Start Conservative**: Begin with 0.7-0.8 strength
- **Test and Adjust**: Experiment with different strength values
- **Quality Over Speed**: Use higher quality models for reference workflows
- **Batch Testing**: Generate multiple variations to find optimal settings

---

## **🚀 Future Enhancements**

### **Planned Features**
- **Multiple Reference Images**: Support for multiple reference images per job
- **Reference Strength Presets**: Pre-configured strength values for common use cases
- **Reference Image Library**: Built-in library of high-quality reference images
- **Advanced Blending**: More sophisticated reference blending algorithms

### **Current Limitations**
- **WAN Model**: Only supports start frame reference (no end frame)
- **Reference Types**: Limited to style, composition, and character
- **Strength Control**: WAN uses guidance scale adjustment (not native strength)

---

*This guide covers all current reference workflows. For technical implementation details, see `docs/worker_api.md`.* 