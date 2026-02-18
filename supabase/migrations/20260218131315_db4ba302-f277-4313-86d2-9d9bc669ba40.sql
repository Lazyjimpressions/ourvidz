-- Insert MythoMax as the default enhancement model
INSERT INTO public.api_models (display_name, model_key, modality, task, is_default, is_active, priority, provider_id)
VALUES ('MythoMax 13B', 'gryphe/mythomax-l2-13b', 'chat', 'enhancement', true, true, 10, '6631ce1d-342b-4d23-920a-c10102d7cfdc')
ON CONFLICT DO NOTHING;