# Chat Worker Documentation

**Last Updated:** August 31, 2025  
**Status:** ✅ ACTIVE - Pure Inference Engine Architecture

## **🎯 Overview**

The Chat Worker is a **pure inference engine** for AI conversation and prompt enhancement using Qwen 2.5-7B models. It's part of the triple worker system and executes exactly what's provided by edge functions - no hardcoded prompts or business logic.

### **Key Capabilities**
- **Pure Inference Engine**: Executes exactly what edge functions provide
- **Dual Model Support**: Qwen 2.5-7B Instruct (primary) + Base (enhancement)
- **Auto-Registration**: Detects RunPod URL and registers with Supabase
- **Memory Management**: Smart loading/unloading with 15GB VRAM requirement
- **Health Monitoring**: Comprehensive status endpoints
- **Zero Content Restrictions**: No filtering or censorship
- **Enhanced Error Handling**: OOM recovery, model validation, automatic retry
- **SFW Filtering**: Opt-in content filtering with semantic preservation

---

## **🔧 Technical Setup**

### **Model Configuration**
```python
# Qwen 2.5-7B Models Setup
MODEL_PATHS = {
    "instruct": "/workspace/models/huggingface_cache/models--Qwen--Qwen2.5-7B-Instruct/",
    "base": "/workspace/models/huggingface_cache/hub/models--Qwen--Qwen2.5-7B/"
}
MODEL_NAMES = {
    "instruct": "Qwen2.5-7B-Instruct",
    "base": "Qwen2.5-7B"
}
VRAM_USAGE = "15GB"  # Peak usage during generation
```

### **Hardware Requirements**
- **GPU**: NVIDIA RTX 6000 ADA (48GB VRAM)
- **Memory**: 15GB VRAM peak usage
- **Storage**: Model files (~30GB total for both models)
- **Performance**: 1-15 seconds for responses
- **Port**: 7861 (dedicated)

---

## **🏗️ Pure Inference Architecture**

### **Architecture Philosophy**
**"Workers are dumb execution engines. All intelligence lives in the edge function."**

### **Key Changes (August 2025)**
- **Removed hardcoded prompts** - worker no longer contains any prompt logic
- **Template override risk eliminated** - workers cannot override database templates
- **New pure inference endpoints** (`/chat`, `/enhance`, `/generate`, `/worker/info`)
- **Enhanced logging** throughout all worker interactions
- **Memory optimization** and improved OOM handling
- **Edge function control** over all prompt construction
- **Model validation** with test inference on startup
- **OOM error recovery** with automatic retry logic

### **Security Benefits**
- Workers execute exactly what edge functions provide
- No possibility of prompt manipulation or overrides
- Complete audit trail of all AI interactions
- Database-driven template system with edge function control

---

## **💬 API Endpoints**

### **POST /chat** - Chat Conversation
```json
{
  "messages": [
    {
      "role": "system",
      "content": "System prompt from edge function"
    },
    {
      "role": "user",
      "content": "User message"
    }
  ],
  "max_tokens": 512,
  "temperature": 0.7,
  "top_p": 0.9,
  "model": "qwen_instruct|qwen_base",
  "sfw_mode": false
}
```

### **POST /enhance** - Pure Enhancement Inference
```json
{
  "messages": [
    {
      "role": "system",
      "content": "Enhancement system prompt from edge function"
    },
    {
      "role": "user", 
      "content": "Original prompt to enhance"
    }
  ],
  "max_tokens": 200,
  "temperature": 0.7,
  "model": "qwen_instruct|qwen_base"
}
```

### **POST /generate** - Generic Inference
```json
{
  "messages": [
    {
      "role": "system",
      "content": "System prompt from edge function"
    },
    {
      "role": "user",
      "content": "User input"
    }
  ],
  "max_tokens": 512,
  "temperature": 0.7,
  "top_p": 0.9,
  "model": "qwen_instruct|qwen_base",
  "sfw_mode": false
}
```

