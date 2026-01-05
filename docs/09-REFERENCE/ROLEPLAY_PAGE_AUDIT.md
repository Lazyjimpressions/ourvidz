# Roleplay Page Audit

**Date**: January 2026  
**File**: `src/pages/MobileRoleplayChat.tsx`

## Current Implementation Status

### ✅ Working Correctly

1. **Model Loading**: 
   - Uses `useRoleplayModels()` hook to load models from `api_models` table
   - Models filtered by `is_active = true`
   - Local models (Qwen) conditionally available based on health checks

2. **Model Selection UI**:
   - Model selection available in settings drawer (`RoleplaySettingsModal`)
   - Quick settings drawer for mobile (`QuickSettingsDrawer`)
   - Model selection persists to localStorage

3. **Model Passing to Edge Function**:
   - `model_provider` correctly passed to `roleplay-chat` edge function
   - Edge function receives correct model key

### ❌ Issues Found

1. **Template Selection Not Model-Specific** (CRITICAL)
   - **Location**: `loadPromptTemplate()` function (line 299)
   - **Problem**: Function doesn't accept `modelKey` parameter
   - **Problem**: Queries by `use_case` and `content_mode` only, ignores `target_model`
   - **Impact**: Always loads first matching template, not model-specific one
   - **Current Query**:
     ```typescript
     .eq('use_case', 'character_roleplay')
     .eq('content_mode', contentTier)
     .eq('is_active', true)
     .order('version', { ascending: false })
     .limit(1)
     ```
   - **Should Query**:
     ```typescript
     .eq('target_model', modelKey)  // Model-specific first
     .eq('use_case', 'character_roleplay')
     .eq('content_mode', contentTier)
     .eq('is_active', true)
     // Then fallback to universal (target_model IS NULL)
     ```

2. **Template Not Reloaded on Model Change**
   - **Location**: Template loading (line 435)
   - **Problem**: Template loaded once in `useEffect` on mount
   - **Problem**: No `useEffect` to reload template when `modelProvider` changes
   - **Impact**: User changes model but template doesn't update

3. **Clear Conversation Missing Template**
   - **Location**: `handleClearConversation()` function (line 1041)
   - **Problem**: Doesn't reload template before kickoff
   - **Problem**: Doesn't pass `prompt_template_id` in kickoff call (line 1120)
   - **Impact**: New conversation may use wrong template

4. **Template Loading Called Without Model Key**
   - **Location**: Line 435
   - **Problem**: `loadPromptTemplate('nsfw')` called without passing `modelProvider`
   - **Impact**: Can't select model-specific template

## Required Fixes

### Fix 1: Update `loadPromptTemplate()` Function

**Current**:
```typescript
const loadPromptTemplate = async (contentTier: string) => {
  // Only queries by use_case and content_mode
}
```

**Should Be**:
```typescript
const loadPromptTemplate = async (modelKey: string, contentTier: string) => {
  // First try model-specific template
  const { data: modelSpecific, error: modelError } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('target_model', modelKey)
    .eq('use_case', 'character_roleplay')
    .eq('content_mode', contentTier)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!modelError && modelSpecific) {
    return modelSpecific;
  }
  
  // Fallback to universal template
  const { data: universal, error: universalError } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('target_model', null)
    .eq('use_case', 'character_roleplay')
    .eq('content_mode', contentTier)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return universal || null;
}
```

### Fix 2: Add Model Change Handler

**Add useEffect**:
```typescript
// Reload template when model changes
useEffect(() => {
  if (modelProvider && !roleplayModelsLoading) {
    loadPromptTemplate(modelProvider, 'nsfw').then(template => {
      setPromptTemplate(template);
      console.log('📝 Template reloaded for model:', modelProvider, template?.template_name);
    });
  }
}, [modelProvider, roleplayModelsLoading]);
```

### Fix 3: Fix Clear Conversation

**Update `handleClearConversation()`**:
```typescript
// Before kickoff, reload template for current model
const currentTemplate = await loadPromptTemplate(modelProvider, 'nsfw');
setPromptTemplate(currentTemplate);

// Then in kickoff call, pass template ID (or let edge function select)
```

## Verification Checklist

- [ ] Template selection uses `target_model` to match `api_models.model_key`
- [ ] Template reloads when `modelProvider` changes
- [ ] Clear conversation reloads template before kickoff
- [ ] Fallback to universal template works when model-specific template doesn't exist
- [ ] All roleplay models have templates (4 missing templates created)

