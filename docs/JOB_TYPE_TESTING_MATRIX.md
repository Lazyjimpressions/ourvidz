# Job Type Testing Matrix

## Overview
This matrix provides systematic testing for all 10 job types across SDXL, WAN standard, and WAN enhanced models. Each job type is tested with appropriate prompts optimized for that specific model and quality level.

---

## **SDXL Jobs (2 Types)**

### **sdxl_image_fast** (25 steps, ~30s, 6 images)
**Purpose**: Ultra-fast image generation with good quality
**Token Limit**: 75 tokens
**Output**: 6 images per job

#### Test Prompt 1: Artistic Tier
```
score_9, score_8_up, masterpiece, best quality, intimate couple portrait, soft natural lighting, silk sheets, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography
```

#### Test Prompt 2: Explicit Tier
```
score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content
```

#### Test Prompt 3: Unrestricted Tier
```
score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult content, passionate intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism
```

### **sdxl_image_high** (40 steps, ~47s, 6 images)
**Purpose**: High-quality image generation with premium quality
**Token Limit**: 75 tokens
**Output**: 6 images per job

#### Test Prompt 1: Artistic Tier
```
score_9, score_8_up, masterpiece, best quality, intimate couple portrait, soft natural lighting, silk sheets, romantic atmosphere, artistic nude photography, beautiful lighting, professional camera, shallow depth of field, warm color palette, emotional connection, tender moment, professional photography
```

#### Test Prompt 2: Explicit Tier
```
score_9, score_8_up, explicit nsfw, masterpiece, best quality, passionate couple intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, romantic atmosphere, professional adult content
```

#### Test Prompt 3: Unrestricted Tier
```
score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, explicit adult content, passionate intimate scene, natural anatomy, detailed skin texture, professional lighting, artistic composition, high resolution, beautiful lighting, professional camera, shallow depth of field, maximum realism
```

---

## **WAN Standard Jobs (4 Types)**

### **image_fast** (25 steps, ~73s, 1 image)
**Purpose**: Fast single image generation
**Token Limit**: 100 tokens
**Output**: 1 image per job

#### Test Prompt 1: Artistic Tier
```
attractive couple in intimate embrace, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection, tender moment
```

#### Test Prompt 2: Explicit Tier
```
unrestricted nsfw, attractive couple, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

#### Test Prompt 3: Unrestricted Tier
```
unrestricted nsfw, explicit adult content, passionate couple intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

### **image_high** (50 steps, ~90s, 1 image)
**Purpose**: High-quality single image generation
**Token Limit**: 100 tokens
**Output**: 1 image per job

#### Test Prompt 1: Artistic Tier
```
attractive couple in intimate embrace, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection, tender moment
```

#### Test Prompt 2: Explicit Tier
```
unrestricted nsfw, attractive couple, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

#### Test Prompt 3: Unrestricted Tier
```
unrestricted nsfw, explicit adult content, passionate couple intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

### **video_fast** (25 steps, ~251s, 1 video)
**Purpose**: Fast video generation with motion
**Token Limit**: 100 tokens
**Output**: 1 video per job (5s duration)

#### Test Prompt 1: Artistic Tier
```
attractive couple in intimate embrace, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection, tender moment
```

#### Test Prompt 2: Explicit Tier
```
unrestricted nsfw, attractive couple, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

#### Test Prompt 3: Unrestricted Tier
```
unrestricted nsfw, explicit adult content, passionate couple intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

### **video_high** (50 steps, ~360s, 1 video)
**Purpose**: High-quality video generation with motion
**Token Limit**: 100 tokens
**Output**: 1 video per job (6s duration)

#### Test Prompt 1: Artistic Tier
```
attractive couple in intimate embrace, smooth motion, fluid movement, romantic atmosphere, soft natural lighting, intimate setting, stable camera, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, emotional connection, tender moment
```

