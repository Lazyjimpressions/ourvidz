# Table: user_roles

**Last Updated:** December 19, 2024  
**Status:** ✅ Active  
**Purpose:** Role-based access control and permissions

**Ownership:** System  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, NOT NULL) - Foreign key to profiles table
- role (app_role, NOT NULL) - User role (admin, moderator, premium, basic)
- created_at (timestamptz, default: now()) - Role assignment timestamp
```

## **RLS Policies**
```sql
-- Users can view their own roles
CREATE POLICY "Users can view own roles" ON user_roles
FOR SELECT TO public
USING (auth.uid() = user_id);

-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles" ON user_roles
FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role));
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - Role management
  - User Management - Role assignment
  - Permission System - Access control
- **Edge Functions**
  - admin-operations - Role management
  - permission-check - Access verification
- **Services/Hooks**
  - useRoles - Role data and operations
  - RoleService - Role management

## **Business Rules**
- **Role Assignment**: Only admins can assign roles
- **Role Hierarchy**: admin > moderator > premium > basic
- **Multiple Roles**: Users can have multiple roles
- **Role Persistence**: Roles persist across sessions

## **Example Data**
```json
{
  "id": "role-uuid-here",
  "user_id": "user-uuid-here",
  "role": "premium",
  "created_at": "2024-12-19T14:30:00Z"
}
```

## **Related Tables**
- **profiles** - User profile information
- **user_activity_log** - User activity tracking

## **Notes**
- Roles are used for access control throughout the system
- The app_role enum defines available role types
- Role changes are logged in user_activity_log
- Premium roles unlock additional features
