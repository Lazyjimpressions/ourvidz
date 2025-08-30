# WAN Worker Documentation

**Last Updated:** January 2025  
**Status:** ✅ ACTIVE - Fully implemented for video generation

## **🎯 Overview**

The WAN Worker is responsible for video generation using the WAN 2.1 T2V 1.3B model, with integration to Qwen 2.5-7B Base for prompt enhancement. It's part of the triple worker system and provides high-quality video generation capabilities.

### **Key Capabilities**
- **Video Generation**: High-quality video generation with WAN 2.1 T2V 1.3B
- **Prompt Enhancement**: Integration with Qwen 2.5-7B Base for enhanced prompts
- **Multiple Formats**: Support for different video lengths and qualities
- **Image-to-Video**: Convert images to video sequences

---

## **🔧 Technical Setup**

### **Model Configuration**
```python
# WAN 2.1 T2V 1.3B Model Setup
MODEL_PATH = "/workspace/models/wan2.1-t2v-1.3b/"
MODEL_NAME = "Wan2.1-T2V-1.3B"
VRAM_USAGE = "30GB"  # Peak usage during generation
MAX_CONCURRENT_JOBS = 4
```

### **Hardware Requirements**
- **GPU**: NVIDIA RTX 6000 ADA (48GB VRAM)
- **Memory**: 30GB VRAM peak usage
- **Storage**: Model files (~8GB)
- **Performance**: 25-240 seconds for 5-second video

### **Worker Configuration**
```python
WORKER_CONFIG = {
    "wan": {
        "model_path": "/workspace/models/wan2.1-t2v-1.3b/",
        "max_concurrent_jobs": 4,
        "memory_limit": 30,  # GB
        "polling_interval": 5,
        "job_types": ["image_fast", "image_high", "video_fast", "video_high"]
    }
}
```

---

## **🎬 Video Generation Implementation**

### **Video Processing Pipeline**

#### **Standard Video Generation**
```python
def generate_video(job_data):
    """Standard video generation pipeline"""
    
    # 1. Load model
    model = load_wan_model()
    
    # 2. Process prompt enhancement with Qwen
    enhanced_prompt = enhance_prompt_with_qwen(job_data['prompt'])
    
    # 3. Generate video
    video = model.generate(
        prompt=enhanced_prompt,
        negative_prompt=job_data.get('negative_prompt', ''),
        guidance_scale=job_data.get('guidance_scale', 7.5),
        steps=job_data.get('steps', 25),
        width=job_data.get('width', 1280),
        height=job_data.get('height', 720),
        duration=job_data.get('duration', 5),  # seconds
        fps=job_data.get('fps', 16)
    )
    
    return video
```

#### **Image-to-Video Generation**
```python
def generate_image_to_video(job_data):
    """Image-to-video generation pipeline"""
    
    # 1. Load model
    model = load_wan_model()
    
    # 2. Process reference image
    reference_image = load_reference_image(job_data['reference_image_url'])
    
    # 3. Process prompt enhancement
    enhanced_prompt = enhance_prompt_with_qwen(job_data['prompt'])
    
    # 4. Generate video from image
    video = model.generate(
        prompt=enhanced_prompt,
        negative_prompt=job_data.get('negative_prompt', ''),
        guidance_scale=job_data.get('guidance_scale', 7.5),
        steps=job_data.get('steps', 25),
        width=job_data.get('width', 1280),
        height=job_data.get('height', 720),
        duration=job_data.get('duration', 5),
        fps=job_data.get('fps', 16),
        init_image=reference_image
    )
    
    return video
```

### **Qwen Integration**

