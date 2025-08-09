# SDXL Prompting Guide - OurVidz

**Last Updated:** August 8, 2025  
**Model:** SDXL (Stable Diffusion XL)  
**Purpose:** Comprehensive guide for prompt engineering with SDXL model

## Overview

SDXL is a powerful text-to-image model that excels at high-quality, detailed image generation. This guide covers best practices for both SFW and NSFW content generation.

## Core Prompt Structure

### Basic Format
```
[Subject], [Action], [Setting], [Style], [Quality Modifiers], [Negative Prompt]
```

### Example Structure
```
A beautiful woman, sitting on a couch, in a cozy living room, cinematic lighting, 8k, highly detailed, professional photography, (blurry, low quality, distorted:1.2)
```

## SFW Content Guidelines

### Artistic & Professional Content
- **Subject Focus**: Clear, well-defined subjects
- **Style Modifiers**: `professional photography`, `cinematic lighting`, `8k`, `highly detailed`
- **Composition**: `rule of thirds`, `depth of field`, `bokeh`
- **Lighting**: `soft lighting`, `golden hour`, `studio lighting`, `natural light`

### Example SFW Prompts
```
A confident businesswoman, standing in a modern office, wearing a professional suit, natural lighting, professional photography, 8k, highly detailed, (blurry, low quality:1.2)

A couple, walking hand in hand, on a beach at sunset, romantic atmosphere, cinematic lighting, 8k, highly detailed, (blurry, low quality, distorted:1.2)
```

## NSFW Content Guidelines

### Adult Content Best Practices
- **Explicit Language**: Use direct, clear terminology when appropriate
- **Progressive Escalation**: Build intensity gradually across multiple images
- **Character Consistency**: Maintain character appearance and personality
- **Scene Progression**: Logical flow from introduction to intimate moments

### Example NSFW Prompts
```
A beautiful woman, wearing lingerie, lying on a bed, seductive pose, soft lighting, 8k, highly detailed, (blurry, low quality:1.2)

A couple, intimate embrace, in a bedroom, passionate moment, dim lighting, 8k, highly detailed, (blurry, low quality, distorted:1.2)
```

## Multi-Scene Sequence Examples

### Progressive Escalation (4-Image Sequence)

**Scene 1 - Introduction:**
```
A handsome man and beautiful woman, meeting at a bar, casual conversation, warm lighting, 8k, highly detailed, (blurry, low quality:1.2)
```

**Scene 2 - Flirting:**
```
The same couple, sitting closer together, flirting and touching hands, intimate lighting, 8k, highly detailed, (blurry, low quality:1.2)
```

**Scene 3 - Kissing:**
```
The couple, passionately kissing, in a private corner, romantic lighting, 8k, highly detailed, (blurry, low quality:1.2)
```

**Scene 4 - Intimate:**
```
The couple, undressing each other, in a bedroom, sensual lighting, 8k, highly detailed, (blurry, low quality:1.2)
```

## Quality Modifiers

### High-Quality Modifiers
- `8k`, `highly detailed`, `professional photography`
- `cinematic lighting`, `studio lighting`, `perfect composition`
- `sharp focus`, `depth of field`, `bokeh`
- `masterpiece`, `best quality`, `ultra realistic`

### Style Modifiers
- `photorealistic`, `hyperrealistic`, `detailed`
- `artistic`, `cinematic`, `dramatic`
- `soft lighting`, `warm tones`, `golden hour`
- `professional`, `elegant`, `sophisticated`

## Negative Prompts

### Common Negative Prompts
```
(blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, signature, text, extra limbs, missing limbs, poorly drawn hands, poorly drawn face, mutation, mutated, extra limbs, extra arms, extra legs, disfigured, bad proportions, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, mutated hands and feet, out of frame, blender, doll, cropped, low-res, close-up, poorly-drawn face, out of frame, double, two heads, blurred, ugly, disfigured, too many limbs, deformed, repetitive, black and white, grainy, extra limbs, bad anatomy, high pass filter, airbrush, portrait, zoomed, soft light, smooth skin, closeup, deformed, extra limbs, extra fingers, mutated hands, bad anatomy, bad proportions, blind, extra eyes, ugly eyes, dead eyes, blur, vignette, out of shot, out of focus, gaussian, closeup, monochrome, grainy, noisy, text, writing, watermark, logo, oversaturation, over saturation, over shadow)
```

### NSFW-Specific Negatives
```
(blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, signature, text, extra limbs, missing limbs, poorly drawn hands, poorly drawn face, mutation, mutated, extra limbs, extra arms, extra legs, disfigured, bad proportions, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, mutated hands and feet, out of frame, blender, doll, cropped, low-res, close-up, poorly-drawn face, out of frame, double, two heads, blurred, ugly, disfigured, too many limbs, deformed, repetitive, black and white, grainy, extra limbs, bad anatomy, high pass filter, airbrush, portrait, zoomed, soft light, smooth skin, closeup, deformed, extra limbs, extra fingers, mutated hands, bad anatomy, bad proportions, blind, extra eyes, ugly eyes, dead eyes, blur, vignette, out of shot, out of focus, gaussian, closeup, monochrome, grainy, noisy, text, writing, watermark, logo, oversaturation, over saturation, over shadow, clothes, clothing, dressed, wearing clothes)
```

## Token Optimization

### SDXL Token Limits
- **Optimal Length**: 75-150 tokens
- **Maximum**: 200 tokens (may cause truncation)
- **Compression Techniques**: Use abbreviations, remove redundant words

### Token-Saving Tips
- Use `8k` instead of `8k resolution`
- Use `highly detailed` instead of `very highly detailed`
- Combine modifiers: `cinematic lighting` instead of `cinematic, lighting`
- Remove unnecessary articles: `beautiful woman` instead of `a beautiful woman`

## Troubleshooting Common Issues

### Poor Quality Results
- Add more quality modifiers
- Improve negative prompts
- Check token count
- Ensure proper subject focus

### Inconsistent Characters
- Use consistent descriptive terms
- Maintain character traits across scenes
- Use specific physical descriptions
- Reference previous scenes

### Unwanted Elements
- Strengthen negative prompts
- Add specific exclusions
- Use more precise descriptions
- Adjust style modifiers

## Advanced Techniques

### Character Consistency
- Use consistent physical descriptions
- Maintain personality traits
- Reference previous scenes
- Use character-specific modifiers

### Scene Progression
- Build logical sequences
- Maintain environmental consistency
- Progressive intensity escalation
- Smooth transitions between scenes

### Style Variations
- Photorealistic: `photorealistic, 8k, highly detailed`
- Artistic: `artistic, painterly, oil painting style`
- Cinematic: `cinematic lighting, dramatic, movie still`
- Fashion: `fashion photography, editorial, high fashion`

---

**Note**: This guide should be used in conjunction with the prompt builder AI assistant for optimal results. The AI can help tailor these guidelines to specific use cases and provide real-time optimization suggestions.
