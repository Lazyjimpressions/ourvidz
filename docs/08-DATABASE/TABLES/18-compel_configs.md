# Table: compel_configs

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Compel prompt configuration and optimization for AI generation

**Ownership:** Admin  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- config_name (varchar(100), NOT NULL) - Configuration name
- weights (jsonb, NOT NULL) - Compel weight configuration
- config_hash (varchar(64), NOT NULL) - Configuration hash for uniqueness
- total_tests (integer, default: 0) - Total number of tests run
- avg_quality (numeric, nullable) - Average quality rating
- avg_consistency (numeric, nullable) - Average consistency rating
- is_active (boolean, default: false) - Whether configuration is active
- created_at (timestamptz, default: now()) - Creation timestamp
- created_by (uuid, nullable) - Foreign key to profiles table (creator)
```

## **RLS Policies**
```sql
-- Admin access to compel configs
CREATE POLICY "Admin access to compel configs" ON compel_configs
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
  - Admin Dashboard - Compel configuration management
  - Testing Interface - Configuration testing and validation
- **Edge Functions**
  - enhance-prompt - Compel configuration application
  - queue-job - Configuration selection for jobs
- **Services/Hooks**
  - CompelService - Compel configuration management
  - useCompelConfigs - Configuration data and operations

## **Business Rules**
- **Admin Management**: Only admins can create, update, or delete configurations
- **Weight Configuration**: Compel weights stored as JSONB for flexibility
- **Configuration Hashing**: Unique hash ensures configuration integrity
- **Testing Framework**: Configurations can be tested and rated
- **Quality Metrics**: Tracks quality and consistency ratings
- **Active Status**: Only active configurations are used for generation

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "config_name": "Portrait Optimization v2",
  "weights": {
    "portrait": 1.2,
    "detailed": 1.1,
    "professional": 1.0,
    "lighting": 1.3,
    "composition": 1.1,
    "expression": 1.2,
    "background": 0.8
  },
  "config_hash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234",
  "total_tests": 45,
  "avg_quality": 8.7,
  "avg_consistency": 8.2,
  "is_active": true,
  "created_at": "2025-08-30T10:00:00Z",
  "created_by": "admin-uuid-here"
}
```

## **Common Queries**
```sql
-- Get all active compel configurations
SELECT * FROM compel_configs
WHERE is_active = true
ORDER BY avg_quality DESC;

-- Get configurations by quality rating
SELECT * FROM compel_configs
WHERE avg_quality >= 8.0
ORDER BY avg_quality DESC, total_tests DESC;

-- Get configurations with test statistics
SELECT 
    cc.*,
    COUNT(mtr.id) as test_count,
    AVG(mtr.overall_quality) as test_avg_quality
FROM compel_configs cc
LEFT JOIN model_test_results mtr ON cc.config_hash = mtr.test_metadata->>'compel_config_hash'
WHERE cc.is_active = true
GROUP BY cc.id
ORDER BY cc.avg_quality DESC;

-- Get most tested configurations
SELECT * FROM compel_configs
ORDER BY total_tests DESC
LIMIT 10;

-- Get configurations by creator
SELECT 
    cc.*,
    p.username as creator_name
FROM compel_configs cc
LEFT JOIN profiles p ON cc.created_by = p.id
ORDER BY cc.created_at DESC;

-- Get configuration performance comparison
SELECT 
    config_name,
    avg_quality,
    avg_consistency,
    total_tests,
    CASE 
        WHEN avg_quality >= 8.5 THEN 'excellent'
        WHEN avg_quality >= 7.5 THEN 'good'
        WHEN avg_quality >= 6.5 THEN 'fair'
        ELSE 'poor'
    END as quality_category
FROM compel_configs
WHERE is_active = true
ORDER BY avg_quality DESC;

-- Get configuration by hash
SELECT * FROM compel_configs
WHERE config_hash = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234';
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_compel_configs_active ON compel_configs(is_active, avg_quality DESC);
CREATE INDEX idx_compel_configs_hash ON compel_configs(config_hash);
CREATE INDEX idx_compel_configs_tests ON compel_configs(total_tests DESC);
CREATE INDEX idx_compel_configs_quality ON compel_configs(avg_quality DESC, is_active);
CREATE INDEX idx_compel_configs_created ON compel_configs(created_at DESC);
```

## **Notes**
- **Compel Optimization**: Configurations optimize Compel prompt weighting for better generation
- **Testing Framework**: Configurations can be tested and rated for quality
- **Hash Verification**: Configuration hashes ensure integrity and prevent duplicates
- **Quality Metrics**: Tracks both quality and consistency ratings
- **Performance Tracking**: Monitors which configurations perform best
- **Flexible Weights**: JSONB storage allows for complex weight configurations
