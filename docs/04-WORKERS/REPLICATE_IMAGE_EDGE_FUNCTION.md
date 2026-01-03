# Replicate Image Edge Function

**File:** `supabase/functions/replicate-image/index.ts`
**Last Updated:** January 3, 2026
**Status:** ✅ PRODUCTION - Database-driven with I2I Detection and Generation Mode Support

## **Overview**

The Replicate Image Edge Function handles image generation requests to Replicate API models, with enhanced support for:
- **I2I Detection**: Automatically detects Image-to-Image requests
- **Generation Mode Support**: Separate negative prompts for `txt2img` vs `i2i`
- **Model-Specific Parameter Mapping**: Dynamic parameter validation and mapping
- **Enhanced Scheduler Support**: Robust scheduler mapping with fallbacks

## **Key Features**

### **1. I2I Detection**
```typescript
// Detect if this is an i2i request based on reference image
const hasReferenceImage = !!(body.input?.image || body.metadata?.referenceImage);
```

### **2. Model Type Normalization**
```typescript
const normalizeModelType = (modelFamily: string | null, modelKey: string, isI2I: boolean = false): string => {
  if (family.includes('sdxl') || key.includes('sdxl')) {
    // Check if this is a Replicate SDXL model (not local Lustify SDXL)
    if (apiModel.api_providers.name === 'replicate') {
      return isI2I ? 'replicate-sdxl-i2i' : 'replicate-sdxl';
    }
    return 'sdxl'; // Local Lustify SDXL
  }
  // ... other mappings
};
```

### **3. Generation Mode-Aware Negative Prompts**
```typescript
// Determine generation mode for targeted negative prompts
const generationMode = hasReferenceImage ? 'i2i' : 'txt2img';

// Query negative prompts with generation mode
const { data: negativePrompts, error: negError } = await supabase
  .from('negative_prompts')
  .select('negative_prompt')
  .eq('model_type', normalizedModelType.replace('-i2i', '')) // Remove i2i suffix for lookup
  .eq('content_mode', contentMode)
  .eq('generation_mode', generationMode)
  .eq('is_active', true)
  .order('priority', { ascending: false });
```

## **Database Schema Requirements**

### **negative_prompts Table**
```sql
-- Required columns:
model_type: text           -- 'replicate-sdxl', 'sdxl', 'rv51', etc.
content_mode: text         -- 'nsfw', 'sfw'
generation_mode: text      -- 'txt2img', 'i2i' (NEW)
negative_prompt: text      -- The actual negative prompt terms
priority: integer          -- 1, 2, 3... (higher = more important)
is_active: boolean         -- true/false
description: text          -- Human-readable description
```

### **Current Replicate SDXL Negative Prompts**
```sql
-- Regular (txt2img) prompts
('replicate-sdxl', 'nsfw', 'txt2img', 'blurry, low quality, worst quality, jpeg artifacts, signature, watermark, text', 1, true, 'Minimal quality control for Replicate SDXL NSFW - optimized for I2I compatibility'),
('replicate-sdxl', 'sfw', 'txt2img', 'blurry, low quality, worst quality, jpeg artifacts, signature, watermark, text, nsfw, explicit, sexual, nude, naked', 1, true, 'Minimal quality control for Replicate SDXL SFW - optimized for I2I compatibility'),

-- I2I-specific prompts (minimal to avoid interference)
('replicate-sdxl', 'nsfw', 'i2i', 'blurry, worst quality, jpeg artifacts', 2, true, 'Minimal I2I prompts for Replicate SDXL NSFW - prevents modification interference'),
('replicate-sdxl', 'sfw', 'i2i', 'blurry, worst quality, jpeg artifacts', 2, true, 'Minimal I2I prompts for Replicate SDXL SFW - prevents modification interference');
```

## **Parameter Mapping & Validation**

### **Model Capabilities Integration**
```typescript
// Get model capabilities for input validation
const capabilities = apiModel.capabilities || {};
const allowedInputKeys = Array.isArray(capabilities.allowed_input_keys) ? capabilities.allowed_input_keys : [];
const inputKeyMappings = (typeof capabilities.input_key_mappings === 'object' && capabilities.input_key_mappings && !Array.isArray(capabilities.input_key_mappings)) ? capabilities.input_key_mappings : {};
```

### **Dynamic Parameter Mapping**
```typescript
// Map steps with model-specific key names
if (body.input.steps !== undefined) {
  const stepsKey = inputKeyMappings.steps || 'steps';
  modelInput[stepsKey] = Math.min(Math.max(body.input.steps, 1), 100);
}

// Map guidance_scale with model-specific key names
if (body.input.guidance_scale !== undefined) {
  const guidanceKey = inputKeyMappings.guidance_scale || 'guidance_scale';
  modelInput[guidanceKey] = Math.min(Math.max(body.input.guidance_scale, 3.5), 7);
}
```