### **GET /health** - Health Check
```json
{
  "status": "healthy",
  "model_loaded": true,
  "uptime": 3600.5,
  "stats": {
    "requests_served": 150,
    "model_loads": 2,
    "sfw_requests": 25,
    "base_model_uses": 10,
    "instruct_model_uses": 140
  },
  "worker_type": "pure_inference_engine",
  "no_hardcoded_prompts": true
}
```

### **GET /worker/info** - Worker Information
```json
{
  "worker_type": "pure_inference_engine",
  "model": "Qwen2.5-7B-Instruct",
  "capabilities": {
    "chat": true,
    "enhancement": true,
    "generation": true,
    "hardcoded_prompts": false,
    "prompt_modification": false,
    "pure_inference": true
  },
  "models_loaded": {
    "instruct_loaded": true,
    "base_loaded": false,
    "active_model_type": "instruct"
  },
  "model_paths": {
    "instruct": "/workspace/models/huggingface_cache/models--Qwen--Qwen2.5-7B-Instruct/snapshots/a09a35458c702b33eeacc393d103063234e8bc28",
    "base": "/workspace/models/huggingface_cache/hub/models--Qwen--Qwen2.5-7B/snapshots/d149729398750b98c0af14eb82c78cfe92750796"
  },
  "endpoints": {
    "/chat": "POST - Chat inference with messages array",
    "/enhance": "POST - Enhancement inference with messages array",
    "/generate": "POST - Generic inference with messages array",
    "/health": "GET - Health check",
    "/worker/info": "GET - This information",
    "/debug/model": "GET - Current model/debug status",
    "/memory/status": "GET - Memory status and VRAM usage",
    "/memory/load": "POST - Force load specific model",
    "/memory/unload": "POST - Force unload models"
  },
  "message_format": {
    "required": ["messages"],
    "optional": ["max_tokens", "temperature", "top_p", "sfw_mode", "model"],
    "example": {
      "messages": [
        {"role": "system", "content": "System prompt from edge function"},
        {"role": "user", "content": "User message"}
      ],
      "max_tokens": 512,
      "temperature": 0.7,
      "top_p": 0.9,
      "sfw_mode": false,
      "model": "qwen_instruct"
    }
  }
}
```

### **GET /debug/model** - Model Debug Information
```json
{
  "active_model_type": "instruct",
  "instruct_loaded": true,
  "base_loaded": false,
  "paths": {
    "instruct": "/workspace/models/huggingface_cache/models--Qwen--Qwen2.5-7B-Instruct/snapshots/a09a35458c702b33eeacc393d103063234e8bc28",
    "base": "/workspace/models/huggingface_cache/hub/models--Qwen--Qwen2.5-7B/snapshots/d149729398750b98c0af14eb82c78cfe92750796"
  },
  "devices": {
    "instruct": "cuda:0",
    "base": null
  },
  "stats": {
    "requests_served": 150,
    "model_loads": 2,
    "sfw_requests": 25,
    "base_model_uses": 10,
    "instruct_model_uses": 140
  }
}
```

### **GET /memory/status** - Memory Status
```json
{
  "total_vram": 48.0,
  "allocated_vram": 15.2,
  "available_vram": 32.8,
  "model_loaded": true,
  "instruct_loaded": true,
  "base_loaded": false,
  "instruct_device": "cuda:0"
}
```

### **POST /memory/load** - Load Model
```json
{
  "which": "instruct|base|all",
  "force": false
}
```

### **POST /memory/unload** - Unload Model
```json
{
  "which": "instruct|base|all"
}
```

---

## **🔗 Auto-Registration Process**

The Chat Worker automatically registers itself with Supabase on startup:

