# OurVidz Master Prompting Guide - Expert-Level Implementation

**Last Updated:** July 7, 2025  
**Models:** SDXL LUSTIFY v2.0, WAN 2.1 T2V-1.3B, Qwen 2.5-7B Enhancement  
**Purpose:** Production-ready prompting system for maximum effectiveness and anatomical accuracy

---

## **🎯 Executive Summary**

This master guide consolidates the best approaches from both existing prompting guides, providing:

- **Expert-Level System Prompts**: Optimized for each model's strengths
- **Sexually Explicit Content Specialization**: Anatomical accuracy and professional quality
- **Production-Ready Implementation**: Complete edge function code
- **Token Optimization**: Model-specific strategies
- **Quality Assurance**: Comprehensive negative prompts and error prevention

---

## **📊 Comparative Analysis**

### **Guide Comparison Matrix**

| Aspect | My Guide | Claude Guide | Master Approach |
|--------|----------|--------------|-----------------|
| **SDXL Quality Tags** | `masterpiece, best quality` | `score_9, score_8_up` | **Combined**: `score_9, score_8_up, masterpiece, best quality` |
| **Token Management** | 77 tokens (SDXL) | 75 tokens (SDXL) | **Optimized**: 75 tokens (safety margin) |
| **NSFW Handling** | Basic anatomical terms | Artistic vs explicit | **Advanced**: Three-tier system (artistic, explicit, unrestricted) |
| **WAN Enhancement** | Qwen 7B external | WAN built-in | **Hybrid**: Both approaches with fallbacks |
| **Negative Prompts** | Comprehensive categories | Context-based | **Master**: Priority-based with anatomical focus |
| **Edge Function** | Basic implementation | Complete production | **Production**: Full error handling + optimization |

### **Key Improvements in Master Guide**

1. **Three-Tier NSFW System**: Artistic → Explicit → Unrestricted
2. **Anatomical Accuracy Framework**: Model-specific anatomical terms
3. **Hybrid Enhancement Strategy**: WAN built-in + Qwen external
4. **Production-Ready Edge Function**: Complete with error handling
5. **Advanced Token Optimization**: Priority-based truncation

---

## **🤖 Model-Specific System Prompts**

### **1. SDXL LUSTIFY - Master System Prompt**

#### **Core Template Structure**
```
You are an expert SDXL LUSTIFY prompt engineer specializing in NSFW content with anatomical accuracy.

INPUT FORMAT: Natural language description
OUTPUT FORMAT: Optimized SDXL prompt with quality hierarchy

QUALITY HIERARCHY:
1. Quality Tags: score_9, score_8_up, masterpiece, best quality, highly detailed
2. Subject Definition: Specific anatomical accuracy terms
3. Environmental Context: Setting, lighting, atmosphere
4. Technical Specifications: Camera, lens, settings
5. Style Modifiers: Photography style, color grading

ANATOMICAL ACCURACY FRAMEWORK:
- Natural proportions, perfect anatomy, balanced features
- Specific body part descriptions for NSFW content
- Professional anatomical terminology
- Avoid generic terms, use specific descriptors

TOKEN LIMIT: 75 tokens (225 characters)
PRIORITY: Quality tags → Subject → Environment → Technical → Style

Input: {user_prompt}
Output:
```

#### **Example Conversions**

**Input:** "naked woman in bedroom"
**Output:** 
```
score_9, score_8_up, masterpiece, best quality, highly detailed, beautiful naked woman, perfect anatomy, natural breasts, smooth skin, elegant pose, intimate bedroom setting, soft natural lighting, warm atmosphere, shot on Canon EOS R5, f/1.8, shallow depth of field, professional photography, 8k resolution
```

**Input:** "couple having sex"
**Output:**
```
score_9, score_8_up, masterpiece, best quality, highly detailed, attractive couple, intimate moment, perfect anatomy, natural bodies, sensual interaction, soft lighting, intimate atmosphere, natural skin texture, warm color palette, professional photography, tasteful composition, anatomically accurate
```

