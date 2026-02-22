

# Make Cost-Per-Generation Table-Driven and Editable

## Problem

- fal.ai does not return cost in its API responses -- all costs are estimates
- Cost estimates are hardcoded in a `FAL_PRICING` map inside `fal-image/index.ts` (~40 duplicate entries)
- The `api_models.pricing` JSONB column exists but is empty for every model
- There is no way for admins to edit cost estimates from the UI
- Costs shown in the Usage tab are all estimates but not labeled as such

## Solution

Move pricing entirely into the `api_models.pricing` column, make it editable in the Admin UI, and read it from the database in the edge function with zero hardcoded fallbacks.

---

### Step 1: Add "Est. Cost" editable column to API Models table

**File: `src/components/admin/ApiModelsTab.tsx`**

- Add a new column header "Est. Cost" between existing columns in the table
- Display `model.pricing.per_generation` as an inline-editable cell
- On save, update `pricing` JSONB with `{ per_generation: <number>, currency: "USD" }`

### Step 2: Add "Est. Cost" field to the Model Form

**File: `src/components/admin/ApiModelsTab.tsx`**

- Add a numeric input field for "Est. Cost ($)" in the optional fields section
- Reads/writes `formData.pricing.per_generation`
- Helper text: "USD per generation (estimate)"

### Step 3: Populate pricing via SQL migration (one-time)

Seed `api_models.pricing` for all existing models using the values currently hardcoded in `FAL_PRICING`. This ensures every model has a cost estimate before the hardcoded map is removed.

```sql
UPDATE api_models SET pricing = '{"per_generation": 0.025, "currency": "USD"}'
WHERE model_key LIKE '%seedream%' AND modality = 'image';
-- ... one UPDATE per model/group
```

### Step 4: Replace hardcoded FAL_PRICING with pure table-driven lookup

**File: `supabase/functions/fal-image/index.ts`**

- Remove the entire `FAL_PRICING` map (lines 37-77)
- Remove the `calculateFalCost` function entirely
- Read cost solely from `apiModel.pricing?.per_generation`
- If the value is null/undefined/0, log a warning and record cost as `null` -- no hardcoded default
- This forces admins to populate pricing for every model; missing pricing is surfaced as null in the usage logs rather than silently guessed

Before:
```typescript
const falCost = calculateFalCost(modelKey, modelModality);
```

After:
```typescript
const falCost = apiModel.pricing?.per_generation || null;
if (!falCost) console.warn('No pricing configured for model:', modelKey);
```

### Step 5: Label estimated costs in the Usage tab

**File: `src/components/admin/ApiUsageTab.tsx`**

- In the Recent API Calls table, prefix estimated costs with "~" or add an "(est)" suffix when `log.provider_metadata?.cost_source` is `"estimated"` or `"static_pricing"`
- Costs that are null show as "--" instead of "$0.00"

---

## Files Changed

1. `src/components/admin/ApiModelsTab.tsx` -- Add editable "Est. Cost" column and form field
2. `supabase/functions/fal-image/index.ts` -- Remove `FAL_PRICING` map and `calculateFalCost`; read from `apiModel.pricing.per_generation` only, null if missing
3. `src/components/admin/ApiUsageTab.tsx` -- Label estimated costs, show "--" for null
4. SQL migration -- Populate `pricing` column for all existing models from current hardcoded values

## Key Principle

Zero hardcoded pricing anywhere in the codebase. The `api_models.pricing.per_generation` column is the single source of truth. If a model lacks pricing, the cost is recorded as null and surfaced clearly in the admin UI, prompting the admin to fill it in.

