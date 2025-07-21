# OurVidz Testing Framework - Complete Guide

**Last Updated:** July 8, 2025  
**Status:** ✅ Production Ready - All 10 Job Types Supported  
**Purpose:** Comprehensive testing framework for SDXL, WAN standard, and WAN enhanced models

---

## **🎯 Overview**

This consolidated testing framework provides systematic testing for all 10 job types across SDXL, WAN standard, and WAN enhanced models. The framework enables baseline establishment, quality assessment, and performance monitoring for all AI models in the system.

### **Key Features**
- **Dual Model Support**: SDXL LUSTIFY + WAN 2.1 with Qwen 7B enhancement
- **Individual & Batch Testing**: Single prompt and automated batch testing
- **Quality Assessment**: 4-point rating system with detailed metrics
- **Performance Tracking**: Real-time generation time and success rate monitoring
- **Analytics Dashboard**: Comprehensive reporting and trend analysis

---

## **🤖 Complete Job Type Coverage**

### **All 10 Job Types Supported**

#### **SDXL Jobs (2 Types) - 6-Image Batches**
```yaml
sdxl_image_fast:
  - Steps: 25
  - Time: ~30s (29.9s tested)
  - Output: 6 images per job
  - Purpose: Ultra-fast image generation
  - Status: ✅ Tested and verified

sdxl_image_high:
  - Steps: 40
  - Time: ~47s (42.4s tested)
  - Output: 6 images per job
  - Purpose: High-quality image generation
  - Status: ✅ Tested and verified
```

#### **WAN Standard Jobs (4 Types) - Single Files**
```yaml
image_fast:
  - Steps: 25
  - Time: ~73s
  - Output: 1 image per job
  - Purpose: Fast single image generation
  - Status: ❌ Not tested

image_high:
  - Steps: 50
  - Time: ~90s
  - Output: 1 image per job
  - Purpose: High-quality single image
  - Status: ❌ Not tested

video_fast:
  - Steps: 25
  - Time: ~251s (251.5s tested)
  - Output: 1 video (5s duration)
  - Purpose: Fast video generation
  - Status: ✅ Tested and verified

video_high:
  - Steps: 50
  - Time: ~360s (359.7s tested)
  - Output: 1 video (6s duration)
  - Purpose: High-quality video generation
  - Status: ✅ Tested and verified
```

#### **WAN Enhanced Jobs (4 Types) - AI-Enhanced**
```yaml
image7b_fast_enhanced:
  - Steps: 25
  - Time: ~233s (233.5s tested)
  - Output: 1 image per job
  - Purpose: Fast enhanced with Qwen 7B
  - Status: ✅ Tested and verified

image7b_high_enhanced:
  - Steps: 50
  - Time: ~104s
  - Output: 1 image per job
  - Purpose: High-quality enhanced with Qwen 7B
  - Status: ❌ Not tested

video7b_fast_enhanced:
  - Steps: 25
  - Time: ~264s (263.9s tested)
  - Output: 1 video (5s duration)
  - Purpose: Fast enhanced video with Qwen 7B
  - Status: ✅ Tested and verified

video7b_high_enhanced:
  - Steps: 50
  - Time: ~370s (370.0s tested)
  - Output: 1 video (6s duration)
  - Purpose: High-quality enhanced video with Qwen 7B
  - Status: ✅ Tested and verified
```

---

## **🔧 Testing Interface Features**

### **Single Test Tab**
```yaml
Configuration:
  - Model Type: SDXL or WAN
  - Job Type: All 10 job types available
  - Test Series: 4 series per model
  - Content Tier: Artistic, Explicit, Unrestricted

Features:
  - Real-time prompt editing
  - Token limit validation (75 for SDXL, 100 for WAN)
  - Job type-specific optimization
  - Enhanced model support (simple prompts for Qwen)
  - Immediate quality assessment
```

### **Batch Testing Tab**
```yaml
Configuration:
  - Model Type: SDXL or WAN
  - Job Type: All 10 job types available
  - Series Selection: Multiple series (checkboxes)
  - Tier Selection: Multiple tiers (checkboxes)
  - Variations: 1-10 variations per prompt

Features:
  - Automated batch generation
  - Progress tracking with real-time updates
  - Error handling and retry logic
  - Enhanced model optimization
  - Automatic result saving
```

