# Table: jobs

**Last Updated:** December 19, 2024  
**Status:** ✅ Active  
**Purpose:** Track generation requests and link outputs (images/videos) with model/quality metadata

**Ownership:** System  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions (35 total columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- video_id (uuid, nullable) - Foreign key to videos table
- user_id (uuid, NOT NULL) - Foreign key to profiles table
- job_type (text, NOT NULL) - Job type (sdxl_image_fast/high, video_fast/high, image7b_*, video7b_*)
- status (text, default: 'queued') - Job status (queued | processing | completed | failed)
- error_message (text, nullable) - Error message if job failed
- attempts (integer, default: 0) - Number of retry attempts
- max_attempts (integer, default: 3) - Maximum retry attempts allowed
- metadata (jsonb) - Job-specific metadata and parameters
- project_id (uuid, nullable) - Foreign key to projects table
- image_id (uuid, nullable) - Foreign key to images_videos table
- format (text, nullable) - Output format (png, jpg, mp4, etc.)
- quality (text, nullable) - Quality setting (fast | high)
- model_type (text, nullable) - Model type used for generation
- prompt_test_id (uuid, nullable) - Foreign key to prompt testing
- test_metadata (jsonb) - Test-specific metadata
- moderation_status (text, default: 'pending') - Content moderation status
- reviewed_at (timestamptz, nullable) - When content was reviewed
- reviewed_by (uuid, nullable) - Who reviewed the content
- review_notes (text, nullable) - Review notes and comments
- enhancement_strategy (varchar(50), nullable) - Enhancement strategy used
- original_prompt (text, nullable) - Original user prompt
- enhanced_prompt (text, nullable) - Enhanced prompt after processing
- enhancement_time_ms (integer, nullable) - Time taken for enhancement
- quality_rating (numeric, nullable) - Quality rating score
- quality_improvement (numeric, nullable) - Quality improvement metric
- compel_weights (jsonb, nullable) - Compel prompt weights
- qwen_expansion_percentage (numeric, nullable) - Qwen expansion percentage
- destination (text, default: 'library') - Where to save output
- workspace_session_id (uuid, nullable) - Workspace session identifier
- template_name (text, nullable) - Prompt template used
- api_model_id (uuid, nullable) - Foreign key to API model configuration
```

## **RLS Policies**
```sql
-- Users can only access their own jobs
CREATE POLICY "Users can view own jobs" ON jobs
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own jobs
CREATE POLICY "Users can insert own jobs" ON jobs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- System can update job status
CREATE POLICY "System can update jobs" ON jobs
FOR UPDATE TO authenticated
USING (true);
```

## **Integration Map**
- **Pages/Components**
  - Workspace Page - Displays jobs grouped by metadata.job_id
  - Library Page - Shows completed jobs and their outputs
  - Admin Dashboard - Monitors job status and performance
- **Edge Functions**
  - queue-job - Inserts new jobs and routes to workers
  - job-callback - Updates job status and links image_id/video_id
  - system-metrics - Monitors job performance and queue depth
- **Services/Hooks**
  - AssetService - Reads job rows to infer bucket, model type, and enrich asset metadata
  - useJobStatus - React hook for real-time job status updates

## **Business Rules**
- **Job Ownership**: Each job must belong to a user (user_id is NOT NULL)
- **Output Linking**: Jobs can link to either image_id or video_id (not both)
- **Status Flow**: Jobs follow status progression: queued → processing → completed/failed
- **Metadata Storage**: Job parameters and settings stored in metadata JSONB
- **Job Grouping**: Workspace groups items by metadata.job_id for 1x3 image sets

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid-here",
  "image_id": "image-uuid-here",
  "video_id": null,
  "job_type": "sdxl_image_high",
  "model_type": "sdxl",
  "quality": "high",
  "metadata": {
    "job_id": "job-group-uuid",
    "prompt": "A beautiful landscape",
    "negative_prompt": "blurry, low quality",
    "reference_strength": 0.5,
    "exact_copy_mode": false
  },
  "status": "completed",
  "created_at": "2025-08-30T10:00:00Z"
}
```

## **Common Queries**
```sql
-- Get recent jobs for current user
SELECT id, job_type, status, created_at 
FROM jobs 
WHERE user_id = auth.uid()
ORDER BY created_at DESC 
LIMIT 50;

-- Get jobs by status
SELECT id, job_type, model_type, created_at 
FROM jobs 
WHERE user_id = auth.uid() AND status = 'processing'
ORDER BY created_at DESC;

-- Get job with output details
SELECT j.id, j.job_type, j.status, iv.file_path, iv.file_name
FROM jobs j
LEFT JOIN images_videos iv ON j.image_id = iv.id
WHERE j.user_id = auth.uid() AND j.id = 'job-uuid-here';

-- Get job performance metrics
SELECT 
  job_type,
  COUNT(*) as total_jobs,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
FROM jobs 
WHERE user_id = auth.uid() AND created_at > NOW() - INTERVAL '7 days'
GROUP BY job_type;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_jobs_user_created ON jobs(user_id, created_at DESC);
CREATE INDEX idx_jobs_image_id ON jobs(image_id);
CREATE INDEX idx_jobs_video_id ON jobs(video_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_job_type ON jobs(job_type);
```

## **Notes**
- **Job Grouping**: Jobs with same metadata.job_id are grouped in workspace for batch operations
- **Status Tracking**: Real-time status updates via WebSocket subscriptions
- **Metadata Flexibility**: JSONB allows flexible parameter storage for different job types
- **Performance**: Jobs table is heavily queried, proper indexing is critical
- **Cleanup**: Completed jobs are retained for user history and analytics
- **Worker Integration**: Jobs are routed to appropriate workers based on job_type
