# WAN Worker Documentation

**Last Updated:** August 31, 2025  
**Status:** ✅ ACTIVE - Pure Inference Engine with Reference Frame Support

## **🎯 Overview**

The WAN Worker is a **pure inference engine** for video generation using WAN 2.1 with comprehensive reference frame support (5 modes) and I2I pipeline. It receives complete parameters from edge functions and executes exactly what's provided. Includes internal auto-enhancement for enhanced job types.

### **Key Capabilities**
- **Pure Inference Engine**: Executes exactly what edge functions provide
- **5 Reference Frame Modes**: none, single, start, end, both
- **I2I Pipeline**: `denoise_strength` parameter replaces `reference_strength` for consistency
- **Video Thumbnail Generation**: Mid-frame extraction for better representation
- **Internal Auto-Enhancement**: Qwen Base for enhanced job types
- **Thread-Safe Timeouts**: Concurrent.futures implementation
- **Memory Management**: Model unloading capabilities

---

## **🔧 Technical Setup**

### **Model Configuration**
```python
# WAN 2.1 Model Setup
MODEL_PATH = "/workspace/models/wan2.1-t2v-1.3b/"
MODEL_NAME = "WAN 2.1 T2V 1.3B"
VRAM_USAGE = "30GB"  # Peak usage during generation
MAX_CONCURRENT_JOBS = 1
REFERENCE_MODES = ["none", "single", "start", "end", "both"]
```

### **Hardware Requirements**
- **GPU**: NVIDIA RTX 6000 ADA (48GB VRAM)
- **Memory**: 30GB VRAM peak usage
- **Storage**: Model files (~17GB)
- **Performance**: 25-240 seconds depending on job type
- **Port**: 7860 (shared with SDXL)

### **Worker Configuration**
```python
WORKER_CONFIG = {
    "wan": {
        "model_path": "/workspace/models/wan2.1-t2v-1.3b",
        "max_frames": 83,
        "reference_modes": ["none", "single", "start", "end", "both"],
        "port": 7860,
        "max_concurrent_jobs": 1,
        "memory_limit": 30,  # GB
        "polling_interval": 5,
        "job_types": [
            "image_fast", "image_high", "video_fast", "video_high",
            "image7b_fast_enhanced", "image7b_high_enhanced", 
            "video7b_fast_enhanced", "video7b_high_enhanced"
        ]
    }
}
```

---

## **🎬 I2I Pipeline Features**

### **I2I Pipeline Implementation**
- **denoise_strength Parameter**: Replaces `reference_strength` for consistency
- **Backward Compatibility**: `reference_strength` automatically converted to `denoise_strength = 1 - reference_strength`
- **Parameter Handling**: Workers respect edge function parameters (clamping only in exact copy mode)

---

## **🖼️ Video Thumbnail Generation**

### **Thumbnail Features**
- **Mid-Frame Thumbnails**: Extract middle frame of video for better representation
- **256px WEBP Format**: Longest edge 256px, preserve aspect ratio, quality 85
- **Storage**: Both original video and thumbnail uploaded to `workspace-temp`
- **Callback Format**: Includes both `url` and `thumbnail_url` for each asset

---

## **💬 API Endpoints**

### **GET /health** - Health Check
```json
{
  "status": "healthy",
  "wan_model_loaded": true,
  "qwen_model_loaded": true,
  "device": "cuda:0"
}
```

### **GET /debug/env** - Environment Debug
```json
{
  "wan_generate_path": "/workspace/ourvidz-worker/wan_generate.py",
  "model_paths": {
    "wan": "/workspace/models/wan2.1-t2v-1.3b",
    "qwen": "/workspace/models/huggingface_cache"
  }
}
```

### **POST /enhance** - Internal Enhancement (WAN Auto-Enhancement)
```json
{
  "prompt": "Original prompt",
  "config": {
    "job_type": "image_fast|image_high|video_fast|video_high"
  }
}
```

---

## **📋 Pure Inference Payload**

