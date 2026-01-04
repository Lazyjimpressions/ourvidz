Perfect — below is a **clean, internal reference document** you can drop straight into your repo or `/docs/reference/` folder.

I’ve structured this exactly like your other reference docs: **conceptual → practical → implementation-ready**, with explicit guidance for **Wan 2.1 + Kling**, NSFW-safe assumptions, and zero fluff.

---

# Frame Chaining Best Practices

### (Wan 2.1 I2V + Kling I2V)

**Purpose**
Since **Wan 2.1 does NOT support first+last-frame inputs**, this document defines a **frame chaining strategy** that enables believable scene continuity, character persistence, and pose progression using **single-reference image-to-video models**.

This approach is foundational for:

* NSFW / erotic scene progression
* Roleplay moments
* Short looping clips
* Scene-to-scene continuity without hard cuts

---

## 1. Core Principle: Frame Chaining

> Treat each generated video as a **moment**, not a full scene.

Instead of interpolating from Image A → Image B, we:

1. Generate a short clip from a **single reference image**
2. Extract **one carefully chosen frame**
3. Feed that frame into the **next video generation**
4. Repeat

This creates **implicit temporal continuity**.

---

## 2. Supported Models (Reality Check)

### Wan 2.1 (Primary – NSFW Friendly)

* `fal-ai/wan-i2v`
* Single reference image only
* Very tolerant of adult content
* Best for short (3–6s) erotic loops

### Kling O1 (Secondary – Cinematic)

* `fal-ai/kling-video/o1/image-to-video`
* Strong identity + motion coherence
* Less explicit tolerance than Wan, but usable

❌ Veo / Sora not recommended for NSFW pipelines.

---

## 3. Scene Graph Model (Recommended Architecture)

### Logical Hierarchy

```
Scene
 ├─ Clip 1
 │   └─ Extracted Frame → Frame A
 ├─ Clip 2 (uses Frame A)
 │   └─ Extracted Frame → Frame B
 ├─ Clip 3 (uses Frame B)
 │   └─ ...
 └─ Scene End
```

---

### Data Model (Conceptual)

```ts
Scene {
  scene_id
  title
  characters[]
  setting
  mood
  clips[]
}

Clip {
  clip_id
  model_used (wan | kling)
  prompt
  reference_image_url
  video_url
  extracted_frame_url
  duration_seconds
}

Frame {
  frame_id
  source_clip_id
  timestamp_ms
  image_url
}
```

This structure allows:

* Replay
* Branching
* Regeneration of a single clip without breaking the scene

---

## 4. Best Frame to Extract (Critical)

### ✅ Golden Rule

> **Never extract the first or last frame.**

Those frames are:

* Often unstable
* Motion-blurred
* Compositionally transitional

---

### ✅ Best Extraction Window

| Clip Length | Extract Frame At |
| ----------- | ---------------- |
| 3–4 sec     | 40–55%           |
| 5–6 sec     | 45–60%           |
| 8–10 sec    | 50–65%           |

**Why**

* Motion has stabilized
* Pose is mid-action
* Lighting and anatomy are consistent

---

### ❌ Frames to Avoid

* Extreme motion (hips thrusting, fast camera pans)
* Occlusion (hands covering face/genitals)
* Transitional gestures (turning, stepping, rolling)

---

## 5. Prompting Strategy for Frame Chaining

### Initial Clip (Anchor Clip)

This sets **identity + tone**.

**Wan Prompt Pattern**

```
[character description],
[body type + age confirmation],
[pose],
[environment],
[lighting],
[emotional tone],
slow natural movement, cinematic motion
```

Example:

```
athletic adult woman, long dark hair, confident expression,
lying on a bed, soft sheets,
warm low light, intimate bedroom,
slow breathing, subtle body movement
```

---

### Follow-Up Clips (Chained)

**DO NOT re-describe everything.**

Shift the prompt to **motion intent**, not identity.

```
same character and setting,
continuing the motion,
slight change in pose,
subtle escalation
```

This avoids:

* Identity drift
* Style resets
* Over-conditioning

---

## 6. Wan 2.1 Parameter Best Practices

### Recommended Defaults

```json
{
  "num_frames": 81,
  "fps": 16,
  "resolution": "720p",
  "num_inference_steps": 28–32,
  "guide_scale": 4.5–5.5,
  "enable_safety_checker": false,
  "enable_prompt_expansion": false
}
```

### Why

* Lower CFG = smoother anatomy
* Fewer steps = less artifact buildup across chains
* Prompt expansion often breaks erotic specificity

---

## 7. Kling-Specific Notes (If Used)

Kling is best when:

* You need **stronger cinematic motion**
* You want **camera movement**
* Content is sensual but not extreme

**Use Kling for**

* Intro clips
* Establishing shots
* Transitions between locations

Then switch back to Wan for explicit moments.

---

## 8. Loop-Friendly Clips (Advanced Tip)

To create **seamless loops**:

1. Extract a mid-frame
2. Generate a *new clip* from that frame
3. Keep motion minimal
4. Use breathing / sway / micro-movements

This produces:

* GIF-like erotic loops
* No visible reset
* Excellent UX for galleries

---

## 9. What This Replaces (Mental Model Shift)

| Old Expectation           | Reality                  |
| ------------------------- | ------------------------ |
| Storyboard video          | Moment-based chaining    |
| Start → End interpolation | Implicit continuity      |
| Long clips                | Short, regenerable clips |
| One perfect video         | Modular scene system     |

---

## 10. Summary

* Wan 2.1 is **single-reference only**
* Frame chaining is the correct solution
* Extract frames at **45–60%**
* Prompt motion, not identity, after Clip 1
* Treat scenes as **graphs**, not timelines

---

other steps:

* Convert this into a **Supabase schema**
* Provide a **frame-extraction FFmpeg command**
* Design a **branching scene system** (user choices)
* Write a **Kling-specific chaining doc**


