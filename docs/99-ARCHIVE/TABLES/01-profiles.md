# Table: profiles

**Last Updated:** December 19, 2024  
**Status:** ✅ Active  
**Purpose:** Core user profile information and authentication data

**Ownership:** User  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with UUID from auth.users
- username (text, nullable) - User's chosen username
- subscription_status (text, default: 'inactive') - User's subscription level
- token_balance (integer, default: 100) - Available generation tokens
- created_at (timestamptz, default: now()) - Account creation timestamp
- updated_at (timestamptz, default: now()) - Last profile update timestamp
- age_verified (boolean, default: false) - Age verification status
- birth_date (date, nullable) - User's birth date for age verification
- age_verification_date (timestamptz, nullable) - When age was verified
```

## **RLS Policies**
```sql
-- Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT TO public
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE TO public
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT TO public
USING (has_role(auth.uid(), 'admin'::app_role));
```

## **Integration Map**
- **Pages/Components**
  - User Dashboard - Profile display and editing
  - Settings Page - Profile configuration
  - Age Verification - Age verification workflow
  - Token Management - Token balance display
- **Edge Functions**
  - user-management - Profile operations
  - age-verification - Age verification processing
- **Services/Hooks**
  - useProfile - Profile data and operations
  - ProfileService - Profile management

## **Business Rules**
- **Profile Ownership**: Users can only access their own profile
- **Age Verification**: Required for NSFW content access
- **Token Balance**: Starts with 100 tokens, consumed by generation
- **Subscription**: Tracks user's subscription level
- **Username**: Optional, can be set by user

## **Example Data**
```json
{
  "id": "user-uuid-here",
  "username": "johndoe",
  "subscription_status": "premium",
  "token_balance": 150,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-12-19T14:30:00Z",
  "age_verified": true,
  "birth_date": "1990-05-15",
  "age_verification_date": "2024-01-20T09:00:00Z"
}
```

## **Related Tables**
- **user_roles** - User role assignments
- **user_activity_log** - User activity tracking
- **user_library** - User's content library
- **conversations** - User's chat conversations
- **projects** - User's projects

## **Notes**
- Profile is automatically created when user signs up
- Age verification is required for NSFW content access
- Token balance is managed by the generation system
- Username is optional and can be changed
