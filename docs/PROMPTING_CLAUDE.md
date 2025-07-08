# OurVidz AI Prompting Reference Guide - System Prompts & Implementation

**Last Updated:** January 2025  
**Models:** SDXL Lustify v2.0, WAN 2.1 T2V-1.3B, Qwen 2.5-7B Enhancement  
**Purpose:** Convert natural language to optimized model formats for maximum effectiveness

---

## Table of Contents
1. [SDXL Lustify System Prompts](#sdxl-lustify-system-prompts)
2. [WAN 2.1 Video System Prompts](#wan-21-video-system-prompts)
3. [Enhanced Job Prompting (WAN Built-in)](#enhanced-job-prompting)
4. [NSFW/Explicit Content Templates](#nsfwexplicit-content-templates)
5. [Negative Prompt Implementation](#negative-prompt-implementation)
6. [Edge Function Implementation](#edge-function-implementation)
7. [Token Limit Management](#token-limit-management)

---

## SDXL Lustify System Prompts

### General Purpose Image Generation

**System Prompt Template:**
```
You are an SDXL prompt formatter. Convert user descriptions into optimized SDXL prompts.

Format: [quality tags], [subject], [environment], [style], [technical], [lighting]

Rules:
- Start with "score_9, score_8_up, score_7_up"
- Use comma-separated tags
- Include photographic terms: "shot on [camera]", "f/[aperture]"
- Add lighting: "golden hour", "studio lighting", "dramatic shadows"
- Keep under 75 tokens
- Be specific about physical features and clothing

Input: {user_prompt}
Output:
```

**Example Input:** "Beautiful woman in a red dress at sunset"

**Example Output:**
```
score_9, score_8_up, score_7_up, beautiful woman, long flowing hair, elegant red dress, silk fabric, standing on beach, sunset background, golden hour lighting, shot on Canon EOS R5, f/1.8, shallow depth of field, warm color grading, professional photography
```

### Professional Portrait Photography

**System Prompt Template:**
```
You are a professional photography prompt specialist for SDXL.

Convert descriptions into technical photography prompts following this structure:
1. Quality markers: score_9, score_8_up, masterpiece
2. Subject details with specific features
3. Camera settings and equipment
4. Lighting setup
5. Composition and framing

Emphasize: skin texture, eye detail, hair physics, fabric quality
Max tokens: 75

Input: {user_prompt}
Output:
```

**Example Input:** "Corporate headshot of a businesswoman"

**Example Output:**
```
score_9, score_8_up, masterpiece, professional businesswoman, 30yo, confident expression, navy blue blazer, white blouse, medium length brown hair, subtle makeup, corporate headshot, shot on Hasselblad X2D, 80mm lens, f/2.8, soft box lighting, white seamless background, eye level angle, sharp focus on eyes, professional retouching
```

### Artistic/Fashion Photography

**System Prompt Template:**
```
You are an artistic fashion photography prompt creator for SDXL.

Structure:
- Quality prefix: score_9, score_8_up, RAW photo
- Model description with pose
- Fashion/clothing details  
- Location/backdrop
- Artistic style and mood
- Technical camera details
- Color grading

Focus on: pose dynamics, fabric movement, artistic composition
Token limit: 75

Input: {user_prompt}
Output:
```

**Example Input:** "High fashion model in avant-garde outfit"

**Example Output:**
```
score_9, score_8_up, RAW photo, high fashion model, tall slender figure, avant-garde geometric dress, metallic silver fabric, dynamic pose, one arm raised, industrial warehouse location, dramatic shadows, shot on Phase One XF, 55mm lens, fashion editorial style, high contrast, desaturated colors, vogue magazine aesthetic
```

---

## WAN 2.1 Video System Prompts

### Standard Video Generation

**System Prompt Template:**
```
You are a WAN 2.1 video prompt optimizer. Convert descriptions into cinematic video prompts.

Structure: [subject] + [action/motion] + [environment] + [camera movement] + [style]

Rules:
- Focus on clear, smooth motions
- Use cinematic terminology
- Specify camera movements: "tracking shot", "dolly zoom", "pan left"
- Include temporal words: "slowly", "gradually", "smoothly"
- Avoid complex scene changes
- Keep under 100 tokens

Input: {user_prompt}
Output:
```

**Example Input:** "Woman walking through a garden"

**Example Output:**
```
Elegant woman in flowing white dress slowly walking through blooming garden path, gentle breeze moving her hair, camera tracking alongside her movement, soft morning sunlight filtering through trees, shallow depth of field, cinematic color grading, smooth steadicam motion, peaceful atmosphere
```

### Dynamic Action Sequences

**System Prompt Template:**
```
You are a WAN 2.1 action sequence prompt specialist.

Create prompts emphasizing:
1. Clear subject definition
2. Specific motion verbs
3. Environmental interaction
4. Camera dynamics
5. Pacing descriptors

Avoid: rapid cuts, multiple subjects, scene transitions
Focus: single continuous action, smooth motion
Max tokens: 100

Input: {user_prompt}
Output:
```

**Example Input:** "Person dancing energetically"

**Example Output:**
```
Professional dancer performing contemporary dance routine, fluid arm movements transitioning into spinning leap, studio space with wooden floor, camera circling around subject capturing full body motion, dramatic side lighting creating moving shadows, slow motion segments emphasizing graceful movements, dynamic yet smooth choreography
```

### Atmospheric/Mood Videos

**System Prompt Template:**
```
You are a cinematic mood specialist for WAN 2.1.

Structure atmospheric videos with:
- Subject placement and subtle motion
- Environmental elements and ambiance
- Lighting mood and color temperature
- Camera: mostly static with subtle movements
- Emotional tone descriptors

Emphasize: atmosphere over action, subtle movements
Token limit: 100

Input: {user_prompt}
Output:
```

**Example Input:** "Melancholic scene of someone by a window"

**Example Output:**
```
Solitary figure sitting by rain-streaked window, gentle head turn toward glass, soft rainfall visible outside, dim interior lighting with blue hour ambiance, static camera with slight handheld breathing, melancholic atmosphere, shallow focus transitioning between subject and raindrops, contemplative mood, cinematic letterbox framing
```

---

## Enhanced Job Prompting

### WAN Built-in Enhancement (_enhanced job types)

**Important:** Enhanced jobs use WAN's internal enhancement. No negative prompts allowed.

**System Prompt Template for Enhancement:**
```
You are optimizing prompts for WAN's built-in enhancement feature.

The model will auto-enhance, so:
- Use clear, descriptive language
- Avoid technical jargon
- Focus on narrative and emotion
- Let the model handle technical details
- Be poetic but clear

Structure: Simple subject + action + mood/feeling
Max tokens: 50 (will be expanded by model)

Input: {user_prompt}
Output:
```

**Example Input:** "Woman in meadow feeling free"

**Example Output:**
```
Young woman with arms outstretched spinning joyfully in sunlit wildflower meadow, feeling absolute freedom and connection with nature, pure happiness radiating from her movements
```

**How WAN Enhancement Expands This:**
The built-in enhancement will automatically add:
- Technical camera details
- Lighting specifications  
- Color grading information
- Motion smoothness parameters
- Cinematic qualities

### Enhanced Video Best Practices

**For video7b_fast_enhanced & video7b_high_enhanced:**
```
Original: "woman dancing"
Enhanced Input: "Graceful woman expressing joy through contemporary dance"

What WAN adds internally:
- Camera angles and movements
- Lighting setup details
- Professional filming techniques
- Motion interpolation
- Color correction parameters
```

---

## NSFW/Explicit Content Templates

### SDXL Lustify - Artistic Adult Content

**System Prompt Template:**
```
You are an artistic adult content prompt specialist for SDXL.

Create tasteful, artistic prompts following:
- Start: "score_9, score_8_up, nsfw, mature content"
- Use artistic/professional terminology
- Emphasize: lighting, composition, artistic merit
- Include: professional photography elements
- Avoid: crude or vulgar language

Replace explicit terms with artistic equivalents
Max tokens: 75

Input: {user_prompt}
Output:
```

**Example Input:** "Intimate couple portrait"

**Example Output:**
```
score_9, score_8_up, nsfw, mature content, intimate couple embrace, artistic nude photography, soft natural window light, tender moment, professional boudoir photography, shot on medium format, shallow depth of field, warm skin tones, tasteful composition, fine art aesthetic, emotional connection
```

### SDXL Lustify - Explicit Adult Content

**System Prompt Template:**
```
You are an explicit adult content prompt optimizer for SDXL.

Format for unrestricted NSFW:
- Prefix: "score_9, score_8_up, explicit nsfw"
- Direct but professional language
- Specific anatomical accuracy
- Professional production values
- Photographic realism markers

Maintain quality while being direct
Token limit: 75

Input: {user_prompt}
Output:
```

**Example Input:** "Adult video scene"

**Example Output:**
```
score_9, score_8_up, explicit nsfw, professional adult content, attractive adult performers, intimate scene, high-end production values, professional lighting setup, 4k camera quality, realistic skin textures, anatomically accurate, shot on RED camera, cinematic depth of field, professional color grading
```

### WAN 2.1 - Adult Content Workarounds

**System Prompt Template:**
```
You are optimizing adult content for WAN 2.1's limitations.

WAN struggles with explicit content, so:
- Use suggestive rather than explicit language
- Focus on emotion and atmosphere
- Emphasize artistic cinematography
- Use metaphorical descriptions
- Include "artistic", "tasteful", "elegant"

Keep it cinematic and implied
Max tokens: 100

Input: {user_prompt}
Output:
```

**Example Input:** "Romantic bedroom scene"

**Example Output:**
```
Intimate romantic scene, elegant bedroom with silk sheets, soft candlelight creating warm shadows, slow camera push revealing couple's tender embrace, focusing on emotional connection, hands gently caressing, artistic cinematography with shallow depth of field, tasteful and suggestive rather than explicit, emphasizing love and passion through subtle movements
```

---

## Negative Prompt Implementation

### SDXL Negative Prompts by Context

**Standard Quality Control:**
```javascript
const sdxlNegativePrompts = {
  general: "worst quality, low quality, normal quality, lowres, low details, oversaturated, undersaturated, overexposed, underexposed, grayscale, bw, bad photo, bad photography, bad art",
  
  anatomy: "bad anatomy, bad hands, bad fingers, extra fingers, missing fingers, broken fingers, deformed, distorted features, disfigured, extra limbs, missing limbs, floating limbs, disconnected limbs, mutation, mutated",
  
  technical: "watermark, signature, text, logo, contact info, username, artist name, title, caption, border, frame, ui, interface, hud, diagnostic overlay",
  
  style: "anime, cartoon, graphic, render, cgi, 3d, painting, drawing, illustration, sketch, concept art",
  
  adult: "child, minor, underage, teen, young, childlike features, school uniform, inappropriate content"
};
```

**WAN 2.1 Negative Prompts:**
```javascript
const wanNegativePrompts = {
  general: "static image, still frame, no motion, photograph, blurry, distorted, glitchy, corrupted, artifacts",
  
  motion: "jerky movement, unnatural motion, teleporting, flickering, stuttering, inconsistent motion, morphing features",
  
  quality: "low resolution, pixelated, compression artifacts, banding, noise, grain, amateur, shaky camera",
  
  content: "text overlay, subtitles, watermark, logo, ui elements, split screen, multiple scenes"
};
```

---

## Edge Function Implementation

### Complete Queue-Job Edge Function

```typescript
// supabase/functions/queue-job/index.ts

interface JobConfig {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  frames?: number;
}

// Negative prompt database
const NEGATIVE_PROMPTS = {
  sdxl_image_fast: {
    base: "worst quality, low quality, normal quality, lowres, bad art",
    adult: ", child, minor, underage, inappropriate content"
  },
  sdxl_image_high: {
    base: "worst quality, low quality, lowres, bad anatomy, bad hands, bad art, watermark, text",
    adult: ", child, minor, underage, teen, school uniform"
  },
  image_fast: {
    base: "static image, no motion, blurry, artifacts, low quality",
    adult: ""
  },
  image_high: {
    base: "static image, no motion, blurry, artifacts, low quality, jerky movement",
    adult: ""
  },
  video_fast: {
    base: "static, still frame, no motion, jerky movement, artifacts",
    adult: ""
  },
  video_high: {
    base: "static, still frame, no motion, jerky movement, flickering, low quality",
    adult: ""
  }
};

// Settings configurations
const JOB_SETTINGS = {
  sdxl_image_fast: {
    num_inference_steps: 25,
    guidance_scale: 7.0,
    width: 1024,
    height: 1024,
    batch_size: 6
  },
  sdxl_image_high: {
    num_inference_steps: 40,
    guidance_scale: 7.5,
    width: 1024,
    height: 1024,
    batch_size: 6
  },
  image_fast: {
    num_inference_steps: 40,
    guidance_scale: 6.0,
    width: 832,
    height: 480,
    frames: 1
  },
  image_high: {
    num_inference_steps: 50,
    guidance_scale: 5.0,
    width: 832,
    height: 480,
    frames: 1
  },
  video_fast: {
    num_inference_steps: 40,
    guidance_scale: 6.0,
    width: 832,
    height: 480,
    frames: 81
  },
  video_high: {
    num_inference_steps: 50,
    guidance_scale: 5.0,
    width: 832,
    height: 480,
    frames: 81
  },
  // Enhanced jobs - no negative prompts
  image7b_fast_enhanced: {
    num_inference_steps: 40,
    guidance_scale: 6.0,
    width: 832,
    height: 480,
    frames: 1,
    use_enhancement: true
  },
  image7b_high_enhanced: {
    num_inference_steps: 50,
    guidance_scale: 5.0,
    width: 832,
    height: 480,
    frames: 1,
    use_enhancement: true
  },
  video7b_fast_enhanced: {
    num_inference_steps: 40,
    guidance_scale: 6.0,
    width: 832,
    height: 480,
    frames: 81,
    use_enhancement: true
  },
  video7b_high_enhanced: {
    num_inference_steps: 50,
    guidance_scale: 5.0,
    width: 832,
    height: 480,
    frames: 81,
    use_enhancement: true
  }
};

// Prompt optimization based on job type
function optimizePrompt(prompt: string, jobType: string): string {
  const isVideo = jobType.includes('video');
  const isSDXL = jobType.includes('sdxl');
  const isEnhanced = jobType.includes('enhanced');
  
  // Don't modify enhanced job prompts - let WAN handle it
  if (isEnhanced) {
    return prompt.slice(0, 200); // Token limit for enhanced jobs
  }
  
  // SDXL optimization
  if (isSDXL) {
    // Add quality tags if missing
    if (!prompt.includes('score_')) {
      prompt = `score_9, score_8_up, score_7_up, ${prompt}`;
    }
    // Add photo realism if not specified
    if (!prompt.includes('photo') && !prompt.includes('art')) {
      prompt += ', photorealistic, professional photography';
    }
    return prompt.slice(0, 225); // ~75 tokens
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
    return prompt.slice(0, 300); // ~100 tokens
  }
  
  return prompt;
}

// Main edge function
export async function queueJob(req: Request) {
  const { job_type, prompt, config = {} } = await req.json();
  
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
  const validJobTypes = Object.keys(JOB_SETTINGS);
  if (!validJobTypes.includes(job_type)) {
    return new Response(JSON.stringify({ error: 'Invalid job type' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Check for adult content flags
  const isAdultContent = prompt.toLowerCase().includes('nsfw') || 
                        prompt.toLowerCase().includes('explicit') ||
                        prompt.toLowerCase().includes('nude') ||
                        prompt.toLowerCase().includes('adult');
  
  // Get settings for job type
  const settings = JOB_SETTINGS[job_type];
  const isEnhanced = job_type.includes('enhanced');
  
  // Optimize prompt
  const optimizedPrompt = optimizePrompt(prompt, job_type);
  
  // Build job configuration
  const jobConfig: JobConfig = {
    prompt: optimizedPrompt,
    ...settings,
    ...config // Allow user overrides
  };
  
  // Add negative prompt for non-enhanced jobs
  if (!isEnhanced && NEGATIVE_PROMPTS[job_type]) {
    const negativeBase = NEGATIVE_PROMPTS[job_type].base;
    const negativeAdult = isAdultContent ? NEGATIVE_PROMPTS[job_type].adult : '';
    jobConfig.negative_prompt = negativeBase + negativeAdult;
  }
  
  // Determine queue
  const queue = job_type.includes('sdxl') ? 'sdxl_queue' : 'wan_queue';
  
  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      job_type,
      prompt: optimizedPrompt,
      config: jobConfig,
      status: 'pending'
    })
    .select()
    .single();
    
  if (jobError) {
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
  
  return new Response(JSON.stringify({ 
    job_id: job.id,
    status: 'queued',
    message: `Job queued for ${job_type} generation`
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Prompt Enhancement Middleware

```typescript
// Middleware for Qwen enhancement (separate from WAN built-in)
async function enhanceWithQwen(prompt: string, jobType: string): Promise<string> {
  const isVideo = jobType.includes('video');
  const isSDXL = jobType.includes('sdxl');
  const isAdult = prompt.toLowerCase().includes('nsfw') || 
                  prompt.toLowerCase().includes('adult');
  
  let systemPrompt = '';
  
  if (isSDXL && isAdult) {
    systemPrompt = `Enhance this adult image prompt for artistic quality. 
    Use professional photography terms and maintain tasteful language. 
    Output only the enhanced prompt, max 75 tokens.`;
  } else if (isSDXL) {
    systemPrompt = `Enhance this image prompt with photography details. 
    Add camera, lighting, and composition. Max 75 tokens.`;
  } else if (isVideo && isAdult) {
    systemPrompt = `Enhance this adult video prompt cinematically. 
    Use suggestive rather than explicit language. Focus on artistry. 
    Max 100 tokens.`;
  } else if (isVideo) {
    systemPrompt = `Enhance this video prompt with cinematic details. 
    Add camera movement and atmosphere. Max 100 tokens.`;
  }
  
  // Call Qwen API
  const enhanced = await callQwenAPI(systemPrompt, prompt);
  return enhanced;
}
```

---

## Token Limit Management

### Token Limits by Model

**SDXL Lustify:**
- Optimal: 75 tokens (~225 characters)
- Maximum: 77 tokens (hard limit)
- Strategy: Front-load important elements

**WAN 2.1:**
- Standard jobs: 100 tokens (~300 characters)
- Enhanced jobs: 50 tokens (~150 characters) - will be expanded internally
- Strategy: Focus on motion and cinematography

### Token Optimization Strategies

```javascript
// Token counting approximation
function approximateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 3 characters for English
  return Math.ceil(text.length / 3);
}

// Prompt truncation with priority preservation
function truncatePrompt(prompt: string, maxTokens: number): string {
  const estimated = approximateTokens(prompt);
  
  if (estimated <= maxTokens) {
    return prompt;
  }
  
  // Split into components
  const parts = prompt.split(',').map(p => p.trim());
  const priority = [];
  
  // Keep quality tags and subject
  for (let i = 0; i < parts.length && approximateTokens(priority.join(', ')) < maxTokens - 10; i++) {
    priority.push(parts[i]);
  }
  
  return priority.join(', ');
}
```

---

## Production Deployment Checklist

### Edge Function Deployment
1. **Environment Variables**
   ```
   UPSTASH_REDIS_REST_URL
   UPSTASH_REDIS_REST_TOKEN
   SUPABASE_URL
   SUPABASE_SERVICE_KEY
   ```

2. **CORS Configuration**
   ```typescript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   };
   ```

3. **Error Handling**
   - Input validation
   - Auth verification
   - Queue failure fallbacks
   - Job status updates

4. **Monitoring**
   - Log prompt optimization
   - Track token usage
   - Monitor rejection rates
   - Measure enhancement impact

### Testing Matrix
- [ ] SDXL standard prompts
- [ ] SDXL adult content prompts  
- [ ] WAN standard video prompts
- [ ] WAN adult content workarounds
- [ ] Enhanced job prompts (no negatives)
- [ ] Token limit enforcement
- [ ] Negative prompt injection
- [ ] Queue routing logic

---

This reference guide provides production-ready templates and implementation code for the OurVidz platform. Regular updates based on model performance and user feedback will ensure optimal results.