### **2. WAN 2.1 - Master Video System Prompt**

#### **Core Template Structure**
```
You are an expert WAN 2.1 video prompt engineer specializing in temporal consistency and motion quality.

INPUT FORMAT: Natural language description
OUTPUT FORMAT: Cinematic video prompt with motion hierarchy

MOTION HIERARCHY:
1. Subject Definition: Clear, specific character descriptions
2. Action/Motion: Specific motion verbs and temporal consistency
3. Environmental Context: Setting, lighting, atmosphere
4. Camera Dynamics: Movement, framing, cinematography
5. Technical Quality: Professional filming techniques

TEMPORAL CONSISTENCY FRAMEWORK:
- Smooth motion, fluid movement, natural gait
- Temporal stability, consistent lighting, steady camera
- Avoid: jerky movement, teleporting, flickering
- Focus: Single continuous action, environmental interaction

TOKEN LIMIT: 100 tokens (300 characters)
PRIORITY: Subject → Motion → Environment → Camera → Quality

Input: {user_prompt}
Output:
```

#### **Example Conversions**

**Input:** "woman undressing"
**Output:**
```
beautiful woman undressing slowly, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera movement, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, shallow depth of field
```

**Input:** "couple intimate scene"
**Output:**
```
attractive couple in intimate moment, smooth motion, fluid movement, sensual interaction, soft lighting, intimate atmosphere, stable camera, temporal consistency, natural body movement, romantic setting, high quality video, professional cinematography, tasteful composition, emotional connection
```

### **3. Qwen 7B - Master Enhancement System Prompt**

#### **Core Template Structure**
```
You are an expert prompt enhancement specialist for NSFW content with anatomical accuracy.

INPUT FORMAT: Simple prompt or description
OUTPUT FORMAT: Detailed, professional description with anatomical focus

ENHANCEMENT FRAMEWORK:
1. Anatomical Accuracy: Specific body part descriptions
2. Professional Quality: Cinematography and photography terms
3. Environmental Detail: Setting, lighting, atmosphere
4. Emotional Context: Mood, feeling, connection
5. Technical Excellence: Professional production values

NSFW SPECIALIZATION:
- Use professional anatomical terminology
- Maintain tasteful and respectful language
- Focus on artistic and aesthetic quality
- Emphasize emotional and sensual aspects
- Ensure anatomical accuracy for adult content

EXPANSION RATIO: 300-500% detail increase
TOKEN LIMIT: Model-specific (SDXL: 75, WAN: 100)

Input: {user_prompt}
Output:
```

#### **Example Conversions**

**Input:** "woman in lingerie"
**Output:**
```
一位美丽的女性穿着精致的蕾丝内衣，展现出完美的身材比例和自然的曲线。她有着精致的面容和优雅的气质，在柔和的灯光下显得格外迷人。镜头采用专业的构图技巧，捕捉她自然的表情和优雅的姿态。整个场景充满了浪漫和温馨的氛围，体现了专业的人像摄影水准，展现了人体艺术的优雅和美感。
```

**Input:** "couple intimate"
**Output:**
```
一对相爱的情侣在私密的环境中分享亲密的时刻。他们有着完美的身材比例和自然的身体曲线，展现出健康的美感。柔和的灯光营造出浪漫而温馨的氛围，镜头采用专业的构图技巧，捕捉他们之间真挚的情感交流。整个场景充满了爱意和温暖，体现了专业的人像摄影水准，展现了人体艺术的优雅和美感。
```

---

## **🔞 Sexually Explicit Content Specialization**

### **Three-Tier NSFW System**

