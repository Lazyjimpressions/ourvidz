# Model Testing Implementation Plan

## Current State Analysis

### Database Schema Issues
The current database has conflicting table structures:

1. **Existing `prompt_test_results` table** (from migrations):
   ```sql
   - prompt_text: TEXT
   - model_type: VARCHAR(20) 
   - quality_rating: INTEGER
   - success: BOOLEAN
   - generation_time_ms: INTEGER
   - tested_by: UUID
   ```

2. **Desired `model_test_results` table** (from our migration):
   ```sql
   - model_type: VARCHAR(20)
   - prompt_text: TEXT
   - overall_quality: INTEGER
   - technical_quality: INTEGER
   - content_quality: INTEGER
   - consistency: INTEGER
   - test_metadata: JSONB
   - test_series: VARCHAR(100)
   - test_tier: VARCHAR(50)
   ```

### Component Compatibility Issues
- `PromptTestingTab.tsx` expects SDXL-specific fields (tier, series, anatomical_accuracy)
- Current database has generic fields (model_type, quality_rating)
- TypeScript types don't match between component and database

---

## Recommended Solution: Phased Implementation

### Phase 1: Immediate Fix (Use Existing Table)
**Duration**: 1-2 hours
**Goal**: Get SDXL testing working immediately

#### Step 1: Update PromptTestingTab to Use Existing Schema
```typescript
// Modify the component to work with existing prompt_test_results table
interface TestResult {
  id: string;
  prompt_text: string;
  model_type: string;
  quality_rating?: number;
  success: boolean;
  generation_time_ms?: number;
  notes?: string;
  created_at: string;
  // Store SDXL-specific data in notes as JSON
}

// Store SDXL metadata in notes field as JSON
const sdxlMetadata = {
  tier: selectedTier,
  series: selectedSeries,
  anatomical_accuracy: anatomicalAccuracy,
  content_level: contentLevel,
  consistency: consistency
};

await saveTestResult({
  prompt_text: currentPrompt,
  model_type: 'SDXL',
  quality_rating: overallQuality,
  success: true,
  notes: JSON.stringify(sdxlMetadata)
});
```

#### Step 2: Create SDXL-Specific Wrapper Functions
```typescript
// Helper functions to work with existing table
const saveSDXLTestResult = async (data: {
  prompt: string;
  tier: string;
  series: string;
  overallQuality: number;
  anatomicalAccuracy: number;
  contentLevel: number;
  consistency: number;
  notes?: string;
}) => {
  const metadata = {
    tier: data.tier,
    series: data.series,
    anatomical_accuracy: data.anatomicalAccuracy,
    content_level: data.contentLevel,
    consistency: data.consistency
  };

  return await saveTestResult({
    prompt_text: data.prompt,
    model_type: 'SDXL',
    quality_rating: data.overallQuality,
    success: true,
    notes: JSON.stringify(metadata) + (data.notes ? `\n${data.notes}` : '')
  });
};
```

### Phase 2: Database Migration (Future)
**Duration**: 2-3 hours
**Goal**: Implement unified table structure

#### Step 1: Create Migration Script
```sql
-- Migration: Upgrade to unified model testing
-- 1. Create new table
CREATE TABLE model_test_results_new (
  -- [Full unified structure from our migration]
);

-- 2. Migrate existing data
INSERT INTO model_test_results_new (
  model_type,
  prompt_text,
  overall_quality,
  test_metadata,
  test_series,
  test_tier,
  notes,
  created_at
)
SELECT 
  model_type,
  prompt_text,
  quality_rating,
  CASE 
    WHEN notes IS NOT NULL AND notes != '' 
    THEN notes::jsonb 
    ELSE '{}'::jsonb
  END as test_metadata,
  CASE 
    WHEN notes IS NOT NULL AND notes != '' 
    THEN (notes::jsonb)->>'series'
    ELSE NULL
  END as test_series,
  CASE 
    WHEN notes IS NOT NULL AND notes != '' 
    THEN (notes::jsonb)->>'tier'
    ELSE NULL
  END as test_tier,
  notes,
  created_at
FROM prompt_test_results;

-- 3. Drop old table and rename new one
DROP TABLE prompt_test_results;
ALTER TABLE model_test_results_new RENAME TO model_test_results;
```

