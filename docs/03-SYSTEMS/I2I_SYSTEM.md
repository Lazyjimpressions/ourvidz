# Image-to-Image (I2I) System

**Last Updated:** January 2025  
**Status:** ✅ ACTIVE - SDXL worker implementation complete, 3rd party API integration planned

## **🎯 System Overview**

The I2I system enables users to modify existing images while preserving subject/pose/composition. It's a shared feature across multiple pages (Workspace, Library, Storyboard) and supports both SDXL worker and 3rd party API approaches.

### **Core Use Cases**
1. **Subject Modification**: Change specific elements while preserving person/pose
2. **Composition Modification**: Modify backgrounds, lighting, etc.
3. **Exact Copying**: Create high-fidelity copies (manual selection required)
4. **Character Consistency**: Maintain character appearance across variations

---

## **✅ Current Implementation (SDXL Worker)**

### **Technical Architecture**

#### **Frontend Components**
- **SimplePromptInput** (`src/components/workspace/SimplePromptInput.tsx`)
  - Reference image upload and display
  - Mode switching (MODIFY vs COPY)
  - Reference strength controls
  - Style control management

#### **Backend Integration**
- **queue-job Edge Function** (`supabase/functions/queue-job/index.ts`)
  - Parameter validation and conversion
  - Mode detection and routing
  - Reference strength to denoise_strength conversion

#### **SDXL Worker Processing**
- **Model**: SDXL Lustify (NSFW-optimized)
- **Parameters**: denoise_strength, guidance_scale, steps
- **Enhancement**: Qwen 2.5-7B Base for prompt enhancement

### **Mode Implementation**

#### **Modify Mode (Default)**
```typescript
// Default behavior for all references
const modifyDefaults = {
  referenceStrength: 0.5,        // Worker converts to denoise_strength = 0.5
  enhancementEnabled: true,
  styleControlsEnabled: true,
  guidanceScale: 7.5,            // Worker default for high quality
  steps: 25                      // Worker default for high quality
};
```

#### **Copy Mode (Manual Selection)**
```typescript
// Manual toggle required for exact copying
const copyDefaults = {
  referenceStrength: 0.95,       // Worker clamps denoise_strength to ≤0.05
  enhancementEnabled: false,
  styleControlsEnabled: false,
  guidanceScale: 1.0,            // Worker exact copy mode
  steps: 15                      // Worker exact copy mode
};
```

### **Parameter Flow**

#### **Frontend → Edge Function**
```typescript
// queue-job edge function processing
if (exactCopyMode) {
  // Set exact_copy_mode flag - worker handles optimization
  exact_copy_mode: true,
  skip_enhancement: true,
  // Worker will clamp denoise_strength to ≤0.05, set CFG=1.0
} else {
  // Normal modify mode - use worker defaults
  exact_copy_mode: false,
  skip_enhancement: false,
  // Worker uses denoise_strength = 0.5 (default), CFG=7.5
}
```

#### **SDXL Worker Processing**
```python
# For exact copy mode
if job.get('exact_copy_mode'):
    denoise_strength = min(denoise_strength, 0.05)  # Clamp to ≤0.05
    guidance_scale = 1.0     # Minimal guidance
    negative_prompt = ""     # No negatives
    # Skip all enhancement and style controls
else:
    # Normal modify mode - use worker defaults
    denoise_strength = 0.5   # Worker default for i2i
    guidance_scale = 7.5     # Worker default for high quality
    # Apply normal enhancement and style controls
```

### **UI/UX Implementation**

#### **Default State**
- **Mode**: Always "modify" (never default to copy)
- **Visual**: Clear "MOD" indicator
- **Behavior**: User must manually toggle to "COPY"

#### **Upload Behavior**
- **Upload Image** → Auto-enable "modify" mode
- **Reference Strength**: 0.5
- **No Auto-switch** to copy mode

#### **Mode Toggle**
- **MOD → COPY**: Sets reference strength to 0.95, disables enhancement
- **COPY → MOD**: Sets reference strength to 0.5, enables enhancement
- **Visual Feedback**: Clear mode indicators with appropriate styling

### **Reference Types**

#### **Workspace/Library Items**
- **Metadata Extraction**: Original prompt, seed, generation parameters
- **Default Mode**: Modify (strength 0.5)
- **Copy Mode**: Uses original prompt and seed for consistency

#### **Uploaded Images**
- **No Metadata**: No original prompt or seed available
- **Default Mode**: Modify (strength 0.5)
- **Copy Mode**: Uses minimal preservation prompt

---

## **🚧 Planned Implementation (3rd Party APIs)**

### **Replicate API Integration**

#### **RV5.1 Model**
- **Model**: Replicate RV5.1 (Realistic Vision 5.1)
- **Use Case**: Alternative to SDXL for i2i
- **Advantages**: Different style, potentially better for certain use cases
- **Integration**: Via Supabase API providers table