### **WAN Job Payload**
```json
{
  "id": "wan_job_123",
  "type": "image_fast|image_high|video_fast|video_high|image7b_fast_enhanced|image7b_high_enhanced|video7b_fast_enhanced|video7b_high_enhanced",
  "prompt": "Complete prompt from edge function",
  "user_id": "user_123",
  "config": {
    "width": 480,
    "height": 832,
    "frames": 1-83,
    "fps": 8-24,
    "reference_mode": "none|single|start|end|both",
    "image": "Optional single reference",
    "first_frame": "Optional start reference",
    "last_frame": "Optional end reference"
  },
  "metadata": {
    "reference_image_url": "Fallback reference URL",
    "start_reference_url": "Fallback start URL",
    "end_reference_url": "Fallback end URL",
    "denoise_strength": 0.0-1.0
  }
}
```

### **Enhanced Callback Format**
```json
{
  "job_id": "wan_job_123",
  "worker_id": "wan_worker_001",
  "status": "completed|failed|processing",
  "assets": [
    {
      "type": "video|image",
      "url": "workspace-temp/user123/job123/0.mp4",
      "thumbnail_url": "workspace-temp/user123/job123/0.thumb.webp",
      "metadata": {
        "width": 480,
        "height": 832,
        "frames": 83,
        "fps": 24,
        "duration": 3.46,
        "format": "mp4",
        "file_size_bytes": 5242880,
        "asset_index": 0,
        "denoise_strength": 0.15,
        "pipeline": "img2img",
        "resize_policy": "center_crop",
        "negative_prompt_used": true
      }
    }
  ],
  "metadata": {
    "enhancement_source": "qwen_base|none",
    "reference_mode": "none|single|start|end|both",
    "processing_time": 180.5,
    "vram_used": 30720,
    "auto_enhancement": true|false
  }
}
```

---

## **🔄 Reference Frame Support**

### **Reference Frame Modes**

| **Mode** | **Config Parameter** | **Metadata Fallback** | **WAN Parameters** | **Use Case** |
|----------|---------------------|----------------------|-------------------|--------------|
| **None** | No parameters | No parameters | None | Standard T2V |
| **Single** | `config.image` | `metadata.reference_image_url` | `--image ref.png` | I2V-style |
| **Start** | `config.first_frame` | `metadata.start_reference_url` | `--first_frame start.png` | Start frame |
| **End** | `config.last_frame` | `metadata.end_reference_url` | `--last_frame end.png` | End frame |
| **Both** | `config.first_frame` + `config.last_frame` | `metadata.start_reference_url` + `metadata.end_reference_url` | `--first_frame start.png --last_frame end.png` | Transition |

### **Reference Frame Processing**
```python
def process_reference_frames(config, metadata):
    """Process reference frames based on mode"""
    
    reference_mode = config.get('reference_mode', 'none')
    
    if reference_mode == 'none':
        return {}
    elif reference_mode == 'single':
        return {
            'image': config.get('image') or metadata.get('reference_image_url')
        }
    elif reference_mode == 'start':
        return {
            'first_frame': config.get('first_frame') or metadata.get('start_reference_url')
        }
    elif reference_mode == 'end':
        return {
            'last_frame': config.get('last_frame') or metadata.get('end_reference_url')
        }
    elif reference_mode == 'both':
        return {
            'first_frame': config.get('first_frame') or metadata.get('start_reference_url'),
            'last_frame': config.get('last_frame') or metadata.get('end_reference_url')
        }
```

---

## **📊 Performance Characteristics**

### **Generation Times**
- **Fast Images**: 25-40s
- **High Images**: 40-100s
- **Fast Videos**: 135-180s
- **High Videos**: 180-240s
- **Enhanced Variants**: +60-120s for AI enhancement
- **Video Thumbnail Generation**: +1-2s per video (mid-frame extraction)

### **Job Types**
- **Standard**: `image_fast` (25-40s), `image_high` (40-100s), `video_fast` (135-180s), `video_high` (180-240s)
- **Enhanced**: `image7b_fast_enhanced` (85-100s), `image7b_high_enhanced` (100-240s), `video7b_fast_enhanced` (195-240s), `video7b_high_enhanced` (240+s)

---

## **🔧 Edge Function Requirements**

