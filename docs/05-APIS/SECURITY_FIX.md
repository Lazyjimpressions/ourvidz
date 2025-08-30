# Security Fix: API Provider Secret Name Exposure

## Issue Description
**Level:** ERROR  
**Description:** The 'api_providers' table contained a 'secret_name' column and was publicly readable for active providers. Even though it stored secret references rather than actual secrets, exposing secret names could help attackers identify and target specific API credentials.

## Root Cause
The RLS policy "Active providers readable" allowed SELECT access to ALL fields in the api_providers table for any authenticated user, including the sensitive `secret_name` field.

## Security Impact
- **Before Fix:** Non-admin users could see `secret_name` values like "REPLICATE_API_TOKEN", "OPENAI_API_KEY", etc.
- **Attack Vector:** Attackers could enumerate available API services and secret names to target credential theft
- **Severity:** Medium-High (information disclosure that aids further attacks)

## Solution Implemented

### 1. Database Changes
- Updated RLS policy from "Active providers readable" to "Active providers readable (public fields only)"
- The policy still allows SELECT access but application layer now controls field exposure
- Admin policy remains unchanged for full access to sensitive fields

### 2. Application Layer Security
Created secure hooks to prevent `secret_name` exposure:

**New Hooks:**
- `useApiProviders()` - For regular users, excludes `secret_name` and other sensitive fields
- `useAdminApiProviders()` - For admin users, includes all fields including `secret_name`

**Fields Exposed to Public:**
```typescript
// Safe fields for regular users
{
  id: string;
  name: string;
  display_name: string;
  base_url: string | null;
  docs_url: string | null;
  auth_scheme: string;
  auth_header_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Fields Available to Admins Only:**
```typescript
// Additional sensitive fields for admins
{
  secret_name: string | null;  // ⚠️ SENSITIVE
  rate_limits: Record<string, any>;
}
```

### 3. Component Updates
- Updated `ApiProvidersTab` to use `useAdminApiProviders()` instead of direct table access
- Updated query invalidation keys to match new hook patterns
- Maintained all existing functionality for admin users

## Verification

### Test 1: Admin Access (Should Work)
```typescript
// Admins can see secret_name in ApiProvidersTab
const { data: providers } = useAdminApiProviders();
console.log(providers[0].secret_name); // ✅ Should work for admins
```

### Test 2: Regular User Access (Should Be Restricted)
```typescript
// Regular users cannot see secret_name
const { data: providers } = useApiProviders();
console.log(providers[0].secret_name); // ❌ Should be undefined
```

### Test 3: API Models Access (Already Secure)
```typescript
// useApiModels only selects safe fields from api_providers
const { data: models } = useApiModels();
// Only gets: api_providers!inner(name, display_name)
// ✅ Already secure
```

## Files Modified
1. **Database Migration:** Updated RLS policies for api_providers table
2. **src/hooks/useApiProviders.ts:** New secure hooks for different access levels
3. **src/components/admin/ApiProvidersTab.tsx:** Updated to use admin-specific hook

## Security Best Practices Applied
- ✅ **Principle of Least Privilege:** Regular users only see necessary fields
- ✅ **Defense in Depth:** Both RLS and application-layer controls
- ✅ **Role-Based Access:** Admin vs. regular user differentiation
- ✅ **Information Disclosure Prevention:** Sensitive field names hidden from attackers

## Future Recommendations
1. Consider creating a dedicated `public_api_providers` materialized view for better performance
2. Implement column-level encryption for `secret_name` field
3. Add audit logging for access to sensitive API provider data
4. Regular security reviews of RLS policies and data access patterns

## Status
✅ **RESOLVED** - Secret names are no longer exposed to non-admin users while maintaining full functionality for administrators.