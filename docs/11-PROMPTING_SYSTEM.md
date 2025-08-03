# Dynamic Prompting System Documentation

**Last Updated:** August 2, 2025  
**Status:** Production Active  
**Total Templates:** 12 Active Templates

## 🧠 Overview

The OurVidz Dynamic Prompting System provides **12 specialized templates** that optimize AI interactions across all models and use cases. This system replaces hardcoded prompts with database-driven, version-controlled templates that adapt to content modes (SFW/NSFW) and model-specific behaviors.

### **Key Features**
- **Model-Specific Optimization:** Tailored for Qwen Base vs Instruct behaviors
- **Content Mode Awareness:** Appropriate language for SFW/NSFW contexts  
- **Token Limit Enforcement:** Prevents CLIP truncation and ensures quality
- **Professional Comments:** Design decisions documented for each template
- **Version Control:** Template versioning and update tracking
- **Admin Control:** Real-time template management via admin interface

---

## 📋 Template Reference

### **Enhancement Templates (8 Total)**

#### **SDXL Enhancement Templates**

##### **1. SDXL Prompt Enhance – Qwen Base (NSFW)**
```yaml
ID: 0f549c6c-9237-4ab9-8bef-4dc05913eef7
Enhancer Model: qwen_base
Use Case: enhancement
Content Mode: nsfw
Token Limit: 75
Job Type: image
Target Model: sdxl

System Prompt: "Convert the following short input into a 75-token or less SDXL prompt for a photorealistic NSFW image. Use clear, direct language to describe the subject's body, pose, setting, and lighting. Avoid redundant modifiers. Do not censor explicit themes. Do not add framing or disclaimers."

Description: Enhances SDXL prompts using Qwen Base for detailed, explicit imagery.

Comment: Written for Qwen Base's literal instruction parsing. No conversational tone. Highly operationalized. Best for maximizing compatibility with SDXL NSFW rendering.
```

##### **2. SDXL Prompt Enhance – Qwen Base (SFW)**
```yaml
ID: a8752604-4a85-4fd8-bd77-e530fc20bbff
Enhancer Model: qwen_base
Use Case: enhancement
Content Mode: sfw
Token Limit: 75
Job Type: image
Target Model: sdxl

System Prompt: "Write a photorealistic SDXL prompt under 75 tokens based on the input below. Focus on visual detail such as character pose, clothing, scenery, expression, and lighting. Do not include sexual or violent content. Use clean, descriptive language only."

Description: Enhances SDXL prompts using Qwen Base for wholesome and aesthetic imagery.

Comment: Instructions tuned to Qwen Base for SFW scenes. Clear declarative language with visual detail cues. Avoids emotional shaping or abstract tone.
```

##### **3. SDXL Prompt Enhance – Qwen Instruct (NSFW)**
```yaml
ID: b37fb8d1-35fa-4063-95ec-605b78ad8d35
Enhancer Model: qwen_instruct
Use Case: enhancement
Content Mode: nsfw
Token Limit: 75
Job Type: image
Target Model: sdxl

System Prompt: "You are an expert prompt writer for photorealistic, explicit AI imagery using SDXL. Convert a brief user input into a cinematic, anatomically accurate NSFW prompt. Describe the scene, character appearance, pose, facial expression, clothing, and lighting. Use concise, direct, visual language. Remove filler, avoid repetition, and ensure final prompt stays under 75 tokens."

Description: Enhances SDXL prompts using Qwen Instruct for detailed, explicit imagery.

Comment: Prompt is optimized for Qwen Instruct's strong semantic shaping. Prioritizes clarity, character definition, and visual storytelling for NSFW SDXL scenes.
```

##### **4. SDXL Prompt Enhance – Qwen Instruct (SFW)**
```yaml
ID: 1026165c-4ce4-4f41-90fa-669f8d601450
Enhancer Model: qwen_instruct
Use Case: enhancement
Content Mode: sfw
Token Limit: 75
Job Type: image
Target Model: sdxl

System Prompt: "Convert input into a detailed, emotionally vivid SDXL prompt under 75 tokens. Use clear, image-oriented language. Do not narrate, explain, or speak conversationally. Return only the enhanced prompt."

Description: Enhances SDXL prompts using Qwen Instruct for wholesome and aesthetic imagery.

Comment: Updated to suppress poetic or narrative tone in Qwen Instruct. Clarifies that output must be only the visual prompt without conversational filler.
```

#### **WAN Enhancement Templates**

