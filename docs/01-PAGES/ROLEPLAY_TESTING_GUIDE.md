# Roleplay Testing Guide

**Last Updated:** December 17, 2025  
**Status:** ✅ **READY** - Comprehensive test suite implemented

## Overview

This guide provides instructions for executing the comprehensive roleplay testing suite. The test suite covers all user paths, database interactions, AI response quality, and system prompting.

**Quick Start:** See `scripts/test-roleplay/README.md` for the main testing documentation.

## Test Suite Structure

All test scripts are located in `scripts/test-roleplay/`:

1. **setup-test-data.sql** - Creates test characters, scenes, and verifies configuration
2. **verify-test-data.sql** - Verifies test data is correctly set up
3. **test-character-selection.ts** - Tests character selection and navigation
4. **test-chat-interactions.ts** - Tests chat interactions and scene generation
5. **test-system-prompts.ts** - Tests system prompt and template application
6. **test-database-state.ts** - Tests database state and persistence
7. **run-all-roleplay-tests.ts** - Main test runner for all suites
8. **test-results-template.md** - Template for manual test documentation

## Pre-Test Setup

### 1. Cursor Secrets (Already Configured ✅)

Supabase credentials are configured in Cursor secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional)

### 2. Create Test Data (One-time)

**Step 1:** Open Supabase SQL Editor

**Step 2:** Find pokercpa05 user ID
```sql
SELECT id, email FROM auth.users WHERE email LIKE '%pokercpa05%';
```

**Step 3:** Run `scripts/test-roleplay/setup-test-data.sql`
- Replace `{USER_ID}` with the ID from step 2
- Execute the SQL

**Step 4:** Verify test data setup
```sql
-- Run scripts/test-roleplay/verify-test-data.sql
```

## Running Tests

### Run All Tests

```bash
npm run test:roleplay
```

This executes all test suites in order and generates a comprehensive report.

### Run Individual Test Suites

```bash
npm run test:roleplay:character  # Character Selection & Navigation
npm run test:roleplay:chat       # Chat Interactions
npm run test:roleplay:prompts    # System Prompts
npm run test:roleplay:database   # Database State
```

### Manual Testing

For manual testing, use the browser to test UI flows:

1. Navigate to `/roleplay`
2. Click character card
3. Test chat interactions
4. Test scene generation
5. Test settings
6. Document results using `scripts/test-roleplay/test-results-template.md`

## Test Coverage

### Category 1: Character Selection & Navigation
- ✅ Direct character selection (no modal)
- ✅ Character selection with scene
- ✅ Character info drawer

### Category 2: Chat Interaction Paths
- ✅ Conversation kickoff
- ✅ Regular message exchange
- ✅ Message with scene generation
- ✅ Manual scene generation

### Category 3: System Prompt & Template Testing
- ✅ Prompt template application
- ✅ Character data integration
- ✅ Scene system prompt application

### Category 4: Memory Tier Testing
- ⏳ Conversation memory tier
- ⏳ Character memory tier
- ⏳ Profile memory tier

### Category 5: Image Generation Testing
- ⏳ SDXL local model
- ⏳ Replicate API models
- ⏳ Image model fallback

### Category 6: Model Selection Testing
- ⏳ Chat model selection
- ⏳ Image model selection
- ⏳ Local model availability

### Category 7: Scene Context Testing
- ⏳ Scene with system prompt
- ⏳ Scene with starters
- ⏳ Scene priority selection

### Category 8: Edge Cases & Error Handling
- ⏳ Character not found
- ⏳ No scenes available
- ⏳ Scene generation failure
- ⏳ API model unavailable
- ⏳ Conversation timeout

### Category 9: Database State Verification
- ✅ Conversation lifecycle
- ✅ Message persistence
- ✅ Scene image storage

### Category 10: Integration Testing
- ⏳ Full conversation flow
- ⏳ Settings persistence

**Legend:**
- ✅ Implemented
- ⏳ Planned (can be tested manually)

## Test Results

### Automated Test Results

Test results are saved to:
```
scripts/test-roleplay/test-results/report-{timestamp}.md
```

Each report includes:
- Test suite summary
- Pass/fail status for each test
- Detailed output and errors
- Duration metrics

### Manual Test Documentation

Use `test-results-template.md` to document:
- Test execution details
- Database state (before/after)
- AI response samples
- Performance metrics
- Issues found
- Screenshots

## Database Verification

### After Each Test

Verify database state:

```sql
-- Check conversations
SELECT id, status, memory_tier, updated_at 
FROM conversations 
WHERE character_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY updated_at DESC;

-- Check messages
SELECT id, sender, content, created_at 
FROM messages 
WHERE conversation_id IN (
  SELECT id FROM conversations 
  WHERE character_id = '00000000-0000-0000-0000-000000000001'::uuid
)
ORDER BY created_at DESC;

-- Check jobs
SELECT id, job_type, status, created_at 
FROM jobs 
WHERE metadata->>'character_id' = '00000000-0000-0000-0000-000000000001'
ORDER BY created_at DESC;
```

## AI Response Quality Checks

For each chat interaction, verify:

1. **First Person**: Response uses "I" statements
2. **No Assistant Language**: No "How can I help" phrases
3. **Character Personality**: Traits reflected in response
4. **Voice Examples**: Speaking style matches examples
5. **Scene Context**: Scene referenced if applicable
6. **Forbidden Phrases**: Avoided if specified
7. **NSFW Content**: Allowed if content_tier = 'nsfw'

## System Prompt Verification

Check edge function logs for system prompts:

1. **Template Applied**: Template loaded and used
2. **Placeholders Replaced**: All {{placeholders}} replaced
3. **Character Data**: All character fields included
4. **Scene Context**: Scene system prompt appended
5. **NSFW Unlock**: NSFW allowances block added

## Performance Benchmarks

Expected performance:
- Chat response time: < 15 seconds
- Scene generation time: < 60 seconds
- Page load time: < 3 seconds
- Database queries: < 1 second

## Troubleshooting

### Test Failures

1. **Check Environment Variables**
   ```bash
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   echo $TEST_USER_ID
   ```

2. **Verify Test Data**
   ```sql
   -- Run verify-test-data.sql
   ```

3. **Check Edge Function Logs**
   - Supabase Dashboard → Edge Functions → Logs
   - Look for errors in `roleplay-chat` function

4. **Check Database State**
   - Verify test character exists
   - Verify test scenes exist
   - Verify prompt template active

### Common Issues

**Issue:** "Missing Supabase credentials"
- **Solution:** Set VITE_SUPABASE_ANON_KEY environment variable

**Issue:** "TEST_USER_ID required"
- **Solution:** Set TEST_USER_ID environment variable

**Issue:** "Character not found"
- **Solution:** Run setup-test-data.sql with correct USER_ID

**Issue:** "Template missing"
- **Solution:** Verify prompt template exists and is active

## Next Steps

1. Execute test suite
2. Review test results
3. Document any issues found
4. Fix critical issues
5. Re-run tests to verify fixes
6. Proceed to production deployment

## Related Documentation

- **Test Plan:** `.cursor/plans/roleplay_comprehensive_testing_plan_8d264d15.plan.md`
- **Production Readiness:** `docs/01-PAGES/ROLEPLAY_PRODUCTION_READINESS.md`
- **API Alignment:** `docs/05-APIS/ROLEPLAY_API_ALIGNMENT.md`