#### **Prompt Enhancement**
```python
def enhance_prompt_with_qwen(prompt):
    """Enhance prompt using Qwen 2.5-7B Base"""
    
    # Load Qwen model (if not already loaded)
    qwen_model = load_qwen_model()
    
    # Create enhancement prompt
    enhancement_prompt = f"""
    Enhance this prompt for high-quality video generation:
    Original: {prompt}
    
    Add cinematic details, lighting, camera angles, and motion descriptions.
    Focus on creating engaging, high-quality video content.
    """
    
    # Generate enhanced prompt
    enhanced_prompt = qwen_model.generate(
        prompt=enhancement_prompt,
        max_tokens=200,
        temperature=0.7
    )
    
    return enhanced_prompt.strip()
```

#### **Quality Optimization**
```python
def optimize_video_quality(job_data):
    """Optimize video generation parameters for quality"""
    
    # Adjust parameters based on quality setting
    quality = job_data.get('quality', 'high')
    
    if quality == 'high':
        return {
            'guidance_scale': 7.5,
            'steps': 25,
            'fps': 16
        }
    elif quality == 'fast':
        return {
            'guidance_scale': 5.0,
            'steps': 15,
            'fps': 12
        }
    else:  # balanced
        return {
            'guidance_scale': 6.5,
            'steps': 20,
            'fps': 14
        }
```

---

## **🔗 Frontend Integration**

### **Job Submission**
```typescript
// Frontend job submission to WAN worker
const submitWANJob = async (params: WANJobParams) => {
  const jobData = {
    job_type: 'video_high',
    prompt: params.prompt,
    negative_prompt: params.negativePrompt,
    duration: params.duration || 5,  // seconds
    width: params.width || 1280,
    height: params.height || 720,
    fps: params.fps || 16,
    quality: params.quality || 'high',
    
    // Image-to-video parameters
    reference_image_url: params.referenceImageUrl,
    
    // Worker routing
    target_worker: 'wan'
  };
  
  return await queueJob(jobData);
};
```

### **Progress Tracking**
```typescript
// Frontend progress tracking for video generation
const trackVideoProgress = (jobId: string) => {
  const progressCallback = (progress: VideoProgress) => {
    // Update UI with progress
    updateProgressUI({
      status: progress.status,
      percentage: progress.percentage,
      estimatedTime: progress.estimatedTime,
      currentStep: progress.currentStep
    });
  };
  
  return subscribeToJobProgress(jobId, progressCallback);
};
```

---

## **📊 Performance Optimization**

### **Memory Management**
```python
def optimize_wan_memory():
    """Optimize memory usage for WAN worker"""
    
    # Clear GPU cache before generation
    torch.cuda.empty_cache()
    
    # Monitor VRAM usage
    vram_usage = torch.cuda.memory_allocated() / 1024**3
    if vram_usage > 25:  # GB
        gc.collect()
        torch.cuda.empty_cache()
    
    # Unload Qwen model if not needed
    if not is_qwen_needed():
        unload_qwen_model()
```

### **Model Loading Strategy**
```python
class WANWorker:
    def __init__(self):
        self.wan_model = None
        self.qwen_model = None
        self.wan_loaded = False
        self.qwen_loaded = False
    
    def ensure_models_loaded(self):
        """Ensure required models are loaded"""
        if not self.wan_loaded:
            self.wan_model = load_wan_model()
            self.wan_loaded = True
        
        # Load Qwen only when needed
        if not self.qwen_loaded and needs_enhancement():
            self.qwen_model = load_qwen_model()
            self.qwen_loaded = True
```

### **Concurrent Job Management**
```python
def manage_concurrent_jobs():
    """Manage concurrent video generation jobs"""
    
    max_concurrent = 4
    current_jobs = get_active_jobs()
    
    if len(current_jobs) >= max_concurrent:
        # Queue additional jobs
        return queue_job_for_later()
    
    # Process job immediately
    return process_video_job()
```

---

## **🔍 Error Handling**