1. **URL Detection:** Detects `RUNPOD_POD_ID` environment variable
2. **URL Construction:** Creates `https://{pod_id}-7861.proxy.runpod.net`
3. **Registration:** Calls `register-chat-worker` edge function with:
```json
{
  "worker_url": "https://{pod_id}-7861.proxy.runpod.net",
  "auto_registered": true,
  "registration_method": "pure_inference_chat_worker",
  "worker_type": "pure_inference_engine",
  "capabilities": {
    "hardcoded_prompts": false,
    "prompt_modification": false,
    "pure_inference": true
  },
  "timestamp": "2025-08-31T10:00:00Z"
}
```

---

## **📊 Performance Characteristics**

### **Response Times**
- **Chat Enhancement:** 1-3 seconds (direct inference)
- **Chat Conversation:** 5-15 seconds (dynamic prompts)
- **Model Loading:** 15GB VRAM required for Qwen Instruct
- **Memory Management:** Automatic cleanup and validation
- **PyTorch 2.0 Compilation:** Performance optimization when available

---

## **🧠 Memory Management**

### **Model Loading Strategy**
```python
class ChatWorker:
    def __init__(self):
        self.instruct_model = None
        self.base_model = None
        self.instruct_loaded = False
        self.base_loaded = False
    
    def ensure_model_loaded(self, model_type="instruct"):
        """Ensure specified model is loaded"""
        if model_type == "instruct" and not self.instruct_loaded:
            self.instruct_model = load_qwen_instruct_model()
            self.instruct_loaded = True
        elif model_type == "base" and not self.base_loaded:
            self.base_model = load_qwen_base_model()
            self.base_loaded = True
```

### **Memory Optimization**
```python
def optimize_chat_memory():
    """Optimize memory usage for chat worker"""
    
    # Clear GPU cache between conversations
    torch.cuda.empty_cache()
    
    # Monitor VRAM usage
    vram_usage = torch.cuda.memory_allocated() / 1024**3
    if vram_usage > 12:  # GB
        gc.collect()
        torch.cuda.empty_cache()
    
    # Smart model unloading
    if not actively_using_base_model():
        unload_base_model()
```

---

## **🛡️ Enhanced Error Handling**

### **OOM Error Recovery**
- **Automatic Retry:** OOM errors trigger automatic cleanup and retry
- **Memory Cleanup:** `torch.cuda.empty_cache()` called before retry
- **Graceful Degradation:** Falls back to error response if retry fails
- **Comprehensive Logging:** Detailed OOM event tracking and recovery metrics

### **Model Validation**
- **Startup Validation:** Test inference on model load
- **Runtime Validation:** Continuous model health monitoring
- **Fallback Handling:** Graceful degradation if validation fails
- **Device Consistency:** Automatic device pinning and validation

### **Error Recovery Mechanisms**
```python
# OOM handling with retry logic
try:
    inputs = {k: v.to(device) for k, v in inputs.items()}
except RuntimeError as e:
    if "out of memory" in str(e).lower():
        logger.warning("⚠️ OOM during tensor transfer, cleaning up...")
        torch.cuda.empty_cache()
        inputs = {k: v.to(device) for k, v in inputs.items()}
    else:
        raise

# Generation OOM handling
try:
    with torch.no_grad():
        generated_ids = model.generate(**inputs, ...)
except RuntimeError as e:
    if "out of memory" in str(e).lower():
        logger.warning("⚠️ OOM during generation, cleaning up and retrying...")
        torch.cuda.empty_cache()
        with torch.no_grad():
            generated_ids = model.generate(**inputs, ...)
    else:
        raise
```

---

## **🔒 SFW Filtering System**

### **Implementation Details**
- **Opt-in Only:** SFW mode must be explicitly requested via `sfw_mode: true`
- **Semantic Preservation:** Maintains meaning while masking explicit terms
- **Comprehensive Coverage:** 20+ explicit terms automatically detected
- **Performance Optimized:** Minimal impact on response time
- **User Control:** Users explicitly choose when to apply filtering

