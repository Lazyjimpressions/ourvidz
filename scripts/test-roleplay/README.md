# Roleplay Testing Suite

Comprehensive automated testing suite for roleplay functionality.

## Quick Start

```bash
npm run test:roleplay
```

## Prerequisites

### What I Can Access ✅
- ✅ Supabase URL - In your `.env` file
- ✅ Supabase Anonymous Key - In your `.env` as `VITE_SUPABASE_PUBLISHABLE_KEY`
- ✅ Database access - Can read characters and other tables

### What I Need From You ⚠️

**1. Add Service Role Key to `.env` file:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsbWRtemhjZHdmYWRidmZwY2t0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTc3ODExMCwiZXhwIjoyMDYxMzU0MTEwfQ.qHEWtvg8YR9PIXwANr5vXDsG-WzNXNjBncyRXYOfDE8
```
**Where:** Copy this line from `.env.local.example` and paste into `.env`

**Why:** Needed to find pokercpa05 user automatically

**2. Create Test Data (one-time):**
- Run `setup-test-data.sql` in Supabase SQL Editor
- Replace `{USER_ID}` with pokercpa05's user ID

### Test Data Setup (One-time)
Run in Supabase SQL Editor:
```sql
-- 1. Find pokercpa05 user ID
SELECT id, email FROM auth.users WHERE email LIKE '%pokercpa05%';

-- 2. Edit setup-test-data.sql and replace {USER_ID} with the ID from step 1
-- 3. Execute setup-test-data.sql
```

## Running Tests

### All Tests
```bash
npm run test:roleplay
```

### Individual Test Suites
```bash
npm run test:roleplay:character  # Character selection tests
npm run test:roleplay:chat       # Chat interaction tests
npm run test:roleplay:prompts    # System prompt tests
npm run test:roleplay:database   # Database state tests
```

## Test Coverage

### Automated Tests (12 tests)
- **Character Selection & Navigation** (3 tests)
  - Direct character selection
  - Character selection with scene
  - Character info drawer

- **Chat Interaction Paths** (3 tests)
  - Conversation kickoff
  - Regular message exchange
  - Message with scene generation

- **System Prompt & Template Testing** (3 tests)
  - Prompt template application
  - Character data integration
  - Scene system prompt application

- **Database State Verification** (3 tests)
  - Conversation lifecycle
  - Message persistence
  - Scene image storage

### Manual Tests (19 tests)
See test plan for browser-based testing of:
- Memory Tier Testing
- Image Generation Testing
- Model Selection Testing
- Scene Context Testing
- Edge Cases & Error Handling
- Integration Testing

## Test Results

Results are saved to:
```
scripts/test-roleplay/test-results/report-{timestamp}.md
```

## File Structure

```
scripts/test-roleplay/
├── README.md                    # This file
├── setup-test-data.sql          # Test data setup (run in Supabase SQL Editor)
├── verify-test-data.sql         # Verify test data configuration
├── get-test-user.ts             # User lookup utility
├── run-all-roleplay-tests.ts    # Main test runner
├── test-character-selection.ts  # Character selection tests
├── test-chat-interactions.ts    # Chat interaction tests
├── test-system-prompts.ts       # System prompt tests
├── test-database-state.ts       # Database state tests
├── test-results-template.md     # Manual test documentation template
└── test-results/                # Generated test reports
```

## How It Works

1. **Credentials**: Reads from `.env` file:
   - `VITE_SUPABASE_URL` - Supabase URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Anonymous key (same as ANON_KEY)
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (needed for user lookup)

2. **User Lookup**: Finds `pokercpa05` user automatically:
   - Uses service role key to search `auth.users` table (if available)
   - Falls back to characters table for user_id
   - Last resort: any available user

3. **Test Execution**: Runs all test suites and generates report

## Current Status

✅ **Test Data Created!**
- Test character: ✅ Created (Test Character - Mei Chen)
- Test scenes: ✅ Created (2 scenes)
- Prompt template: ✅ Verified

✅ **Test Results:**
- Character Selection: ✅ 3/3 passing
- System Prompts: ✅ 3/3 passing  
- Database State: ✅ 3/3 passing
- Chat Interactions: ⚠️ Requires edge functions (expected)

**Test data creation script:** `create-test-data.ts` (automatically creates all test data)

## Troubleshooting

**"Test character does not exist"**
- This is expected! Run `setup-test-data.sql` in Supabase SQL Editor
- Replace `{USER_ID}` with: `3348b481-8fb1-4745-8e6c-db6e9847e429`

**"No user found"**
- Add `SUPABASE_SERVICE_ROLE_KEY` to `.env` file (copy from `.env.local.example`)
- Or set `TEST_USER_ID` environment variable

**"Template load failed"**
- Verify prompt template exists:
  ```sql
  SELECT * FROM prompt_templates 
  WHERE use_case = 'character_roleplay' 
    AND content_mode = 'nsfw' 
    AND is_active = true;
  ```

## Related Documentation

- **Test Plan**: `.cursor/plans/roleplay_comprehensive_testing_plan_8d264d15.plan.md`
- **Testing Guide**: `docs/01-PAGES/ROLEPLAY_TESTING_GUIDE.md`
- **Production Readiness**: `docs/01-PAGES/ROLEPLAY_PRODUCTION_READINESS.md`
