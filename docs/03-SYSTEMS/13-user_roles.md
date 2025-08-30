# Table: user_roles

**Last Updated**: 8/24/25

Purpose: User role assignments and permissions

Ownership: Admin

## Schema (key columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, NOT NULL) - Foreign key to profiles table
- role (USER-DEFINED, NOT NULL) - User role enum (admin, moderator, premium_user, basic_user, guest)
- created_at (timestamptz, default: now()) - Role assignment timestamp

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- **User Relationship**: Every role assignment must belong to a user (user_id is NOT NULL)
- **Role Types**: Uses custom enum with predefined roles (admin, moderator, premium_user, basic_user, guest)
- **Assignment Tracking**: Only creation timestamp (no updated_at) - roles are immutable
- **Role Hierarchy**: Roles determine user permissions and access levels
- **Multiple Roles**: Users can have multiple role assignments

## Example Queries
- Get all roles for a user
```sql
SELECT id, role, created_at
FROM user_roles 
WHERE user_id = 'user-uuid-here'
ORDER BY created_at;
```

- Get users with admin role
```sql
SELECT ur.user_id, p.username, ur.role, ur.created_at
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.id
WHERE ur.role = 'admin'
ORDER BY ur.created_at;
```

- Get role distribution
```sql
SELECT role, COUNT(*) as user_count
FROM user_roles 
GROUP BY role
ORDER BY user_count DESC;
```

- Get users with multiple roles
```sql
SELECT user_id, COUNT(*) as role_count
FROM user_roles 
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY role_count DESC;
```

## Notes
- **Role System**: Uses custom enum type for role definitions
- **Permission Management**: Roles control access to different features and content
- **Immutable Assignments**: Role assignments are permanent (no updates, only creation)
- **Multiple Roles**: Users can have multiple role assignments for flexible permissions
- **Admin Access**: Admin roles have full system access and management capabilities