### **Filtered Terms**
```python
redactions = [
    'sex', 'sexual', 'explicit', 'porn', 'pornographic', 'nsfw',
    'cum', 'orgasm', 'anal', 'vagina', 'penis', 'breast', 'boobs',
    'blowjob', 'handjob', 'fuck', 'fucking', 'suck', 'lick', 'moan',
    'nude', 'naked'
]
```

### **SFW Filtering Process**
```python
def apply_sfw_filters(self, text: str) -> str:
    """Apply minimal SFW redaction when explicitly requested by the user.
    Keeps semantics but masks explicit terms to meet SFW mode requirements."""
    try:
        if not text:
            return text
        sanitized = text
        for term in redactions:
            for variant in (term, term.capitalize(), term.upper()):
                sanitized = sanitized.replace(variant, '▇▇')
        return sanitized
    except Exception:
        return text
```

---

## **📈 Monitoring and Logging**

### **Enhanced Logging**
```python
# Request logging
logger.info(f"🎯 Pure inference request received: {len(messages)} messages")
logger.info(f"💬 System prompt length: {len(system_prompt)} characters")
logger.info(f"👤 User prompt length: {len(user_prompt)} characters")

# Execution logging
logger.info(f"🚀 Executing pure inference with {max_tokens} max tokens")
logger.info(f"⏱️ Generation started at {start_time}")

# Response logging
logger.info(f"✅ Pure inference completed in {generation_time:.2f}s")
logger.info(f"📊 Generated {tokens_generated} tokens")
logger.info(f"🎯 Pure inference mode: no template overrides detected")

# Error logging
logger.error(f"❌ Pure inference failed: {error}")
logger.warning(f"⚠️ Fallback to original prompt due to error")

# OOM and recovery logging
logger.warning(f"⚠️ OOM during tensor transfer, cleaning up...")
logger.info(f"🔄 Retrying after memory cleanup...")
logger.info(f"✅ Recovery successful after {retry_count} attempts")

# Model management logging
logger.info(f"🔄 Loading Qwen 2.5-7B Instruct model...")
logger.info(f"✅ Model validation successful")
logger.info(f"✅ PyTorch 2.0 compilation applied")
logger.info(f"🗑️ Unloading Qwen Instruct model...")
```

### **Performance Metrics**
```python
def log_chat_metrics(job_data, response_time, response_length):
    """Log chat worker performance metrics"""
    
    metrics = {
        'worker': 'pure_inference_chat',
        'job_type': job_data.get('job_type'),
        'response_time': response_time,
        'response_length': response_length,
        'conversation_length': len(job_data.get('messages', [])),
        'temperature': job_data.get('temperature'),
        'max_tokens': job_data.get('max_tokens'),
        'model_used': job_data.get('model', 'qwen_instruct'),
        'vram_usage': torch.cuda.memory_allocated() / 1024**3,
        'pure_inference': True,
        'timestamp': datetime.now().isoformat()
    }
    
    log_metrics(metrics)
```

---

## **🎯 Chat Output Specifications**

### **Response Format**
```yaml
Format: Plain text with markdown support
Max Length: 2048 tokens (configurable)
Temperature: 0.7 default (0.0-2.0 range)
Top-p: 0.9 default (0.0-1.0 range)
Response Time: 1-15 seconds typical
Model: qwen_instruct (default) or qwen_base
```

### **Pure Inference Settings**
```python
PURE_INFERENCE_SETTINGS = {
    'max_tokens': 512,
    'temperature': 0.7,
    'top_p': 0.9,
    'model': 'qwen_instruct',
    'sfw_mode': False,
    'no_hardcoded_prompts': True,
    'edge_function_control': True
}
```

---

## **🚀 Future Enhancements**

### **Planned Improvements**
1. **Multi-character Roleplay**: Support for multiple characters in conversation
2. **Voice Integration**: Text-to-speech for roleplay responses
3. **Emotion Detection**: Detect and respond to user emotions
4. **Story Continuity**: Maintain story consistency across sessions

### **Integration Opportunities**
1. **Storyboard System**: Generate storyboards from chat conversations
2. **Character Creation**: Create character profiles from chat interactions
3. **Content Generation**: Generate images/videos based on chat scenarios