### **Enhanced Scheduler Mapping**
```typescript
// Default scheduler mapping for Replicate SDXL models
const defaultSchedulerMap = {
  'EulerA': 'K_EULER_ANCESTRAL',
  'MultistepDPM-Solver': 'DPMSolverMultistep', 
  'MultistepDPM': 'DPMSolverMultistep',
  'K_EULER_ANCESTRAL': 'K_EULER_ANCESTRAL',
  'DPMSolverMultistep': 'DPMSolverMultistep',
  'K_EULER': 'K_EULER',
  'DDIM': 'DDIM',
  'HeunDiscrete': 'HeunDiscrete', 
  'KarrasDPM': 'KarrasDPM',
  'PNDM': 'PNDM'
};

// Merge model-specific overrides if provided
const finalSchedulerMap = { ...defaultSchedulerMap, ...schedulerAliases };

// Safety check: ensure mapped scheduler is in Replicate's allowed list
const replicateAllowedSchedulers = ['DDIM', 'DPMSolverMultistep', 'HeunDiscrete', 'KarrasDPM', 'K_EULER_ANCESTRAL', 'K_EULER', 'PNDM'];
if (!replicateAllowedSchedulers.includes(mappedScheduler)) {
  console.log(`⚠️ Mapped scheduler "${mappedScheduler}" not in Replicate's allowed list, falling back to K_EULER_ANCESTRAL`);
  mappedScheduler = 'K_EULER_ANCESTRAL';
}
```

## **Input Filtering**

### **Allowed Keys Filtering**
```typescript
// Filter input to only allowed keys for this model to prevent 422 errors
if (allowedInputKeys.length > 0) {
  const filteredInput = {};
  Object.keys(modelInput).forEach(key => {
    if (allowedInputKeys.includes(key) || ['prompt', 'num_outputs'].includes(key)) {
      filteredInput[key] = modelInput[key];
    } else {
      console.log(`🚮 Filtered out unsupported input key: ${key}`);
    }
  });
  Object.assign(modelInput, filteredInput);
}
```

## **Request Flow**

1. **Authentication**: Validate user token
2. **Model Resolution**: Get API model configuration from database
3. **I2I Detection**: Check for reference image presence
4. **Model Type Normalization**: Map to appropriate model_type
5. **Negative Prompt Selection**: Query based on model_type, content_mode, and generation_mode
6. **Parameter Mapping**: Apply model-specific parameter mappings
7. **Input Validation**: Filter to allowed keys only
8. **Replicate API Call**: Submit to Replicate with validated parameters

## **Logging & Debugging**

### **Enhanced Logging**
```typescript
console.log('🎯 Job parameters validated:', {
  jobType_from_body: body.job_type,
  jobType_legacy: body.jobType,
  final_jobType: jobType,
  quality_from_body: body.quality,
  final_quality: quality,
  model_family_raw: apiModel.model_family,
  model_key: apiModel.model_key,
  normalized_model_type: normalizedModelType
});

console.log('🔧 Model capabilities:', {
  allowed_input_keys: allowedInputKeys,
  scheduler_aliases: schedulerAliases,
  input_key_mappings: inputKeyMappings
});
```

## **Error Handling**

- **Model Not Found**: Returns 400 with specific error message
- **Invalid Provider**: Validates provider is 'replicate'
- **Missing Version**: Ensures Replicate model has version hash
- **Parameter Validation**: Clamps values to valid ranges
- **Scheduler Fallback**: Falls back to 'K_EULER_ANCESTRAL' for invalid schedulers

## **I2I Optimization**

### **Minimal Negative Prompts for I2I**
- **Regular (txt2img)**: 7-12 terms for quality control
- **I2I**: 3 terms only (`'blurry, worst quality, jpeg artifacts'`)
- **Rationale**: Excessive negative prompts interfere with I2I modification

### **Generation Mode Detection**
- **Automatic**: Detects based on `body.input?.image` or `body.metadata?.referenceImage`
- **Database Query**: Uses `generation_mode` column for targeted prompt selection
- **Fallback**: Uses regular prompts if I2I-specific prompts not found

## **Migration Requirements**

### **Database Changes**
```sql
-- Add generation_mode column
ALTER TABLE public.negative_prompts 
ADD COLUMN IF NOT EXISTS generation_mode text DEFAULT 'txt2img';

-- Insert Replicate SDXL negative prompts
INSERT INTO public.negative_prompts (model_type, content_mode, generation_mode, negative_prompt, priority, is_active, description) VALUES
-- ... (see migration file for complete data)
```

## **Testing**

### **Test Cases**
1. **Regular Text-to-Image**: Should use `txt2img` negative prompts
2. **I2I with Reference**: Should use `i2i` negative prompts
3. **Parameter Mapping**: Verify model-specific parameter mapping
4. **Scheduler Validation**: Test scheduler fallback behavior
5. **Input Filtering**: Ensure unsupported keys are filtered out

### **Debug Commands**
```bash
# Check current negative prompts
SELECT * FROM negative_prompts WHERE model_type = 'replicate-sdxl' ORDER BY content_mode, generation_mode, priority;

# Verify generation_mode column
SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'negative_prompts' AND column_name = 'generation_mode';
```

## **Performance Considerations**

- **Database Queries**: Single query for negative prompts with proper indexing
- **Parameter Validation**: Efficient type checking and clamping
- **Input Filtering**: O(n) filtering of input parameters
- **Scheduler Mapping**: O(1) hash table lookups

## **Future Enhancements**

1. **Caching**: Cache negative prompts for frequently used model/content_mode combinations
2. **Dynamic Capabilities**: Real-time model capability updates
3. **A/B Testing**: Support for multiple negative prompt variants
4. **Analytics**: Track parameter usage and success rates
