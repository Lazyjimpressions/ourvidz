# Table: usage_logs

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Platform usage tracking and analytics for business intelligence

**Ownership:** User  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, NOT NULL) - Foreign key to profiles table
- action (text, NOT NULL) - User action performed
- credits_consumed (numeric, default: 1.0) - Credits consumed for action
- metadata (jsonb, nullable) - Additional usage metadata
- created_at (timestamptz, default: now()) - Usage timestamp
- format (text, nullable) - Output format (image, video, etc.)
- quality (text, nullable) - Quality setting used
```

## **RLS Policies**
```sql
-- Usage logs access policy
CREATE POLICY "Usage logs access policy" ON usage_logs
FOR ALL TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (auth.uid() = user_id)
);
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - Usage analytics and monitoring
  - User Dashboard - Personal usage statistics
  - Billing Interface - Credit consumption tracking
- **Edge Functions**
  - All generation functions - Usage logging
  - system-metrics - Usage aggregation
- **Services/Hooks**
  - UsageService - Usage tracking and analytics
  - useUsageLogs - Usage data and operations

## **Business Rules**
- **Credit Tracking**: All actions consume credits based on complexity
- **User Ownership**: Each usage log belongs to a user
- **Metadata Storage**: Additional context stored as JSONB
- **Format Tracking**: Output format affects credit consumption
- **Quality Impact**: Quality settings affect credit costs
- **Admin Access**: Admins can view all usage data

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid-here",
  "action": "image_generation",
  "credits_consumed": 2.5,
  "metadata": {
    "model_used": "sdxl",
    "prompt_length": 150,
    "generation_time_ms": 45000,
    "file_size_bytes": 2048576,
    "enhancement_strategy": "qwen_compel",
    "api_provider": "replicate"
  },
  "created_at": "2025-08-30T10:00:00Z",
  "format": "image",
  "quality": "high"
}
```

## **Common Queries**
```sql
-- Get user's usage history
SELECT * FROM usage_logs
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 100;

-- Get user's credit consumption summary
SELECT 
    SUM(credits_consumed) as total_credits_consumed,
    COUNT(*) as total_actions,
    AVG(credits_consumed) as avg_credits_per_action
FROM usage_logs
WHERE user_id = auth.uid()
  AND created_at >= NOW() - INTERVAL '30 days';

-- Get usage by action type
SELECT 
    action,
    COUNT(*) as action_count,
    SUM(credits_consumed) as total_credits,
    AVG(credits_consumed) as avg_credits
FROM usage_logs
WHERE user_id = auth.uid()
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY action
ORDER BY total_credits DESC;

-- Get usage by format and quality
SELECT 
    format,
    quality,
    COUNT(*) as usage_count,
    SUM(credits_consumed) as total_credits
FROM usage_logs
WHERE user_id = auth.uid()
  AND format IS NOT NULL
  AND quality IS NOT NULL
GROUP BY format, quality
ORDER BY total_credits DESC;

-- Get daily usage statistics
SELECT 
    DATE_TRUNC('day', created_at) as day,
    COUNT(*) as daily_actions,
    SUM(credits_consumed) as daily_credits
FROM usage_logs
WHERE user_id = auth.uid()
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

-- Get platform-wide usage analytics (admin only)
SELECT 
    action,
    COUNT(*) as total_actions,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(credits_consumed) as total_credits,
    AVG(credits_consumed) as avg_credits
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY total_credits DESC;

-- Get user ranking by credit consumption
SELECT 
    ul.user_id,
    p.username,
    SUM(ul.credits_consumed) as total_credits,
    COUNT(ul.id) as total_actions
FROM usage_logs ul
JOIN profiles p ON ul.user_id = p.id
WHERE ul.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ul.user_id, p.username
ORDER BY total_credits DESC
LIMIT 20;

-- Get usage trends over time
SELECT 
    DATE_TRUNC('week', created_at) as week,
    action,
    COUNT(*) as weekly_actions,
    SUM(credits_consumed) as weekly_credits
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', created_at), action
ORDER BY week DESC, weekly_credits DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_usage_logs_user_created ON usage_logs(user_id, created_at DESC);
CREATE INDEX idx_usage_logs_action ON usage_logs(action, created_at DESC);
CREATE INDEX idx_usage_logs_format_quality ON usage_logs(format, quality);
CREATE INDEX idx_usage_logs_created ON usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_credits ON usage_logs(credits_consumed DESC);
```

## **Notes**
- **Credit Management**: Tracks credit consumption for billing and quota management
- **Usage Analytics**: Provides insights into platform usage patterns
- **Format Tracking**: Different output formats have different credit costs
- **Quality Impact**: Higher quality settings consume more credits
- **Business Intelligence**: Enables data-driven decisions about pricing and features
- **User Insights**: Helps understand user behavior and preferences
- **Billing Support**: Essential for accurate billing and credit management
