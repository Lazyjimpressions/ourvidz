# Table: enhancement_presets

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Enhancement parameter presets and configurations for prompt improvement

**Ownership:** Admin  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- preset_name (varchar(100), NOT NULL) - Preset name
- preset_description (text, nullable) - Preset description
- enable_qwen (boolean, NOT NULL) - Whether to enable Qwen enhancement
- enable_compel (boolean, NOT NULL) - Whether to enable Compel enhancement
- auto_enhancement (boolean, NOT NULL) - Whether to auto-enhance prompts
- compel_weights (jsonb, nullable) - Compel weight configuration
- qwen_settings (jsonb, nullable) - Qwen enhancement settings
- usage_count (integer, default: 0) - Number of times preset used
- avg_quality_with_preset (numeric, nullable) - Average quality rating with preset
- is_recommended (boolean, default: false) - Whether preset is recommended
- created_at (timestamptz, default: now()) - Creation timestamp
- created_by (uuid, nullable) - Foreign key to profiles table (creator)
```

## **RLS Policies**
```sql
-- Admin access to enhancement presets
CREATE POLICY "Admin access to enhancement presets" ON enhancement_presets
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - Enhancement preset management
  - Generation Interface - Preset selection for enhancement
- **Edge Functions**
  - enhance-prompt - Preset application for prompt enhancement
  - queue-job - Preset selection for job creation
- **Services/Hooks**
  - EnhancementService - Enhancement preset management
  - useEnhancementPresets - Preset data and operations

## **Business Rules**
- **Admin Management**: Only admins can create, update, or delete presets
- **Enhancement Options**: Presets can enable Qwen and/or Compel enhancement
- **Auto Enhancement**: Presets can be set for automatic application
- **Quality Tracking**: Presets track usage and quality improvements
- **Recommendation System**: Presets can be marked as recommended
- **Configuration Storage**: Enhancement settings stored as JSONB for flexibility

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "preset_name": "High Quality Portrait",
  "preset_description": "Optimized for high-quality portrait generation with enhanced details",
  "enable_qwen": true,
  "enable_compel": true,
  "auto_enhancement": true,
  "compel_weights": {
    "portrait": 1.2,
    "detailed": 1.1,
    "professional": 1.0,
    "lighting": 1.3
  },
  "qwen_settings": {
    "expansion_percentage": 0.3,
    "style_enhancement": true,
    "detail_enhancement": true
  },
  "usage_count": 150,
  "avg_quality_with_preset": 8.5,
  "is_recommended": true,
  "created_at": "2025-08-30T10:00:00Z",
  "created_by": "admin-uuid-here"
}
```

## **Common Queries**
```sql
-- Get all enhancement presets
SELECT * FROM enhancement_presets
ORDER BY is_recommended DESC, usage_count DESC;

-- Get recommended presets
SELECT * FROM enhancement_presets
WHERE is_recommended = true
ORDER BY avg_quality_with_preset DESC;

-- Get presets by enhancement type
SELECT * FROM enhancement_presets
WHERE enable_qwen = true AND enable_compel = true
ORDER BY usage_count DESC;

-- Get presets with quality statistics
SELECT 
    ep.*,
    COUNT(j.id) as total_jobs,
    AVG(j.quality_rating) as avg_quality,
    AVG(j.quality_improvement) as avg_improvement
FROM enhancement_presets ep
LEFT JOIN jobs j ON ep.preset_name = j.enhancement_strategy
WHERE ep.is_active = true
GROUP BY ep.id
ORDER BY ep.avg_quality_with_preset DESC;

-- Get most used presets
SELECT * FROM enhancement_presets
ORDER BY usage_count DESC
LIMIT 10;

-- Get presets by creator
SELECT 
    ep.*,
    p.username as creator_name
FROM enhancement_presets ep
LEFT JOIN profiles p ON ep.created_by = p.id
ORDER BY ep.created_at DESC;

-- Get auto-enhancement presets
SELECT * FROM enhancement_presets
WHERE auto_enhancement = true
ORDER BY is_recommended DESC, avg_quality_with_preset DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_enhancement_presets_recommended ON enhancement_presets(is_recommended, avg_quality_with_preset DESC);
CREATE INDEX idx_enhancement_presets_usage ON enhancement_presets(usage_count DESC);
CREATE INDEX idx_enhancement_presets_auto ON enhancement_presets(auto_enhancement, is_recommended);
CREATE INDEX idx_enhancement_presets_created ON enhancement_presets(created_at DESC);
```

## **Notes**
- **Quality Optimization**: Presets optimize prompt enhancement for better generation quality
- **Flexible Configuration**: JSONB storage allows for complex enhancement settings
- **Usage Tracking**: Monitors which presets are most effective
- **Auto Enhancement**: Presets can be automatically applied to improve user experience
- **Recommendation System**: Helps users select the best presets for their needs
- **Multi-Enhancement**: Supports both Qwen and Compel enhancement methods
