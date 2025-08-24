# Table: profiles

**Last Updated**: 8/24/25

Purpose: User profile information and authentication data

Ownership: System/Auth

## Schema (key columns)
- id (uuid, pk) - Primary key (no default, likely from auth.users)
- username (text, nullable) - User's display name
- subscription_status (text, default: 'inactive') - User's subscription level
- token_balance (integer, default: 100) - Available credits/tokens
- created_at (timestamptz, default: now()) - Account creation timestamp
- updated_at (timestamptz, default: now()) - Last profile update timestamp
- age_verified (boolean, default: false) - Age verification status

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- **Authentication**: Profile ID links to Supabase auth.users table
- **Token System**: Users start with 100 tokens, consumed for content generation
- **Subscription**: Default status is 'inactive', can be upgraded to premium tiers
- **Age Verification**: Required for NSFW content access
- **Username**: Optional display name for user identification

## Example Queries
- Get user profile with token balance
```sql
SELECT id, username, subscription_status, token_balance, age_verified
FROM profiles 
WHERE id = 'user-uuid-here';
```

- Get users with active subscriptions
```sql
SELECT id, username, subscription_status, token_balance
FROM profiles 
WHERE subscription_status != 'inactive'
ORDER BY created_at DESC;
```

- Get users with low token balance
```sql
SELECT id, username, token_balance
FROM profiles 
WHERE token_balance < 10
ORDER BY token_balance;
```

- Update user token balance
```sql
UPDATE profiles 
SET token_balance = token_balance - 1, updated_at = now()
WHERE id = 'user-uuid-here';
```

## Notes
- **Auth Integration**: Profile ID is the same as auth.users ID for seamless integration
- **Token Management**: Token balance is decremented for each content generation
- **Subscription Tiers**: Different subscription levels may have different token limits
- **Age Verification**: Critical for compliance with content rating systems
- **Profile Updates**: updated_at timestamp tracks when profile was last modified
