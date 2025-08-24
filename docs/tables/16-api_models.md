# Table: api_models

**Last Updated**: 8/24/25

Purpose: Available AI models and their configurations

Ownership: Admin

## Schema (key columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- created_at/updated_at (timestamptz, NOT NULL, default: now()) - Timestamps
- created_by (uuid, nullable) - Admin who created the model
- provider_id (uuid, NOT NULL) - Foreign key to api_providers table
- model_key (text, NOT NULL) - Unique identifier for the model
- version (text, nullable) - Model version number
- display_name (text, NOT NULL) - Human-readable model name
- modality (text, NOT NULL) - Type of content (image, video, text)
- task (text, NOT NULL) - Specific task (generation, enhancement, etc.)
- model_family (text, nullable) - Model family/group
- endpoint_path (text, nullable) - API endpoint for the model
- input_defaults (jsonb, NOT NULL, default: '{}') - Default input parameters
- capabilities (jsonb, NOT NULL, default: '{}') - Model capabilities
- pricing (jsonb, NOT NULL, default: '{}') - Pricing information
- output_format (text, nullable) - Expected output format
- is_active (boolean, NOT NULL, default: true) - Whether model is available
- is_default (boolean, NOT NULL, default: false) - Default model for task
- priority (integer, NOT NULL, default: 0) - Display/selection priority

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- **Provider Relationship**: Every model must belong to a provider (provider_id is NOT NULL)
- **Model Key Uniqueness**: model_key should be unique within a provider
- **Active Models**: Only active models (is_active = true) are available for use
- **Default Models**: Only one model per task/modality should be marked as default
- **Priority Ordering**: Models are displayed in priority order (lower numbers first)
- **Pricing Structure**: Pricing information stored as JSON for flexibility

## Example Queries
- Get all active models for image generation
```sql
SELECT id, display_name, model_key, modality, task, is_default, priority
FROM api_models 
WHERE is_active = true 
  AND modality = 'image' 
  AND task = 'generation'
ORDER BY priority, display_name;
```

- Get default models by task
```sql
SELECT modality, task, display_name, model_key
FROM api_models 
WHERE is_default = true 
  AND is_active = true
ORDER BY modality, task;
```

- Get models by provider
```sql
SELECT am.display_name, am.model_key, am.modality, am.task, ap.display_name as provider_name
FROM api_models am
JOIN api_providers ap ON am.provider_id = ap.id
WHERE am.is_active = true
ORDER BY ap.display_name, am.priority;
```

- Get model pricing information
```sql
SELECT display_name, model_key, pricing
FROM api_models 
WHERE is_active = true
ORDER BY display_name;
```

## Notes
- **Provider Integration**: Models are organized by external API providers
- **Configuration Flexibility**: JSON fields allow for complex model configurations
- **Versioning**: Model versions can be tracked for updates and rollbacks
- **Pricing Model**: Pricing stored as JSON to support various pricing structures
- **Capability Tracking**: Model capabilities help with feature availability
- **Priority System**: Priority field controls model selection order in UI
