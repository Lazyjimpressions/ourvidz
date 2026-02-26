# Storyboard User Guide

## Creating Multi-Clip Videos with Character Consistency

> This guide explains how to use the Storyboard feature to create longer-form videos with consistent characters across multiple clips. It covers project setup, clip generation, frame chaining, and best practices.

---

## 1. Overview: What is Storyboard?

Storyboard lets you create videos by chaining together multiple AI-generated clips. Each clip maintains visual consistency with the previous one through **frame chaining** - extracting a frame from one clip to use as the starting point for the next.

### Key Concepts

| Term | Meaning |
|------|---------|
| **Project** | A complete video with multiple scenes |
| **Scene** | A logical section (e.g., "Beach arrival", "Sunset moment") |
| **Clip** | A single video segment (3-10 seconds) |
| **Frame Chaining** | Using extracted frames to link clips together |
| **Anchor Clip** | First clip that establishes the visual identity |
| **Chain Clip** | Follow-up clips that continue from previous frame |

---

## 2. Getting Started

### Step 1: Create a Project

1. Navigate to **Storyboard** from the main menu
2. Click **New Project**
3. Enter project details:
   - **Title**: Name your project
   - **Description**: Brief summary (helps AI suggestions later)
   - **Aspect Ratio**: 16:9 (landscape), 9:16 (portrait), or 1:1 (square)
   - **Primary Character**: Select from your characters (optional but recommended)

### Step 2: Add Scenes

1. In the project editor, click **Add Scene**
2. Give each scene a title and description
3. Set the mood/setting (helps with prompt suggestions)

**Tip:** Think of scenes as story beats - "Introduction", "Rising action", "Climax", etc.

---

## 3. Understanding Clip Types (V2)

The Storyboard V2 system offers five different clip types, each designed for specific use cases.

### Clip Type Overview

| Type | Duration | Best For | Reference Source |
|------|----------|----------|------------------|
| **Quick** | 5s | First clips, establishing shots | Character portrait or uploaded image |
| **Extended** | 10s | Continuing from previous clip | Previous clip video |
| **Controlled** | 5s | Precise motion with identity preservation | Character image + motion preset |
| **Long** | 15s | Extended sequences (auto-orchestrated) | Character image |
| **Keyframed** | 5s | Specific start/end poses | Start and end frame images |

### Choosing the Right Type

| Scenario | Recommended Type |
|----------|------------------|
| First clip in a scene | **Quick** |
| Smooth continuation from previous | **Extended** |
| Need specific motion (breathing, turn) | **Controlled** |
| Character needs to hold identity | **Controlled** |
| Longer uninterrupted sequence | **Long** |
| Known start and end poses | **Keyframed** |

### How Clip Types Affect Generation

- **Quick**: Uses Image-to-Video (I2V) - transforms your reference image into motion
- **Extended**: Uses Video Extend - continues the video from where the last clip ended
- **Controlled**: Uses MultiConditioning - combines identity reference with motion reference
- **Keyframed**: Uses multi-image input - interpolates between your start/end frames

---

## 4. Using AI Assistance

Storyboard V2 includes comprehensive AI assistance throughout the workflow.

### AI Story Planning

When creating a new project with AI assistance level set to "Full":

1. Provide a project description (e.g., "A romantic scene at sunset on the beach")
2. The AI generates:
   - **Story beats**: High-level narrative structure
   - **Scene breakdown**: Specific scenes with titles and descriptions
   - **Mood suggestions**: Emotional tone for each scene
   - **Duration allocation**: How to distribute time across scenes

3. Scenes are automatically created from the AI plan
4. You can edit, reorder, or delete any AI-generated scenes

### AI Prompt Suggestions

When writing clip prompts, the AI can suggest motion prompts based on:

- **Scene context**: The scene's mood, setting, and description
- **Previous clip**: What motion came before (for continuity)
- **Character**: Any character-specific movement patterns

Suggestions come in three intensity levels:
- **Subtle**: Minimal motion (breathing, blinking)
- **Medium**: Moderate action (turning, stepping)
- **Dynamic**: Active motion (walking, gesturing)

### AI Prompt Enhancement

Before generation, you can enhance your prompt:

1. Write your basic prompt
2. Click the **Enhance** button (sparkle icon)
3. The AI expands your prompt for better video generation
4. Review and edit the enhanced prompt if needed

