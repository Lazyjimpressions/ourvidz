Great question — this is exactly the right place to pause and *lock in a clean mental model* before wiring this into OurVidz.

I’ll break this down **practically**, not marketing-speak.

---

## 1️⃣ Mental model: how Seedream v4 / v4.5 actually work

Think of **Seedream as a unified image foundation model**, exposed through **different endpoints** for different tasks.

They are **not separate models you chain together internally** — *you choose the endpoint based on what you want to do*.

### The four relevant Seedream endpoints

| Endpoint           | Purpose                                     | Do you need a source image? | Max Images |
| ------------------ | ------------------------------------------- | --------------------------- | ---------- |
| `v4/text-to-image` | Generate a new image from text              | ❌ No                        | 0          |
| `v4.5/text-to-image` | Higher-quality text-to-image generation   | ❌ No                        | 0          |
| `v4/edit`          | Modify an existing image using text         | ✅ Yes                       | 1-10       |
| `v4.5/edit`        | Higher-quality editing with **multi-reference** | ✅ Yes                   | **1-10**   |

👉 **They stand on their own.**
You don’t “call v4 first then v4/edit”.
You **choose one per request**.

---

## 2️⃣ When should each endpoint be used?

### ✅ `fal-ai/bytedance/seedream/v4/text-to-image`

Use this when:

* You are generating a **new scene image**
* No previous image exists
* This is your **first visual for a roleplay scene**

**Typical OurVidz use case**

* Roleplay chat reaches a beat → “Generate scene image”
* Prompt is derived from chat context
* No reference image yet

---

### ✅ `fal-ai/bytedance/seedream/v4/edit`

Use this when:

* You already have an image
* You want to **change something**:

  * pose
  * clothing
  * expression
  * lighting
  * camera angle
  * scene continuity

This is **image-to-image (i2i)** with instructions.

---

### ✅ `fal-ai/bytedance/seedream/v4.5/edit` (recommended default for i2i)

This is the **same concept as v4/edit**, but:

* Better prompt adherence
* Better anatomy & realism
* Better localized edits
* Better handling of complex instructions

👉 **If you can afford it, use v4.5/edit as your default i2i endpoint.**

---

## 3️⃣ How this fits cleanly into an OurVidz workflow

Here’s a **recommended architecture** that maps cleanly to your roleplay + fallback strategy.

---

### 🧱 Core idea: ONE image pipeline, TWO entry points

#### Entry Point A — Scene creation (T2I)

```text
Roleplay Chat
   ↓
Scene Summarizer / Prompt Enhancer (LLM)
   ↓
Seedream v4 TEXT-TO-IMAGE
   ↓
Store image + metadata
```

#### Entry Point B — Scene evolution (I2I)

```text
User action or story progression
   ↓
Instruction prompt (change request)
   ↓
Seedream v4.5 EDIT (with previous image)
   ↓
New image version
```

---

## 4️⃣ Concrete example (this will help it click)

### 🎬 First image (new scene)

**Call**

```json
model: "fal-ai/bytedance/seedream/v4/text-to-image"
```

**Prompt**

```text
A private outdoor hot tub at night, steam rising in the cool air.
Soft lighting reflects off the water.
A young woman with long dark hair sits relaxed against the edge,
her expression shy but curious.
Cinematic lighting, photorealistic, shallow depth of field.
```

➡️ Output: **Image #1 (Scene Start)**

---

### 🎞 Scene progresses → image-to-image edit

User or AI says:

> “She leans closer, her shoulders rising out of the water slightly, eyes locked on the viewer.”

**Call**

```json
model: "fal-ai/bytedance/seedream/v4.5/edit"
image: <Image #1>
prompt: "She leans closer, shoulders rising slightly out of the water,
maintaining the same character appearance, lighting, and setting."
```

➡️ Output: **Image #2 (Same scene, evolved)**

---

## 5️⃣ Do the edit models require special setup?

Short answer: **No extra setup**, but you must pass the right inputs.

### Required inputs for EDIT models

