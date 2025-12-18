# Roleplay Test Results Template

**Test ID:** [Test ID from plan]
**Test Name:** [Test name from plan]
**Execution Date/Time:** [Date and time]
**Tester Name:** [Tester name]

## Test Status

- [ ] ✅ PASSED
- [ ] ❌ FAILED

## Test Path

[Describe the exact user path tested]

## Expected Results

[List expected behaviors]

## Actual Results

[Describe what actually happened]

## Database State (Before)

### Characters Table
- Character ID: [ID]
- Character Name: [Name]
- Has complete data: [Yes/No]

### Character Scenes Table
- Scene ID: [ID]
- Scene Name: [Name]
- Has system_prompt: [Yes/No]
- Has scene_rules: [Yes/No]

### Conversations Table
- Conversation ID: [ID or None]
- Status: [Status]

### Messages Table
- Message Count: [Count]

## Database State (After)

### Characters Table
[Any changes]

### Character Scenes Table
[Any changes]

### Conversations Table
- Conversation ID: [ID]
- Status: [Status]
- Memory Tier: [Tier]

### Messages Table
- Message Count: [Count]
- Latest Message: [Content preview]

## AI Response Quality

### Response Sample
```
[Paste character response here]
```

### Quality Checks
- [ ] Response is in first person as character
- [ ] No assistant language
- [ ] Character personality reflected
- [ ] Voice examples followed (if applicable)
- [ ] Scene context referenced (if applicable)
- [ ] Forbidden phrases avoided
- [ ] NSFW content allowed (if applicable)

### Response Analysis
[Detailed analysis of response quality]

## System Prompt Verification

### Template Used
- Template Name: [Name]
- Template ID: [ID]

### Placeholders Replaced
- [ ] {{character_name}}
- [ ] {{character_description}}
- [ ] {{character_personality}}
- [ ] {{character_background}}
- [ ] {{character_speaking_style}}
- [ ] {{voice_examples}}
- [ ] {{scene_context}}

### System Prompt Sample
```
[First 500 characters of system prompt]
```

## Image Generation (If Applicable)

### Job Details
- Job ID: [ID]
- Job Type: [Type]
- Status: [Status]
- Model Used: [Model]

### Image Quality
- [ ] Character appearance consistent
- [ ] Scene matches response
- [ ] Visual description applied
- [ ] Consistency score: [Score]

## Performance Metrics

- Chat Response Time: [Time]s
- Scene Generation Time: [Time]s
- Page Load Time: [Time]s
- Database Query Time: [Time]s

## Issues Found

### Critical Issues
[None or list]

### High Priority Issues
[None or list]

### Medium Priority Issues
[None or list]

### Low Priority Issues
[None or list]

## Screenshots

[Attach screenshots if applicable]

## Console Logs

```
[Relevant console logs]
```

## Edge Function Logs

```
[Relevant edge function logs]
```

## Notes

[Any additional observations or notes]

## Next Steps

[Actions needed based on test results]

