# Chat Worker Documentation

**Last Updated:** January 2025  
**Status:** ✅ ACTIVE - Fully implemented for chat and roleplay

## **🎯 Overview**

The Chat Worker is responsible for chat functionality and roleplay using the Qwen 2.5-7B Instruct model. It's part of the triple worker system and provides natural conversation capabilities with NSFW-optimized responses.

### **Key Capabilities**
- **Chat Conversations**: Natural language chat with Qwen 2.5-7B Instruct
- **Roleplay**: Character-based roleplay scenarios
- **Storytelling**: Creative writing and story generation
- **Prompt Enhancement**: Assist with prompt creation and refinement
- **NSFW Content**: Unrestricted content generation

---

## **🔧 Technical Setup**

### **Model Configuration**
```python
# Qwen 2.5-7B Instruct Model Setup
MODEL_PATH = "/workspace/models/huggingface_cache/"
MODEL_NAME = "Qwen2.5-7B-Instruct"
VRAM_USAGE = "15GB"  # Peak usage during generation
MAX_CONCURRENT_JOBS = 8
```

### **Hardware Requirements**
- **GPU**: NVIDIA RTX 6000 ADA (48GB VRAM)
- **Memory**: 15GB VRAM peak usage
- **Storage**: Model files (~14GB)
- **Performance**: 5-15 seconds for chat responses

### **Worker Configuration**
```python
WORKER_CONFIG = {
    "chat": {
        "model_path": "/workspace/models/huggingface_cache/",
        "max_concurrent_jobs": 8,
        "memory_limit": 15,  # GB
        "polling_interval": 3,
        "job_types": ["chat_enhance", "chat_conversation", "chat_unrestricted"]
    }
}
```

---

## **💬 Chat Implementation**

### **Conversation Processing**

#### **Standard Chat**
```python
def process_chat_message(job_data):
    """Process standard chat messages"""
    
    # 1. Load model
    model = load_qwen_instruct_model()
    
    # 2. Build conversation context
    conversation = build_conversation_context(job_data['messages'])
    
    # 3. Generate response
    response = model.generate(
        messages=conversation,
        max_tokens=job_data.get('max_tokens', 500),
        temperature=job_data.get('temperature', 0.7),
        top_p=job_data.get('top_p', 0.9),
        do_sample=True
    )
    
    return response
```

#### **Roleplay Chat**
```python
def process_roleplay_message(job_data):
    """Process roleplay messages with character context"""
    
    # 1. Load model
    model = load_qwen_instruct_model()
    
    # 2. Build roleplay context
    roleplay_context = build_roleplay_context(
        character=job_data.get('character'),
        scenario=job_data.get('scenario'),
        messages=job_data.get('messages', [])
    )
    
    # 3. Generate roleplay response
    response = model.generate(
        messages=roleplay_context,
        max_tokens=job_data.get('max_tokens', 300),
        temperature=job_data.get('temperature', 0.8),
        top_p=job_data.get('top_p', 0.9),
        do_sample=True
    )
    
    return response
```

### **Context Building**

#### **Conversation Context**
```python
def build_conversation_context(messages):
    """Build conversation context for Qwen model"""
    
    conversation = []
    
    # Add system message
    system_message = {
        "role": "system",
        "content": "You are a helpful AI assistant for OurVidz, an adult content creation platform. You can help with creative writing, roleplay, and content generation. Be engaging and natural in your responses."
    }
    conversation.append(system_message)
    
    # Add conversation history
    for message in messages[-10:]:  # Last 10 messages for context
        conversation.append({
            "role": message.get('role', 'user'),
            "content": message.get('content', '')
        })
    
    return conversation
```

#### **Roleplay Context**
```python
def build_roleplay_context(character, scenario, messages):
    """Build roleplay context with character and scenario"""
    
    conversation = []
    
    # Add roleplay system message
    system_message = {
        "role": "system",
        "content": f"""You are roleplaying as {character} in the scenario: {scenario}.
        
        Stay in character at all times. Respond naturally and engagingly.
        Be descriptive and immersive in your responses.
        Keep responses concise but engaging."""
    }
    conversation.append(system_message)
    
    # Add conversation history
    for message in messages[-5:]:  # Last 5 messages for roleplay context
        conversation.append({
            "role": message.get('role', 'user'),
            "content": message.get('content', '')
        })
    
    return conversation
```

---

## **🎭 Roleplay System**

### **Character Management**
```python
def create_character_profile(character_data):
    """Create character profile for roleplay"""
    
    profile = {
        'name': character_data.get('name'),
        'personality': character_data.get('personality'),
        'appearance': character_data.get('appearance'),
        'background': character_data.get('background'),
        'speaking_style': character_data.get('speaking_style'),
        'scenarios': character_data.get('scenarios', [])
    }
    
    return profile
```

### **Scenario Generation**
```python
def generate_roleplay_scenario(character, scenario_type):
    """Generate roleplay scenario based on character and type"""
    
    scenarios = {
        'casual': f"Casual conversation with {character}",
        'romantic': f"Romantic scenario with {character}",
        'adventure': f"Adventure scenario with {character}",
        'intimate': f"Intimate scenario with {character}"
    }
    
    base_scenario = scenarios.get(scenario_type, scenarios['casual'])
    
    # Enhance scenario with character details
    enhanced_scenario = f"{base_scenario}. {character.get('personality', '')}"
    
    return enhanced_scenario
```

---

## **🔗 Frontend Integration**

