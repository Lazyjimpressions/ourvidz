# OurVidz API Reference

**Last Updated:** July 16, 2025 at 5:05pm AM CST  
**Status:** ✅ Production Ready - All 10 Job Types Supported, Multi-Reference System Live  
**System:** Dual Worker (SDXL + WAN) on RTX 6000 ADA (48GB VRAM)

---

## **🎯 Core API Endpoints**

### **1. Queue Job (`/functions/v1/queue-job`)**

**Purpose:** Submit generation jobs to the worker queue system

**Method:** `POST`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "jobType": "sdxl_image_fast" | "sdxl_image_high" | "image_fast" | "image_high" | "video_fast" | "video_high" | "image7b_fast_enhanced" | "image7b_high_enhanced" | "video7b_fast_enhanced" | "video7b_high_enhanced",
  "metadata": {
    "prompt": "string",
    "num_images": 1 | 3 | 6,  // SDXL only - flexible quantities
    "seed": 123456789,        // Optional - for reproducible generation
    "reference_image_url": "string",  // Optional - for image-to-image
    "reference_type": "style" | "composition" | "character",  // Optional
    "reference_strength": 0.1-1.0,  // Optional - reference influence
    "credits": 1
  },
  "projectId": "uuid",        // Optional
  "videoId": "uuid",          // Optional - for video jobs
  "imageId": "uuid"           // Optional - for image jobs
}
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "uuid",
    "user_id": "uuid",
    "job_type": "string",
    "format": "image" | "video",
    "quality": "fast" | "high",
    "model_type": "string",
    "status": "queued",
    "metadata": {
      "model_variant": "lustify_sdxl" | "wan_2_1_1_3b",
      "queue": "sdxl_queue" | "wan_queue",
      "negative_prompt": "string",  // SDXL only
      "num_images": 1 | 3 | 6,
      "seed": 123456789,
      "expected_generation_time": 25-240,
      "content_type": "image" | "video",
      "file_extension": "png" | "mp4"
    }
  },
  "queueLength": 1,
  "modelVariant": "string",
  "isSDXL": true | false,
  "negativePromptSupported": true | false
}
```

**Key Features:**
- **Flexible SDXL Quantities**: 1, 3, or 6 images per batch
- **Enhanced Negative Prompts**: Automatic generation for SDXL jobs with multi-party scene detection
- **Seed Support**: Reproducible generation with user-controlled seeds
- **Reference Images**: Optional image-to-image generation with type and strength control
- **Dual Worker Routing**: Automatic queue selection (SDXL vs WAN)
- **Comprehensive Metadata**: Enhanced tracking and debugging information

### **2. Job Callback (`/functions/v1/job-callback`)**

**Purpose:** Worker callback endpoint for job status updates

**Method:** `POST`

**Authentication:** Service role key (internal)

**Request Body (Standardized):**
```json
{
  "job_id": "uuid",
  "status": "processing" | "completed" | "failed",
  "assets": ["url1", "url2", "url3"],  // Standardized array format
  "error_message": "string",           // Optional - for failed jobs
  "enhancedPrompt": "string",          // Optional - for image_high jobs
  "metadata": {
    "seed": 123456789,                 // Worker-generated seed
    "generation_time": 15.5,           // Actual generation time
    "num_images": 3                    // Number of images generated
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job callback processed successfully with standardized parameters",
  "debug": {
    "job_id": "uuid",
    "jobStatus": "completed",
    "jobType": "sdxl_image_fast",
    "format": "image",
    "quality": "fast",
    "isSDXL": true,
    "isEnhanced": false,
    "assetsProcessed": 3,
    "processingTimestamp": "2025-07-16T..."
  }
}
```

**Key Features:**
- **Standardized Parameters**: Consistent `job_id`, `assets` array across all workers
- **Metadata Preservation**: Merges worker metadata with existing job metadata
- **Enhanced Error Handling**: Comprehensive debugging and error tracking
- **Multi-Asset Support**: Handles multiple images/videos per job
- **Seed Tracking**: Stores and preserves generation seeds for reproducibility

---

## **🔄 Job Types & Capabilities**

### **SDXL Jobs (Phase 1)**
| Job Type | Format | Quality | Quantity | Reference | Seed | Negative Prompt |
|----------|--------|---------|----------|-----------|------|-----------------|
| `sdxl_image_fast` | Image | Fast | 1,3,6 | ✅ | ✅ | ✅ |
| `sdxl_image_high` | Image | High | 1,3,6 | ✅ | ✅ | ✅ |

### **WAN Jobs (Phase 2)**
| Job Type | Format | Quality | Quantity | Reference | Seed | Negative Prompt |
|----------|--------|---------|----------|-----------|------|-----------------|
| `image_fast` | Image | Fast | 1 | ✅ | ✅ | ❌ |
| `image_high` | Image | High | 1 | ✅ | ✅ | ❌ |
| `video_fast` | Video | Fast | 1 | ✅ | ✅ | ❌ |
| `video_high` | Video | High | 1 | ✅ | ✅ | ❌ |

### **Enhanced WAN Jobs (Phase 3)**
| Job Type | Format | Quality | Quantity | Reference | Seed | Negative Prompt |
|----------|--------|---------|----------|-----------|------|-----------------|
| `image7b_fast_enhanced` | Image | Fast | 1 | ✅ | ✅ | ❌ |
| `image7b_high_enhanced` | Image | High | 1 | ✅ | ✅ | ❌ |
| `video7b_fast_enhanced` | Video | Fast | 1 | ✅ | ✅ | ❌ |
| `video7b_high_enhanced` | Video | High | 1 | ✅ | ✅ | ❌ |

---

## **🎨 Reference Image System**

### **Reference Types**
- **Style**: Influences artistic style and visual treatment
- **Composition**: Guides layout, framing, and scene structure  
- **Character**: Maintains character appearance and features

### **Reference Parameters**
```json
{
  "reference_image_url": "https://storage.example.com/reference.jpg",
  "reference_type": "style" | "composition" | "character",
  "reference_strength": 0.1-1.0  // How much influence the reference has
}
```

**Note:** Reference images are optional enhancements. Jobs can be submitted without references.

---

## **🌱 Seed System**

### **Seed Parameters**
```json
{
  "seed": 123456789  // Integer for reproducible generation
}
```

**Benefits:**
- Reproducible results across generations
- Character consistency in multi-image batches
- A/B testing of different prompts with same seed

---

## **🚫 Enhanced Negative Prompts (SDXL Only)**

### **Automatic Generation**
The system automatically generates comprehensive negative prompts for SDXL jobs based on:

**Priority 1: Critical Quality**
- bad anatomy, extra limbs, deformed, missing limbs
- worst quality, low quality, normal quality, lowres

**Priority 2: Anatomical Accuracy**
- deformed hands, extra fingers, deformed face
- malformed, bad hands, bad fingers, missing fingers

**Priority 3: Technical Artifacts**
- text, watermark, logo, signature, contact info

**Priority 4: Style Prevention**
- anime, cartoon, graphic, render, cgi, 3d

**Priority 5: Multi-Party Scene Prevention**
- three girls, all girls, only girls, no male
- missing male, disembodied penis, floating penis

**Priority 6: Position Accuracy**
- wrong position, incorrect pose, impossible position
- unnatural pose, penis in wrong place

**Priority 7: NSFW Anatomical**
- deformed breasts, extra breasts, anatomical errors
- wrong anatomy, distorted bodies, unnatural poses

### **Smart Detection**
The system intelligently detects:
- Multi-party scenes (mixed gender groups)
- Explicit content requiring position accuracy
- NSFW content needing anatomical improvements

---

## **📊 Performance Metrics**

### **SDXL Performance (RTX 6000 ADA)**
- **1 Image**: 3-8 seconds
- **3 Images**: 9-24 seconds  
- **6 Images**: 18-48 seconds

### **WAN Performance**
- **Image Fast**: 25-40 seconds
- **Image High**: 40-100 seconds
- **Video Fast**: 135-180 seconds
- **Video High**: 180-240 seconds

### **Enhanced WAN Performance**
- **Image Fast Enhanced**: 85-100 seconds
- **Image High Enhanced**: 100-240 seconds
- **Video Fast Enhanced**: 195-240 seconds
- **Video High Enhanced**: 240+ seconds

---

## **🔧 Error Handling**

### **Standard Error Response**
```json
{
  "error": "Error description",
  "success": false,
  "details": "Additional error information",
  "debug": {
    "timestamp": "2025-07-16T...",
    "errorType": "ErrorClassName"
  }
}
```

### **Common Error Codes**
- `400`: Invalid job type or parameters
- `401`: Authentication required
- `500`: Server error or Redis configuration issue

---

## **📝 Legacy Compatibility**

### **Single Reference Support**
Legacy single-reference jobs are still supported:
```json
{
  "reference_image_url": "https://storage.example.com/reference.jpg"
}
```

### **Non-Reference Jobs**
Jobs without references work exactly as before:
```json
{
  "prompt": "Your prompt here",
  "num_images": 1
}
```

### **Backward Compatibility**
- All existing job types remain functional
- Legacy metadata fields are preserved
- Single-reference workflows continue to work
- Non-reference generation unchanged

---

## **🔄 Database Schema Updates**

### **Jobs Table**
```sql
-- Enhanced metadata fields
metadata JSONB {
  "model_variant": "lustify_sdxl" | "wan_2_1_1_3b",
  "queue": "sdxl_queue" | "wan_queue",
  "negative_prompt": "string",  -- SDXL only
  "seed": 123456789,
  "num_images": 1 | 3 | 6,
  "reference_image_url": "string",
  "reference_type": "style" | "composition" | "character",
  "reference_strength": 0.1-1.0,
  "generation_time": 15.5,
  "expected_generation_time": 25-240,
  "dual_worker_routing": true,
  "negative_prompt_supported": true | false,
  "edge_function_version": "2.1.0"
}
```

### **Images Table**
```sql
-- Enhanced metadata for multi-image support
metadata JSONB {
  "model_type": "sdxl" | "wan" | "enhanced-7b",
  "is_sdxl": true | false,
  "is_enhanced": true | false,
  "seed": 123456789,
  "generation_time": 15.5,
  "image_index": 0,  -- For multi-image batches
  "total_images": 3,
  "original_job_id": "uuid",
  "callback_processed_at": "2025-07-16T...",
  "callback_debug": {
    "job_type": "sdxl_image_fast",
    "primary_asset": "url",
    "received_assets": ["url1", "url2", "url3"],
    "processing_timestamp": "2025-07-16T..."
  }
}
```

### **Videos Table**
```sql
-- Enhanced metadata for video jobs
metadata JSONB {
  "model_type": "wan" | "enhanced-7b",
  "is_enhanced": true | false,
  "seed": 123456789,
  "generation_time": 180.5,
  "stored_path": "exact/path/from/worker",
  "bucket": "video_fast" | "video_high" | "video7b_fast_enhanced" | "video7b_high_enhanced",
  "path_consistency_fixed": true,
  "callback_processed_at": "2025-07-16T..."
}
```

---

## **🛠️ Storage Buckets**

### **SDXL Buckets**
- `sdxl_image_fast` - Fast SDXL image generation
- `sdxl_image_high` - High quality SDXL image generation

### **WAN Buckets**
- `image_fast` - Fast WAN image generation
- `image_high` - High quality WAN image generation
- `video_fast` - Fast WAN video generation
- `video_high` - High quality WAN video generation

### **Enhanced WAN Buckets**
- `image7b_fast_enhanced` - Enhanced fast image generation
- `image7b_high_enhanced` - Enhanced high quality image generation
- `video7b_fast_enhanced` - Enhanced fast video generation
- `video7b_high_enhanced` - Enhanced high quality video generation

### **Reference Image Buckets**
- `reference_images` - User-uploaded reference images
- `workspace_assets` - Workspace reference assets

---

## **📈 Usage Tracking**

### **Usage Logs Table**
```sql
-- Enhanced usage tracking
metadata JSONB {
  "job_id": "uuid",
  "project_id": "uuid",
  "image_id": "uuid",
  "video_id": "uuid",
  "model_type": "string",
  "model_variant": "lustify_sdxl" | "wan_2_1_1_3b",
  "queue": "sdxl_queue" | "wan_queue",
  "dual_worker_routing": true,
  "negative_prompt_supported": true | false,
  "usage_timestamp": "2025-07-16T..."
}
```

---

## **🔍 Debugging & Monitoring**

### **Enhanced Logging**
All API calls include comprehensive debugging information:
- Request/response timestamps
- Parameter validation results
- Worker routing decisions
- Metadata processing status
- Error context and stack traces

### **Callback Debugging**
Job callbacks include detailed processing information:
- Asset validation results
- Metadata merge operations
- Database update status
- Error handling outcomes

---

## **🚀 Recent Updates (July 16, 2025)**

### **Major Enhancements**
1. **Standardized Callback Parameters**: Consistent `job_id`, `assets` array across all workers
2. **Enhanced Negative Prompts**: Intelligent generation for SDXL with multi-party scene detection
3. **Flexible SDXL Quantities**: User-selectable 1, 3, or 6 images per batch
4. **Seed Support**: Reproducible generation with user-controlled seeds
5. **Reference Image System**: Optional image-to-image with type and strength control
6. **Comprehensive Error Handling**: Enhanced debugging and error tracking
7. **Metadata Consistency**: Improved data flow and storage

### **Performance Improvements**
- Optimized batch processing for multi-image SDXL jobs
- Enhanced error recovery and retry mechanisms
- Improved Redis queue management
- Better resource utilization tracking

### **Developer Experience**
- Enhanced API documentation and examples
- Comprehensive debugging information
- Backward compatibility preservation
- Clear error messages and status codes 