#### **Tier 1: Artistic Adult Content (Tasteful)**
```yaml
Target: Artistic, tasteful adult content
Language: Professional, artistic terminology
Focus: Emotional connection, aesthetic beauty
Anatomical Terms: Natural curves, perfect proportions, elegant features
Quality: Professional photography, fine art aesthetic

Example Input: "intimate couple portrait"
Example Output: "score_9, score_8_up, masterpiece, intimate couple embrace, artistic nude photography, soft natural window light, tender moment, professional boudoir photography, shot on medium format, shallow depth of field, warm skin tones, tasteful composition, fine art aesthetic, emotional connection"
```

#### **Tier 2: Explicit Adult Content (Direct)**
```yaml
Target: Direct, explicit adult content
Language: Professional but direct terminology
Focus: Anatomical accuracy, production quality
Anatomical Terms: Specific body part descriptions, natural anatomy
Quality: Professional adult content, high-end production

Example Input: "adult video scene"
Example Output: "score_9, score_8_up, explicit nsfw, professional adult content, attractive adult performers, intimate scene, high-end production values, professional lighting setup, 4k camera quality, realistic skin textures, anatomically accurate, shot on RED camera, cinematic depth of field, professional color grading"
```

#### **Tier 3: Unrestricted Adult Content (Maximum)**
```yaml
Target: Unrestricted, maximum explicit content
Language: Direct, professional adult terminology
Focus: Maximum anatomical accuracy, professional quality
Anatomical Terms: Comprehensive anatomical descriptions
Quality: Professional adult production, maximum realism

Example Input: "explicit adult scene"
Example Output: "score_9, score_8_up, unrestricted nsfw, professional adult content, attractive adult performers, explicit intimate scene, maximum anatomical accuracy, high-end production values, professional lighting setup, 4k camera quality, realistic skin textures, shot on RED camera, cinematic depth of field, professional color grading, maximum realism"
```

### **Anatomical Accuracy Framework**

#### **SDXL Anatomical Terms**
```yaml
General Anatomy:
  - perfect anatomy, natural proportions, balanced features
  - natural curves, elegant figure, harmonious body
  - smooth skin, natural skin texture, healthy skin

NSFW-Specific:
  - natural breasts, perfect breasts, symmetrical breasts
  - natural curves, perfect anatomy, proportional body
  - anatomically accurate, realistic anatomy, natural proportions
  - professional anatomical accuracy, medical-grade realism

Quality Modifiers:
  - masterpiece, best quality, highly detailed
  - professional photography, 8k resolution
  - natural lighting, soft lighting, intimate atmosphere
```

#### **WAN Video Anatomical Terms**
```yaml
Motion Quality:
  - smooth motion, fluid movement, natural movement
  - temporal consistency, stable motion, continuous movement
  - natural body movement, graceful motion, fluid action

Anatomical Stability:
  - consistent anatomy, stable proportions, continuous features
  - temporal consistency, motion stability, fluid transitions
  - anatomically accurate motion, realistic body movement

Camera and Lighting:
  - stable camera, consistent lighting, smooth camera movement
  - temporal lighting, continuous illumination, stable exposure
  - professional cinematography, smooth transitions
```

---

## **🚫 Advanced Negative Prompt System**

### **Priority-Based Negative Prompt Framework**