#### Test Prompt 2: Explicit Tier
```
unrestricted nsfw, attractive couple, passionate intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

#### Test Prompt 3: Unrestricted Tier
```
unrestricted nsfw, explicit adult content, passionate couple intimate scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, professional adult content, high quality video, professional cinematography, maximum realism
```

---

## **WAN Enhanced Jobs (4 Types)**

### **image7b_fast_enhanced** (25 steps, ~233s, 1 image)
**Purpose**: Fast enhanced image with Qwen 7B prompt enhancement
**Token Limit**: 50 tokens (simple input, Qwen enhances)
**Output**: 1 image per job

#### Test Prompt 1: Simple Input (Qwen Enhanced)
```
two asian models intimate scene
```

#### Test Prompt 2: Simple Input (Qwen Enhanced)
```
couple passionate love making
```

#### Test Prompt 3: Simple Input (Qwen Enhanced)
```
professional adult content scene
```

### **image7b_high_enhanced** (50 steps, ~104s, 1 image)
**Purpose**: High-quality enhanced image with Qwen 7B prompt enhancement
**Token Limit**: 50 tokens (simple input, Qwen enhances)
**Output**: 1 image per job

#### Test Prompt 1: Simple Input (Qwen Enhanced)
```
two asian models intimate scene
```

#### Test Prompt 2: Simple Input (Qwen Enhanced)
```
couple passionate love making
```

#### Test Prompt 3: Simple Input (Qwen Enhanced)
```
professional adult content scene
```

### **video7b_fast_enhanced** (25 steps, ~264s, 1 video)
**Purpose**: Fast enhanced video with Qwen 7B prompt enhancement
**Token Limit**: 50 tokens (simple input, Qwen enhances)
**Output**: 1 video per job (5s duration)

#### Test Prompt 1: Simple Input (Qwen Enhanced)
```
two asian models intimate scene
```

#### Test Prompt 2: Simple Input (Qwen Enhanced)
```
couple passionate love making
```

#### Test Prompt 3: Simple Input (Qwen Enhanced)
```
professional adult content scene
```

### **video7b_high_enhanced** (50 steps, ~370s, 1 video)
**Purpose**: High-quality enhanced video with Qwen 7B prompt enhancement
**Token Limit**: 50 tokens (simple input, Qwen enhances)
**Output**: 1 video per job (6s duration)

#### Test Prompt 1: Simple Input (Qwen Enhanced)
```
two asian models intimate scene
```

#### Test Prompt 2: Simple Input (Qwen Enhanced)
```
couple passionate love making
```

#### Test Prompt 3: Simple Input (Qwen Enhanced)
```
professional adult content scene
```

---

## **Testing Protocol**

### **For Each Job Type:**
1. **Test all 3 tiers** (Artistic → Explicit → Unrestricted)
2. **Generate 2-3 variations** per prompt
3. **Record results** in testing UI
4. **Rate quality** (1-10 scale)
5. **Note performance** (generation time, file size)

### **Quality Metrics:**
- **Overall Quality** (1-10): Technical execution and artistic merit
- **Technical Quality** (1-10): Resolution, artifacts, file format
- **Content Quality** (1-10): NSFW content appropriateness and accuracy
- **Consistency** (1-10): Reliability across multiple generations

### **Performance Metrics:**
- **Generation Time**: Actual vs expected time
- **File Size**: Compression efficiency
- **Success Rate**: Percentage of successful generations
- **Error Types**: Common failure modes

---

## **Expected Results Matrix**

| Job Type | Artistic Quality | Explicit Quality | Unrestricted Quality | Performance | Status |
|----------|------------------|------------------|---------------------|-------------|--------|
| **sdxl_image_fast** | 7-8/10 | 6-7/10 | 5-6/10 | 29.9s | ✅ Tested |
| **sdxl_image_high** | 8-9/10 | 7-8/10 | 6-7/10 | 42.4s | ✅ Tested |
| **image_fast** | 6-7/10 | 5-6/10 | 4-5/10 | 73s | 🔄 Testing |
| **image_high** | 7-8/10 | 6-7/10 | 5-6/10 | 90s | 🔄 Testing |
| **video_fast** | 6-7/10 | 5-6/10 | 4-5/10 | 251s | 🔄 Testing |
| **video_high** | 7-8/10 | 6-7/10 | 5-6/10 | 360s | 🔄 Testing |
| **image7b_fast_enhanced** | 7-8/10 | 6-7/10 | 5-6/10 | 233s | 🔄 Testing |
| **image7b_high_enhanced** | 8-9/10 | 7-8/10 | 6-7/10 | 104s | 🔄 Testing |
| **video7b_fast_enhanced** | 7-8/10 | 6-7/10 | 5-6/10 | 264s | 🔄 Testing |
| **video7b_high_enhanced** | 8-9/10 | 7-8/10 | 6-7/10 | 370s | 🔄 Testing |

---

## **Testing Priority**

### **Phase 1: Core Models (Week 1)**
1. **SDXL Jobs**: `sdxl_image_fast`, `sdxl_image_high`
2. **WAN Standard**: `image_fast`, `image_high`

### **Phase 2: Video Models (Week 2)**
1. **WAN Video**: `video_fast`, `video_high`
2. **Motion Quality**: Focus on temporal consistency

### **Phase 3: Enhanced Models (Week 3)**
1. **WAN Enhanced**: All 4 enhanced job types
2. **Qwen Enhancement**: Validate prompt enhancement quality

### **Phase 4: Cross-Model Analysis (Week 4)**
1. **Quality Comparison**: SDXL vs WAN vs Enhanced
2. **Performance Analysis**: Time vs quality trade-offs
3. **Best Practices**: Optimal job type selection

This comprehensive testing matrix ensures systematic evaluation of all job types while establishing quality baselines and performance characteristics for each model variant. 