#### Step 2: Update Component Interface
```typescript
// Update to use new unified structure
interface TestResult {
  id: string;
  model_type: 'SDXL' | 'WAN' | 'LORA';
  prompt_text: string;
  overall_quality?: number;
  technical_quality?: number;
  content_quality?: number;
  consistency?: number;
  test_metadata: any;
  test_series?: string;
  test_tier?: string;
  notes?: string;
  created_at: string;
}
```

### Phase 3: WAN Model Integration
**Duration**: 1-2 hours
**Goal**: Add WAN testing capabilities

#### Step 1: Create WAN Test Series
```typescript
const WAN_TEST_SERIES = [
  {
    id: 'couples-motion',
    name: 'Couples Motion Testing',
    description: 'Smooth romantic motion sequences',
    prompts: {
      artistic: 'attractive couple, smooth motion, fluid movement, romantic atmosphere...',
      explicit: 'unrestricted nsfw, passionate couple, smooth motion, fluid movement...',
      unrestricted: 'unrestricted nsfw, explicit adult content, smooth motion...'
    }
  },
  // ... more series
];
```

#### Step 2: Add Model Selection to UI
```typescript
const [selectedModel, setSelectedModel] = useState<'SDXL' | 'WAN'>('SDXL');
const [selectedSeries, setSelectedSeries] = useState<string>('couples-intimacy');
```

### Phase 4: LoRA Integration (Future)
**Duration**: 2-3 hours
**Goal**: Support custom LoRA testing

#### Step 1: Extend Metadata Structure
```json
{
  "lora_name": "custom-style-1",
  "lora_strength": 0.8,
  "base_model": "SDXL",
  "style_category": "anime"
}
```

#### Step 2: Add LoRA Configuration UI
```typescript
const [loraConfig, setLoraConfig] = useState({
  name: '',
  strength: 0.8,
  baseModel: 'SDXL'
});
```

---

## Immediate Action Plan

### Option A: Quick Fix (Recommended)
1. **Update PromptTestingTab.tsx** to work with existing `prompt_test_results` table
2. **Store SDXL metadata in notes field** as JSON
3. **Create wrapper functions** for SDXL-specific operations
4. **Test SDXL functionality** immediately
5. **Plan database migration** for future

### Option B: Full Migration (More Complex)
1. **Run the unified migration** to create new table structure
2. **Update all components** to use new interface
3. **Migrate existing data** from old table
4. **Test all functionality** with new structure

---

## Recommended Approach: Option A (Quick Fix)

### Benefits:
- ✅ **Immediate functionality** - SDXL testing works today
- ✅ **No data loss** - Preserves existing test results
- ✅ **Minimal risk** - Uses proven database structure
- ✅ **Future-proof** - Easy to migrate later

### Implementation Steps:
1. **Modify PromptTestingTab.tsx** (30 minutes)
2. **Add SDXL metadata helpers** (15 minutes)
3. **Test SDXL functionality** (15 minutes)
4. **Document current approach** (10 minutes)

### Code Changes Required:
```typescript
// 1. Update interface to match existing table
interface TestResult {
  id: string;
  prompt_text: string;
  model_type: string;
  quality_rating?: number;
  success: boolean;
  notes?: string;
  created_at: string;
}

// 2. Add SDXL metadata helpers
const parseSDXLMetadata = (notes: string) => {
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
};

const saveSDXLTest = async (data: SDXLTestData) => {
  const metadata = {
    tier: data.tier,
    series: data.series,
    anatomical_accuracy: data.anatomicalAccuracy,
    content_level: data.contentLevel,
    consistency: data.consistency
  };

  return await saveTestResult({
    prompt_text: data.prompt,
    model_type: 'SDXL',
    quality_rating: data.overallQuality,
    success: true,
    notes: JSON.stringify(metadata)
  });
};
```

---

## Success Criteria

### Phase 1 Success:
- [ ] SDXL testing UI works with existing database
- [ ] All 4 test series can be executed
- [ ] Quality ratings are saved and displayed
- [ ] Test results are properly stored and retrieved

### Phase 2 Success:
- [ ] Unified table structure implemented
- [ ] All existing data migrated successfully
- [ ] Component updated to use new interface
- [ ] No functionality regression

### Phase 3 Success:
- [ ] WAN testing capabilities added
- [ ] Motion quality metrics implemented
- [ ] Cross-model comparison available
- [ ] Enhanced analytics working

This phased approach ensures immediate functionality while providing a clear path to the unified testing framework. 