### **Test Results Tab**
```yaml
Display:
  - All test results with metadata
  - Job type indicators and model badges
  - Quality rating interface
  - Generated content preview
  - Notes and observations

Quality Metrics:
  - Overall Quality (1-10)
  - Technical Quality (1-10)
  - Content Quality (1-10)
  - Consistency (1-10)
```

### **Analytics Tab**
```yaml
Metrics:
  - Quality by tier and model
  - Model performance comparison
  - Series progress tracking
  - Job type performance analysis
  - Success rate trends
  - Generation time analysis
```

---

## **📊 Quality Assessment Framework**

### **Rating System (1-10 Scale)**

#### **Overall Quality**
- **Technical execution and artistic merit**
- **Professional standards and production value**
- **Composition, lighting, color grading**
- **Overall visual appeal and impact**

#### **Technical Quality**
- **Resolution and detail quality**
- **No artifacts or distortions**
- **Proper file format and compression**
- **Technical execution excellence**

#### **Content Quality**
- **Anatomical accuracy (SDXL) / Motion accuracy (WAN)**
- **NSFW content appropriateness**
- **Emotional expression and realism**
- **Content relevance and effectiveness**

#### **Consistency**
- **Reliability across multiple generations**
- **Stable quality with same prompt**
- **Predictable results**
- **Model stability and reliability**

### **Color-Coded Quality Indicators**
```yaml
Quality Levels:
  - 8-10: Green (Excellent)
  - 6-7: Yellow (Good)
  - 1-5: Red (Poor)

Tier Colors:
  - Artistic: Blue (Tasteful)
  - Explicit: Yellow (Direct)
  - Unrestricted: Red (Maximum)

Model Colors:
  - SDXL: Purple (Image generation)
  - WAN: Green (Video generation)
  - Enhanced: Orange (Qwen enhancement)
```

---

## **🎨 Test Series Structure**

### **SDXL Test Series (4 Series)**
```yaml
Series 1: Couples Intimacy Progression
  - Artistic: Romantic, tasteful content
  - Explicit: Direct, anatomical content
  - Unrestricted: Maximum explicit content

Series 2: Shower/Bath Scenes
  - Artistic: Steamy, intimate atmosphere
  - Explicit: Wet, sensual content
  - Unrestricted: Maximum wet content

Series 3: Bedroom Intimacy
  - Artistic: Soft lighting, romantic
  - Explicit: Passionate, detailed
  - Unrestricted: Maximum bedroom content

Series 4: Multi-Person Scenes
  - Artistic: Group intimacy, tasteful
  - Explicit: Multi-person interactions
  - Unrestricted: Maximum group content
```

### **WAN Test Series (4 Series)**
```yaml
Series 1: Couples Motion Intimacy
  - Artistic: Smooth romantic motion
  - Explicit: Passionate motion sequences
  - Unrestricted: Maximum motion content

Series 2: Shower Motion Scenes
  - Artistic: Steamy motion atmosphere
  - Explicit: Wet motion interactions
  - Unrestricted: Maximum wet motion

Series 3: Bedroom Motion
  - Artistic: Intimate motion sequences
  - Explicit: Passionate motion content
  - Unrestricted: Maximum bedroom motion

Series 4: Group Motion Scenes
  - Artistic: Multi-person motion
  - Explicit: Group motion interactions
  - Unrestricted: Maximum group motion
```

---

## **📈 Baseline Maintenance Process**

### **Phase 1: Initial Baseline Establishment**

#### **Step 1: Core Model Testing**
```yaml
SDXL Models:
  - Test sdxl_image_fast with all 4 series × 3 tiers
  - Test sdxl_image_high with all 4 series × 3 tiers
  - Generate 3 variations per prompt
  - Total: 2 models × 4 series × 3 tiers × 3 variations = 72 tests

WAN Standard Models:
  - Test image_fast, image_high, video_fast, video_high
  - Test all 4 series × 3 tiers for each
  - Generate 3 variations per prompt
  - Total: 4 models × 4 series × 3 tiers × 3 variations = 144 tests
```

#### **Step 2: Enhanced Model Testing**
```yaml
WAN Enhanced Models:
  - Test all 4 enhanced job types
  - Use simple prompts (Qwen handles enhancement)
  - Test all 4 series × 3 tiers for each
  - Generate 3 variations per prompt
  - Total: 4 models × 4 series × 3 tiers × 3 variations = 144 tests
```

### **Phase 2: Expected Quality Baselines**

