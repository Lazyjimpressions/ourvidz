# Table: user_activity_log

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** User behavior and activity monitoring for analytics and security

**Ownership:** User  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, nullable) - Foreign key to profiles table
- action (text, NOT NULL) - User action performed
- resource_type (text, nullable) - Type of resource accessed
- resource_id (text, nullable) - ID of resource accessed
- metadata (jsonb, nullable, default: '{}') - Additional action metadata
- ip_address (inet, nullable) - User's IP address
- user_agent (text, nullable) - User's browser/device information
- created_at (timestamptz, default: now()) - Action timestamp
```

## **RLS Policies**
```sql
-- User activity log select policy
CREATE POLICY "User activity log select policy" ON user_activity_log
FOR SELECT TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (auth.uid() = user_id)
);

-- User activity log admin operations
CREATE POLICY "User activity log admin operations" ON user_activity_log
FOR INSERT TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User activity log admin updates
CREATE POLICY "User activity log admin updates" ON user_activity_log
FOR UPDATE TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- User activity log admin deletes
CREATE POLICY "User activity log admin deletes" ON user_activity_log
FOR DELETE TO public
USING (has_role(auth.uid(), 'admin'::app_role));
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - User activity monitoring
  - Analytics Dashboard - User behavior analysis
  - Security Monitoring - Suspicious activity detection
- **Edge Functions**
  - All edge functions - Activity logging
  - system-metrics - Activity aggregation
- **Services/Hooks**
  - ActivityLogService - Activity logging and retrieval
  - useActivityLog - Activity data and operations

## **Business Rules**
- **User Tracking**: All user actions are logged for analytics and security
- **Admin Access**: Admins can view all activity logs
- **User Privacy**: Users can only view their own activity
- **Metadata Storage**: Additional context stored as JSONB
- **Security Monitoring**: IP addresses and user agents tracked for security
- **Resource Tracking**: Actions linked to specific resources when applicable

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid-here",
  "action": "image_generated",
  "resource_type": "image",
  "resource_id": "image-uuid-here",
  "metadata": {
    "model_used": "sdxl",
    "prompt": "A beautiful sunset over mountains",
    "generation_time_ms": 45000,
    "file_size_bytes": 2048576,
    "quality": "high",
    "enhancement_strategy": "qwen_compel"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "created_at": "2025-08-30T10:00:00Z"
}
```

## **Common Queries**
```sql
-- Get user's own activity log
SELECT * FROM user_activity_log
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 100;

-- Get activity by action type
SELECT 
    action,
    COUNT(*) as action_count,
    COUNT(DISTINCT user_id) as unique_users
FROM user_activity_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY action_count DESC;

-- Get user activity summary
SELECT 
    user_id,
    COUNT(*) as total_actions,
    COUNT(DISTINCT action) as unique_actions,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action
FROM user_activity_log
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_actions DESC;

-- Get activity by resource type
SELECT 
    resource_type,
    COUNT(*) as access_count,
    COUNT(DISTINCT user_id) as unique_users
FROM user_activity_log
WHERE resource_type IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY resource_type
ORDER BY access_count DESC;

-- Get suspicious activity (multiple rapid actions)
SELECT 
    user_id,
    action,
    COUNT(*) as action_count,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action
FROM user_activity_log
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id, action
HAVING COUNT(*) > 10
ORDER BY action_count DESC;

-- Get activity by IP address
SELECT 
    ip_address,
    COUNT(*) as request_count,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_request,
    MAX(created_at) as last_request
FROM user_activity_log
WHERE ip_address IS NOT NULL
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY request_count DESC;

-- Get feature usage statistics
SELECT 
    action,
    DATE_TRUNC('day', created_at) as day,
    COUNT(*) as daily_usage
FROM user_activity_log
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY action, DATE_TRUNC('day', created_at)
ORDER BY day DESC, daily_usage DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_user_activity_log_user_created ON user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_user_activity_log_action ON user_activity_log(action, created_at DESC);
CREATE INDEX idx_user_activity_log_resource ON user_activity_log(resource_type, resource_id);
CREATE INDEX idx_user_activity_log_created ON user_activity_log(created_at DESC);
CREATE INDEX idx_user_activity_log_ip ON user_activity_log(ip_address, created_at DESC);
```

## **Notes**
- **Security Monitoring**: Tracks IP addresses and user agents for security analysis
- **Analytics**: Provides insights into user behavior and feature usage
- **Resource Tracking**: Links actions to specific resources for detailed analysis
- **Metadata Flexibility**: JSONB storage allows for rich contextual information
- **Privacy Protection**: Users can only access their own activity data
- **Admin Oversight**: Admins can monitor all user activity for security and analytics
- **Performance**: Optimized for time-based queries and user-specific access patterns
