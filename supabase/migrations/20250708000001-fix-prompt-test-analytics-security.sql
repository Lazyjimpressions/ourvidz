-- Fix security definer issue for prompt_test_analytics view
-- Drop the existing view with SECURITY DEFINER
DROP VIEW IF EXISTS public.prompt_test_analytics;

-- Recreate the view (defaults to SECURITY INVOKER for views)
CREATE VIEW public.prompt_test_analytics AS
SELECT 
    ptr.id AS test_id,
    ptr.prompt_text,
    ptr.model_type,
    ptr.model_version,
    ptr.quality_rating,
    ptr.notes,
    ptr.created_at AS test_created_at,
    ptr.generation_time_ms,
    ptr.success_rate,
    ptr.generation_parameters,
    j.id AS job_id,
    j.status AS job_status,
    j.created_at AS job_created_at,
    j.completed_at AS job_completed_at,
    i.id AS image_id,
    i.image_url,
    i.metadata AS image_metadata
FROM prompt_test_results ptr
LEFT JOIN jobs j ON ptr.job_id = j.id
LEFT JOIN images i ON ptr.image_id = i.id
ORDER BY ptr.created_at DESC;

-- Enable RLS on the view to enforce row-level security
ALTER VIEW public.prompt_test_analytics SET (security_barrier = true);

-- Add RLS policy to ensure users can only see their own test results
-- Admins can see all results
CREATE POLICY "Users can only see their own prompt test results" ON public.prompt_test_analytics
    FOR SELECT USING (
        -- Users can see their own test results
        tested_by = auth.uid() 
        OR 
        -- Admins can see all test results
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Grant appropriate permissions
GRANT SELECT ON public.prompt_test_analytics TO authenticated;
GRANT SELECT ON public.prompt_test_analytics TO anon;

-- Add comment for documentation
COMMENT ON VIEW public.prompt_test_analytics IS 
'Analytics view for prompt test results. Users can only see their own results, admins can see all results.'; 