
## Plan: Fix Build Errors Across Edge Functions

### Analysis Summary

After reviewing the recent code and build errors, I've identified **4 edge functions** with TypeScript issues. These are mostly caused by:
1. TypeScript inferring `never` types due to variable declarations without proper typing
2. Property name mismatches between expected and actual interfaces
3. Undefined variable references
4. Missing properties in interface definitions

---

### Error Breakdown & Fixes

#### 1. `supabase/functions/enhance-prompt/index.ts` (Lines 650-656)

**Problem**: `enhancementResult` is declared with `let enhancementResult` (line 594) without a type annotation, causing TypeScript to infer `never` when accessing properties.

**Fix**: Add explicit type annotation to the variable declaration.

```typescript
// Line 594 - Change from:
let enhancementResult

// To:
let enhancementResult: {
  enhanced_prompt: string;
  strategy: string;
  template_name?: string;
  model_used: string;
  token_count: number;
  compressed: boolean;
}
```

---

#### 2. `supabase/functions/fal-image/index.ts` (Line 1327)

**Problem**: Variable `timestamp` is referenced but not in scope at line 1327. The `timestamp` variable is declared at line 1287 inside the outer `try` block, but line 1327 is inside a nested `if` block where scope might not be visible.

**Fix**: Declare a new `timestamp` or reuse `Date.now()` directly in the thumbnail path.

```typescript
// Line 1327 - Change from:
const thumbStoragePath = `${user.id}/${jobData.id}_${timestamp}.thumb.webp`;

// To:
const thumbStoragePath = `${user.id}/${jobData.id}_${Date.now()}.thumb.webp`;
```

---

#### 3. `supabase/functions/playground-chat/index.ts` (Multiple errors)

**Problem A - Lines 493, 501, 534, 550, 571**: Properties accessed on `conversation` resolve to `never` because the Supabase query result isn't typed.

**Fix**: Add explicit type assertion after the conversation query.

```typescript
// Line 486-490 - Add type assertion:
const conversation = conversationData as {
  id: string;
  character_id: string | null;
  project_id: string | null;
  user_character_id: string | null;
  conversation_type: string;
};
```

**Problem B - Lines 515, 991**: Insert statements to `messages` table fail because the local Database type is incomplete.

**Fix**: Use type assertion `as any` for the insert objects.

```typescript
// Line 515 - Change from:
.insert({
  conversation_id,
  sender: 'user',
  content: message,
})

// To:
.insert({
  conversation_id,
  sender: 'user',
  content: message,
} as any)
```

**Problem C - Lines 611, 616**: `systemConfig.config.chatWorkerUrl` - TypeScript doesn't know the shape of `config`.

**Fix**: Add type assertion for system config.

```typescript
// Line 610-616 - Add assertion:
const config = systemConfig?.config as { chatWorkerUrl?: string } | undefined;
if (configError || !config?.chatWorkerUrl) {
  // ...
}
chatWorkerUrl = config.chatWorkerUrl;
```

**Problem D - Lines 632-634**: `msg` properties are `never`.

**Fix**: Type the map function parameter.

```typescript
// Line 631 - Add explicit type:
.map((msg: { sender: string; content: string; created_at: string }) => ({
```

**Problem E - Lines 642-646**: `cache.metadata` uses wrong property names (`templateCount`, `negativePromptCount`, `lastUpdated` vs. `template_count`, `negative_prompt_count`, `refreshed_at`).

**Fix**: Use the correct property names from `CacheData` interface.

```typescript
// Lines 642-646 - Change from:
templateCount: cache?.metadata?.templateCount || 0,
negativePromptCount: cache?.metadata?.negativePromptCount || 0,
ageHours: cache?.metadata?.lastUpdated ? ...

// To:
templateCount: cache?.metadata?.template_count || 0,
negativePromptCount: cache?.metadata?.negative_prompt_count || 0,
ageHours: cache?.metadata?.refreshed_at ? 
  ((Date.now() - new Date(cache.metadata.refreshed_at).getTime()) / (1000 * 60 * 60)).toFixed(1) : 'unknown'
```

**Problem F - Line 662**: `req.body` doesn't have `content_tier` because request body must be parsed first.

**Fix**: Access the parsed body instead.

```typescript
// The request body should be parsed at the top of the handler.
// Line 662 - Check if body is already parsed, or use a parsed variable
```

**Problem G - Lines 579**: Update statement type mismatch.

**Fix**: Add type assertion.

```typescript
.update({ interaction_count: (character.interaction_count || 0) + 1 } as any)
```

---

#### 4. `supabase/functions/queue-job/index.ts` (Lines 318-319, 653)

**Problem A - Lines 318-319**: `JobRequest` interface is missing `bypass_enhancement` and `hard_override` properties.

**Fix**: Add missing properties to the `JobRequest` interface.

```typescript
// Lines 18-38 - Add to JobRequest interface:
interface JobRequest {
  // ... existing properties ...
  bypass_enhancement?: boolean;
  hard_override?: boolean;
}
```

**Problem B - Line 653**: `error` is of type `unknown`.

**Fix**: Type guard or assertion for error.

```typescript
// Line 653 - Change from:
details: error.message

// To:
details: error instanceof Error ? error.message : String(error)
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/enhance-prompt/index.ts` | Add type to `enhancementResult` variable |
| `supabase/functions/fal-image/index.ts` | Fix `timestamp` reference with `Date.now()` |
| `supabase/functions/playground-chat/index.ts` | Fix conversation typing, cache metadata property names, add type assertions |
| `supabase/functions/queue-job/index.ts` | Add missing interface properties, fix error typing |

---

### Technical Summary

These errors are caused by:
1. **Untyped variables** - TypeScript infers `never` when it can't determine the type
2. **Scope issues** - Variable used outside its declaration scope
3. **Interface mismatches** - Property names not matching expected interfaces
4. **Missing type guards** - Using `unknown` typed error without guards
5. **Supabase client typing** - Local Database types incomplete or not matching actual schema

All fixes use standard TypeScript patterns (type annotations, assertions, guards) to provide explicit types where inference fails.