### **Chat Interface**
```typescript
// Frontend chat message submission
const submitChatMessage = async (params: ChatParams) => {
  const jobData = {
    job_type: 'chat_conversation',
    messages: params.messages,
    max_tokens: params.maxTokens || 500,
    temperature: params.temperature || 0.7,
    top_p: params.topP || 0.9,
    
    // Roleplay specific parameters
    character: params.character,
    scenario: params.scenario,
    
    // Worker routing
    target_worker: 'chat'
  };
  
  return await queueJob(jobData);
};
```

### **Roleplay Interface**
```typescript
// Frontend roleplay message submission
const submitRoleplayMessage = async (params: RoleplayParams) => {
  const jobData = {
    job_type: 'chat_roleplay',
    messages: params.messages,
    character: params.character,
    scenario: params.scenario,
    max_tokens: params.maxTokens || 300,
    temperature: params.temperature || 0.8,
    top_p: params.topP || 0.9,
    
    // Worker routing
    target_worker: 'chat'
  };
  
  return await queueJob(jobData);
};
```

### **Real-time Updates**
```typescript
// Frontend real-time chat updates
const subscribeToChatUpdates = (conversationId: string) => {
  const callback = (update: ChatUpdate) => {
    // Update UI with new message
    updateChatUI({
      messageId: update.messageId,
      content: update.content,
      role: update.role,
      timestamp: update.timestamp
    });
  };
  
  return subscribeToConversation(conversationId, callback);
};
```

---

## **📊 Performance Optimization**

### **Memory Management**
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
    
    # Limit conversation history
    truncate_conversation_history()
```

### **Model Loading Strategy**
```python
class ChatWorker:
    def __init__(self):
        self.model = None
        self.model_loaded = False
    
    def ensure_model_loaded(self):
        """Ensure Qwen Instruct model is loaded"""
        if not self.model_loaded:
            self.model = load_qwen_instruct_model()
            self.model_loaded = True
```

### **Concurrent Processing**
```python
def manage_concurrent_chats():
    """Manage concurrent chat sessions"""
    
    max_concurrent = 8
    current_sessions = get_active_chat_sessions()
    
    if len(current_sessions) >= max_concurrent:
        # Queue additional requests
        return queue_chat_request()
    
    # Process immediately
    return process_chat_message()
```

---

## **🔍 Error Handling**

### **Common Issues**
```python
def handle_chat_errors(error, job_data):
    """Handle common chat worker errors"""
    
    if "CUDA out of memory" in str(error):
        # Clear memory and retry
        torch.cuda.empty_cache()
        return retry_chat_job(job_data)
    
    elif "Model not found" in str(error):
        # Reload model
        reload_qwen_model()
        return retry_chat_job(job_data)
    
    elif "Invalid input" in str(error):
        # Return error to frontend
        return {
            'error': 'Invalid input format',
            'job_id': job_data.get('job_id')
        }
    
    else:
        # Log unknown error
        log_error(error, job_data)
        return {
            'error': 'Chat processing failed',
            'job_id': job_data.get('job_id')
        }
```

### **Response Validation**
```python
def validate_chat_response(response):
    """Validate chat response quality"""
    
    # Check for empty responses
    if not response or len(response.strip()) < 10:
        return False, "Response too short"
    
    # Check for repetitive content
    if is_repetitive(response):
        return False, "Response too repetitive"
    
    # Check for inappropriate content (if needed)
    if contains_inappropriate_content(response):
        return False, "Inappropriate content detected"
    
    return True, "Valid response"
```

---

## **📈 Monitoring and Logging**

### **Performance Metrics**
```python
def log_chat_metrics(job_data, response_time, response_length):
    """Log chat worker performance metrics"""
    
    metrics = {
        'worker': 'chat',
        'job_type': job_data.get('job_type'),
        'response_time': response_time,
        'response_length': response_length,
        'conversation_length': len(job_data.get('messages', [])),
        'temperature': job_data.get('temperature'),
        'max_tokens': job_data.get('max_tokens'),
        'vram_usage': torch.cuda.memory_allocated() / 1024**3,
        'timestamp': datetime.now().isoformat()
    }
    
    log_metrics(metrics)
```

### **Quality Monitoring**
```python
def monitor_chat_quality(job_data, response):
    """Monitor chat response quality"""
    
    # Check response time
    if response.get('response_time', 0) > 20:  # seconds
        log_quality_issue('slow_chat_response', job_data, response)
    
    # Check response length
    if len(response.get('content', '')) < 50:
        log_quality_issue('short_chat_response', job_data, response)
    
    # Check for roleplay consistency
    if job_data.get('job_type') == 'chat_roleplay':
        if not is_in_character(response.get('content'), job_data.get('character')):
            log_quality_issue('out_of_character_response', job_data, response)
```

---

## **🎯 Chat Output Specifications**

### **Response Format**
```yaml
Format: Plain text with markdown support
Max Length: 500 tokens (configurable)
Temperature: 0.7 default (0.1-1.0 range)
Top-p: 0.9 default (0.1-1.0 range)
Response Time: 5-15 seconds typical
```

### **Roleplay Settings**
```python
ROLEPLAY_SETTINGS = {
    'max_tokens': 300,
    'temperature': 0.8,
    'top_p': 0.9,
    'character_consistency': True,
    'scenario_awareness': True
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

**Note**: This worker provides the foundation for natural conversation and roleplay capabilities. The Qwen 2.5-7B Instruct model ensures high-quality, contextually appropriate responses.
