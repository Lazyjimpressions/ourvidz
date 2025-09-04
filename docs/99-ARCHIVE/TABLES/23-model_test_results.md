# Table: model_test_results

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Model testing and validation results for quality assurance

**Ownership:** Admin  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, nullable) - Foreign key to profiles table (tester)
- model_type (varchar(20), NOT NULL) - Model type (sdxl, wan, etc.)
- model_version (varchar(50), nullable) - Model version
- prompt_text (text, NOT NULL) - Test prompt used
- success (boolean, NOT NULL, default: true) - Whether test was successful
- overall_quality (integer, nullable) - Overall quality rating (1-10)
- technical_quality (integer, nullable) - Technical quality rating (1-10)
- content_quality (integer, nullable) - Content quality rating (1-10)
- consistency (integer, nullable) - Consistency rating (1-10)
- test_series (varchar(100), NOT NULL) - Test series identifier
- test_tier (varchar(50), NOT NULL) - Test tier (basic, advanced, expert)
- test_category (varchar(100), nullable) - Test category
- test_metadata (jsonb, NOT NULL, default: '{}') - Test metadata
- job_id (uuid, nullable) - Foreign key to jobs table
- image_id (uuid, nullable) - Foreign key to generated image
- video_id (uuid, nullable) - Foreign key to generated video
- generation_time_ms (integer, nullable) - Generation time in milliseconds
- file_size_bytes (integer, nullable) - Generated file size
- notes (text, nullable) - Test notes
- created_at (timestamptz, default: now()) - Creation timestamp
- updated_at (timestamptz, default: now()) - Last update timestamp
- enhancement_strategy (varchar(50), nullable) - Enhancement strategy used
- original_prompt (text, nullable) - Original prompt before enhancement
- enhanced_prompt (text, nullable) - Enhanced prompt
- enhancement_time_ms (integer, nullable) - Enhancement time in milliseconds
- quality_improvement (numeric, nullable) - Quality improvement percentage
- compel_weights (jsonb, nullable) - Compel weights used
- qwen_expansion_percentage (numeric, nullable) - Qwen expansion percentage
- baseline_quality (numeric, nullable) - Baseline quality rating
```

## **RLS Policies**
```sql
-- Admin access to model test results
CREATE POLICY "Admin access to model test results" ON model_test_results
FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role));
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - Test results monitoring
  - Testing Interface - Test execution and results
  - Quality Analytics - Test result analysis
- **Edge Functions**
  - All generation functions - Test result logging
  - system-metrics - Test result aggregation
- **Services/Hooks**
  - TestService - Test execution and result management
  - useModelTestResults - Test result data and operations

## **Business Rules**
- **Test Tracking**: All model tests are tracked with detailed results
- **Quality Metrics**: Multiple quality dimensions tracked (overall, technical, content, consistency)
- **Test Series**: Tests organized into series for systematic evaluation
- **Test Tiers**: Different test complexity levels (basic, advanced, expert)
- **Metadata Storage**: Rich test context stored as JSONB
- **Enhancement Tracking**: Tracks prompt enhancement impact on quality
- **Admin Access**: Only admins can view and manage test results

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "admin-uuid-here",
  "model_type": "sdxl",
  "model_version": "1.0",
  "prompt_text": "A beautiful portrait of a young woman with detailed facial features",
  "success": true,
  "overall_quality": 8,
  "technical_quality": 9,
  "content_quality": 7,
  "consistency": 8,
  "test_series": "portrait_quality_2025",
  "test_tier": "advanced",
  "test_category": "portrait",
  "test_metadata": {
    "test_environment": "production",
    "api_provider": "replicate",
    "enhancement_enabled": true,
    "compel_config_hash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234"
  },
  "job_id": "job-uuid-here",
  "image_id": "image-uuid-here",
  "video_id": null,
  "generation_time_ms": 45000,
  "file_size_bytes": 2048576,
  "notes": "Excellent technical quality, good facial detail, slight room for improvement in artistic style",
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z",
  "enhancement_strategy": "qwen_compel",
  "original_prompt": "A beautiful portrait of a young woman",
  "enhanced_prompt": "A beautiful portrait of a young woman with detailed facial features, professional lighting, high resolution, photorealistic",
  "enhancement_time_ms": 2000,
  "quality_improvement": 15.5,
  "compel_weights": {
    "portrait": 1.2,
    "detailed": 1.1
  },
  "qwen_expansion_percentage": 0.3,
  "baseline_quality": 6.5
}
```

## **Common Queries**
```sql
-- Get test results by model type
SELECT * FROM model_test_results
WHERE model_type = 'sdxl'
ORDER BY created_at DESC
LIMIT 100;

