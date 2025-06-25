# UNIFIED CONFIGURATION (Frontend + Backend Aligned)

OPTIMAL_CONFIGURATION:
  image_fast:
    size: "832x480"              # Landscape (easier to view on mobile)
    resolution: "832*480"        # Backend format
    model: "t2i-14B"            # Direct image generation
    time: "15-45 seconds"       # Realistic based on tests
    credits: 1                  # Fair pricing
    sample_steps: 10            # Fast generation
    
  image_high:
    size: "1280x720"            # 720p standard (widely compatible)
    resolution: "1280*720"      # Backend format  
    model: "t2i-14B"            # Same model, more steps
    time: "30-60 seconds"       # Realistic for higher res
    credits: 2                  # Premium pricing
    sample_steps: 25            # Quality generation
    
  video_fast:
    size: "832x480"             # Standard definition
    resolution: "832*480"       # Backend format
    model: "t2v-1.3B"          # Fast video model
    time: "2-4 minutes"         # Realistic for 1-2 seconds video
    credits: 3                  # Video costs more
    frame_num: 17               # 1 second (4n+1 formula)
    sample_steps: 15            # Balanced speed/quality
    
  video_high:
    size: "1280x720"            # HD quality
    resolution: "1280*720"      # Backend format
    model: "t2v-14B"           # Premium video model  
    time: "8-15 minutes"        # Realistic for 2 seconds HD
    credits: 5                  # Premium pricing
    frame_num: 33               # 2 seconds (4n+1 formula)
    sample_steps: 30            # High quality

# REASONING FOR CHANGES:

SIZE_DECISIONS:
  image_fast: "832x480"         # Changed from 480x832 - landscape better for previews
  image_high: "1280x720"       # Changed from 1024x1024 - 720p more practical than square
  video_fast: "832x480"        # Keep current - standard definition
  video_high: "1280x720"       # Keep current - HD standard

TIME_ESTIMATES:
  - Based on actual Wan 2.1 performance data
  - Accounts for model loading/unloading time
  - Includes file processing and upload time
  - More conservative/realistic estimates

MODEL_SELECTION:
  - t2i-14B for all images (direct generation, no video conversion)
  - t2v-1.3B for fast videos (speed priority)
  - t2v-14B for high videos (quality priority)

CREDIT_SYSTEM:
  - Progressive pricing based on compute cost
  - Images cheaper than videos
  - High quality costs more than fast