### **Common Issues**
```python
def handle_wan_errors(error, job_data):
    """Handle common WAN worker errors"""
    
    if "CUDA out of memory" in str(error):
        # Clear memory and retry with lower quality
        torch.cuda.empty_cache()
        job_data['quality'] = 'fast'
        return retry_job(job_data)
    
    elif "Model not found" in str(error):
        # Reload model
        reload_wan_model()
        return retry_job(job_data)
    
    elif "Invalid reference image" in str(error):
        # Fallback to text-to-video
        job_data.pop('reference_image_url', None)
        return retry_job(job_data)
    
    else:
        # Log unknown error
        log_error(error, job_data)
        return {
            'error': 'Video generation failed',
            'job_id': job_data.get('job_id')
        }
```

### **Quality Degradation**
```python
def degrade_quality_on_error(job_data):
    """Degrade quality settings on error"""
    
    current_quality = job_data.get('quality', 'high')
    
    if current_quality == 'high':
        job_data['quality'] = 'balanced'
        job_data['guidance_scale'] = 6.5
        job_data['steps'] = 20
    elif current_quality == 'balanced':
        job_data['quality'] = 'fast'
        job_data['guidance_scale'] = 5.0
        job_data['steps'] = 15
    
    return job_data
```

---

## **📈 Monitoring and Logging**

### **Performance Metrics**
```python
def log_video_metrics(job_data, generation_time, video_info):
    """Log WAN worker performance metrics"""
    
    metrics = {
        'worker': 'wan',
        'job_type': job_data.get('job_type'),
        'generation_time': generation_time,
        'video_duration': video_info.get('duration'),
        'video_size': video_info.get('file_size'),
        'resolution': f"{video_info.get('width')}x{video_info.get('height')}",
        'fps': video_info.get('fps'),
        'quality': job_data.get('quality'),
        'vram_usage': torch.cuda.memory_allocated() / 1024**3,
        'timestamp': datetime.now().isoformat()
    }
    
    log_metrics(metrics)
```

### **Quality Monitoring**
```python
def monitor_video_quality(job_data, result):
    """Monitor video generation quality"""
    
    # Check for common quality issues
    if result.get('error'):
        log_quality_issue('video_generation_error', job_data, result)
    
    # Monitor generation times
    if result.get('generation_time', 0) > 300:  # 5 minutes
        log_quality_issue('slow_video_generation', job_data, result)
    
    # Monitor video file size
    if result.get('file_size', 0) < 1000000:  # 1MB
        log_quality_issue('small_video_file', job_data, result)
```

---

## **🎯 Video Output Specifications**

### **Standard Output**
```yaml
Format: MP4 with H.264 encoding
Resolution: 720p (1280x720) default, 1080p available
Frame Rate: 16fps default, 12-24fps range
Duration: 5 seconds (Phase 1), extendable to 30+ seconds
File Size: 15-25MB typical for 5-second video
Quality: High-definition, web-optimized
```

### **Quality Settings**
```python
QUALITY_SETTINGS = {
    'fast': {
        'guidance_scale': 5.0,
        'steps': 15,
        'fps': 12,
        'estimated_time': '60-120 seconds'
    },
    'balanced': {
        'guidance_scale': 6.5,
        'steps': 20,
        'fps': 14,
        'estimated_time': '120-180 seconds'
    },
    'high': {
        'guidance_scale': 7.5,
        'steps': 25,
        'fps': 16,
        'estimated_time': '180-240 seconds'
    }
}
```

---

## **🚀 Future Enhancements**

### **Planned Improvements**
1. **Extended Video Lengths**: Support for 15s, 30s, 60s videos
2. **Video Stitching**: Combine multiple clips with continuity
3. **Advanced Motion**: Better motion control and consistency
4. **Audio Integration**: Add audio generation capabilities

### **Integration Opportunities**
1. **Storyboard System**: Generate videos from storyboard sequences
2. **Character Consistency**: Maintain character appearance across video clips
3. **Scene Transitions**: Smooth transitions between video segments

---

**Note**: This worker is optimized for the OurVidz platform and provides the foundation for video generation capabilities. The Qwen integration ensures high-quality prompt enhancement for better video results.