### **Required Parameters**
```json
{
  "id": "string",                    // Job ID (required)
  "type": "image_fast|image_high|video_fast|video_high|image7b_fast_enhanced|image7b_high_enhanced|video7b_fast_enhanced|video7b_high_enhanced", // Job type (required)
  "prompt": "string",                // Complete prompt (required)
  "user_id": "string",               // User ID (required)
  "config": {
    "width": 480,                   // Width (optional, default: 480)
    "height": 832,                  // Height (optional, default: 832)
    "frames": 1-83,                 // Video frames (optional, default: 83)
    "fps": 8-24,                   // FPS (optional, default: 24)
    "reference_mode": "none|single|start|end|both", // Reference mode (optional, default: none)
    "image": "string",              // Single reference (optional)
    "first_frame": "string",        // Start reference (optional)
    "last_frame": "string"          // End reference (optional)
  },
  "metadata": {
    "reference_image_url": "string", // Fallback reference (optional)
    "start_reference_url": "string", // Fallback start (optional)
    "end_reference_url": "string",   // Fallback end (optional)
    "denoise_strength": 0.0-1.0     // Reference strength (optional, default: 0.5)
  }
}
```

### **Edge Function Processing**
1. **Validate User Permissions**: Check video generation permissions
2. **Enhance Prompt**: Call Chat Worker for prompt enhancement if needed
3. **Process References**: Download and validate reference images
4. **Convert Presets**: Transform frontend presets to worker parameters
5. **Route to Worker**: Send complete job data to WAN worker

---

## **🧠 Memory Management**

### **Memory Allocation**
```python
def setup_wan_memory():
    """Configure WAN memory allocation"""
    if torch.cuda.is_available():
        # WAN uses 30GB of 48GB VRAM
        torch.cuda.set_per_process_memory_fraction(0.625)  # 30GB / 48GB
        
        # Enable memory optimizations
        torch.backends.cuda.enable_mem_efficient_sdp(True)
        torch.backends.cuda.enable_flash_sdp(True)
```

### **Model Loading Strategy**
```python
class WANWorker:
    def __init__(self):
        self.wan_model = None
        self.qwen_model = None
        self.wan_loaded = False
        self.qwen_loaded = False
    
    def ensure_models_loaded(self, job_type):
        """Ensure required models are loaded"""
        if not self.wan_loaded:
            self.wan_model = load_wan_model()
            self.wan_loaded = True
        
        # Load Qwen for enhanced jobs
        if 'enhanced' in job_type and not self.qwen_loaded:
            self.qwen_model = load_qwen_base_model()
            self.qwen_loaded = True
```

---

## **📈 Monitoring and Logging**

### **Performance Metrics**
```python
def log_wan_metrics(job_data, response_time, reference_mode):
    """Log WAN worker performance metrics"""
    
    metrics = {
        'worker': 'wan',
        'job_type': job_data.get('job_type'),
        'response_time': response_time,
        'reference_mode': reference_mode,
        'width': job_data.get('config', {}).get('width'),
        'height': job_data.get('config', {}).get('height'),
        'frames': job_data.get('config', {}).get('frames'),
        'fps': job_data.get('config', {}).get('fps'),
        'denoise_strength': job_data.get('metadata', {}).get('denoise_strength'),
        'vram_usage': torch.cuda.memory_allocated() / 1024**3,
        'timestamp': datetime.now().isoformat()
    }
    
    log_metrics(metrics)
```

---

## **🔑 Environment Configuration**

### **Required Environment Variables**
```bash
SUPABASE_URL=              # Supabase database URL
SUPABASE_SERVICE_ROLE_KEY= # Supabase service key
UPSTASH_REDIS_REST_URL=    # Redis queue URL
UPSTASH_REDIS_REST_TOKEN=  # Redis authentication token
WAN_WORKER_API_KEY=        # API key for WAN worker authentication
HF_TOKEN=                  # Optional HuggingFace token
```

### **RunPod Deployment**
- **WAN Worker URL**: `https://{RUNPOD_POD_ID}-7860.proxy.runpod.net`
- **Port**: 7860 (shared with SDXL worker)
- **Health Monitoring**: Continuous status tracking via `/health` endpoints

---

## **🚀 Future Enhancements**

### **Planned Improvements**
1. **Advanced Reference Processing**: Multi-reference frame support
2. **Custom Models**: Support for custom fine-tuned WAN models
3. **Real-time Generation**: Streaming video generation progress
4. **Quality Enhancement**: Post-processing quality improvements

### **Integration Opportunities**
1. **Character Consistency**: Integration with character reference system
2. **Style Transfer**: Advanced style transfer capabilities
3. **Batch Processing**: Support for batch video generation

---

**Note**: This worker provides high-quality video generation with comprehensive reference frame support and I2I pipeline capabilities. The WAN 2.1 model ensures professional-quality results with zero content restrictions.
