# Table: enhancement_presets

**Last Updated**: 8/24/25

Purpose: Prompt enhancement configurations and presets

Ownership: Admin

## Schema (key columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- preset_name (varchar, NOT NULL) - Preset name/identifier
- preset_description (text, nullable) - Preset description
- enable_qwen (boolean, NOT NULL) - Whether to use Qwen enhancement
- enable_compel (boolean, NOT NULL) - Whether to use Compel enhancement
- auto_enhancement (boolean, NOT NULL) - Whether to auto-enhance prompts
- compel_weights (jsonb, nullable) - Compel weight configuration
- qwen_settings (jsonb, nullable) - Qwen enhancement settings
- usage_count (integer, default: 0) - Number of times preset used
- avg_quality_with_preset (numeric, nullable) - Average quality rating
- is_recommended (boolean, default: false) - Whether preset is recommended
- created_at (timestamptz, default: now()) - Creation timestamp
- created_by (uuid, nullable) - Admin who created the preset

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- **Preset Name**: Preset name is mandatory and should be unique
- **Enhancement Options**: Can enable Qwen, Compel, or both enhancement types
- **Auto Enhancement**: Controls whether prompts are automatically enhanced
- **Quality Tracking**: avg_quality_with_preset tracks performance metrics
- **Usage Tracking**: usage_count tracks how often preset is used
- **Recommendation System**: is_recommended flags high-performing presets
- **Admin Creation**: Presets are created by admin users

## Example Queries
- Get recommended presets
```sql
SELECT preset_name, preset_description, usage_count, avg_quality_with_preset
FROM enhancement_presets 
WHERE is_recommended = true 
  AND is_active = true
ORDER BY avg_quality_with_preset DESC;
```

- Get presets with Qwen enabled
```sql
SELECT preset_name, preset_description, qwen_settings
FROM enhancement_presets 
WHERE enable_qwen = true
ORDER BY usage_count DESC;
```

- Get presets with Compel enabled
```sql
SELECT preset_name, preset_description, compel_weights
FROM enhancement_presets 
WHERE enable_compel = true
ORDER BY usage_count DESC;
```

- Get high-usage presets
```sql
SELECT preset_name, usage_count, avg_quality_with_preset, is_recommended
FROM enhancement_presets 
WHERE usage_count > 100
ORDER BY usage_count DESC;
```

- Get presets by quality rating
```sql
SELECT preset_name, avg_quality_with_preset, usage_count
FROM enhancement_presets 
WHERE avg_quality_with_preset IS NOT NULL
ORDER BY avg_quality_with_preset DESC;
```

## Notes
- **Dual Enhancement**: Supports both Qwen and Compel enhancement systems
- **Performance Tracking**: Quality metrics help identify best-performing presets
- **Auto Enhancement**: Can automatically apply enhancement to user prompts
- **Configuration Flexibility**: JSON fields allow complex enhancement settings
- **Usage Analytics**: Tracks which presets are most popular
- **Recommendation Engine**: System can recommend presets based on performance