#### **Implementation Plan**
```typescript
// API provider configuration
const replicateConfig = {
  provider: 'replicate',
  model: 'rv5.1',
  endpoint: 'https://api.replicate.com/v1/predictions',
  parameters: {
    denoise_strength: 0.5,  // Map from reference strength
    guidance_scale: 7.5,
    steps: 25
  }
};
```

### **OpenRouter API Integration**

#### **Alternative Models**
- **SDXL 1.0**: Standard SDXL model
- **SDXL Turbo**: Faster generation
- **Other Models**: As available through OpenRouter

#### **Implementation Plan**
```typescript
// OpenRouter configuration
const openRouterConfig = {
  provider: 'openrouter',
  models: ['sdxl-1.0', 'sdxl-turbo'],
  endpoint: 'https://openrouter.ai/api/v1',
  parameters: {
    denoise_strength: 0.5,
    guidance_scale: 7.5,
    steps: 25
  }
};
```

### **API Provider Management**

#### **Supabase Tables**
- **api_providers**: Provider configuration and credentials
- **api_models**: Available models per provider
- **Admin Interface**: Manage providers and models

#### **Fallback Strategy**
```typescript
// Priority order for i2i generation
const i2iPriority = [
  'sdxl-worker',      // Primary: Internal SDXL worker
  'replicate-rv5.1',  // Secondary: Replicate RV5.1
  'openrouter-sdxl',  // Tertiary: OpenRouter SDXL
  'openrouter-turbo'  // Fallback: OpenRouter Turbo
];
```

---

## **🔧 Technical Implementation Details**

### **Parameter Mapping**

#### **Reference Strength Conversion**
```typescript
// Frontend reference strength to worker denoise_strength
const convertReferenceStrength = (referenceStrength: number, mode: 'modify' | 'copy') => {
  if (mode === 'copy') {
    return Math.min(referenceStrength, 0.05); // Clamp for exact copy
  }
  return 1 - referenceStrength; // Invert for modify mode
};
```

#### **Mode Detection**
```typescript
// Determine i2i mode based on user input and settings
const detectI2IMode = (referenceImage: string, exactCopyMode: boolean, prompt: string) => {
  if (!referenceImage) return 'none';
  if (exactCopyMode) return 'copy';
  if (prompt.trim()) return 'modify';
  return 'modify'; // Default to modify
};
```

### **Error Handling**

#### **Worker Failures**
- **Fallback**: Switch to 3rd party API
- **Retry Logic**: Attempt with different parameters
- **User Feedback**: Clear error messages and recovery options

#### **API Failures**
- **Provider Switch**: Try next available provider
- **Parameter Adjustment**: Reduce quality for faster generation
- **Graceful Degradation**: Fall back to basic generation

---

## **📊 Performance Considerations**

### **Generation Times**
- **SDXL Worker**: 3-8 seconds per image
- **Replicate RV5.1**: 5-15 seconds per image
- **OpenRouter SDXL**: 3-10 seconds per image

### **Cost Optimization**
- **Provider Selection**: Choose based on cost and quality requirements
- **Batch Processing**: Group multiple i2i requests
- **Caching**: Cache common reference images

### **Quality vs Speed**
- **High Quality**: Use SDXL worker with full enhancement
- **Fast Generation**: Use OpenRouter Turbo or reduced parameters
- **Balanced**: Use Replicate RV5.1 with moderate settings

---

## **🎯 Future Enhancements**

### **Advanced Features**
1. **Multi-Reference**: Support multiple reference images
2. **Style Transfer**: Apply artistic styles to references
3. **Batch I2I**: Process multiple images with same modification
4. **Character Consistency**: Advanced character preservation

### **Integration Opportunities**
1. **Storyboard System**: I2I for scene continuity
2. **Library Management**: Bulk i2i operations
3. **Workflow Automation**: Automated i2i pipelines

### **Quality Improvements**
1. **Better Parameter Tuning**: AI-optimized parameter selection
2. **Enhanced Prompting**: Intelligent prompt modification
3. **Result Comparison**: Side-by-side comparison tools

---

## **🔍 Testing and Validation**

### **Test Scenarios**
1. **Subject Modification**: Change clothing, accessories, etc.
2. **Background Changes**: Modify scene backgrounds
3. **Exact Copying**: Verify high-fidelity reproduction
4. **Error Handling**: Test fallback scenarios

### **Quality Metrics**
1. **Subject Preservation**: Maintain person/character consistency
2. **Modification Accuracy**: Apply requested changes correctly
3. **Artifact Reduction**: Minimize generation artifacts
4. **User Satisfaction**: Track user feedback and preferences

---

**Note**: This system is actively developed and will be enhanced with 3rd party API integration. The current SDXL worker implementation provides a solid foundation for the expanded system.
