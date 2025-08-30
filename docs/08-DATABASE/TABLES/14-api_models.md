# Table: api_models

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Available models per API provider for job routing and model selection

**Ownership:** Admin  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- created_at (timestamptz, NOT NULL, default: now()) - Creation timestamp
- updated_at (timestamptz, NOT NULL, default: now()) - Last update timestamp
- created_by (uuid, nullable) - Foreign key to profiles table (creator)
- provider_id (uuid, NOT NULL) - Foreign key to api_providers table
- model_key (text, NOT NULL) - Provider-specific model identifier
- version (text, nullable) - Model version
- display_name (text, NOT NULL) - Human-readable model name
- modality (text, NOT NULL) - Model modality (text, image, video, audio)
- task (text, NOT NULL) - Model task (generation, classification, etc.)
- model_family (text, nullable) - Model family/architecture
- endpoint_path (text, nullable) - API endpoint path
- input_defaults (jsonb, NOT NULL, default: '{}') - Default input parameters
- capabilities (jsonb, NOT NULL, default: '{}') - Model capabilities
- pricing (jsonb, NOT NULL, default: '{}') - Pricing information
- output_format (text, nullable) - Output format specification
- is_active (boolean, NOT NULL, default: true) - Whether model is active
- is_default (boolean, NOT NULL, default: false) - Whether model is default for task
- priority (integer, NOT NULL, default: 0) - Model priority for selection
```

## **RLS Policies**
```sql
-- Active models readable by authenticated users
CREATE POLICY "Active models readable" ON api_models
FOR SELECT TO authenticated
USING (is_active = true);

-- Admins can manage models
CREATE POLICY "Admins can manage models" ON api_models
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - Model management interface
  - Model Selection - Model choice for generation jobs
- **Edge Functions**
  - queue-job - Model selection for job routing
  - replicate-image - Model-specific API calls
- **Services/Hooks**
  - ModelService - Model management and selection
  - useAPIModels - Model data and operations

## **Business Rules**
- **Model Management**: Only admins can create, update, or delete models
- **Active Status**: Only active models are used for job routing
- **Provider Association**: Each model must belong to a provider
- **Priority System**: Models have priority for automatic selection
- **Default Models**: One model can be default for each task/modality
- **Capabilities**: Model capabilities stored as JSONB for flexibility
- **Pricing**: Pricing information stored as JSONB for cost tracking

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z",
  "created_by": "admin-uuid-here",
  "provider_id": "provider-uuid-here",
  "model_key": "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
  "version": "1.0",
  "display_name": "SDXL 1.0",
  "modality": "image",
  "task": "generation",
  "model_family": "SDXL",
  "endpoint_path": "/predictions",
  "input_defaults": {
    "prompt": "",
    "negative_prompt": "",
    "width": 1024,
    "height": 1024,
    "num_inference_steps": 50,
    "guidance_scale": 7.5
  },
  "capabilities": {
    "max_resolution": "1024x1024",
    "supports_negative_prompts": true,
    "supports_image_to_image": true,
    "supports_inpainting": false
  },
  "pricing": {
    "per_image": 0.0023,
    "currency": "USD",
    "billing_unit": "per_image"
  },
  "output_format": "image/jpeg",
  "is_active": true,
  "is_default": true,
  "priority": 1
}
```

## **Common Queries**
```sql
-- Get all active models
SELECT 
    am.*,
    ap.name as provider_name,
    ap.display_name as provider_display_name
FROM api_models am
JOIN api_providers ap ON am.provider_id = ap.id
WHERE am.is_active = true AND ap.is_active = true
ORDER BY am.priority, am.display_name;

-- Get models by modality and task
SELECT * FROM api_models
WHERE modality = 'image' AND task = 'generation' AND is_active = true
ORDER BY priority, display_name;

-- Get default models
SELECT 
    am.*,
    ap.name as provider_name
FROM api_models am
JOIN api_providers ap ON am.provider_id = ap.id
WHERE am.is_default = true AND am.is_active = true
ORDER BY am.modality, am.task;

-- Get models with usage statistics
SELECT 
    am.display_name,
    am.modality,
    am.task,
    ap.name as provider_name,
    COUNT(j.id) as total_jobs,
    COUNT(j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,
    COUNT(j.id) FILTER (WHERE j.status = 'failed') as failed_jobs,
    AVG(j.quality_rating) as avg_quality_rating
FROM api_models am
JOIN api_providers ap ON am.provider_id = ap.id
LEFT JOIN jobs j ON am.id = j.api_model_id
WHERE am.is_active = true
GROUP BY am.id, am.display_name, am.modality, am.task, ap.name
ORDER BY total_jobs DESC;

-- Get models by provider
SELECT * FROM api_models
WHERE provider_id = 'provider-uuid-here' AND is_active = true
ORDER BY priority, display_name;

-- Get model selection for job routing
SELECT 
    am.id,
    am.model_key,
    am.display_name,
    am.modality,
    am.task,
    am.input_defaults,
    am.capabilities,
    am.pricing,
    ap.name as provider_name,
    ap.base_url,
    ap.auth_scheme
FROM api_models am
JOIN api_providers ap ON am.provider_id = ap.id
WHERE am.is_active = true 
AND ap.is_active = true
AND am.modality = 'image'
AND am.task = 'generation'
ORDER BY am.priority, am.is_default DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_api_models_active ON api_models(is_active, priority);
CREATE INDEX idx_api_models_modality_task ON api_models(modality, task, is_active);
CREATE INDEX idx_api_models_provider ON api_models(provider_id, is_active);
CREATE INDEX idx_api_models_default ON api_models(is_default, modality, task) WHERE is_default = true;
CREATE INDEX idx_api_models_priority ON api_models(priority, is_active);
```

## **Notes**
- **Model Selection**: Priority system for automatic model selection
- **Capability Tracking**: JSONB storage for flexible capability definitions
- **Pricing Integration**: Cost tracking for job billing and optimization
- **Provider Integration**: Models linked to providers for API routing
- **Default Models**: Automatic selection for common tasks
- **Version Control**: Model versioning for tracking updates
- **Input Defaults**: Pre-configured parameters for each model
