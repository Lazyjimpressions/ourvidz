# Table: user_collections

**Last Updated**: 8/24/25

Purpose: User-created content collections

Ownership: User

## Schema (key columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, NOT NULL) - Foreign key to profiles table
- name (text, NOT NULL) - Collection name
- description (text, nullable) - Collection description
- asset_count (integer, default: 0) - Number of assets in collection
- created_at (timestamptz, default: now()) - Creation timestamp

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- **User Ownership**: Every collection must belong to a user (user_id is NOT NULL)
- **Name Required**: Collection name is mandatory
- **Asset Counting**: asset_count tracks the number of assets in the collection
- **Description Optional**: Collections can have optional descriptions
- **Creation Tracking**: Only creation timestamp (no updated_at)

## Example Queries
- Get all collections for a user
```sql
SELECT id, name, description, asset_count, created_at
FROM user_collections 
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

- Get collections with assets
```sql
SELECT id, name, asset_count
FROM user_collections 
WHERE asset_count > 0
ORDER BY asset_count DESC;
```

- Get empty collections
```sql
SELECT id, name, created_at
FROM user_collections 
WHERE asset_count = 0
ORDER BY created_at DESC;
```

- Get collection statistics
```sql
SELECT 
    COUNT(*) as total_collections,
    SUM(asset_count) as total_assets,
    AVG(asset_count) as avg_assets_per_collection
FROM user_collections 
WHERE user_id = 'user-uuid-here';
```

## Notes
- **Asset Organization**: Collections help users organize their content library
- **Counter Management**: asset_count should be updated when assets are added/removed
- **Simple Structure**: Minimal schema focused on collection management
- **User Isolation**: Collections are private to each user
- **No Updates**: Collections are immutable after creation (no updated_at field)
