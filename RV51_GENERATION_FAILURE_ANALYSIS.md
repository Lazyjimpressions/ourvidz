# RV5.1 Generation Failure Analysis

**Date:** January 2025  
**Status:** 🚨 CRITICAL - Generation failing with 422 errors  
**Model:** `lucataco/realistic-vision-v5.1` (RV5.1)

## **Root Cause Analysis**

### **1. Scheduler Validation Error** ❌
```
scheduler must be one of the following: "EulerA", "MultistepDPM-Solver"
```

**Problem**: Database configuration mismatch
- **Database says**: `["K_EULER_ANCESTRAL", "K_EULER", "K_DPM_2_ANCESTRAL", "K_DPM_2", "K_HEUN", "K_LMS", "DDIM", "PLMS"]`
- **Replicate API expects**: `["EulerA", "MultistepDPM-Solver"]`

**Current Error**: Edge function sends `"K_EULER_ANCESTRAL"` but API rejects it.

### **2. Seed Type Error** ❌
```
input.seed: Invalid type. Expected: integer, given: null
```

**Problem**: Edge function is sending `null` for seed when it should either send an integer or omit the parameter entirely.

## **Evidence from Logs**

### **Recent Failed Jobs**
```json
{
  "error": "Prediction creation failed",
  "message": "Request to https://api.replicate.com/v1/predictions failed with status 422 Unprocessable Entity: {
    \"detail\": \"- input.scheduler: scheduler must be one of the following: \\\"EulerA\\\", \\\"MultistepDPM-Solver\\\"\\n- input.seed: Invalid type. Expected: integer, given: null\\n\",
    \"status\": 422,
    \"title\": \"Input validation failed\",
    \"invalid_fields\": [
      {
        \"type\": \"enum\",
        \"field\": \"input.scheduler\",
        \"description\": \"scheduler must be one of the following: \\\"EulerA\\\", \\\"MultistepDPM-Solver\\\"\"
      },
      {
        \"type\": \"invalid_type\",
        \"field\": \"input.seed\",
        \"description\": \"Invalid type. Expected: integer, given: null\"
      }
    ]
  }"
}
```

### **Model Configuration**
```json
{
  "model_key": "lucataco/realistic-vision-v5.1",
  "version": "2c8e954decbf70b7607a4414e5785ef9e4de4b8c51d50fb8b8b349160e0ef6bb",
  "allowed_schedulers": ["K_EULER_ANCESTRAL", "K_EULER", "K_DPM_2_ANCESTRAL", "K_DPM_2", "K_HEUN", "K_LMS", "DDIM", "PLMS"],
  "scheduler_aliases": {
    "lms": "K_LMS",
    "heun": "K_HEUN", 
    "dpm_2": "K_DPM_2",
    "euler": "K_EULER",
    "euler_a": "K_EULER_ANCESTRAL",
    "dpm_2_ancestral": "K_DPM_2_ANCESTRAL",
    "euler_ancestral": "K_EULER_ANCESTRAL"
  }
}
```

## **Required Fixes**

### **1. Database Configuration Update** 🔧
```sql
UPDATE api_models 
SET capabilities = jsonb_set(
  jsonb_set(
    capabilities, 
    '{allowed_schedulers}', 
    '["EulerA", "MultistepDPM-Solver"]'::jsonb
  ),
  '{scheduler_aliases}',
  '{
    "EulerA": "EulerA", 
    "MultistepDPM-Solver": "MultistepDPM-Solver", 
    "K_EULER_ANCESTRAL": "EulerA", 
    "K_EULER": "EulerA", 
    "K_DPM_2_ANCESTRAL": "MultistepDPM-Solver", 
    "K_DPM_2": "MultistepDPM-Solver", 
    "K_HEUN": "EulerA", 
    "K_LMS": "EulerA", 
    "DDIM": "EulerA", 
    "PLMS": "EulerA"
  }'::jsonb
)
WHERE model_key = 'lucataco/realistic-vision-v5.1';
```

### **2. Edge Function Seed Handling** 🔧
The edge function already has seed validation, but needs to be more robust:

```typescript
// Current code (line 418-420)
if ('seed' in (modelInput as any) && (typeof (modelInput as any).seed !== 'number' || Number.isNaN((modelInput as any).seed))) {
  delete (modelInput as any).seed;
}

// Enhanced version needed
if ('seed' in (modelInput as any)) {
  const seed = (modelInput as any).seed;
  if (seed === null || seed === undefined || typeof seed !== 'number' || Number.isNaN(seed)) {
    delete (modelInput as any).seed;
    console.log('🚮 Removed invalid seed value:', seed);
  }
}
```

## **Immediate Actions Required**

### **1. Update Database** ⚡
Run the SQL update above to fix the scheduler configuration.

### **2. Test Generation** ⚡
After database update, test RV5.1 generation to verify:
- Scheduler mapping works correctly
- Seed handling doesn't send null values
- Generation completes successfully

### **3. Monitor Logs** ⚡
Check edge function logs for:
- Scheduler mapping success
- Seed validation messages
- Successful Replicate API calls

## **Expected Results After Fix**

### **Before Fix** ❌
```json
{
  "scheduler": "K_EULER_ANCESTRAL",  // ❌ Rejected by API
  "seed": null                       // ❌ Invalid type
}
```

### **After Fix** ✅
```json
{
  "scheduler": "EulerA",             // ✅ Accepted by API
  // seed omitted if null            // ✅ No invalid type
}
```

## **Verification Commands**

```sql
-- Check updated scheduler configuration
SELECT model_key, capabilities->'allowed_schedulers' as allowed_schedulers, 
       capabilities->'scheduler_aliases' as scheduler_aliases 
FROM api_models 
WHERE model_key = 'lucataco/realistic-vision-v5.1';

-- Check recent job status
SELECT id, status, error_message, created_at 
FROM jobs 
WHERE api_model_id = '6c42c68a-fcb8-417e-b0e8-c5154eaa3a4f' 
ORDER BY created_at DESC 
LIMIT 3;
```

## **Impact**

- **Current**: 100% failure rate for RV5.1 generation
- **After Fix**: Expected 95%+ success rate
- **Users Affected**: All users trying to generate with RV5.1 model
- **Priority**: HIGH - Core functionality broken

The fix is straightforward but requires immediate database update to restore RV5.1 generation functionality.
