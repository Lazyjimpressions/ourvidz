# WAN Video Generation Prompting Guide - OurVidz

**Last Updated:** August 8, 2025  
**Model:** WAN 2.1 (Video Generation)  
**Purpose:** Comprehensive guide for video prompt engineering with WAN model

## Overview

WAN is a powerful text-to-video model that excels at generating high-quality, temporally consistent video content. This guide covers best practices for both SFW and NSFW video generation.

## Core Video Prompt Structure

### Basic Format
```
[Subject], [Action/Motion], [Setting], [Camera Movement], [Style], [Quality Modifiers], [Duration], [Negative Prompt]
```

### Example Structure
```
A beautiful woman, walking gracefully, in a modern apartment, camera slowly panning, cinematic lighting, 8k, highly detailed, 5 seconds, (blurry, low quality, distorted:1.2)
```

## Video-Specific Considerations

### Temporal Consistency
- **Character Consistency**: Maintain character appearance across frames
- **Environmental Consistency**: Keep settings and lighting consistent
- **Motion Continuity**: Ensure smooth transitions between actions
- **Pacing**: Consider video duration and scene progression

### Camera Movement
- **Static**: `static camera`, `fixed angle`
- **Panning**: `camera slowly panning`, `panning left to right`
- **Zooming**: `camera slowly zooming in`, `zoom out`
- **Tracking**: `camera following subject`, `tracking shot`
- **Dolly**: `dolly shot`, `camera moving forward`

## SFW Video Guidelines

### Professional & Artistic Content
- **Subject Focus**: Clear, well-defined subjects with consistent appearance
- **Motion Description**: Smooth, natural movements
- **Style Modifiers**: `cinematic`, `professional video`, `smooth motion`
- **Quality**: `8k`, `highly detailed`, `professional cinematography`

### Example SFW Video Prompts
```
A confident businesswoman, walking through a modern office, camera following her movement, professional lighting, 8k, highly detailed, 4 seconds, (blurry, low quality:1.2)

A couple, dancing together, in a romantic garden, camera slowly circling around them, golden hour lighting, cinematic, 8k, highly detailed, 6 seconds, (blurry, low quality, distorted:1.2)
```

## NSFW Video Guidelines

### Adult Content Best Practices
- **Progressive Escalation**: Build intensity gradually across video duration
- **Motion Description**: Natural, fluid movements
- **Scene Progression**: Logical flow from introduction to intimate moments
- **Character Consistency**: Maintain character appearance throughout

### Example NSFW Video Prompts
```
A beautiful woman, slowly undressing, in a dimly lit bedroom, camera slowly zooming in, sensual lighting, 8k, highly detailed, 5 seconds, (blurry, low quality:1.2)

A couple, intimate embrace, in a romantic setting, camera slowly panning around them, soft lighting, 8k, highly detailed, 6 seconds, (blurry, low quality, distorted:1.2)
```

## Multi-Scene Video Sequences

### Progressive Escalation (4-Video Sequence)

**Scene 1 - Introduction (5 seconds):**
```
A handsome man and beautiful woman, meeting at a bar, casual conversation, camera slowly panning between them, warm lighting, 8k, highly detailed, (blurry, low quality:1.2)
```

**Scene 2 - Flirting (5 seconds):**
```
The same couple, sitting closer together, flirting and touching hands, camera slowly zooming in, intimate lighting, 8k, highly detailed, (blurry, low quality:1.2)
```

**Scene 3 - Kissing (6 seconds):**
```
The couple, passionately kissing, camera slowly circling around them, romantic lighting, 8k, highly detailed, (blurry, low quality:1.2)
```

**Scene 4 - Intimate (8 seconds):**
```
The couple, undressing each other, camera slowly panning, sensual lighting, 8k, highly detailed, (blurry, low quality:1.2)
```

## Video Quality Modifiers

### High-Quality Video Modifiers
- `8k`, `highly detailed`, `professional video`
- `smooth motion`, `cinematic`, `professional cinematography`
- `stable camera`, `perfect composition`, `ultra realistic`
- `masterpiece`, `best quality`, `film quality`

### Motion-Specific Modifiers
- `smooth movement`, `fluid motion`, `natural motion`
- `steady camera`, `professional camera work`
- `cinematic movement`, `dramatic camera angles`
- `smooth transitions`, `seamless motion`

## Duration Guidelines

### Optimal Video Lengths
- **Short Clips**: 3-5 seconds (introduction, simple actions)
- **Medium Clips**: 5-8 seconds (complex actions, interactions)
- **Long Clips**: 8-12 seconds (detailed scenes, multiple actions)
- **Maximum**: 12 seconds (may affect quality)

