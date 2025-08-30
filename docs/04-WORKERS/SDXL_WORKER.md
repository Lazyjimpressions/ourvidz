# SDXL Worker Documentation

**Last Updated:** January 2025  
**Status:** ✅ ACTIVE - Fully implemented with i2i capabilities

## **🎯 Overview**

The SDXL Worker is responsible for image generation using the SDXL Lustify model, with specialized handling for image-to-image (i2i) functionality. It's part of the triple worker system and provides high-quality NSFW-optimized image generation.

### **Key Capabilities**
- **Image Generation**: High-quality image generation with SDXL Lustify
- **I2I Processing**: Image-to-image modification and exact copying
- **Batch Processing**: Support for 1, 3, or 6 image generation
- **Prompt Enhancement**: Integration with Qwen 2.5-7B Base for prompt enhancement

---

## **🔧 Technical Setup**

### **Model Configuration**
```python
# SDXL Lustify Model Setup
MODEL_PATH = "/workspace/models/sdxl-lustify/"
MODEL_NAME = "lustifySDXLNSFWSFW_v20.safetensors"
VRAM_USAGE = "10GB"  # Always loaded
MAX_CONCURRENT_JOBS = 2
```

### **Hardware Requirements**
- **GPU**: NVIDIA RTX 6000 ADA (48GB VRAM)
- **Memory**: 10GB VRAM dedicated to SDXL
- **Storage**: Model files (~6GB)
- **Performance**: 3-8 seconds per image

### **Worker Configuration**
```python
WORKER_CONFIG = {
    "sdxl": {
        "model_path": "/workspace/models/sdxl-lustify/",
        "max_concurrent_jobs": 2,
        "memory_limit": 10,  # GB
        "polling_interval": 2,
        "job_types": ["sdxl_image_fast", "sdxl_image_high"]
    }
}
```

---

## **🎨 I2I Implementation**

### **Parameter Handling**

#### **Reference Strength Conversion**
```python
def process_i2i_parameters(job_data):
    """Convert frontend reference strength to SDXL denoise_strength"""
    
    reference_strength = job_data.get('reference_strength', 0.5)
    exact_copy_mode = job_data.get('exact_copy_mode', False)
    
    if exact_copy_mode:
        # Exact copy mode: clamp denoise_strength to ≤0.05
        denoise_strength = min(reference_strength, 0.05)
        guidance_scale = 1.0
        negative_prompt = ""
        skip_enhancement = True
    else:
        # Modify mode: use worker defaults
        denoise_strength = 1 - reference_strength  # Invert for SDXL
        guidance_scale = 7.5
        negative_prompt = job_data.get('negative_prompt', '')
        skip_enhancement = False
    
    return {
        'denoise_strength': denoise_strength,
        'guidance_scale': guidance_scale,
        'negative_prompt': negative_prompt,
        'skip_enhancement': skip_enhancement
    }
```

#### **Mode Detection**
```python
def detect_i2i_mode(job_data):
    """Determine i2i mode based on job parameters"""
    
    reference_image = job_data.get('reference_image_url')
    exact_copy_mode = job_data.get('exact_copy_mode', False)
    prompt = job_data.get('prompt', '').strip()
    
    if not reference_image:
        return 'none'
    
    if exact_copy_mode:
        return 'copy'
    
    if prompt:
        return 'modify'
    
    return 'modify'  # Default to modify mode
```

### **Image Processing Pipeline**

#### **Standard Generation**
```python
def generate_image(job_data):
    """Standard image generation pipeline"""
    
    # 1. Load model (always loaded)
    model = load_sdxl_model()
    
    # 2. Process prompt enhancement
    if not job_data.get('skip_enhancement'):
        enhanced_prompt = enhance_prompt_with_qwen(job_data['prompt'])
    else:
        enhanced_prompt = job_data['prompt']
    
    # 3. Generate image
    image = model.generate(
        prompt=enhanced_prompt,
        negative_prompt=job_data.get('negative_prompt', ''),
        guidance_scale=job_data.get('guidance_scale', 7.5),
        steps=job_data.get('steps', 25),
        width=job_data.get('width', 1024),
        height=job_data.get('height', 1024)
    )
    
    return image
```

#### **I2I Generation**
```python
def generate_i2i_image(job_data):
    """I2I image generation pipeline"""
    
    # 1. Load model
    model = load_sdxl_model()
    
    # 2. Process reference image
    reference_image = load_reference_image(job_data['reference_image_url'])
    
    # 3. Process parameters
    i2i_params = process_i2i_parameters(job_data)
    
    # 4. Generate with reference
    image = model.generate(
        prompt=job_data.get('prompt', ''),
        negative_prompt=i2i_params['negative_prompt'],
        guidance_scale=i2i_params['guidance_scale'],
        steps=job_data.get('steps', 25),
        denoise_strength=i2i_params['denoise_strength'],
        init_image=reference_image
    )
    
    return image
```

---

## **🔗 Frontend Integration**

