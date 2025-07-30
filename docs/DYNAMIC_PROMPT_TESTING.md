# Dynamic Prompt Management System - Testing Guide

## Overview
This document outlines the testing procedures and validation methods for the Dynamic Prompt Management System implemented in OurVidz.

## System Components

### 1. Database Schema
- `prompt_templates`: Stores enhancement templates for different models and content types
- `negative_prompts`: Stores negative prompts organized by model and content mode
- `system_config`: Caches frequently accessed templates and configuration data

### 2. Edge Functions
- `enhance-prompt`: AI-powered prompt enhancement using cached templates
- `queue-job`: Job submission with dynamic negative prompt generation
- `playground-chat`: Chat functionality with content-aware system prompts
- `refresh-prompt-cache`: Cache management and refresh functionality
- `test-edge-functions`: Comprehensive testing suite

### 3. Admin Interface
- `PromptManagementTab`: CRUD operations for templates and negative prompts
- Cache refresh controls and monitoring
- Real-time template management

## Testing Procedures

### 1. Cache Functionality Test
```typescript
// Test cache retrieval and validation
const cacheTest = await testCacheFunctionality();
```

**What it tests:**
- Cache data exists in `system_config` table
- Cache contains prompt templates and negative prompts
- Cache metadata is present and recent
- Cache structure is valid

**Expected results:**
- Cache age < 24 hours (warning if older)
- Template count > 0
- Negative prompt count > 0
- Valid metadata with refresh timestamp

### 2. Content Detection Test
```typescript
// Test SFW/NSFW content classification
const contentTest = await testContentDetection();
```

**Test cases:**
- "beautiful landscape" → SFW
- "nude woman on beach" → NSFW
- "family portrait" → SFW
- "sexy adult content" → NSFW
- "children playing in park" → SFW

**What it validates:**
- NSFW term list is loaded from cache
- Content detection logic works correctly
- Edge cases are handled properly

### 3. Template Retrieval Test
```typescript
// Test template loading from cache and database
const templateTest = await testTemplateRetrieval();
```

**What it tests:**
- Cache template retrieval works
- Database fallback is functional
- Template structure is correct
- Active templates are available

### 4. Negative Prompt Generation Test
```typescript
// Test negative prompt merging and generation
const negativeTest = await testNegativePromptGeneration();
```

**What it validates:**
- Cache negative prompts are available
- Database negative prompts exist
- User prompt merging works correctly
- Model-specific prompts are retrieved

### 5. Edge Function Integration Test
```typescript
// Test end-to-end functionality
const integrationTest = await testEdgeFunctionIntegration();
```

**What it tests:**
- `enhance-prompt` function responds correctly
- `queue-job` function processes requests
- Functions use cached data properly
- Error handling works as expected

## Running Tests

### Manual Testing via Admin Interface
1. Navigate to Admin Dashboard → Prompt Management
2. Use "Refresh Cache" button to update cached data
3. Verify template and negative prompt counts
4. Test CRUD operations on templates

### Automated Testing via API
```bash
# Run all tests
curl -X POST https://your-project.supabase.co/functions/v1/test-edge-functions \
  -H "Content-Type: application/json" \
  -d '{"testType": "all"}'

# Run specific test
curl -X POST https://your-project.supabase.co/functions/v1/test-edge-functions \
  -H "Content-Type: application/json" \
  -d '{"testType": "cache"}'
```

### Test Types Available
- `all`: Run complete test suite
- `cache`: Test cache functionality only
- `content`: Test content detection only
- `templates`: Test template retrieval only
- `negative`: Test negative prompt generation only
- `integration`: Test edge function integration only

## Performance Monitoring

### Key Metrics
- **Cache Hit Rate**: Should be > 90% for optimal performance
- **Fallback Usage**: Level 0 (cache) preferred, Level 2+ indicates issues
- **Response Times**: 
  - Cache retrieval: < 100ms
  - Database fallback: < 500ms
  - Complete enhancement: < 2000ms

### Monitoring Tools
- Built-in EdgeFunctionMonitor class
- Performance logging in all edge functions
- Cache validation and integrity checking
- Automated recommendations based on test results

## Troubleshooting

### Common Issues

#### 1. Cache Not Found
**Symptoms:** Tests fail with "Cache not found or empty"
**Solution:** Run cache refresh via admin interface

#### 2. Content Detection Failing
**Symptoms:** SFW/NSFW detection gives wrong results
**Solutions:** 
- Check NSFW terms in cache
- Verify content detection logic
- Update NSFW term list if needed

#### 3. Template Retrieval Failing
**Symptoms:** No templates found in cache or database
**Solutions:**
- Verify active templates exist in database
- Run cache refresh
- Check template structure matches expected format

#### 4. High Fallback Usage
**Symptoms:** Functions frequently use Level 2+ fallbacks
**Solutions:**
- Check cache refresh frequency
- Verify database template availability
- Monitor worker connectivity

### Performance Issues

#### 1. Slow Response Times
- Check cache age and refresh if needed
- Monitor database query performance
- Verify worker connectivity

#### 2. High Error Rates
- Check edge function logs
- Verify database connectivity
- Review template and negative prompt data quality

## Best Practices

### 1. Regular Cache Maintenance
- Refresh cache daily or when templates are updated
- Monitor cache age and set up alerts
- Validate cache integrity regularly

### 2. Template Management
- Keep templates active and well-organized
- Use descriptive template names
- Test templates before activating

### 3. Performance Optimization
- Monitor fallback usage and minimize Level 2+ fallbacks
- Keep cache fresh (< 24 hours)
- Optimize database queries for template retrieval

### 4. Content Safety
- Regularly review and update NSFW term lists
- Test content detection with edge cases
- Monitor content classification accuracy

## Monitoring Dashboard

The admin interface provides real-time monitoring:
- Cache status and age
- Template and negative prompt counts
- Recent cache refresh history
- Performance metrics and alerts

## Alerts and Notifications

Set up monitoring for:
- Cache age > 24 hours
- High fallback usage (> 10% Level 2+)
- Template/negative prompt count drops
- Edge function error rates > 5%
- Response times > threshold values

## Conclusion

Regular testing and monitoring ensure the Dynamic Prompt Management System operates efficiently and provides consistent, high-quality results. Use this guide to establish testing procedures and maintain system health.