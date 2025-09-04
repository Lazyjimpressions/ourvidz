# Table: prompt_ab_tests

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Prompt testing and optimization through A/B testing

**Ownership:** Admin  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- test_name (varchar(100), NOT NULL) - Test name
- test_series (varchar(100), NOT NULL) - Test series identifier
- baseline_config (jsonb, NOT NULL) - Baseline configuration
- enhanced_config (jsonb, NOT NULL) - Enhanced configuration
- total_participants (integer, default: 0) - Total participants in test
- baseline_avg_quality (numeric, nullable) - Baseline average quality
- enhanced_avg_quality (numeric, nullable) - Enhanced average quality
- quality_improvement (numeric, nullable) - Quality improvement percentage
- confidence_level (numeric, nullable) - Statistical confidence level
- is_complete (boolean, default: false) - Whether test is complete
- created_at (timestamptz, default: now()) - Creation timestamp
- completed_at (timestamptz, nullable) - Completion timestamp
```

## **RLS Policies**
```sql
-- Admin access to prompt ab tests
CREATE POLICY "Admin access to prompt ab tests" ON prompt_ab_tests
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - A/B test management
  - Testing Interface - Test execution and monitoring
  - Analytics Dashboard - Test result analysis
- **Edge Functions**
  - enhance-prompt - A/B test configuration application
  - system-metrics - Test result aggregation
- **Services/Hooks**
  - ABTestService - A/B test management and execution
  - usePromptABTests - A/B test data and operations

## **Business Rules**
- **Test Management**: A/B tests compare baseline vs enhanced configurations
- **Statistical Analysis**: Tracks quality improvements and confidence levels
- **Test Series**: Tests organized into series for systematic evaluation
- **Participant Tracking**: Monitors number of participants in each test
- **Completion Status**: Tests can be marked as complete when sufficient data collected
- **Admin Access**: Only admins can create and manage A/B tests
- **Configuration Storage**: Both baseline and enhanced configs stored as JSONB

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "test_name": "Portrait Enhancement v2",
  "test_series": "portrait_optimization_2025",
  "baseline_config": {
    "enhancement_strategy": "none",
    "compel_weights": {},
    "qwen_settings": {
      "enabled": false
    }
  },
  "enhanced_config": {
    "enhancement_strategy": "qwen_compel",
    "compel_weights": {
      "portrait": 1.2,
      "detailed": 1.1,
      "professional": 1.0
    },
    "qwen_settings": {
      "enabled": true,
      "expansion_percentage": 0.3,
      "style_enhancement": true
    }
  },
  "total_participants": 150,
  "baseline_avg_quality": 6.8,
  "enhanced_avg_quality": 8.2,
  "quality_improvement": 20.6,
  "confidence_level": 95.2,
  "is_complete": true,
  "created_at": "2025-08-30T10:00:00Z",
  "completed_at": "2025-08-30T15:30:00Z"
}
```

## **Common Queries**
```sql
-- Get all A/B tests
SELECT * FROM prompt_ab_tests
ORDER BY created_at DESC;

-- Get completed tests
SELECT * FROM prompt_ab_tests
WHERE is_complete = true
ORDER BY quality_improvement DESC;

-- Get tests by series
SELECT 
    test_series,
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE is_complete = true) as completed_tests,
    AVG(quality_improvement) as avg_improvement
FROM prompt_ab_tests
GROUP BY test_series
ORDER BY avg_improvement DESC;

-- Get test results with statistical significance
SELECT 
    test_name,
    test_series,
    baseline_avg_quality,
    enhanced_avg_quality,
    quality_improvement,
    confidence_level,
    total_participants
FROM prompt_ab_tests
WHERE is_complete = true
  AND confidence_level >= 90
ORDER BY quality_improvement DESC;

-- Get ongoing tests
SELECT 
    test_name,
    test_series,
    total_participants,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as hours_running
FROM prompt_ab_tests
WHERE is_complete = false
ORDER BY created_at DESC;

-- Get test performance by series
SELECT 
    test_series,
    COUNT(*) as total_tests,
    AVG(quality_improvement) as avg_improvement,
    MAX(quality_improvement) as max_improvement,
    MIN(quality_improvement) as min_improvement,
    AVG(confidence_level) as avg_confidence
FROM prompt_ab_tests
WHERE is_complete = true
GROUP BY test_series
ORDER BY avg_improvement DESC;

-- Get recent test activity
SELECT 
    test_name,
    test_series,
    is_complete,
    total_participants,
    quality_improvement,
    created_at,
    completed_at
FROM prompt_ab_tests
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Get test completion time analysis
SELECT 
    test_series,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) as avg_completion_hours,
    COUNT(*) as completed_tests
FROM prompt_ab_tests
WHERE is_complete = true
  AND completed_at IS NOT NULL
GROUP BY test_series
ORDER BY avg_completion_hours;

-- Get configuration comparison
SELECT 
    test_name,
    baseline_config->>'enhancement_strategy' as baseline_strategy,
    enhanced_config->>'enhancement_strategy' as enhanced_strategy,
    quality_improvement,
    confidence_level
FROM prompt_ab_tests
WHERE is_complete = true
ORDER BY quality_improvement DESC;

-- Get participant distribution
SELECT 
    test_series,
    AVG(total_participants) as avg_participants,
    MIN(total_participants) as min_participants,
    MAX(total_participants) as max_participants,
    COUNT(*) as test_count
FROM prompt_ab_tests
WHERE is_complete = true
GROUP BY test_series
ORDER BY avg_participants DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_prompt_ab_tests_series ON prompt_ab_tests(test_series, created_at DESC);
CREATE INDEX idx_prompt_ab_tests_complete ON prompt_ab_tests(is_complete, quality_improvement DESC);
CREATE INDEX idx_prompt_ab_tests_improvement ON prompt_ab_tests(quality_improvement DESC, confidence_level DESC);
CREATE INDEX idx_prompt_ab_tests_created ON prompt_ab_tests(created_at DESC);
CREATE INDEX idx_prompt_ab_tests_confidence ON prompt_ab_tests(confidence_level DESC, is_complete);
```

## **Notes**
- **A/B Testing Framework**: Systematic comparison of prompt enhancement strategies
- **Statistical Analysis**: Tracks quality improvements and confidence levels
- **Test Series Organization**: Groups related tests for systematic evaluation
- **Participant Management**: Monitors test participation and completion
- **Configuration Comparison**: Compares baseline vs enhanced configurations
- **Quality Optimization**: Data-driven approach to prompt enhancement
- **Confidence Tracking**: Statistical significance for reliable results
