# Exact Copy Functionality Troubleshooting Guide

## 🚨 **Current Issue Analysis**

Based on your analysis, the exact copy functionality is not working because:

1. **Original Enhanced Prompt Not Being Used**: The system is not extracting/using the original enhanced prompt from reference images
2. **Reference Metadata Not Being Extracted**: The metadata extraction is failing or not being triggered
3. **Style Controls Still Active**: Even in exact copy mode, style controls are being applied

## 🔍 **Root Cause Investigation**

### **Phase 1: Frontend Debugging**

#### **Step 1: Check Metadata Extraction**
```javascript
// Run in browser console
debugExactCopy.debugWorkspaceAssets()
```

**Expected Output:**
- Workspace assets should be found
- First asset should have `enhancedPrompt` or `metadata.enhanced_prompt`
- Metadata extraction should return valid data

#### **Step 2: Check Current State**
```javascript
// Run in browser console
debugExactCopy.debugCurrentState()
```

**Expected Output:**
- `exactCopyMode` should be `true` when enabled
- `referenceMetadata` should contain extracted data
- `referenceImageUrl` should be set

#### **Step 3: Manual Testing Workflow**
1. **Select a workspace item as reference**
   - Right-click → "Use as Reference" or drag to reference box
   - Check console for: `🎯 ITEM METADATA FOR EXACT COPY`
   - Check console for: `🎯 ITERATE METADATA EXTRACTION`

2. **Enable exact copy mode**
   - Toggle exact copy mode in UI
   - Check console for: `🎯 EXACT COPY DEBUG - State Check`

3. **Enter modification prompt**
   - Type: "change to red dress"
   - Check console for: `🎯 EXACT COPY MODE - ACTIVE`

### **Phase 2: Backend Debugging**

#### **Step 1: Check Edge Function Logs**
Look for these log patterns in Supabase Edge Function logs:

**Queue-Job Function:**
```
🎯 REFERENCE IMAGE PROCESSING:
🎯 EXACT COPY DEBUG:
```

**Enhance-Prompt Function:**
```
🎯 ENHANCE-PROMPT DEBUG:
🎯 EXACT COPY MODE:
```

#### **Step 2: Verify Data Flow**
The data should flow as follows:

1. **Frontend → Queue-Job:**
   ```typescript
   metadata: {
     reference_image: true,
     reference_url: "https://...",
     reference_strength: 0.9,
     reference_type: "composition",
     exact_copy_mode: true,
     skip_enhancement: true,
     user_requested_enhancement: false
   }
   ```

2. **Queue-Job → Worker:**
   ```typescript
   jobPayload: {
     reference_image_url: "https://...",
     reference_strength: 0.9,
     reference_type: "composition",
     exact_copy_mode: true
   }
   ```

## 🛠️ **Potential Fixes**

### **Fix 1: Metadata Extraction Issue**
If metadata extraction is failing:

```typescript
// Check if asset has the expected structure
console.log('Asset structure:', {
  id: asset.id,
  type: asset.type,
  metadata: asset.metadata,
  enhancedPrompt: asset.enhancedPrompt,
  prompt: asset.prompt
});
```

**Possible Issues:**
- Asset doesn't have `enhancedPrompt` field
- Metadata is stored in different location
- Asset type doesn't support metadata extraction

### **Fix 2: State Management Issue**
If reference metadata is not being set:

```typescript
// Check if setReferenceMetadata is being called
console.log('Setting reference metadata:', metadata);
state.setReferenceMetadata(metadata);
```

**Possible Issues:**
- `setReferenceMetadata` function not working
- State not being updated properly
- Component not re-rendering

### **Fix 3: Edge Function Issue**
If exact copy mode is not reaching the worker:

```typescript
// Check if exact_copy_mode is being passed correctly
console.log('Exact copy mode in job payload:', jobPayload.exact_copy_mode);
```

**Possible Issues:**
- `exact_copy_mode` not being set in metadata
- Edge function not passing it to worker
- Worker not recognizing the flag

## 🎯 **Testing Steps**

### **Step 1: Create Test Image**
1. Generate a simple image with a clear prompt
2. Note the enhanced prompt from the generation
3. Use this image as reference for exact copy

### **Step 2: Test Exact Copy**
1. Select the test image as reference
2. Enable exact copy mode
3. Enter a simple modification: "change color to red"
4. Check console logs for debugging info

### **Step 3: Verify Results**
1. Check if the generated image uses the original enhanced prompt
2. Check if style controls are disabled
3. Check if the modification is applied correctly

## 📊 **Expected Behavior**

### **When Exact Copy Works:**
- **Original Prompt**: "A professional high-resolution shot of a teenage female model standing with perfect posture, wearing a sleek black dress..."
- **User Input**: "change to red dress"
- **Final Prompt**: "A professional high-resolution shot of a teenage female model standing with perfect posture, wearing a sleek red dress..."
- **Style Controls**: Disabled (no cinematic lighting, film grain, etc.)
- **Seed**: Same as original image

### **When Exact Copy Fails:**
- **Original Prompt**: "change to red dress"
- **Final Prompt**: "change to red dress, cinematic lighting, film grain, dramatic composition"
- **Style Controls**: Still active
- **Seed**: Different from original

## 🚀 **Next Steps**

1. **Run the debug script** in browser console
2. **Check edge function logs** for the debugging output
3. **Identify the specific failure point** from the logs
4. **Apply the appropriate fix** based on the issue
5. **Test the fix** with a simple modification

## 📞 **Support**

If you need help interpreting the debug output or implementing fixes, please share:
1. Console logs from the debug script
2. Edge function logs showing the debugging output
3. Any error messages you encounter
