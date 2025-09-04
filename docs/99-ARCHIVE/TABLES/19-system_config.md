# Table: system_config

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Global system configuration and settings management

**Ownership:** Admin  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (bigint, pk, default: 1) - Primary key (single row table)
- config (jsonb, NOT NULL, default: '{}') - System configuration data
- created_at (timestamptz, default: now()) - Creation timestamp
- updated_at (timestamptz, default: now()) - Last update timestamp
```

## **RLS Policies**
```sql
-- Admin can manage system config
CREATE POLICY "Admin can manage system config" ON system_config
FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role));
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - System configuration management
  - System Settings - Configuration display and editing
- **Edge Functions**
  - All edge functions - Configuration access
  - enhance-prompt - Configuration-based enhancement
  - queue-job - Configuration-based job routing
- **Services/Hooks**
  - SystemConfigService - Configuration management
  - useSystemConfig - Configuration data and operations

## **Business Rules**
- **Single Row**: This table contains only one row with global system settings
- **Admin Access**: Only admins can read, update, or modify configuration
- **JSONB Storage**: All configuration stored as flexible JSONB
- **Global Scope**: Configuration affects entire system behavior
- **Version Control**: Configuration changes tracked with timestamps

## **Example Data**
```json
{
  "id": 1,
  "config": {
    "system": {
      "maintenance_mode": false,
      "max_file_size_mb": 50,
      "allowed_file_types": ["jpg", "png", "mp4", "mov"],
      "default_quality": "high",
      "max_concurrent_jobs": 10
    },
    "enhancement": {
      "default_enhancement_strategy": "qwen_compel",
      "auto_enhancement_enabled": true,
      "enhancement_timeout_ms": 30000,
      "max_enhancement_attempts": 3
    },
    "api": {
      "default_provider": "replicate",
      "fallback_provider": "openrouter",
      "rate_limit_per_minute": 60,
      "timeout_seconds": 300
    },
    "storage": {
      "workspace_retention_days": 7,
      "max_workspace_size_gb": 10,
      "compression_enabled": true,
      "cdn_enabled": true
    },
    "security": {
      "max_login_attempts": 5,
      "session_timeout_hours": 24,
      "require_age_verification": true,
      "content_moderation_enabled": true
    },
    "features": {
      "character_system_enabled": true,
      "storyboard_enabled": true,
      "roleplay_enabled": true,
      "i2i_enabled": true,
      "video_generation_enabled": true
    }
  },
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z"
}
```

## **Common Queries**
```sql
-- Get current system configuration
SELECT config FROM system_config WHERE id = 1;

-- Get specific configuration section
SELECT config->'system' as system_config FROM system_config WHERE id = 1;

-- Get feature flags
SELECT config->'features' as feature_flags FROM system_config WHERE id = 1;

-- Check if maintenance mode is enabled
SELECT (config->'system'->>'maintenance_mode')::boolean as maintenance_mode 
FROM system_config WHERE id = 1;

-- Get API configuration
SELECT config->'api' as api_config FROM system_config WHERE id = 1;

-- Get enhancement settings
SELECT config->'enhancement' as enhancement_config FROM system_config WHERE id = 1;

-- Update specific configuration section
UPDATE system_config 
SET config = jsonb_set(config, '{system,maintenance_mode}', 'true'::jsonb)
WHERE id = 1;

-- Update multiple configuration values
UPDATE system_config 
SET config = config || '{"system": {"maintenance_mode": false, "max_file_size_mb": 100}}'::jsonb
WHERE id = 1;
```

## **Indexing Recommendations**
```sql
-- No additional indexes needed for single row table
-- Primary key index is sufficient
```

## **Notes**
- **Global Configuration**: Single source of truth for system-wide settings
- **Feature Flags**: Controls which features are enabled/disabled
- **API Settings**: Configures API providers, rate limits, and timeouts
- **Storage Settings**: Controls file retention, size limits, and compression
- **Security Settings**: Manages authentication, sessions, and content moderation
- **Enhancement Settings**: Controls prompt enhancement behavior
- **System Settings**: Manages maintenance mode, file limits, and quality defaults
