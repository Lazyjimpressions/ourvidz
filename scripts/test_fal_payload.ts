import dotenv from 'dotenv';
dotenv.config();

const FAL_KEY = process.env.FAL_API_KEY;

if (!FAL_KEY) {
  console.error("No FAL_API_KEY found in environment!");
  process.exit(1);
}

const payload = {
  "loras": [],
  "prompt": "[SHOT TYPE] Passionate kiss. Two women, their bodies pressed against each other, share a passionate kiss. The camera slowly zooms in on their faces as they explore each other's lips, tongues dancing together. [ACTION] Their hands wander over each other's bodies, teasing and arousing one another. The kiss deepens, and they moan softly, lost in the moment. As the clip progresses, they break apart, panting heavily, their eyes locked on each other. One woman gently trails her fingers down the other's neck, leaving a trail of goosebumps in her wake. Lighting: Dim. Mood: Intimate, passionate. Camera: Static shot, close-up, slow zoom-in. Continuity: Same outfit, same location, no scene cut, consistent lighting and mood.",
  "image_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000&auto=format&fit=crop",
  "frame_rate": 30,
  "num_frames": 121,
  "resolution": "720p",
  "aspect_ratio": "16:9",
  "expand_prompt": false,
  "reverse_video": false,
  "negative_prompt": "worst quality, inconsistent motion, blurry, jittery, distorted",
  "constant_rate_factor": 35,
  "enable_safety_checker": false,
  "first_pass_skip_final_steps": 1,
  "first_pass_num_inference_steps": 8,
  "second_pass_skip_initial_steps": 5,
  "second_pass_num_inference_steps": 8
};

async function run() {
  console.log('Sending test request to fal.ai...');
  try {
    const res = await fetch("https://queue.fal.run/fal-ai/ltx-video-13b-distilled/image-to-video", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`HTTP Error: ${res.status}`);
      console.error(text);
    } else {
      const data = await res.json();
      console.log('Success:', data);
    }
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

run();