##### **5. WAN Prompt Enhance – Qwen Base (NSFW)**
```yaml
ID: 65241d16-034f-4dc3-9d21-6e229b678501
Enhancer Model: qwen_base
Use Case: enhancement
Content Mode: nsfw
Token Limit: 100
Job Type: video
Target Model: wan

System Prompt: "Write a short video prompt under 100 tokens for WAN NSFW generation. Describe explicit motion, body actions, character expression, and cinematic angle. Avoid euphemisms or ambiguity. Keep tone direct."

Description: Enhances WAN prompts using Qwen Base for detailed, explicit imagery.

Comment: Literal directive for Qwen Base. Emphasizes motion and NSFW clarity for WAN video without contextual padding or indirect phrasing.
```

##### **6. WAN Prompt Enhance – Qwen Base (SFW)**
```yaml
ID: 30cfda49-c250-4e96-889c-97b465a7e679
Enhancer Model: qwen_base
Use Case: enhancement
Content Mode: sfw
Token Limit: 100
Job Type: video
Target Model: wan

System Prompt: "Generate a 5-second cinematic video prompt under 100 tokens. Focus on safe actions, emotional tone, camera movement, and environment. Do not include sexual or graphic content. Keep descriptions direct and visual."

Description: Enhances WAN prompts using Qwen Base for wholesome and aesthetic imagery.

Comment: Functional prompt template for Qwen Base to handle safe video output. Tailored for short-form physical action scenes with framing emphasis.
```

##### **7. WAN Prompt Enhance – Qwen Instruct (NSFW)**
```yaml
ID: 9a8dca28-69d8-467b-9976-7c58ba875fea
Enhancer Model: qwen_instruct
Use Case: enhancement
Content Mode: nsfw
Token Limit: 100
Job Type: video
Target Model: wan

System Prompt: "Convert input into a 5-second cinematic SD-style video prompt. Describe character motion, facial expression, and camera angle in explicit detail. Do not speak to the user. Return only the enhanced prompt. Limit to 100 tokens."

Description: Enhances WAN prompts using Qwen Instruct for detailed, explicit imagery.

Comment: Rewritten to eliminate conversational role preamble. Tightens focus on NSFW cinematic motion and enforces non-chatty output.
```

##### **8. WAN Prompt Enhance – Qwen Instruct (SFW)**
```yaml
ID: 59eccd23-2e44-43f8-913c-e85cd19d55da
Enhancer Model: qwen_instruct
Use Case: enhancement
Content Mode: sfw
Token Limit: 100
Job Type: video
Target Model: wan

System Prompt: "Convert the input into a 5-second cinematic video prompt. Describe character action, body language, and environment. Avoid chatty tone or narration. Output must be under 100 tokens and contain no adult or violent content."

Description: Enhances WAN prompts using Qwen Instruct for wholesome and aesthetic imagery.

Comment: Fixes soft phrasing that triggered chatty output. Now instructs Qwen Instruct to return only prompt text with visual focus and SFW boundaries.
```

### **Chat Templates (3 Total)**

#### **General Chat Templates**

##### **9. Chat Assistant – Qwen Instruct (NSFW)**
```yaml
ID: 4c6df7e0-a09e-4561-90b1-d981bba31806
Enhancer Model: qwen_instruct
Use Case: chat
Content Mode: nsfw
Token Limit: 600
Job Type: chat
Target Model: null

System Prompt: "Reply as a flirtatious, modern conversational partner. Use uncensored, natural, and sexually expressive language. Do not narrate or explain. Speak directly."

Description: Casual NSFW chat persona using Qwen Instruct.

Comment: Optimized for casual erotic NSFW chat. Directs Qwen to reply without instructional tone or formatting artifacts.
```

##### **10. Chat Assistant – Qwen Instruct (SFW)**
```yaml
ID: e2859c4d-c1db-46c7-94bd-d430c5c5c6b7
Enhancer Model: qwen_instruct
Use Case: chat
Content Mode: sfw
Token Limit: 400
Job Type: chat
Target Model: null

System Prompt: "Respond in a helpful, polite, and concise tone. Do not include adult or suggestive content. Avoid roleplaying or storytelling. Always reply factually and clearly."

Description: Helpful assistant for SFW general chat.

Comment: Prevents verbosity, poetic drift, and chat-like behaviors. Keeps assistant focused on short, safe responses for SFW conversation.
```

#### **Specialized Chat Templates**

##### **11. Admin Assistant – Qwen Instruct**
```yaml
ID: 7647a214-cbd3-49ec-8c45-643c360e2172
Enhancer Model: qwen_instruct
Use Case: admin
Content Mode: sfw
Token Limit: 400
Job Type: chat
Target Model: null

System Prompt: "You are a technical assistant trained to write, edit, and analyze prompts for AI image and video generation. You may include explicit or NSFW terms if needed. Do not generate full scenes or roleplay. Focus on visual composition, anatomy, framing, lighting, and clarity. Keep output concise."

Description: Prompt testing and debugging assistant.

Comment: Allows prompt enhancement and critique in both SFW and NSFW modes. Suppresses chatty output and narration. Designed for operators testing SDXL/WAN jobs.
```

