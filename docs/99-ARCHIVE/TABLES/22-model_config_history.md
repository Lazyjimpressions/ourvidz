# Table: model_config_history

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Model configuration change tracking and versioning for rollback capability

**Ownership:** Admin  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- model_type (varchar(20), NOT NULL) - Model type (sdxl, wan, etc.)
- config_name (varchar(100), NOT NULL) - Configuration name
- config_data (jsonb, NOT NULL) - Configuration data
- is_active (boolean, default: false) - Whether configuration is active
- created_by (uuid, nullable) - Foreign key to profiles table (creator)
- created_at (timestamptz, default: now()) - Creation timestamp
- notes (text, nullable) - Configuration notes
```

## **RLS Policies**
```sql
-- Admin access to model config history
CREATE POLICY "Admin access to model config history" ON model_config_history
FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role));
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - Configuration history management
  - Model Configuration - Configuration versioning interface
- **Edge Functions**
  - All generation functions - Configuration application
  - system-metrics - Configuration tracking
- **Services/Hooks**
  - ConfigService - Configuration management and versioning
  - useModelConfigHistory - Configuration history operations

## **Business Rules**
- **Version Control**: Each configuration change creates a new version
- **Active Status**: Only one configuration per model type can be active
- **Change Tracking**: All configuration changes are tracked with timestamps
- **Rollback Support**: Historical configurations can be restored
- **Admin Access**: Only admins can manage configuration history
- **Notes Support**: Configuration changes can include explanatory notes

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "model_type": "sdxl",
  "config_name": "SDXL Production Config v2.1",
  "config_data": {
    "default_settings": {
      "guidance_scale": 7.5,
      "num_inference_steps": 50,
      "width": 1024,
      "height": 1024,
      "scheduler": "DPMSolverMultistepScheduler"
    },
    "enhancement_settings": {
      "enable_compel": true,
      "compel_weights": {
        "portrait": 1.2,
        "detailed": 1.1
      },
      "enable_qwen": true,
      "qwen_expansion_percentage": 0.3
    },
    "quality_settings": {
      "default_quality": "high",
      "max_file_size_mb": 50,
      "compression_enabled": true
    }
  },
  "is_active": true,
  "created_by": "admin-uuid-here",
  "created_at": "2025-08-30T10:00:00Z",
  "notes": "Updated SDXL configuration with improved compel weights and Qwen enhancement settings"
}
```

## **Common Queries**
```sql
-- Get active configuration for model type
SELECT * FROM model_config_history
WHERE model_type = 'sdxl' AND is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- Get configuration history for model type
SELECT 
    mch.*,
    p.username as creator_name
FROM model_config_history mch
LEFT JOIN profiles p ON mch.created_by = p.id
WHERE mch.model_type = 'sdxl'
ORDER BY mch.created_at DESC;

-- Get all active configurations
SELECT 
    model_type,
    config_name,
    created_at,
    created_by
FROM model_config_history
WHERE is_active = true
ORDER BY model_type, created_at DESC;

-- Get configuration changes over time
SELECT 
    model_type,
    config_name,
    created_at,
    notes
FROM model_config_history
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Get configuration by creator
SELECT 
    mch.*,
    p.username as creator_name
FROM model_config_history mch
LEFT JOIN profiles p ON mch.created_by = p.id
WHERE mch.created_by = 'admin-uuid-here'
ORDER BY mch.created_at DESC;

-- Get configuration comparison
SELECT 
    model_type,
    config_name,
    config_data->'default_settings'->>'guidance_scale' as guidance_scale,
    config_data->'default_settings'->>'num_inference_steps' as inference_steps,
    created_at
FROM model_config_history
WHERE is_active = true
ORDER BY model_type;

-- Get recent configuration changes
SELECT 
    model_type,
    config_name,
    created_at,
    notes,
    CASE 
        WHEN is_active THEN 'ACTIVE'
        ELSE 'INACTIVE'
    END as status
FROM model_config_history
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Get configuration rollback candidates
SELECT 
    model_type,
    config_name,
    created_at,
    notes
FROM model_config_history
WHERE model_type = 'sdxl'
  AND is_active = false
  AND created_at >= NOW() - INTERVAL '90 days'
ORDER BY created_at DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_model_config_history_model_active ON model_config_history(model_type, is_active, created_at DESC);
CREATE INDEX idx_model_config_history_created ON model_config_history(created_at DESC);
CREATE INDEX idx_model_config_history_creator ON model_config_history(created_by, created_at DESC);
CREATE INDEX idx_model_config_history_type_name ON model_config_history(model_type, config_name);
```

## **Notes**
- **Version Control**: Maintains complete history of configuration changes
- **Rollback Support**: Enables restoration of previous configurations
- **Change Tracking**: All modifications tracked with timestamps and notes
- **Active Management**: Only one configuration per model type can be active
- **Configuration Data**: Flexible JSONB storage for complex configurations
- **Audit Trail**: Complete audit trail of who made what changes when
- **Configuration Comparison**: Enables comparison between different versions