-- Get test results by series
SELECT 
    test_series,
    COUNT(*) as total_tests,
    AVG(overall_quality) as avg_quality,
    AVG(technical_quality) as avg_technical,
    AVG(content_quality) as avg_content,
    AVG(consistency) as avg_consistency
FROM model_test_results
WHERE success = true
GROUP BY test_series
ORDER BY avg_quality DESC;

-- Get quality improvement analysis
SELECT 
    enhancement_strategy,
    COUNT(*) as test_count,
    AVG(quality_improvement) as avg_improvement,
    AVG(enhancement_time_ms) as avg_enhancement_time
FROM model_test_results
WHERE enhancement_strategy IS NOT NULL
  AND quality_improvement IS NOT NULL
GROUP BY enhancement_strategy
ORDER BY avg_improvement DESC;

-- Get test results by tier
SELECT 
    test_tier,
    COUNT(*) as total_tests,
    AVG(overall_quality) as avg_quality,
    COUNT(*) FILTER (WHERE success = true) as successful_tests,
    ROUND(
        (COUNT(*) FILTER (WHERE success = true)::float / COUNT(*)) * 100, 2
    ) as success_rate
FROM model_test_results
GROUP BY test_tier
ORDER BY avg_quality DESC;

-- Get recent test results
SELECT 
    mtr.*,
    p.username as tester_name
FROM model_test_results mtr
LEFT JOIN profiles p ON mtr.user_id = p.id
WHERE mtr.created_at >= NOW() - INTERVAL '7 days'
ORDER BY mtr.created_at DESC;

-- Get test performance comparison
SELECT 
    model_type,
    model_version,
    COUNT(*) as total_tests,
    AVG(overall_quality) as avg_quality,
    AVG(generation_time_ms) as avg_generation_time,
    COUNT(*) FILTER (WHERE success = true) as successful_tests
FROM model_test_results
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY model_type, model_version
ORDER BY avg_quality DESC;

-- Get enhancement strategy effectiveness
SELECT 
    enhancement_strategy,
    COUNT(*) as test_count,
    AVG(quality_improvement) as avg_improvement,
    AVG(enhancement_time_ms) as avg_time,
    AVG(overall_quality) as avg_final_quality
FROM model_test_results
WHERE enhancement_strategy IS NOT NULL
  AND success = true
GROUP BY enhancement_strategy
ORDER BY avg_improvement DESC;

-- Get test results by category
SELECT 
    test_category,
    COUNT(*) as total_tests,
    AVG(overall_quality) as avg_quality,
    AVG(technical_quality) as avg_technical,
    AVG(content_quality) as avg_content
FROM model_test_results
WHERE test_category IS NOT NULL
  AND success = true
GROUP BY test_category
ORDER BY avg_quality DESC;

-- Get quality trends over time
SELECT 
    DATE_TRUNC('week', created_at) as week,
    model_type,
    AVG(overall_quality) as weekly_avg_quality,
    COUNT(*) as test_count
FROM model_test_results
WHERE success = true
  AND created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', created_at), model_type
ORDER BY week DESC, weekly_avg_quality DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_model_test_results_model_created ON model_test_results(model_type, created_at DESC);
CREATE INDEX idx_model_test_results_series ON model_test_results(test_series, created_at DESC);
CREATE INDEX idx_model_test_results_tier ON model_test_results(test_tier, overall_quality DESC);
CREATE INDEX idx_model_test_results_quality ON model_test_results(overall_quality DESC);
CREATE INDEX idx_model_test_results_enhancement ON model_test_results(enhancement_strategy, quality_improvement DESC);
CREATE INDEX idx_model_test_results_success ON model_test_results(success, created_at DESC);
```

## **Notes**
- **Quality Assurance**: Comprehensive testing framework for model validation
- **Multi-dimensional Quality**: Tracks overall, technical, content, and consistency quality
- **Enhancement Analysis**: Measures impact of prompt enhancement strategies
- **Test Organization**: Systematic test series and tiers for structured evaluation
- **Performance Tracking**: Monitors generation time and file sizes
- **Metadata Rich**: Flexible JSONB storage for detailed test context
- **Trend Analysis**: Historical data for quality improvement tracking
