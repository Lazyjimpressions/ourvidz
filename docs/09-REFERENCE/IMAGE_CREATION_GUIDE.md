# Image Generation Prompt Guide  
## A Step-by-Step Framework for High-Quality AI Images

> This guide explains how to structure effective image prompts for AI image generation systems.  
> It is designed for creators, product teams, and prompt engineers who want **predictable, high-quality visual outputs**.

---

## 1. Core Prompt Structure (The Golden Rule)

An effective image prompt follows this order:

1. **Subject**
2. **Description & Details**
3. **Style & Medium**
4. **Composition & Camera**
5. **Lighting**
6. **Quality Modifiers**
7. **Constraints / Negatives (if supported)**

Think of prompts as **layered instructions**, not a sentence.

---

## 2. Step 1 — Define the Subject (Required)

The subject is **what the image is about**.

### Best Practices
- Be specific
- Use singular focus unless multiple subjects are intentional
- Define age, gender, or type clearly if relevant

### Examples
- “A young woman”
- “A futuristic city skyline”
- “A medieval knight in armor”

**Avoid**
- Vague terms like “someone” or “thing”
- Multiple unrelated subjects unless intentional

---

## 3. Step 2 — Add Physical & Visual Details

Describe the subject’s **appearance and attributes**.

### Common Detail Categories
- Hair (color, length, style)
- Clothing (type, material, fit)
- Expression or emotion
- Body posture or stance
- Distinctive features

### Example
> “A young woman with long dark hair, wearing a black leather jacket, calm expression”

**Tip:** Add details gradually—too many at once can reduce clarity.

---

## 4. Step 3 — Define the Art Style or Medium

This tells the model **how the image should look**.

### Common Style Types
- Photography
- Illustration
- Digital art
- Oil painting
- Anime
- Cinematic still
- Concept art

### Photography Modifiers
- “portrait photography”
- “fashion photography”
- “cinematic photography”

### Example
> “digital illustration, modern fantasy style”

---

## 5. Step 4 — Composition & Camera Framing

Controls **how the subject appears in frame**.

### Common Composition Terms
- Close-up
- Medium shot
- Full body
- Wide shot
- Centered composition
- Rule of thirds

### Camera & Lens (for realism)
- 35mm lens
- 50mm portrait
- Shallow depth of field
- Bokeh background

### Example
> “medium shot, centered composition, shallow depth of field”

---

## 6. Step 5 — Lighting & Mood

Lighting dramatically affects realism and tone.

### Lighting Types
- Soft lighting
- Natural daylight
- Studio lighting
- Rim lighting
- Neon lighting
- Volumetric lighting

### Mood Pairings
- Soft lighting → romantic, calm
- High contrast → dramatic
- Low light → moody, cinematic

### Example
> “soft natural lighting, warm tones”

---

## 7. Step 6 — Quality & Detail Modifiers

These keywords improve clarity and output quality.

### Common Quality Keywords
- high quality
- highly detailed
- ultra-detailed
- sharp focus
- professional
- masterpiece
- 4k / 8k (model-dependent)

### Example
> “highly detailed, professional quality”

---

## 8. Step 7 — Optional: Background & Environment

If the background matters, specify it.

### Examples
- “minimal background”
- “city street at night”
- “bedroom interior”
- “fantasy forest”

**Tip:** If you don’t specify a background, the model will invent one.

---

## 9. Step 8 — Optional: Negative Prompts (If Supported)

Negative prompts tell the model **what to avoid**.

### Common Negative Terms
- blurry
- low quality
- distorted anatomy
- extra limbs
- watermark
- text
- logo

### Example
> Negative: blurry, low resolution, distorted features

---

## 10. Putting It All Together (Full Prompt Example)

**Structured Prompt**
A young woman with long dark hair wearing a black leather jacket,
digital illustration,
medium shot, centered composition,
soft natural lighting,
highly detailed, professional quality


**Optional Negative Prompt**
blurry, low quality, distorted anatomy, watermark


---

## 11. Prompt Length & Complexity Guidelines

### Short Prompts
- Faster
- Less control
- More randomness

### Long Prompts
- More control
- Higher consistency
- Risk of over-constraining if poorly ordered

**Rule of Thumb:**  
Start simple → add layers only if needed.

---

## 12. Common Mistakes to Avoid

- ❌ Overloading the prompt with conflicting styles
- ❌ Mixing realism and cartoon styles unintentionally
- ❌ Forgetting lighting or composition
- ❌ Using vague descriptors
- ❌ Relying only on quality keywords without detail

---

## 13. Iteration Strategy (How Pros Work)

1. Generate initial image
2. Identify what’s wrong:
   - Face?
   - Pose?
   - Style?
   - Lighting?
3. Add or adjust **one category at a time**
4. Regenerate
5. Save successful prompts as templates

---

## 14. Platform Design Implications

For AI image platforms, this guide maps well to:
- Step-based prompt builders
- Visual sliders (lighting, detail, realism)
- Preset styles
- Prompt previews
- Editable negative prompts

A structured UI reduces user frustration and improves output quality.

---

## 15. Final Takeaway

Great image prompts are:
- Structured
- Specific
- Layered
- Iterative

Treat prompting as **visual direction**, not a sentence—and your results will improve dramatically.

---

**Document Type:** Image Generation Reference  
**Recommended Use:**  
- User education  
- Prompt UI design  
- Internal prompt standards  
- AI image product documentation
