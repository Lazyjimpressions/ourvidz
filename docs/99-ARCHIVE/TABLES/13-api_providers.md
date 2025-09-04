# Table: api_providers

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** 3rd party API provider configuration and management

**Ownership:** Admin  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- created_at (timestamptz, NOT NULL, default: now()) - Creation timestamp
- updated_at (timestamptz, NOT NULL, default: now()) - Last update timestamp
- name (text, NOT NULL) - Provider name (e.g., 'replicate', 'openrouter')
- display_name (text, NOT NULL) - Human-readable display name
- base_url (text, nullable) - Base URL for API endpoints
- docs_url (text, nullable) - Documentation URL
- auth_scheme (text, NOT NULL, default: 'bearer') - Authentication scheme
- auth_header_name (text, default: 'Authorization') - Authentication header name
- secret_name (text, nullable) - Environment variable name for API key
- rate_limits (jsonb, NOT NULL, default: '{}') - Rate limiting configuration
- is_active (boolean, NOT NULL, default: true) - Whether provider is active
```

## **RLS Policies**
```sql
-- Active providers readable by authenticated users
CREATE POLICY "Active providers readable (authenticated only)" ON api_providers
FOR SELECT TO public
USING ((is_active = true) AND (auth.uid() IS NOT NULL));

-- Admins can manage providers
CREATE POLICY "Admins can manage providers" ON api_providers
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - Provider management interface
  - API Configuration - Provider settings and monitoring
- **Edge Functions**
  - queue-job - Provider selection for job routing
  - replicate-image - Replicate API integration
  - replicate-webhook - Replicate webhook handling
- **Services/Hooks**
  - APIService - Provider management and selection
  - useAPIProviders - Provider data and operations

## **Business Rules**
- **Provider Management**: Only admins can create, update, or delete providers
- **Active Status**: Only active providers are used for job routing
- **Authentication**: Each provider has its own authentication scheme
- **Rate Limiting**: Rate limits are stored as JSONB for flexibility
- **Secret Management**: API keys stored as environment variables, not in database
- **Documentation**: Links to provider documentation for reference

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z",
  "name": "replicate",
  "display_name": "Replicate",
  "base_url": "https://api.replicate.com/v1",
  "docs_url": "https://replicate.com/docs",
  "auth_scheme": "bearer",
  "auth_header_name": "Authorization",
  "secret_name": "REPLICATE_API_TOKEN",
  "rate_limits": {
    "requests_per_minute": 60,
    "requests_per_hour": 1000,
    "concurrent_requests": 5
  },
  "is_active": true
}
```

## **Common Queries**
```sql
-- Get all active providers
SELECT * FROM api_providers
WHERE is_active = true
ORDER BY display_name;

-- Get provider with model count
SELECT 
    ap.*,
    COUNT(am.id) as model_count,
    COUNT(am.id) FILTER (WHERE am.is_active = true) as active_model_count
FROM api_providers ap
LEFT JOIN api_models am ON ap.id = am.provider_id
WHERE ap.is_active = true
GROUP BY ap.id
ORDER BY ap.display_name;

-- Get provider by name
SELECT * FROM api_providers
WHERE name = 'replicate' AND is_active = true;

-- Get providers with usage statistics
SELECT 
    ap.name,
    ap.display_name,
    ap.is_active,
    COUNT(j.id) as total_jobs,
    COUNT(j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,
    COUNT(j.id) FILTER (WHERE j.status = 'failed') as failed_jobs
FROM api_providers ap
LEFT JOIN api_models am ON ap.id = am.provider_id
LEFT JOIN jobs j ON am.id = j.api_model_id
WHERE ap.is_active = true
GROUP BY ap.id, ap.name, ap.display_name, ap.is_active
ORDER BY total_jobs DESC;

-- Get provider configuration for job routing
SELECT 
    ap.name,
    ap.base_url,
    ap.auth_scheme,
    ap.auth_header_name,
    ap.rate_limits,
    am.model_key,
    am.display_name as model_name
FROM api_providers ap
JOIN api_models am ON ap.id = am.provider_id
WHERE ap.is_active = true AND am.is_active = true
ORDER BY ap.name, am.priority;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_api_providers_active ON api_providers(is_active, display_name);
CREATE INDEX idx_api_providers_name ON api_providers(name) WHERE is_active = true;
CREATE INDEX idx_api_providers_updated ON api_providers(updated_at DESC);
```

## **Notes**
- **Provider Management**: Centralized configuration for all 3rd party APIs
- **Authentication**: Flexible authentication schemes (bearer, api_key, etc.)
- **Rate Limiting**: JSONB storage allows for complex rate limit configurations
- **Secret Security**: API keys stored as environment variables, not in database
- **Model Integration**: Providers are linked to api_models for job routing
- **Active Status**: Only active providers are used for job processing
- **Documentation**: Links to provider docs for development reference