#### **SDXL LUSTIFY - Master Negative Prompts**
```typescript
function generateMasterNegativePromptForSDXL(userPrompt = '', tier = 'artistic') {
  console.log('🎨 Generating master negative prompt for SDXL');
  
  // Priority 1: Critical Quality (Always Included)
  const criticalNegatives = [
    "bad anatomy", "extra limbs", "deformed", "missing limbs",
    "worst quality", "low quality", "normal quality", "lowres"
  ];
  
  // Priority 2: Anatomical Accuracy (Always Included)
  const anatomicalNegatives = [
    "bad hands", "bad fingers", "extra fingers", "missing fingers",
    "deformed hands", "deformed face", "malformed", "distorted features"
  ];
  
  // Priority 3: Technical Artifacts (High Priority)
  const technicalNegatives = [
    "watermark", "signature", "text", "logo", "contact info",
    "username", "artist name", "title", "caption"
  ];
  
  // Priority 4: Style Prevention (Medium Priority)
  const styleNegatives = [
    "anime", "cartoon", "graphic", "render", "cgi", "3d",
    "painting", "drawing", "illustration", "sketch"
  ];
  
  // Priority 5: NSFW-Specific (Conditional)
  const nsfwNegatives = [
    "child", "minor", "underage", "teen", "young",
    "childlike features", "school uniform", "inappropriate content"
  ];
  
  // Priority 6: Adult Content Enhancement (Tier-Specific)
  const adultEnhancementNegatives = {
    artistic: [
      "crude", "vulgar", "explicit", "graphic", "distasteful"
    ],
    explicit: [
      "amateur", "low budget", "poor quality", "unprofessional"
    ],
    unrestricted: [
      "amateur", "low budget", "poor quality", "unprofessional",
      "anatomical errors", "wrong proportions", "distorted anatomy"
    ]
  };
  
  // Build negative prompt with priority system
  let negativePrompt = [
    ...criticalNegatives,
    ...anatomicalNegatives,
    ...technicalNegatives.slice(0, 4), // Limit for token efficiency
    ...styleNegatives.slice(0, 3),     // Limit for token efficiency
    ...nsfwNegatives
  ];
  
  // Add tier-specific adult content negatives
  if (tier !== 'artistic') {
    negativePrompt.push(...adultEnhancementNegatives[tier].slice(0, 3));
  }
  
  // Add conditional NSFW anatomical improvements
  if (userPrompt.toLowerCase().includes('naked') || 
      userPrompt.toLowerCase().includes('nude') || 
      userPrompt.toLowerCase().includes('sex')) {
    negativePrompt.push(
      "deformed breasts", "extra breasts", "anatomical errors",
      "wrong anatomy", "distorted bodies", "unnatural poses"
    );
  }
  
  const result = negativePrompt.join(", ");
  console.log('✅ Master SDXL negative prompt generated:', result);
  return result;
}
```

#### **WAN 2.1 - Master Negative Prompts**
```typescript
function generateMasterNegativePromptForWAN(userPrompt = '', isVideo = false, tier = 'artistic') {
  console.log('🎬 Generating master negative prompt for WAN');
  
  // Priority 1: Motion Quality (Always Included)
  const motionNegatives = [
    "static image", "still frame", "no motion", "photograph",
    "jerky movement", "unnatural motion", "teleporting"
  ];
  
  // Priority 2: Video-Specific (Video Only)
  const videoNegatives = isVideo ? [
    "flickering", "stuttering", "inconsistent motion", "morphing features",
    "motion artifacts", "temporal inconsistency", "frame stuttering"
  ] : [];
  
  // Priority 3: Quality Control (Always Included)
  const qualityNegatives = [
    "blurry", "distorted", "glitchy", "corrupted", "artifacts",
    "low resolution", "pixelated", "compression artifacts"
  ];
  
  // Priority 4: Content Prevention (Always Included)
  const contentNegatives = [
    "text overlay", "subtitles", "watermark", "logo",
    "ui elements", "split screen", "multiple scenes"
  ];
  
  // Priority 5: NSFW-Specific (Conditional)
  const nsfwNegatives = [
    "child", "minor", "underage", "teen", "young",
    "childlike features", "inappropriate content"
  ];
  
  // Priority 6: Adult Content Enhancement (Tier-Specific)
  const adultEnhancementNegatives = {
    artistic: [
      "crude", "vulgar", "explicit", "graphic", "distasteful"
    ],
    explicit: [
      "amateur", "low budget", "poor quality", "unprofessional"
    ],
    unrestricted: [
      "amateur", "low budget", "poor quality", "unprofessional",
      "anatomical errors", "wrong proportions", "distorted anatomy"
    ]
  };
  
  // Build comprehensive negative prompt
  let negativePrompt = [
    ...motionNegatives,
    ...videoNegatives,
    ...qualityNegatives,
    ...contentNegatives,
    ...nsfwNegatives
  ];
  
  // Add tier-specific adult content negatives
  if (tier !== 'artistic') {
    negativePrompt.push(...adultEnhancementNegatives[tier]);
  }
  
  // Add conditional NSFW anatomical improvements
  if (userPrompt.toLowerCase().includes('naked') || 
      userPrompt.toLowerCase().includes('nude') || 
      userPrompt.toLowerCase().includes('sex')) {
    negativePrompt.push(
      "deformed breasts", "extra breasts", "anatomical errors",
      "wrong anatomy", "distorted bodies", "unnatural poses",
      "inconsistent anatomy", "morphing features"
    );
  }
  
  const result = negativePrompt.join(", ");
  console.log('✅ Master WAN negative prompt generated:', result);
  return result;
}
```

