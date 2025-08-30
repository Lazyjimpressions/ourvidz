# Table: api_providers

**Last Updated**: 8/24/25

Purpose: External API provider configurations

Ownership: Admin

## Schema (key columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- created_at/updated_at (timestamptz, NOT NULL, default: now()) - Timestamps
- name (text, NOT NULL) - Provider identifier/key
- display_name (text, NOT NULL) - Human-readable provider name
- base_url (text, nullable) - Base API URL
- docs_url (text, nullable) - Documentation URL
- auth_scheme (text, NOT NULL, default: 'bearer') - Authentication method
- auth_header_name (text, default: 'Authorization') - Auth header name
- secret_name (text, nullable) - Secret key name for credentials
- rate_limits (jsonb, NOT NULL, default: '{}') - Rate limiting configuration
- is_active (boolean, NOT NULL, default: true) - Whether provider is available

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- **Provider Names**: name should be unique identifier, display_name for UI
- **Authentication**: Default auth scheme is 'bearer' with 'Authorization' header
- **Rate Limiting**: Rate limits stored as JSON for flexible configuration
- **Active Status**: Only active providers (is_active = true) are available
- **Secret Management**: secret_name references external secret storage
- **URL Configuration**: base_url and docs_url are optional

## Example Queries
- Get all active providers
```sql
SELECT id, name, display_name, base_url, auth_scheme
FROM api_providers 
WHERE is_active = true
ORDER BY display_name;
```

- Get provider with rate limits
```sql
SELECT name, display_name, rate_limits
FROM api_providers 
WHERE is_active = true
ORDER BY name;
```

- Get providers by auth scheme
```sql
SELECT name, display_name, auth_scheme, auth_header_name
FROM api_providers 
WHERE auth_scheme = 'bearer'
ORDER BY display_name;
```

- Get provider configuration for API calls
```sql
SELECT name, base_url, auth_scheme, auth_header_name, secret_name
FROM api_providers 
WHERE is_active = true
ORDER BY name;
```

## Notes
- **External Integration**: Manages configuration for external AI service providers
- **Authentication**: Supports different auth schemes (bearer, api_key, etc.)
- **Rate Limiting**: JSON configuration allows for complex rate limit rules
- **Secret Management**: secret_name references Supabase secrets or external vault
- **URL Management**: base_url for API calls, docs_url for reference
- **Provider Management**: Easy to add/remove providers by setting is_active