**Example:**
- Your prompt: "walks toward water"
- Enhanced: "same character and setting, continuing natural movement, walks slowly toward the water's edge with graceful steps, gentle breeze affecting hair and clothing, golden sunset reflections on wet sand"

---

## 5. Motion Presets

Motion presets provide reference videos that guide how your character should move.

### Accessing the Motion Library

1. Select a clip and set type to **Controlled**
2. Click the **Motion Preset** selector
3. Browse categories or search for specific motions
4. Preview any preset by hovering over its thumbnail

### Available Categories

| Category | Presets | Use Cases |
|----------|---------|-----------|
| **Breathing** | Subtle, Deep | Calm scenes, close-ups |
| **Turn** | Left, Right | Changing direction, reveals |
| **Walk** | Forward, Backward | Movement sequences |
| **Camera** | Orbit, Handheld | Cinematic effects |
| **Expression** | Smile Transition | Emotional moments |
| **General** | Look Around | Ambient movement |

### Tips for Effective Motion Presets

- **Match energy**: Choose presets that fit your scene's mood
- **Combine with prompts**: Your text prompt adds context to the motion
- **Test first**: Generate a test clip to see how the preset works with your character
- **Subtle works best**: Dramatic motions can cause identity drift

---

## 6. Generating Your First Clip (Anchor Clip)

The first clip is crucial - it establishes the visual foundation for all following clips.

### Reference Image (Required)

Every clip needs a reference image. For the first clip, you have three options:

| Option | Best For |
|--------|----------|
| **Upload Image** | When you have a specific starting image |
| **Character Portrait** | Using your character's reference (auto-selected if available) |
| **Generate First** | Create an image in Workspace, then use it here |

### Writing the Anchor Prompt

Your first prompt should include comprehensive details:

```
[Character description], [pose], [environment], [lighting], [mood], [motion]
```

**Example:**
> "Young woman with long dark hair, wearing a red sundress, standing on a beach at sunset, golden hour lighting, romantic mood, slow natural movement, hair gently blowing in the breeze"

### What to Include

- **Character**: Age, hair, eyes, distinguishing features
- **Attire**: Clothing, accessories, colors
- **Pose**: Standing, sitting, position, facing direction
- **Environment**: Location, background details
- **Lighting**: Natural/artificial, time of day, shadows
- **Mood**: Emotional tone (romantic, dramatic, peaceful)
- **Motion**: Type of movement (slow, dynamic, subtle)

---

## 7. Generating Chain Clips

After your first clip, subsequent clips should **NOT** repeat the character description.

### Why Motion-Only Prompts?

Re-describing the character causes **identity drift** - the model interprets your description slightly differently each time, leading to inconsistent appearance.

Instead, trust the reference frame (extracted from the previous clip) and focus on motion:

### Writing Chain Prompts

```
same character and setting, [motion intent], [subtle change]
```

**Examples:**
> "same character and setting, continuing the motion, slowly turns head to the right"

> "same scene, slight camera movement left, character takes a step forward"

> "continuing movement, gentle smile appearing, soft breeze continues"

### What to Include in Chain Prompts

- **Continuity phrase**: "same character", "continuing motion", "same scene"
- **Motion intent**: What movement should happen
- **Camera direction**: Pan, zoom, static
- **Subtle changes**: Expression shifts, small movements

### What to AVOID in Chain Prompts

- Re-describing character appearance
- Mentioning hair color, clothing, eye color again
- Adding new major elements not in reference

---

## 8. Frame Extraction

After each clip generates, you need to extract a frame for the next clip.

### The Sweet Spot

| Clip Length | Extract At |
|-------------|------------|
| 3-4 seconds | 40-55% |
| 5-6 seconds | 45-60% |
| 8-10 seconds | 50-65% |

### Using the Frame Selector

1. After clip completes, click **Select Frame**
2. Use the slider to scrub through the video
3. The **green zone** shows the optimal extraction range
4. Click **Extract** when you find a good frame

### What Makes a Good Chain Frame?

- **Clear subject**: Character is visible and well-defined
- **Stable motion**: Not during fast movement blur
- **Good composition**: Subject positioned well for continuation
- **Natural pose**: Allows smooth continuation in next clip

### What to Avoid

- Extracting at 0-30%: Too similar to input, no motion development
- Extracting at 70-100%: Often blurry, motion artifacts
- Fast motion frames: Creates jarring transitions

---

## 9. Model Selection

### Available Video Models