---

## **⚙️ Production-Ready Edge Function Implementation**

### **Complete Master Edge Function**

```typescript
// supabase/functions/queue-job/index.ts
// Master prompting system with three-tier NSFW support

interface MasterJobConfig {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  frames?: number;
  enhancement_tier?: 'artistic' | 'explicit' | 'unrestricted';
}

// Master settings configurations
const MASTER_JOB_SETTINGS = {
  // SDXL Jobs
  sdxl_image_fast: {
    num_inference_steps: 25,
    guidance_scale: 7.0,
    width: 1024,
    height: 1024,
    batch_size: 6,
    token_limit: 75
  },
  sdxl_image_high: {
    num_inference_steps: 40,
    guidance_scale: 7.5,
    width: 1024,
    height: 1024,
    batch_size: 6,
    token_limit: 75
  },
  
  // WAN Standard Jobs
  image_fast: {
    num_inference_steps: 40,
    guidance_scale: 6.0,
    width: 832,
    height: 480,
    frames: 1,
    token_limit: 100
  },
  image_high: {
    num_inference_steps: 50,
    guidance_scale: 5.0,
    width: 832,
    height: 480,
    frames: 1,
    token_limit: 100
  },
  video_fast: {
    num_inference_steps: 40,
    guidance_scale: 6.0,
    width: 832,
    height: 480,
    frames: 81,
    token_limit: 100
  },
  video_high: {
    num_inference_steps: 50,
    guidance_scale: 5.0,
    width: 832,
    height: 480,
    frames: 81,
    token_limit: 100
  },
  
  // Enhanced Jobs (No negative prompts)
  image7b_fast_enhanced: {
    num_inference_steps: 40,
    guidance_scale: 6.0,
    width: 832,
    height: 480,
    frames: 1,
    use_enhancement: true,
    token_limit: 50
  },
  image7b_high_enhanced: {
    num_inference_steps: 50,
    guidance_scale: 5.0,
    width: 832,
    height: 480,
    frames: 1,
    use_enhancement: true,
    token_limit: 50
  },
  video7b_fast_enhanced: {
    num_inference_steps: 40,
    guidance_scale: 6.0,
    width: 832,
    height: 480,
    frames: 81,
    use_enhancement: true,
    token_limit: 50
  },
  video7b_high_enhanced: {
    num_inference_steps: 50,
    guidance_scale: 5.0,
    width: 832,
    height: 480,
    frames: 81,
    use_enhancement: true,
    token_limit: 50
  }
};

// Master prompt optimization
function optimizeMasterPrompt(prompt: string, jobType: string, tier: string = 'artistic'): string {
  const isVideo = jobType.includes('video');
  const isSDXL = jobType.includes('sdxl');
  const isEnhanced = jobType.includes('enhanced');
  const settings = MASTER_JOB_SETTINGS[jobType];
  
  // Don't modify enhanced job prompts - let WAN handle it
  if (isEnhanced) {
    return prompt.slice(0, settings.token_limit * 3); // Character limit
  }
  
  // SDXL optimization
  if (isSDXL) {
    // Add quality tags if missing
    if (!prompt.includes('score_') && !prompt.includes('masterpiece')) {
      prompt = `score_9, score_8_up, masterpiece, best quality, ${prompt}`;
    }
    
    // Add photo realism if not specified
    if (!prompt.includes('photo') && !prompt.includes('art')) {
      prompt += ', photorealistic, professional photography';
    }
    
    // Add tier-specific modifiers
    if (tier === 'explicit') {
      prompt = prompt.replace('score_9, score_8_up, masterpiece', 'score_9, score_8_up, explicit nsfw, masterpiece');
    } else if (tier === 'unrestricted') {
      prompt = prompt.replace('score_9, score_8_up, masterpiece', 'score_9, score_8_up, unrestricted nsfw, masterpiece');
    }
    
    return prompt.slice(0, settings.token_limit * 3); // ~75 tokens
  }
  
  // WAN video optimization
  if (isVideo) {
    // Add motion descriptors if missing
    if (!prompt.includes('moving') && !prompt.includes('walking') && !prompt.includes('motion')) {
      prompt += ', smooth natural motion';
    }
    
    // Add camera work if missing
    if (!prompt.includes('camera') && !prompt.includes('shot')) {
      prompt += ', professional cinematography, steady camera';
    }
    
    // Add tier-specific modifiers
    if (tier === 'explicit') {
      prompt += ', professional adult content';
    } else if (tier === 'unrestricted') {
      prompt += ', unrestricted adult content';
    }
    
    return prompt.slice(0, settings.token_limit * 3); // ~100 tokens
  }
  
  return prompt;
}

// Master negative prompt generation
function generateMasterNegativePrompt(prompt: string, jobType: string, tier: string = 'artistic'): string {
  const isSDXL = jobType.includes('sdxl');
  const isEnhanced = jobType.includes('enhanced');
  const isVideo = jobType.includes('video');
  
  // Enhanced jobs don't use negative prompts
  if (isEnhanced) {
    return '';
  }
  
  // Generate model-specific negative prompts
  if (isSDXL) {
    return generateMasterNegativePromptForSDXL(prompt, tier);
  } else {
    return generateMasterNegativePromptForWAN(prompt, isVideo, tier);
  }
}

// Main master edge function
export async function queueMasterJob(req: Request) {
  try {
    const { job_type, prompt, config = {}, enhancement_tier = 'artistic' } = await req.json();
    
    // Validate enhancement tier
    const validTiers = ['artistic', 'explicit', 'unrestricted'];
    if (!validTiers.includes(enhancement_tier)) {
      return new Response(JSON.stringify({ error: 'Invalid enhancement tier' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get user from auth
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate job type
    const validJobTypes = Object.keys(MASTER_JOB_SETTINGS);
    if (!validJobTypes.includes(job_type)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid job type',
        valid_types: validJobTypes
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get settings for job type
    const settings = MASTER_JOB_SETTINGS[job_type];
    const isEnhanced = job_type.includes('enhanced');
    
    // Optimize prompt using master system
    const optimizedPrompt = optimizeMasterPrompt(prompt, job_type, enhancement_tier);
    
    // Generate negative prompt
    const negativePrompt = generateMasterNegativePrompt(prompt, job_type, enhancement_tier);
    
    // Build master job configuration
    const jobConfig: MasterJobConfig = {
      prompt: optimizedPrompt,
      negative_prompt: negativePrompt,
      enhancement_tier,
      ...settings,
      ...config // Allow user overrides
    };
    
    // Determine queue
    const queue = job_type.includes('sdxl') ? 'sdxl_queue' : 'wan_queue';
    
    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type,
        prompt: optimizedPrompt,
        negative_prompt: negativePrompt,
        config: jobConfig,
        enhancement_tier,
        status: 'pending'
      })
      .select()
      .single();
      
    if (jobError) {
      console.error('❌ Job creation failed:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to create job' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Add to Redis queue
    const queuePayload = {
      id: job.id,
      type: job_type,
      prompt: jobConfig.prompt,
      negative_prompt: jobConfig.negative_prompt,
      config: jobConfig,
      enhancement_tier,
      user_id: user.id,
      created_at: new Date().toISOString()
    };
    
    const redisResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/lpush/${queue}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queuePayload)
    });
    
    if (!redisResponse.ok) {
      // Update job status to failed
      await supabase
        .from('jobs')
        .update({ status: 'failed', error_message: 'Failed to queue job' })
        .eq('id', job.id);
        
      return new Response(JSON.stringify({ error: 'Failed to queue job' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Master job queued successfully:', {
      jobId: job.id,
      jobType,
      enhancementTier: enhancement_tier,
      hasNegativePrompt: !!negativePrompt,
      queue
    });
    
    return new Response(JSON.stringify({ 
      job_id: job.id,
      status: 'queued',
      enhancement_tier,
      message: `Master job queued for ${job_type} generation (${enhancement_tier} tier)`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Master edge function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

---

## **🎯 Advanced Token Management**

### **Master Token Optimization Strategy**

```typescript
// Advanced token counting with priority preservation
function masterTokenOptimization(prompt: string, maxTokens: number, jobType: string): string {
  // More accurate token estimation
  function estimateTokens(text: string): number {
    // English: ~4 characters per token
    // Chinese: ~2 characters per token
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    const ratio = hasChinese ? 2 : 4;
    return Math.ceil(text.length / ratio);
  }
  
  const estimated = estimateTokens(prompt);
  
  if (estimated <= maxTokens) {
    return prompt;
  }
  
  // Priority-based truncation
  const parts = prompt.split(',').map(p => p.trim());
  const priorities = {
    sdxl: ['score_9', 'score_8_up', 'masterpiece', 'best quality', 'highly detailed'],
    wan: ['subject', 'motion', 'environment', 'camera', 'quality']
  };
  
  const jobPriorities = jobType.includes('sdxl') ? priorities.sdxl : priorities.wan;
  const optimized = [];
  
  // Keep priority elements first
  for (const priority of jobPriorities) {
    const matchingParts = parts.filter(p => p.toLowerCase().includes(priority.toLowerCase()));
    optimized.push(...matchingParts);
  }
  
  // Add remaining parts until token limit
  for (const part of parts) {
    if (!optimized.includes(part) && estimateTokens(optimized.join(', ')) < maxTokens - 10) {
      optimized.push(part);
    }
  }
  
  return optimized.join(', ');
}
```

---

## **📊 Quality Assurance Framework**

### **Master Quality Metrics**

```yaml
Anatomical Accuracy:
  Target: 85% reduction in anatomical errors
  Measurement: User feedback + automated detection
  Implementation: Comprehensive negative prompts + anatomical terms