#### **SDXL Models**
```yaml
sdxl_image_fast:
  - Artistic Tier: 7-8/10
  - Explicit Tier: 6-7/10
  - Unrestricted Tier: 5-6/10

sdxl_image_high:
  - Artistic Tier: 8-9/10
  - Explicit Tier: 7-8/10
  - Unrestricted Tier: 6-7/10
```

#### **WAN Standard Models**
```yaml
image_fast:
  - Artistic Tier: 6-7/10
  - Explicit Tier: 5-6/10
  - Unrestricted Tier: 4-5/10

image_high:
  - Artistic Tier: 7-8/10
  - Explicit Tier: 6-7/10
  - Unrestricted Tier: 5-6/10

video_fast:
  - Artistic Tier: 6-7/10
  - Explicit Tier: 5-6/10
  - Unrestricted Tier: 4-5/10

video_high:
  - Artistic Tier: 7-8/10
  - Explicit Tier: 6-7/10
  - Unrestricted Tier: 5-6/10
```

#### **WAN Enhanced Models**
```yaml
image7b_fast_enhanced:
  - Artistic Tier: 7-8/10
  - Explicit Tier: 6-7/10
  - Unrestricted Tier: 5-6/10

image7b_high_enhanced:
  - Artistic Tier: 8-9/10
  - Explicit Tier: 7-8/10
  - Unrestricted Tier: 6-7/10

video7b_fast_enhanced:
  - Artistic Tier: 7-8/10
  - Explicit Tier: 6-7/10
  - Unrestricted Tier: 5-6/10

video7b_high_enhanced:
  - Artistic Tier: 8-9/10
  - Explicit Tier: 7-8/10
  - Unrestricted Tier: 6-7/10
```

### **Phase 3: Ongoing Monitoring**
```yaml
Monthly Baseline Checks:
  - Re-test 1 series per model monthly
  - Compare results to established baselines
  - Flag any quality degradation
  - Document performance changes

Performance Monitoring:
  - Track generation times
  - Monitor success rates
  - Analyze error patterns
  - Update baseline expectations
```

---

## **📋 Comprehensive Testing Matrix**

### **SDXL Jobs (2 Types)**

#### **sdxl_image_fast** (25 steps, ~30s, 6 images)
**Purpose**: Ultra-fast image generation with good quality  
**Token Limit**: 75 tokens  
**Output**: 6 images per job

**Test Prompt 1: Artistic Tier**
```
score_9, score_8_up, masterpiece, best quality, intimate couple portrait, soft natural lighting, silk sheets, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography
```

**Test Prompt 2: Explicit Tier**
```
score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content
```

**Test Prompt 3: Unrestricted Tier**
```
score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult content, passionate intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism
```

#### **sdxl_image_high** (40 steps, ~47s, 6 images)
**Purpose**: High-quality image generation with premium quality  
**Token Limit**: 75 tokens  
**Output**: 6 images per job

**Test Prompt 1: Artistic Tier**
```
score_9, score_8_up, masterpiece, best quality, intimate couple portrait, soft natural lighting, silk sheets, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography
```

**Test Prompt 2: Explicit Tier**
```
score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content
```

**Test Prompt 3: Unrestricted Tier**
```
score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult content, passionate intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism
```

### **WAN Standard Jobs (4 Types)**

#### **image_fast** (25 steps, ~73s, 1 image)
**Purpose**: Fast single image generation  
**Token Limit**: 100 tokens  
**Output**: 1 image per job

**Test Prompt 1: Artistic Tier**
```
attractive couple in intimate embrace, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection, tender moment
```

**Test Prompt 2: Explicit Tier**
```
unrestricted nsfw, attractive couple, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

**Test Prompt 3: Unrestricted Tier**
```
unrestricted nsfw, explicit adult content, passionate couple intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

#### **image_high** (50 steps, ~90s, 1 image)
**Purpose**: High-quality single image generation  
**Token Limit**: 100 tokens  
**Output**: 1 image per job

**Test Prompt 1: Artistic Tier**
```
attractive couple in intimate embrace, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection, tender moment
```

**Test Prompt 2: Explicit Tier**
```
unrestricted nsfw, attractive couple, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

**Test Prompt 3: Unrestricted Tier**
```
unrestricted nsfw, explicit adult content, passionate couple intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

#### **video_fast** (25 steps, ~251s, 1 video)
**Purpose**: Fast video generation with motion  
**Token Limit**: 100 tokens  
**Output**: 1 video per job (5s duration)

**Test Prompt 1: Artistic Tier**
```
attractive couple in intimate embrace, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection, tender moment
```