* ✅ `image` (URL or base64)
* ✅ `prompt` (what to change)
* ❌ You do *not* need a negative prompt (optional)

### Best practice

* Always include phrases like:

  * *“maintain the same character identity”*
  * *“keep the same lighting and environment”*
  * *“subtle change”* or *“slight adjustment”*

This dramatically improves continuity.

---

## 6️⃣ How this maps to your fallback strategy

This aligns **perfectly** with your design goals:

### 🔥 Local server UP

* SDXL / WAN locally
* Full control, lowest cost

### ⚡ Local server DOWN

* Seedream v4 → T2I fallback
* Seedream v4.5 → I2I fallback
* Same prompt templates
* Same edge function
* Same UI flow

You do **not** need separate logic paths — just a provider switch.

---

## 7️⃣ Recommendation (clear decision)

**For OurVidz, I would standardize on:**

### Text → Image

* `fal-ai/bytedance/seedream/v4/text-to-image`

### Image → Image

* `fal-ai/bytedance/seedream/v4.5/edit`

### Why this combo works

* Unified provider
* Fast
* High-quality
* NSFW-tolerant in practice (model-dependent)
* Strong i2i (better than Replicate SDXL endpoints you tested)

---

## 8️⃣ Next logical step:

consider:

* Design **exact prompt templates** for:

  * scene creation
  * scene evolution
  * clothing changes
  * pose changes
* Define **when the UI should offer "Generate Image" vs "Update Image"**
* Map **token → image cost expectations**

---

## 9️⃣ Multi-Reference Composition (v4.5/edit)

**NEW CAPABILITY:** Seedream v4.5/edit supports **up to 10 input images** for multi-source composition.

### How It Works

The model uses **Figure notation** to reference images:

```typescript
image_urls: [
  "https://...scene.jpg",      // Figure 1: Environment
  "https://...character.jpg",  // Figure 2: AI Character
  "https://...user.jpg"        // Figure 3: User Character
]

prompt: `
In the setting from Figure 1, show the woman from Figure 2
and the man from Figure 3 in an intimate embrace.

RULES:
- Maintain environment and lighting from Figure 1
- Preserve Character 1's appearance from Figure 2
- Preserve Character 2's appearance from Figure 3
`
```

### Use Cases for Multi-Reference

| Scene Style | References | Figure Mapping |
|-------------|------------|----------------|
| character_only | 2 | Fig 1: Scene, Fig 2: Character |
| pov | 2 | Fig 1: Scene, Fig 2: Character |
| both_characters | 3 | Fig 1: Scene, Fig 2: AI Char, Fig 3: User |

### API Input Format

```typescript
// v4.5/edit uses image_urls ARRAY (not image_url string)
{
  prompt: "In the setting from Figure 1...",
  image_urls: ["url1", "url2", "url3"],  // ARRAY format
  enable_safety_checker: false
}

// NOTE: v4.5/edit does NOT use strength parameter
```

### Character Limits

| Model | char_limit | Notes |
|-------|------------|-------|
| v4/t2i | 10,000 | Standard prompts |
| v4.5/t2i | 10,000 | Standard prompts |
| v4/edit | 10,000 | No strength param |
| v4.5/edit | 10,000 | Multi-ref, no strength |

---

## Integration Status

- ✅ Seedream v4/t2i model exists in database
- ✅ Seedream v4.5/edit model exists in database (max_images: 10)
- ⏳ Seedream v4.5/t2i needs to be added to database
- ✅ Dynamic model filtering active
- ✅ Recommended for workspace I2I edits
- ✅ Automatically appears when reference image is set
- ✅ Multi-reference supported for both_characters scenes

---

## Related Documentation

- [FAL_AI_SEEDREAM_DEFINITIVE.md](./FAL_AI_SEEDREAM_DEFINITIVE.md) - Complete API reference
- [ROLEPLAY_SCENE_GENERATION.md](./ROLEPLAY_SCENE_GENERATION.md) - Scene generation workflow