NSFW Content Quality:
  Target: 75% improvement in adult content accuracy
  Measurement: Professional quality assessment
  Implementation: Three-tier system + anatomical framework

Video Motion Quality:
  Target: 90% reduction in motion artifacts
  Measurement: Temporal consistency analysis
  Implementation: Video-specific negative prompts + motion terms

Overall Quality:
  Target: >95% user satisfaction for enhanced jobs
  Measurement: User feedback collection
  Implementation: Hybrid enhancement strategy
```

### **Production Monitoring**

```typescript
// Quality monitoring and logging
function logMasterJobQuality(jobId: string, jobType: string, tier: string, prompt: string) {
  const qualityMetrics = {
    job_id: jobId,
    job_type: jobType,
    enhancement_tier: tier,
    prompt_length: prompt.length,
    estimated_tokens: Math.ceil(prompt.length / 3),
    has_anatomical_terms: /anatomical|proportions|natural/.test(prompt.toLowerCase()),
    has_quality_tags: /score_|masterpiece|best quality/.test(prompt.toLowerCase()),
    has_nsfw_indicators: /nsfw|adult|explicit/.test(prompt.toLowerCase()),
    timestamp: new Date().toISOString()
  };
  
  // Log to monitoring system
  console.log('📊 Master job quality metrics:', qualityMetrics);
  
  // Store in database for analysis
  supabase.from('quality_metrics').insert(qualityMetrics);
}
```

---

## **🚀 Production Deployment Checklist**

### **Master System Deployment**

1. **Environment Variables**
   ```
   UPSTASH_REDIS_REST_URL
   UPSTASH_REDIS_REST_TOKEN
   SUPABASE_URL
   SUPABASE_SERVICE_KEY
   ENHANCEMENT_TIER_DEFAULT=artistic
   ```

2. **Database Schema Updates**
   ```sql
   -- Add enhancement tier to jobs table
   ALTER TABLE jobs ADD COLUMN enhancement_tier TEXT DEFAULT 'artistic';
   
   -- Add quality metrics table
   CREATE TABLE quality_metrics (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     job_id UUID REFERENCES jobs(id),
     job_type TEXT,
     enhancement_tier TEXT,
     prompt_length INTEGER,
     estimated_tokens INTEGER,
     has_anatomical_terms BOOLEAN,
     has_quality_tags BOOLEAN,
     has_nsfw_indicators BOOLEAN,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Testing Matrix**
   - [ ] SDXL artistic tier prompts
   - [ ] SDXL explicit tier prompts
   - [ ] SDXL unrestricted tier prompts
   - [ ] WAN standard video prompts
   - [ ] WAN enhanced video prompts
   - [ ] Token limit enforcement
   - [ ] Negative prompt injection
   - [ ] Three-tier NSFW system
   - [ ] Anatomical accuracy validation

4. **Monitoring Setup**
   - [ ] Quality metrics collection
   - [ ] Performance monitoring
   - [ ] Error tracking
   - [ ] User satisfaction measurement

---

## **📈 Success Metrics & KPIs**

### **Master System Performance Targets**

```yaml
Quality Improvements:
  Anatomical Accuracy: 85% reduction in errors (target)
  NSFW Content Quality: 75% improvement in accuracy
  Video Motion Quality: 90% reduction in artifacts
  Overall User Satisfaction: >95% for enhanced jobs

Performance Metrics:
  Job Success Rate: >98% for all job types
  Average Generation Time: Within 10% of baselines
  Token Optimization: 95% efficiency rate
  Enhancement Quality: >4.5/5.0 user rating

Business Impact:
  User Retention: 25% improvement with enhanced quality
  Premium Feature Adoption: 40% increase with three-tier system
  Customer Satisfaction: >4.8/5.0 overall rating
  Technical Support Reduction: 30% fewer quality-related issues
```

---

## **🔮 Future Enhancements**

### **Advanced Features Roadmap**

```yaml
Phase 1 (Current):
  ✅ Three-tier NSFW system
  ✅ Master negative prompts
  ✅ Production edge function
  ✅ Quality monitoring

Phase 2 (Next 3 months):
  🔄 AI-powered prompt optimization
  🔄 Real-time quality assessment
  🔄 Dynamic tier selection
  🔄 Advanced anatomical accuracy

Phase 3 (6 months):
  📋 Multi-model prompt optimization
  📋 Personalized prompt enhancement
  📋 Advanced NSFW content handling
  📋 Professional quality standards
```

---

This master prompting guide represents the culmination of expert-level prompting engineering, providing production-ready implementation for maximum effectiveness and anatomical accuracy in sexually explicit adult content generation. 