---

## **🔑 Environment Configuration**

### **Required Environment Variables**
```bash
SUPABASE_URL=              # Supabase database URL
SUPABASE_SERVICE_KEY=      # Supabase service key
UPSTASH_REDIS_REST_URL=    # Redis queue URL
UPSTASH_REDIS_REST_TOKEN=  # Redis authentication token
WAN_WORKER_API_KEY=        # API key for WAN worker authentication
HF_TOKEN=                  # Optional HuggingFace token
RUNPOD_POD_ID=             # RunPod pod ID for auto-registration
```

### **Optional Environment Variables**
```bash
QWEN_INSTRUCT_PATH=        # Override default Instruct model path
QWEN_BASE_PATH=            # Override default Base model path
```

### **RunPod Deployment**
- **Chat Worker URL:** `https://{RUNPOD_POD_ID}-7861.proxy.runpod.net`
- **Auto-Registration:** Detects `RUNPOD_POD_ID` and registers with Supabase
- **Health Monitoring:** Continuous status tracking via `/health` endpoints

---

## **🔧 Model Management Details**

### **Model Loading Process**
```python
def load_qwen_instruct_model(self, force=False):
    """Load Qwen Instruct model with memory management"""
    
    # Check memory availability
    if not self.check_memory_available(15):
        logger.warning("⚠️ Insufficient VRAM for Qwen Instruct model")
        return False
    
    # Load tokenizer and model
    self.qwen_instruct_tokenizer = AutoTokenizer.from_pretrained(
        self.instruct_model_path,
        trust_remote_code=True,
        local_files_only=True
    )
    
    self.qwen_instruct_model = AutoModelForCausalLM.from_pretrained(
        self.instruct_model_path,
        torch_dtype=torch.bfloat16,
        device_map="auto",
        trust_remote_code=True,
        local_files_only=True
    )
    
    # Store device and set to eval mode
    self.instruct_model_device = next(self.qwen_instruct_model.parameters()).device
    self.qwen_instruct_model.eval()
    
    # PyTorch 2.0 optimization
    try:
        self.qwen_instruct_model = torch.compile(self.qwen_instruct_model)
        logger.info("✅ PyTorch 2.0 compilation applied")
    except Exception as e:
        logger.info(f"ℹ️ PyTorch 2.0 compilation not available: {e}")
    
    # Validate model with test inference
    logger.info("🔍 Validating model with test inference...")
    test_input = self.qwen_instruct_tokenizer(["test"], return_tensors="pt")
    with torch.no_grad():
        _ = self.qwen_instruct_model(**test_input.to(self.instruct_model_device))
    logger.info("✅ Model validation successful")
```

### **Memory Status Monitoring**
```python
def log_gpu_memory(self):
    """Log current GPU memory usage"""
    if torch.cuda.is_available():
        allocated = torch.cuda.memory_allocated() / (1024**3)
        cached = torch.cuda.memory_reserved() / (1024**3)
        total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        logger.info(f"🔥 GPU Memory - Allocated: {allocated:.1f}GB, Cached: {cached:.1f}GB, Total: {total:.0f}GB")

def check_memory_available(self, required_gb=15):
    """Check if enough VRAM is available for model loading"""
    if not torch.cuda.is_available():
        return False
        
    total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    allocated = torch.cuda.memory_allocated() / (1024**3)
    available = total - allocated
    
    logger.info(f"🔍 Memory check: {available:.1f}GB available, {required_gb}GB required")
    return available >= required_gb
```

---

**Note**: This worker provides the foundation for natural conversation and roleplay capabilities with a pure inference engine architecture. The Qwen 2.5-7B Instruct model ensures high-quality, contextually appropriate responses while maintaining complete edge function control over all prompts and logic. The enhanced error handling, SFW filtering, and comprehensive monitoring make it production-ready for high-volume AI conversation workloads.