**Test Prompt 2: Explicit Tier**
```
unrestricted nsfw, attractive couple, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

**Test Prompt 3: Unrestricted Tier**
```
unrestricted nsfw, explicit adult content, passionate couple intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

#### **video_high** (50 steps, ~360s, 1 video)
**Purpose**: High-quality video generation with motion  
**Token Limit**: 100 tokens  
**Output**: 1 video per job (6s duration)

**Test Prompt 1: Artistic Tier**
```
attractive couple in intimate embrace, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection, tender moment
```

**Test Prompt 2: Explicit Tier**
```
unrestricted nsfw, attractive couple, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

**Test Prompt 3: Unrestricted Tier**
```
unrestricted nsfw, explicit adult content, passionate couple intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

### **WAN Enhanced Jobs (4 Types)**

#### **image7b_fast_enhanced** (25 steps, ~233s, 1 image)
**Purpose**: Fast enhanced image with Qwen 7B prompt enhancement  
**Token Limit**: 50 tokens (simple input, Qwen enhances)  
**Output**: 1 image per job

**Test Prompt 1: Simple Input (Qwen Enhanced)**
```
two asian models intimate scene
```

**Test Prompt 2: Simple Input (Qwen Enhanced)**
```
couple passionate love making
```

**Test Prompt 3: Simple Input (Qwen Enhanced)**
```
professional adult content scene
```

#### **image7b_high_enhanced** (50 steps, ~104s, 1 image)
**Purpose**: High-quality enhanced image with Qwen 7B prompt enhancement  
**Token Limit**: 50 tokens (simple input, Qwen enhances)  
**Output**: 1 image per job

**Test Prompt 1: Simple Input (Qwen Enhanced)**
```
two asian models intimate scene
```

**Test Prompt 2: Simple Input (Qwen Enhanced)**
```
couple passionate love making
```

**Test Prompt 3: Simple Input (Qwen Enhanced)**
```
professional adult content scene
```

#### **video7b_fast_enhanced** (25 steps, ~264s, 1 video)
**Purpose**: Fast enhanced video with Qwen 7B prompt enhancement  
**Token Limit**: 50 tokens (simple input, Qwen enhances)  
**Output**: 1 video per job (5s duration)

**Test Prompt 1: Simple Input (Qwen Enhanced)**
```
two asian models intimate scene
```

**Test Prompt 2: Simple Input (Qwen Enhanced)**
```
couple passionate love making
```

**Test Prompt 3: Simple Input (Qwen Enhanced)**
```
professional adult content scene
```

#### **video7b_high_enhanced** (50 steps, ~370s, 1 video)
**Purpose**: High-quality enhanced video with Qwen 7B prompt enhancement  
**Token Limit**: 50 tokens (simple input, Qwen enhances)  
**Output**: 1 video per job (6s duration)

**Test Prompt 1: Simple Input (Qwen Enhanced)**
```
two asian models intimate scene
```

**Test Prompt 2: Simple Input (Qwen Enhanced)**
```
couple passionate love making
```

**Test Prompt 3: Simple Input (Qwen Enhanced)**
```
professional adult content scene
```

---

## **🚀 Testing Workflows**

### **Individual Testing Workflow**
```yaml
1. Select Model:
   - Choose SDXL (images) or WAN (videos)

2. Select Series:
   - Choose from 4 available test series
   - Each series has 3 tiers (artistic → explicit → unrestricted)

3. Select Tier:
   - Artistic: Tasteful, romantic content
   - Explicit: Direct, anatomical content
   - Unrestricted: Maximum explicit content

4. Review Prompt:
   - Auto-generated prompt based on selections
   - Token count validation
   - Option to modify prompt

5. Generate Content:
   - Submit to appropriate queue (SDXL/WAN)
   - Auto-save test result
   - Display generated content

6. Rate Quality:
   - Overall quality (1-10)
   - Technical quality (1-10)
   - Content quality (1-10)
   - Consistency (1-10)
   - Add notes
```

### **Batch Testing Workflow**
```yaml
1. Configure Batch:
   - Select model type
   - Choose multiple series (checkboxes)
   - Choose multiple tiers (checkboxes)
   - Set variations per prompt (1-10)

2. Review Summary:
   - Total tests calculation
   - Estimated time
   - Resource requirements

3. Start Batch:
   - Progress tracking
   - Real-time updates
   - Error handling
   - Automatic result saving

4. Monitor Progress:
   - Visual progress bar
   - Completed/total count
   - Success/failure tracking

5. Review Results:
   - All results in test results tab
   - Quality assessment interface
   - Analytics and insights
```

