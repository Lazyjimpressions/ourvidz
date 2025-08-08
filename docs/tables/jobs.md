# Table: jobs

Purpose: Track generation requests and link outputs (images/videos) with model/quality metadata.

## Schema (typical columns)
- id (uuid, pk)
- user_id (uuid)
- image_id (uuid|null)
- video_id (uuid|null)
- job_type (text) – e.g., sdxl_image_fast/high, video_fast/high, image7b_*, video7b_*
- model_type (text|null)
- quality (text|null) – fast | high
- metadata (jsonb)
- status (text) – queued | processing | completed | failed
- created_at (timestamptz)

## Integration Map
- Edge Functions
  - queue-job (inserts job)
  - job-callback (updates status, links image_id/video_id)
- Services
  - AssetService (reads job rows to infer bucket, model type, and to enrich asset metadata with `job_id`)
- Workspace
  - Items grouped by `metadata.job_id` (populated from jobs.id) for 1x3 image sets

## Indexing
- Recommended: (user_id, created_at desc), (image_id), (video_id), (status)

## Example Queries
- Recent jobs for user
```sql
select id, job_type, status, created_at from jobs
where user_id = auth.uid()
order by created_at desc
limit 50;
```