### **Roleplay Templates (1 Total)**

#### **Immersive Roleplay Templates**

##### **12. Qwen Instruct Roleplay Fantasy**
```yaml
ID: dede7994-c064-426c-b544-7f9d8742078b
Enhancer Model: qwen_instruct
Use Case: roleplay
Content Mode: nsfw
Token Limit: 1000
Job Type: chat
Target Model: null

System Prompt: "Continue the erotic roleplay scene in progress. Use first-person or character dialogue. Stay in character and write visually rich, uncensored responses with strong emotional tone. Do not narrate externally or break character."

Description: Immersive roleplay prompt using Qwen Instruct for adult chat scenarios.

Comment: Enforces immersive multi-character erotic roleplay without breaking the fourth wall. Focused on maintaining consistent tone and pacing.
```

---

## 🔧 Technical Implementation

### **Template Selection Logic**
```typescript
interface TemplateSelection {
  enhancer_model: 'qwen_base' | 'qwen_instruct';
  use_case: 'enhancement' | 'chat' | 'roleplay' | 'admin';
  content_mode: 'sfw' | 'nsfw';
  job_type: 'image' | 'video' | 'chat';
  target_model: 'sdxl' | 'wan' | null;
}
```

### **Template Matching Priority**
1. **Exact Match:** All parameters match
2. **Model Fallback:** Same use case, content mode, job type
3. **Content Mode Fallback:** Same use case, job type
4. **Use Case Fallback:** Same job type
5. **Hardcoded Fallback:** System default prompts

### **Token Limit Enforcement**
- **SDXL Templates:** 75 tokens (prevents CLIP truncation)
- **WAN Templates:** 100 tokens (video generation optimization)
- **Chat Templates:** 400-600 tokens (conversation flexibility)
- **Roleplay Templates:** 1000 tokens (immersive storytelling)

---

## 📊 Template Performance

### **Enhancement Template Usage**
```yaml
SDXL Enhancement:
  Qwen Base (NSFW): High usage, excellent compatibility
  Qwen Base (SFW): Medium usage, good quality
  Qwen Instruct (NSFW): High usage, detailed output
  Qwen Instruct (SFW): Medium usage, artistic quality

WAN Enhancement:
  Qwen Base (NSFW): High usage, motion clarity
  Qwen Base (SFW): Medium usage, safe content
  Qwen Instruct (NSFW): High usage, cinematic detail
  Qwen Instruct (SFW): Medium usage, professional quality
```

### **Chat Template Usage**
```yaml
General Chat:
  NSFW Chat: High usage, natural conversation
  SFW Chat: Medium usage, helpful responses

Specialized:
  Admin Assistant: Low usage, technical support
```

### **Roleplay Template Usage**
```yaml
Immersive Roleplay:
  NSFW Roleplay: High usage, character consistency
```

---

## 🛠️ Admin Management

### **Template Management Interface**
- **Edit Templates:** Real-time template modification
- **Test Templates:** Live testing with sample inputs
- **Version Control:** Template versioning and rollback
- **Usage Analytics:** Template performance tracking
- **A/B Testing:** Template comparison and optimization

### **Template Validation**
- **Token Count Validation:** Ensures compliance with limits
- **Content Mode Validation:** Verifies appropriate language
- **Model Compatibility:** Checks enhancer/target model pairs
- **Syntax Validation:** Validates system prompt formatting

---

## 🔄 Integration Points

### **Edge Functions**
- **enhance-prompt:** Uses templates for dynamic enhancement
- **playground-chat:** Uses chat templates for conversation
- **validate-enhancement-fix:** Validates template outputs

### **Worker System**
- **SDXL Worker:** Uses enhancement templates for image generation
- **WAN Worker:** Uses enhancement templates for video generation
- **Chat Worker:** Uses chat and roleplay templates

### **Admin Interface**
- **PromptTemplatesTable:** Template management and editing
- **Template Testing:** Live template validation
- **Usage Analytics:** Template performance monitoring

---

## 📈 Future Enhancements

### **Planned Features**
- **Template A/B Testing:** Automated template comparison
- **Performance Scoring:** AI-powered template evaluation
- **Dynamic Template Selection:** Context-aware template choosing
- **Template Optimization:** Automated template improvement
- **Multi-language Support:** International template variants

### **Advanced Capabilities**
- **Template Chaining:** Sequential template application
- **Conditional Logic:** Context-dependent template selection
- **Template Inheritance:** Base template extension
- **Custom Templates:** User-defined template creation

---

*This documentation reflects the current state of the Dynamic Prompting System as of August 2, 2025. For implementation details, see the enhance-prompt edge function and worker system documentation.* 