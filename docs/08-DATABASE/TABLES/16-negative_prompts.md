# Table: negative_prompts

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Negative prompt template management for AI generation

**Ownership:** Admin  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- model_type (varchar, NOT NULL, default: 'sdxl') - Model type (sdxl, wan, etc.)
- content_mode (varchar, NOT NULL, default: 'nsfw') - Content mode (sfw, nsfw)
- negative_prompt (text, NOT NULL) - Negative prompt content
- is_active (boolean, default: true) - Whether prompt is active
- priority (integer, default: 1) - Prompt priority for selection
- created_at (timestamptz, default: now()) - Creation timestamp
- updated_at (timestamptz, default: now()) - Last update timestamp
- created_by (uuid, nullable) - Foreign key to profiles table (creator)
- description (text, nullable) - Prompt description
```

## **RLS Policies**
```sql
-- Admin access to negative prompts
CREATE POLICY "Admin access to negative prompts" ON negative_prompts
FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role));
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - Negative prompt management
  - Generation Interface - Negative prompt selection
- **Edge Functions**
  - queue-job - Negative prompt application
  - enhance-prompt - Prompt enhancement with negative prompts
- **Services/Hooks**
  - NegativePromptService - Negative prompt management
  - useNegativePrompts - Negative prompt data and operations

## **Business Rules**
- **Admin Management**: Only admins can create, update, or delete negative prompts
- **Model Specificity**: Negative prompts are specific to model types
- **Content Safety**: Separate prompts for SFW/NSFW content
- **Priority System**: Higher priority prompts are selected first
- **Active Status**: Only active prompts are used for generation
- **Content Filtering**: Negative prompts help filter unwanted content

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "model_type": "sdxl",
  "content_mode": "nsfw",
  "negative_prompt": "blurry, low quality, distorted, ugly, deformed, poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, mutated hands and fingers, out of focus, long neck, long body, mutated hands and fingers, out of frame, blender, doll, cropped, low-res, close-up, poorly-drawn face, out of frame, double, two heads, blurred, ugly, deformed, too many limbs, deformed, repetitive, black and white, grainy, extra limbs, bad anatomy, high pass filter, airbrush, portrait, zoomed, soft focus, vignette, out of shot, out of focus, gaussian, closeup, monochrome, grainy, noisy, text, writing, watermark, logo, oversaturation, over saturation, over shadow",
  "is_active": true,
  "priority": 1,
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z",
  "created_by": "admin-uuid-here",
  "description": "Standard SDXL negative prompt for NSFW content"
}
```

## **Common Queries**
```sql
-- Get active negative prompts by model type
SELECT * FROM negative_prompts
WHERE model_type = 'sdxl' AND is_active = true
ORDER BY priority, created_at DESC;

-- Get negative prompts by content mode
SELECT * FROM negative_prompts
WHERE content_mode = 'nsfw' AND is_active = true
ORDER BY model_type, priority;

-- Get highest priority negative prompt for model
SELECT * FROM negative_prompts
WHERE model_type = 'sdxl' AND content_mode = 'nsfw' AND is_active = true
ORDER BY priority DESC, created_at DESC
LIMIT 1;

-- Get negative prompts with usage statistics
SELECT 
    np.*,
    COUNT(j.id) as usage_count
FROM negative_prompts np
LEFT JOIN jobs j ON np.negative_prompt = j.metadata->>'negative_prompt'
WHERE np.is_active = true
GROUP BY np.id
ORDER BY np.priority, usage_count DESC;

-- Get negative prompts by creator
SELECT 
    np.*,
    p.username as creator_name
FROM negative_prompts np
LEFT JOIN profiles p ON np.created_by = p.id
WHERE np.is_active = true
ORDER BY np.created_at DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_negative_prompts_model_mode ON negative_prompts(model_type, content_mode, is_active);
CREATE INDEX idx_negative_prompts_priority ON negative_prompts(priority DESC, is_active);
CREATE INDEX idx_negative_prompts_active ON negative_prompts(is_active, model_type);
CREATE INDEX idx_negative_prompts_created ON negative_prompts(created_at DESC);
```

## **Notes**
- **Content Safety**: Negative prompts help filter unwanted content from AI generation
- **Model Specificity**: Different models may require different negative prompts
- **Priority System**: Higher priority prompts are automatically selected
- **Admin Control**: Only admins can manage negative prompts for quality control
- **Content Modes**: Separate prompts for SFW/NSFW content filtering
- **Usage Tracking**: Can track which prompts are most effective