### Duration Considerations
- **Simple Actions**: 3-5 seconds
- **Complex Interactions**: 5-8 seconds
- **Scene Transitions**: 6-10 seconds
- **Progressive Sequences**: 8-12 seconds

## Negative Prompts for Video

### Common Video Negative Prompts
```
(blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, signature, text, extra limbs, missing limbs, poorly drawn hands, poorly drawn face, mutation, mutated, extra limbs, extra arms, extra legs, disfigured, bad proportions, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, mutated hands and feet, out of frame, blender, doll, cropped, low-res, close-up, poorly-drawn face, out of frame, double, two heads, blurred, ugly, disfigured, too many limbs, deformed, repetitive, black and white, grainy, extra limbs, bad anatomy, high pass filter, airbrush, portrait, zoomed, soft light, smooth skin, closeup, deformed, extra limbs, extra fingers, mutated hands, bad anatomy, bad proportions, blind, extra eyes, ugly eyes, dead eyes, blur, vignette, out of shot, out of focus, gaussian, closeup, monochrome, grainy, noisy, text, writing, watermark, logo, oversaturation, over saturation, over shadow, jittery, unstable, shaky camera, poor motion, choppy, frame drops)
```

### NSFW Video-Specific Negatives
```
(blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, signature, text, extra limbs, missing limbs, poorly drawn hands, poorly drawn face, mutation, mutated, extra limbs, extra arms, extra legs, disfigured, bad proportions, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, mutated hands and feet, out of frame, blender, doll, cropped, low-res, close-up, poorly-drawn face, out of frame, double, two heads, blurred, ugly, disfigured, too many limbs, deformed, repetitive, black and white, grainy, extra limbs, bad anatomy, high pass filter, airbrush, portrait, zoomed, soft light, smooth skin, closeup, deformed, extra limbs, extra fingers, mutated hands, bad anatomy, bad proportions, blind, extra eyes, ugly eyes, dead eyes, blur, vignette, out of shot, out of focus, gaussian, closeup, monochrome, grainy, noisy, text, writing, watermark, logo, oversaturation, over saturation, over shadow, jittery, unstable, shaky camera, poor motion, choppy, frame drops, clothes, clothing, dressed, wearing clothes)
```

## Token Optimization for Video

### WAN Token Limits
- **Optimal Length**: 100-200 tokens
- **Maximum**: 300 tokens (may cause truncation)
- **Video-Specific**: Include motion and duration descriptions

### Token-Saving Tips for Video
- Use `camera panning` instead of `camera slowly panning from left to right`
- Use `5 seconds` instead of `5 second duration`
- Combine motion: `walking and talking` instead of `walking, talking`
- Use `smooth motion` instead of `very smooth motion`

## Troubleshooting Video Issues

### Poor Motion Quality
- Add motion-specific modifiers
- Improve camera movement descriptions
- Check duration settings
- Ensure smooth action descriptions

### Inconsistent Characters
- Use consistent descriptive terms
- Maintain character traits throughout video
- Use specific physical descriptions
- Reference previous scenes in sequences

### Temporal Inconsistencies
- Strengthen motion descriptions
- Add temporal consistency modifiers
- Use clear action sequences
- Maintain environmental consistency

## Advanced Video Techniques

### Character Consistency Across Frames
- Use consistent physical descriptions
- Maintain personality traits
- Reference previous scenes in sequences
- Use character-specific modifiers

### Scene Progression in Video
- Build logical action sequences
- Maintain environmental consistency
- Progressive intensity escalation
- Smooth transitions between actions

### Camera Work Techniques
- **Static**: `static camera, fixed angle`
- **Panning**: `camera slowly panning left to right`
- **Zooming**: `camera slowly zooming in on subject`
- **Tracking**: `camera following subject movement`
- **Circling**: `camera slowly circling around subject`

### Video Style Variations
- **Cinematic**: `cinematic lighting, dramatic camera work, film quality`
- **Documentary**: `natural lighting, handheld camera, realistic motion`
- **Professional**: `studio lighting, professional camera work, smooth motion`
- **Artistic**: `artistic lighting, creative camera angles, stylized motion`

## Multi-Video Sequence Planning

### Storyboard Approach
1. **Scene 1**: Introduction and setup
2. **Scene 2**: Development and interaction
3. **Scene 3**: Climax or peak moment
4. **Scene 4**: Resolution or conclusion

### Consistency Across Videos
- Maintain character appearance
- Keep environmental consistency
- Use progressive intensity
- Smooth narrative flow

---

**Note**: This guide should be used in conjunction with the prompt builder AI assistant for optimal video generation results. The AI can help tailor these guidelines to specific use cases and provide real-time optimization suggestions for video prompts.
