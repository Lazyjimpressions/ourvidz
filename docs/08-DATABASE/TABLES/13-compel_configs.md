# Table: compel_configs

**Last Updated**: 8/24/25

Purpose: Compel-specific configuration settings

Ownership: Admin

## Schema (key columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- config_name (varchar, NOT NULL) - Configuration name/identifier
- weights (jsonb, NOT NULL) - Compel weight configuration
- config_hash (varchar, NOT NULL) - Hash of configuration for uniqueness
- total_tests (integer, default: 0) - Number of tests run with this config
- avg_quality (numeric, nullable) - Average quality rating
- avg_consistency (numeric, nullable) - Average consistency rating
- is_active (boolean, default: false) - Whether config is active
- created_at (timestamptz, default: now()) - Creation timestamp
- created_by (uuid, nullable) - Admin who created the config

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- **Config Name**: Configuration name is mandatory
- **Weight Configuration**: weights field contains JSON configuration for Compel
- **Hash Uniqueness**: config_hash ensures configuration uniqueness
- **Testing Metrics**: total_tests tracks how many tests used this config
- **Quality Metrics**: avg_quality and avg_consistency track performance
- **Active Status**: Only active configs (is_active = true) are used
- **Admin Creation**: Configs are created by admin users

## Example Queries
- Get active Compel configurations
```sql
SELECT config_name, avg_quality, avg_consistency, total_tests
FROM compel_configs 
WHERE is_active = true
ORDER BY avg_quality DESC;
```

- Get high-quality configurations
```sql
SELECT config_name, avg_quality, avg_consistency, total_tests
FROM compel_configs 
WHERE avg_quality > 8.0 
  AND total_tests > 10
ORDER BY avg_quality DESC;
```

- Get configurations by test count
```sql
SELECT config_name, total_tests, avg_quality, avg_consistency
FROM compel_configs 
WHERE total_tests > 0
ORDER BY total_tests DESC;
```

- Get configurations by consistency
```sql
SELECT config_name, avg_consistency, avg_quality, total_tests
FROM compel_configs 
WHERE avg_consistency IS NOT NULL
ORDER BY avg_consistency DESC;
```

- Get configuration hash duplicates
```sql
SELECT config_hash, COUNT(*) as duplicate_count
FROM compel_configs 
GROUP BY config_hash
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

## Notes
- **Compel Integration**: Manages Compel weight configurations for prompt enhancement
- **Performance Tracking**: Quality and consistency metrics help optimize configurations
- **Hash Validation**: config_hash prevents duplicate configurations
- **Testing Framework**: total_tests tracks configuration validation
- **Quality Metrics**: Dual metrics (quality + consistency) for comprehensive evaluation
- **Admin Management**: Only admins can create and manage Compel configurations