| Model | Best For | Notes |
|-------|----------|-------|
| **WAN 2.1 I2V** | Primary choice, NSFW content | Recommended default |
| **Kling O1** | Cinematic SFW content | Higher quality, limited NSFW |
| **Local WAN** | When available | Faster, private |

### When to Switch Models

- **Generation failing**: Try alternate model
- **Quality issues**: Different models have different strengths
- **Content type**: Some models handle certain content better

---

## 10. Best Practices

### Project Planning

1. **Plan your story first**: Outline scenes before generating
2. **Shorter clips chain better**: 5-second clips are easier than 10-second
3. **Allow for iteration**: Your first clip may need multiple attempts

### Prompt Tips

| Do | Don't |
|----|-------|
| Be specific in anchor prompt | Write vague descriptions |
| Use motion-only for chains | Re-describe character |
| Include lighting/mood | Assume defaults work |
| Mention camera movement | Leave composition to chance |

### Quality Tips

- **Consistent lighting**: Establish in first clip, don't change drastically
- **Minimal background changes**: Keep environment stable across clips
- **Gradual motion**: Small movements chain better than dramatic ones
- **Review before chaining**: Watch full clip before extracting frame

---

## 11. Troubleshooting

### "My character looks different in each clip"

**Cause**: Re-describing character in chain prompts
**Fix**: Use motion-only prompts, trust the reference frame

### "Clips don't flow smoothly"

**Cause**: Extracting frames too early or late
**Fix**: Use the 45-60% range, avoid motion blur frames

### "Generation keeps failing"

**Causes & Fixes**:

- Reference image too small → Use higher resolution
- Prompt too complex → Simplify, focus on essentials
- Model overloaded → Wait and retry, or switch models

### "Colors/lighting shift between clips"

**Cause**: Model interpreting prompts differently
**Fix**: Don't mention lighting in chain prompts unless intentional change

### "Character's pose is wrong"

**Cause**: Prompt conflicts with reference frame
**Fix**: Align prompt with what's shown in reference, don't fight it

---

## 12. Example Workflow

### Project: "Beach Sunset Romance" (30 seconds, 6 clips)

**Setup:**

- Aspect ratio: 16:9
- Primary character: "Emma" (dark hair, green eyes)
- Target: 6 clips × 5 seconds each

**Clip 1 (Anchor):**
> Reference: Emma's character portrait
> Prompt: "Young woman with long dark hair, green eyes, wearing white flowing dress, standing on beach, sunset golden hour lighting, gentle waves in background, romantic cinematic mood, slow natural movement, hair and dress gently moving in breeze"

**Clip 2 (Chain):**
> Reference: Frame from Clip 1 at 52%
> Prompt: "same character and setting, continuing motion, slowly turns to face the ocean, camera gently follows"

**Clip 3 (Chain):**
> Reference: Frame from Clip 2 at 48%
> Prompt: "continuing the scene, walks slowly toward the water, feet touching sand, sunset reflecting"

**Clip 4 (Chain):**
> Reference: Frame from Clip 3 at 55%
> Prompt: "same scene continuing, stops at water's edge, looks down at waves, peaceful expression"

**Clip 5 (Chain):**
> Reference: Frame from Clip 4 at 50%
> Prompt: "continuing motion, looks up toward horizon, slight smile, wind picks up slightly"

**Clip 6 (Chain):**
> Reference: Frame from Clip 5 at 52%
> Prompt: "final moment, character turns back toward camera with gentle smile, golden light on face, cinematic ending"

---

## 13. Keyboard Shortcuts (Coming Soon)

| Shortcut | Action |
|----------|--------|
| `Space` | Play/pause selected clip |
| `←` / `→` | Previous/next clip |
| `G` | Generate new clip |
| `E` | Extract frame from current clip |
| `R` | Retry failed clip |

---

## Related Guides

- [IMAGE_CREATION_GUIDE.md](./IMAGE_CREATION_GUIDE.md) - Prompt writing basics
- [FRAMECHAINING_GUIDE.md](./FRAMECHAINING_GUIDE.md) - Technical frame chaining details
- [WAN2.1_i2v_FAL_AI_GUIDE.md](./WAN2.1_i2v_FAL_AI_GUIDE.md) - WAN model specifics

---

## Need Help?

If you encounter issues not covered here:

1. Check the generation logs for error details
2. Try a different model
3. Simplify your prompt
4. Ensure reference image is high quality
5. Contact support with your project ID