---

## **📊 Analytics and Reporting**

### **Key Metrics Tracked**
```yaml
Quality Metrics:
  - Average quality by model
  - Quality by tier
  - Quality by series
  - Quality trends over time

Performance Metrics:
  - Generation time by job type
  - Success rate by model
  - Error patterns and frequency
  - Resource utilization

Usage Metrics:
  - Most tested series
  - Most used job types
  - Quality rating patterns
  - User feedback correlation
```

### **Reporting Features**
```yaml
Real-time Dashboards:
  - Current test status
  - Quality trends
  - Performance metrics
  - Error alerts

Historical Analysis:
  - Quality progression over time
  - Model comparison charts
  - Performance regression detection
  - Baseline evolution tracking
```

---

## **🔧 Database Integration**

### **Supabase Connection**
```typescript
// Properly connected to model_test_results table
const { data, error } = await supabase
  .from('model_test_results')
  .select('*')
  .order('created_at', { ascending: false });
```

### **Table Schema**
```sql
-- Unified model_test_results table structure
model_test_results (
  id UUID PRIMARY KEY,
  model_type VARCHAR(20) NOT NULL,
  prompt_text TEXT NOT NULL,
  test_tier VARCHAR(50) NOT NULL,
  test_series VARCHAR(100) NOT NULL,
  overall_quality INTEGER,
  technical_quality INTEGER,
  content_quality INTEGER,
  consistency INTEGER,
  notes TEXT,
  image_url TEXT,
  video_url TEXT,
  job_id UUID,
  success BOOLEAN,
  created_at TIMESTAMP
);
```

### **Data Flow**
1. **Generation**: Submit prompt to queue-job edge function
2. **Storage**: Auto-save test result to database
3. **Retrieval**: Load and display all test results
4. **Updates**: Real-time quality rating updates

---

## **✅ Success Criteria**

### **Framework Completeness**
- [x] All 10 job types supported
- [x] Enhanced model integration
- [x] Comprehensive quality metrics
- [x] Real-time analytics
- [x] Baseline tracking
- [x] Automated batch testing

### **Baseline Establishment**
- [ ] Complete initial testing (360 tests)
- [ ] Quality baseline documentation
- [ ] Performance baseline documentation
- [ ] Monthly monitoring schedule
- [ ] Regression testing protocol

### **Ongoing Maintenance**
- [ ] Monthly baseline checks
- [ ] Quality trend analysis
- [ ] Performance monitoring
- [ ] Error pattern tracking
- [ ] Baseline updates

---

## **🎯 Usage Guidelines**

### **For Individual Testing**
1. Start with artistic tier to establish baseline
2. Progress to explicit tier for content testing
3. Test unrestricted tier for model limits
4. Rate quality immediately after generation
5. Add detailed notes for future reference

### **For Batch Testing**
1. Select comprehensive series coverage
2. Start with fewer variations (1-3) for initial testing
3. Increase variations (5-10) for detailed analysis
4. Monitor progress and resource usage
5. Review all results systematically

### **For Quality Assessment**
1. Use consistent rating criteria
2. Consider model-specific strengths
3. Document exceptional results
4. Track quality trends over time
5. Use analytics for optimization

This comprehensive testing framework ensures systematic evaluation and baseline maintenance for all AI models in the system, providing reliable quality assessment and performance monitoring capabilities. 

## **Qwen-Only Prompt Testing & Scoring**

- All prompt testing, scoring, and analytics are now Qwen-based.
- Use the following Supabase tables for all analytics and dashboards:
  - model_test_results
  - job_enhancement_analysis
  - image_enhancement_analysis
  - video_enhancement_analysis
  - prompt_ab_tests
- Use the following fields for Qwen analytics: prompt_text, enhanced_prompt, overall_quality, technical_quality, content_quality, consistency, notes, enhancement_strategy, qwen_expansion_percentage, etc.

### **Best Practices for NSFW, Positions, Multi-Party Prompts**
- Use explicit, clear language in the base prompt.
- Let Qwen expand and professionalize the description.
- For multi-party, specify all participants and desired interactions in the prompt.
- For positions, use anatomical terms and clear action verbs.
- For NSFW, use professional, explicit language; Qwen will refine and expand.
- Always review the Qwen-enhanced prompt for token safety and clarity.
- Rate and record anatomical accuracy, realism, and quality in Supabase. 