### **Job Submission**
```typescript
// Frontend job submission to SDXL worker
const submitSDXLJob = async (params: SDXLJobParams) => {
  const jobData = {
    job_type: 'sdxl_image_high',
    prompt: params.prompt,
    negative_prompt: params.negativePrompt,
    batch_size: params.batchSize,
    width: params.width,
    height: params.height,
    
    // I2I specific parameters
    reference_image_url: params.referenceImageUrl,
    reference_strength: params.referenceStrength,
    exact_copy_mode: params.exactCopyMode,
    
    // Worker routing
    target_worker: 'sdxl'
  };
  
  return await queueJob(jobData);
};
```

### **Parameter Validation**
```typescript
// Frontend parameter validation
const validateSDXLParams = (params: SDXLJobParams) => {
  const errors = [];
  
  // Basic validation
  if (!params.prompt?.trim()) {
    errors.push('Prompt is required');
  }
  
  // I2I validation
  if (params.referenceImageUrl && !params.referenceStrength) {
    errors.push('Reference strength required for I2I');
  }
  
  // Parameter ranges
  if (params.referenceStrength && (params.referenceStrength < 0 || params.referenceStrength > 1)) {
    errors.push('Reference strength must be between 0 and 1');
  }
  
  return errors;
};
```

---

## **📊 Performance Optimization**

### **Model Loading Strategy**
```python
# SDXL model is always loaded for fast response
class SDXLWorker:
    def __init__(self):
        self.model = None
        self.model_loaded = False
    
    def ensure_model_loaded(self):
        """Ensure SDXL model is loaded"""
        if not self.model_loaded:
            self.model = load_sdxl_model()
            self.model_loaded = True
```

### **Memory Management**
```python
# Memory optimization for concurrent jobs
def optimize_memory():
    """Optimize memory usage for SDXL worker"""
    
    # Clear GPU cache between jobs
    torch.cuda.empty_cache()
    
    # Monitor VRAM usage
    vram_usage = torch.cuda.memory_allocated() / 1024**3
    if vram_usage > 8:  # GB
        gc.collect()
        torch.cuda.empty_cache()
```

### **Batch Processing**
```python
def process_batch(job_data):
    """Process multiple images in batch"""
    
    batch_size = job_data.get('batch_size', 1)
    images = []
    
    for i in range(batch_size):
        # Generate individual image
        image = generate_image(job_data)
        images.append(image)
        
        # Memory cleanup between images
        if i < batch_size - 1:
            torch.cuda.empty_cache()
    
    return images
```

---

## **🔍 Error Handling**

### **Common Issues**
```python
def handle_sdxl_errors(error, job_data):
    """Handle common SDXL worker errors"""
    
    if "CUDA out of memory" in str(error):
        # Clear memory and retry
        torch.cuda.empty_cache()
        gc.collect()
        return retry_job(job_data)
    
    elif "Model not found" in str(error):
        # Reload model
        reload_sdxl_model()
        return retry_job(job_data)
    
    elif "Invalid reference image" in str(error):
        # Return error to frontend
        return {
            'error': 'Invalid reference image format',
            'job_id': job_data.get('job_id')
        }
    
    else:
        # Log unknown error
        log_error(error, job_data)
        return {
            'error': 'Unknown error occurred',
            'job_id': job_data.get('job_id')
        }
```

### **Fallback Strategies**
```python
def fallback_generation(job_data):
    """Fallback to basic generation if I2I fails"""
    
    # Remove I2I parameters
    basic_job = {
        'prompt': job_data.get('prompt'),
        'negative_prompt': job_data.get('negative_prompt'),
        'guidance_scale': 7.5,
        'steps': 25
    }
    
    return generate_image(basic_job)
```

---

## **📈 Monitoring and Logging**

### **Performance Metrics**
```python
def log_performance_metrics(job_data, generation_time):
    """Log SDXL worker performance metrics"""
    
    metrics = {
        'worker': 'sdxl',
        'job_type': job_data.get('job_type'),
        'generation_time': generation_time,
        'batch_size': job_data.get('batch_size', 1),
        'i2i_mode': detect_i2i_mode(job_data),
        'vram_usage': torch.cuda.memory_allocated() / 1024**3,
        'timestamp': datetime.now().isoformat()
    }
    
    log_metrics(metrics)
```

### **Quality Monitoring**
```python
def monitor_generation_quality(job_data, result):
    """Monitor generation quality and log issues"""
    
    # Check for common quality issues
    if result.get('error'):
        log_quality_issue('generation_error', job_data, result)
    
    # Monitor generation times
    if result.get('generation_time', 0) > 10:  # seconds
        log_quality_issue('slow_generation', job_data, result)
    
    # Monitor I2I specific issues
    if job_data.get('reference_image_url'):
        if result.get('similarity_score', 0) < 0.7:
            log_quality_issue('low_i2i_similarity', job_data, result)
```

---

## **🚀 Future Enhancements**

### **Planned Improvements**
1. **Advanced I2I**: Multi-reference image support
2. **Style Transfer**: Artistic style application
3. **Quality Optimization**: Better parameter tuning
4. **Batch Optimization**: Improved batch processing

### **Integration Opportunities**
1. **3rd Party APIs**: Fallback to external SDXL providers
2. **Quality Comparison**: Side-by-side result comparison
3. **Parameter Learning**: AI-optimized parameter selection

---

**Note**: This worker is actively maintained and optimized for the OurVidz platform. The I2I implementation provides the foundation for advanced image modification capabilities.
