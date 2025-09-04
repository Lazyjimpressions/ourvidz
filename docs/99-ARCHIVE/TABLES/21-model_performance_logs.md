# Table: model_performance_logs

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Model performance monitoring and metrics for optimization

**Ownership:** Admin  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- model_type (varchar(20), NOT NULL) - Model type (sdxl, wan, etc.)
- date (date, NOT NULL) - Performance date
- total_generations (integer, default: 0) - Total generations attempted
- successful_generations (integer, default: 0) - Successful generations
- failed_generations (integer, default: 0) - Failed generations
- avg_generation_time_ms (integer, nullable) - Average generation time in milliseconds
- avg_quality_rating (numeric, nullable) - Average quality rating
- total_processing_time_ms (integer, nullable) - Total processing time
- created_at (timestamptz, default: now()) - Creation timestamp
- updated_at (timestamptz, default: now()) - Last update timestamp
```

## **RLS Policies**
```sql
-- Admin access to model performance logs
CREATE POLICY "Admin access to model performance logs" ON model_performance_logs
FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role));
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - Model performance monitoring
  - Performance Analytics - Model optimization insights
- **Edge Functions**
  - All generation functions - Performance logging
  - system-metrics - Performance aggregation
- **Services/Hooks**
  - PerformanceService - Performance monitoring and analysis
  - useModelPerformance - Performance data and operations

## **Business Rules**
- **Daily Aggregation**: Performance metrics aggregated by date
- **Model Tracking**: Separate metrics for each model type
- **Success Rate**: Tracks successful vs failed generations
- **Performance Metrics**: Monitors generation time and quality
- **Admin Access**: Only admins can view performance data
- **Historical Tracking**: Maintains historical performance data

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "model_type": "sdxl",
  "date": "2025-08-30",
  "total_generations": 150,
  "successful_generations": 142,
  "failed_generations": 8,
  "avg_generation_time_ms": 45000,
  "avg_quality_rating": 8.2,
  "total_processing_time_ms": 6750000,
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z"
}
```

## **Common Queries**
```sql
-- Get performance by model type
SELECT * FROM model_performance_logs
WHERE model_type = 'sdxl'
ORDER BY date DESC
LIMIT 30;

-- Get success rates by model
SELECT 
    model_type,
    SUM(total_generations) as total_generations,
    SUM(successful_generations) as successful_generations,
    SUM(failed_generations) as failed_generations,
    ROUND(
        (SUM(successful_generations)::float / SUM(total_generations)) * 100, 2
    ) as success_rate_percentage,
    AVG(avg_quality_rating) as avg_quality
FROM model_performance_logs
WHERE date >= NOW() - INTERVAL '30 days'
GROUP BY model_type
ORDER BY success_rate_percentage DESC;

-- Get performance trends over time
SELECT 
    date,
    model_type,
    total_generations,
    successful_generations,
    avg_generation_time_ms,
    avg_quality_rating
FROM model_performance_logs
WHERE date >= NOW() - INTERVAL '30 days'
ORDER BY date DESC, model_type;

-- Get model performance comparison
SELECT 
    model_type,
    AVG(avg_generation_time_ms) as avg_time_ms,
    AVG(avg_quality_rating) as avg_quality,
    AVG(
        (successful_generations::float / total_generations) * 100
    ) as avg_success_rate
FROM model_performance_logs
WHERE date >= NOW() - INTERVAL '7 days'
GROUP BY model_type
ORDER BY avg_quality DESC;

-- Get performance anomalies (high failure rates)
SELECT 
    date,
    model_type,
    total_generations,
    failed_generations,
    ROUND(
        (failed_generations::float / total_generations) * 100, 2
    ) as failure_rate_percentage
FROM model_performance_logs
WHERE (failed_generations::float / total_generations) > 0.1
  AND date >= NOW() - INTERVAL '7 days'
ORDER BY failure_rate_percentage DESC;

-- Get quality trends
SELECT 
    DATE_TRUNC('week', date) as week,
    model_type,
    AVG(avg_quality_rating) as weekly_avg_quality,
    COUNT(*) as data_points
FROM model_performance_logs
WHERE date >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', date), model_type
ORDER BY week DESC, weekly_avg_quality DESC;

-- Get processing time analysis
SELECT 
    model_type,
    AVG(avg_generation_time_ms) as avg_time_ms,
    MIN(avg_generation_time_ms) as min_time_ms,
    MAX(avg_generation_time_ms) as max_time_ms,
    STDDEV(avg_generation_time_ms) as time_stddev
FROM model_performance_logs
WHERE avg_generation_time_ms IS NOT NULL
  AND date >= NOW() - INTERVAL '30 days'
GROUP BY model_type
ORDER BY avg_time_ms;

-- Get daily performance summary
SELECT 
    date,
    COUNT(DISTINCT model_type) as active_models,
    SUM(total_generations) as total_generations,
    SUM(successful_generations) as total_successful,
    AVG(avg_quality_rating) as overall_avg_quality
FROM model_performance_logs
WHERE date >= NOW() - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_model_performance_logs_model_date ON model_performance_logs(model_type, date DESC);
CREATE INDEX idx_model_performance_logs_date ON model_performance_logs(date DESC);
CREATE INDEX idx_model_performance_logs_quality ON model_performance_logs(avg_quality_rating DESC);
CREATE INDEX idx_model_performance_logs_time ON model_performance_logs(avg_generation_time_ms);
```

## **Notes**
- **Performance Monitoring**: Tracks model performance for optimization
- **Success Rate Analysis**: Monitors generation success rates
- **Quality Tracking**: Tracks average quality ratings over time
- **Processing Time**: Monitors generation speed and efficiency
- **Historical Data**: Maintains performance history for trend analysis
- **Model Comparison**: Enables comparison between different models
- **Optimization Insights**: Provides data for model selection and optimization
