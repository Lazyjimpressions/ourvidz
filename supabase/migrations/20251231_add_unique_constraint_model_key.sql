-- Migration: Add unique constraint on api_models.model_key
-- Applied via Supabase MCP on 2025-12-31
--
-- This enables ON CONFLICT upsert operations on model_key

ALTER TABLE api_models ADD CONSTRAINT api_models_model_key_unique UNIQUE (model_key);
