# OurVidz Performance Testing Script

**Last Updated:** July 7, 2025  
**Purpose:** Systematic testing of all 10 job types with master prompting guide optimization  
**Test Scenario:** Sexually explicit adult content - Two gorgeous petite Asian models

---

## **🚀 Testing Execution Guide**

### **Prerequisites**
- Valid authentication token
- Access to OurVidz API endpoints
- Performance monitoring tools
- Quality assessment framework

---

## **📋 Test Execution Commands**

### **Phase 1: SDXL Image Generation (High Priority)**

#### **Test 1: sdxl_image_fast (Unrestricted Tier)**
```bash
curl -X POST "https://your-domain.supabase.co/functions/v1/queue-job" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "sdxl_image_fast",
    "metadata": {
      "prompt": "score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, highly detailed, two gorgeous petite asian models, perfect anatomy, natural curves, intimate photo shoot, passionate love scene, intimate moment, soft natural lighting, professional photography, shot on Canon EOS R5, f/1.8, shallow depth of field, warm atmosphere, anatomically accurate, professional adult content",
      "credits": 1,
      "test_phase": "phase1_sdxl_fast",
      "test_scenario": "sexually_explicit_adult_content"
    }
  }'
```

**Expected Results:**
- Generation Time: ~29.9s
- Output: 6 high-quality 1024x1024 PNG images
- Quality: Excellent anatomical accuracy
- Success Rate: 100%

#### **Test 2: sdxl_image_high (Unrestricted Tier)**
```bash
curl -X POST "https://your-domain.supabase.co/functions/v1/queue-job" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "sdxl_image_high",
    "metadata": {
      "prompt": "score_9, score_8_up, unrestricted nsfw, masterpiece, best quality, highly detailed, two gorgeous petite asian models, perfect anatomy, natural curves, intimate photo shoot, passionate love scene, intimate moment, soft natural lighting, professional photography, shot on Canon EOS R5, f/1.8, shallow depth of field, warm atmosphere, anatomically accurate, professional adult content, maximum realism",
      "credits": 1,
      "test_phase": "phase1_sdxl_high",
      "test_scenario": "sexually_explicit_adult_content"
    }
  }'
```

**Expected Results:**
- Generation Time: ~42.4s
- Output: 6 premium 1024x1024 PNG images
- Quality: Premium anatomical accuracy
- Success Rate: 100%

---

### **Phase 2: WAN Video Generation (High Priority)**

#### **Test 3: video_fast (Artistic Tier)**
```bash
curl -X POST "https://your-domain.supabase.co/functions/v1/queue-job" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "video_fast",
    "metadata": {
      "prompt": "two gorgeous petite asian models, intimate photo shoot, passionate love scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera movement, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, shallow depth of field",
      "credits": 1,
      "test_phase": "phase2_video_fast",
      "test_scenario": "sexually_explicit_adult_content"
    }
  }'
```

**Expected Results:**
- Generation Time: ~251.5s (4m 11s)
- Output: 1 MP4 video (5s duration, 480x832)
- Quality: Good anatomical accuracy
- Success Rate: 95%

#### **Test 4: video_high (Artistic Tier)**
```bash
curl -X POST "https://your-domain.supabase.co/functions/v1/queue-job" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "video_high",
    "metadata": {
      "prompt": "two gorgeous petite asian models, intimate photo shoot, passionate love scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, romantic setting, high quality video, professional cinematography, tasteful composition, emotional connection",
      "credits": 1,
      "test_phase": "phase2_video_high",
      "test_scenario": "sexually_explicit_adult_content"
    }
  }'
```

**Expected Results:**
- Generation Time: ~359.7s (6m)
- Output: 1 MP4 video (6s duration, 480x832)
- Quality: Better anatomical accuracy
- Success Rate: 95%

#### **Test 5: video7b_fast_enhanced (Explicit Tier)**
```bash
curl -X POST "https://your-domain.supabase.co/functions/v1/queue-job" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "video7b_fast_enhanced",
    "metadata": {
      "prompt": "two gorgeous petite asian models intimate photo shoot passionate love scene",
      "credits": 1,
      "test_phase": "phase2_video7b_fast_enhanced",
      "test_scenario": "sexually_explicit_adult_content"
    }
  }'
```

**Expected Results:**
- Generation Time: ~263.9s (4m 24s)
- Output: 1 enhanced MP4 video (5s duration, 480x832)
- Quality: Enhanced anatomical accuracy (Qwen enhanced)
- Success Rate: 95%

#### **Test 6: video7b_high_enhanced (Explicit Tier)**
```bash
curl -X POST "https://your-domain.supabase.co/functions/v1/queue-job" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "video7b_high_enhanced",
    "metadata": {
      "prompt": "two gorgeous petite asian models intimate photo shoot passionate love scene",
      "credits": 1,
      "test_phase": "phase2_video7b_high_enhanced",
      "test_scenario": "sexually_explicit_adult_content"
    }
  }'
```

**Expected Results:**
- Generation Time: ~370.0s (6m 10s)
- Output: 1 enhanced MP4 video (6s duration, 480x832)
- Quality: Enhanced anatomical accuracy (Qwen enhanced)
- Success Rate: 95%

---

### **Phase 3: WAN Image Generation (Medium Priority)**

#### **Test 7: image_fast (Artistic Tier)**
```bash
curl -X POST "https://your-domain.supabase.co/functions/v1/queue-job" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "image_fast",
    "metadata": {
      "prompt": "two gorgeous petite asian models, intimate photo shoot, passionate love scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera movement, temporal consistency, natural body movement, elegant gestures, high quality video, tasteful composition, professional cinematography, shallow depth of field",
      "credits": 1,
      "test_phase": "phase3_image_fast",
      "test_scenario": "sexually_explicit_adult_content"
    }
  }'
```

**Expected Results:**
- Generation Time: ~73s
- Output: 1 PNG image (480x832)
- Quality: Good anatomical accuracy
- Success Rate: 90%

#### **Test 8: image_high (Artistic Tier)**
```bash
curl -X POST "https://your-domain.supabase.co/functions/v1/queue-job" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "image_high",
    "metadata": {
      "prompt": "two gorgeous petite asian models, intimate photo shoot, passionate love scene, smooth motion, fluid movement, sensual atmosphere, soft lighting, intimate setting, stable camera, temporal consistency, natural body movement, romantic setting, high quality video, professional cinematography, tasteful composition, emotional connection",
      "credits": 1,
      "test_phase": "phase3_image_high",
      "test_scenario": "sexually_explicit_adult_content"
    }
  }'
```

**Expected Results:**
- Generation Time: ~90s
- Output: 1 PNG image (480x832)
- Quality: Better anatomical accuracy
- Success Rate: 90%

#### **Test 9: image7b_fast_enhanced (Explicit Tier)**
```bash
curl -X POST "https://your-domain.supabase.co/functions/v1/queue-job" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "image7b_fast_enhanced",
    "metadata": {
      "prompt": "two gorgeous petite asian models intimate photo shoot passionate love scene",
      "credits": 1,
      "test_phase": "phase3_image7b_fast_enhanced",
      "test_scenario": "sexually_explicit_adult_content"
    }
  }'
```

**Expected Results:**
- Generation Time: ~233.5s
- Output: 1 enhanced PNG image (480x832)
- Quality: Enhanced anatomical accuracy (Qwen enhanced)
- Success Rate: 90%

#### **Test 10: image7b_high_enhanced (Explicit Tier)**
```bash
curl -X POST "https://your-domain.supabase.co/functions/v1/queue-job" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "image7b_high_enhanced",
    "metadata": {
      "prompt": "two gorgeous petite asian models intimate photo shoot passionate love scene",
      "credits": 1,
      "test_phase": "phase3_image7b_high_enhanced",
      "test_scenario": "sexually_explicit_adult_content"
    }
  }'
```

**Expected Results:**
- Generation Time: ~104s
- Output: 1 enhanced PNG image (480x832)
- Quality: Enhanced anatomical accuracy (Qwen enhanced)
- Success Rate: 90%

---

## **📊 Job Status Monitoring**

### **Status Check Command**
```bash
# Replace JOB_ID with the actual job ID returned from the queue-job response
curl -X GET "https://your-domain.supabase.co/functions/v1/jobs/JOB_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Expected Status Flow**
```yaml
queued → processing → completed/failed
```

### **Monitoring Script**
```javascript
// JavaScript monitoring script
async function monitorJob(jobId, token) {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`https://your-domain.supabase.co/functions/v1/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const job = await response.json();
      console.log(`Job ${jobId}: ${job.status}`);
      
      if (job.status === 'completed') {
        clearInterval(interval);
        console.log('✅ Job completed successfully!');
        console.log('Assets:', job.metadata.primary_asset);
        if (job.metadata.all_assets) {
          console.log('All assets:', job.metadata.all_assets);
        }
      } else if (job.status === 'failed') {
        clearInterval(interval);
        console.log('❌ Job failed:', job.error_message);
      }
    } catch (error) {
      console.error('Error monitoring job:', error);
    }
  }, 2000); // Check every 2 seconds
}
```

---

## **🔍 Quality Assessment Checklist**

### **For Each Completed Job, Evaluate:**

#### **Anatomical Accuracy (1-5 Scale)**
- [ ] Perfect anatomical proportions (5.0)
- [ ] Natural body curves and features (4.0+)
- [ ] Professional adult content quality (4.0+)
- [ ] No deformities or artifacts (4.0+)
- [ ] Realistic skin texture and lighting (4.0+)

#### **Technical Quality (1-5 Scale)**
- [ ] Perfect resolution and clarity (5.0)
- [ ] Professional production values (4.0+)
- [ ] No technical artifacts (4.0+)
- [ ] Optimal file size and compression (4.0+)

#### **NSFW Content Quality**
- [ ] Appropriate anatomical accuracy for adult content
- [ ] Professional production values
- [ ] Tasteful composition and lighting
- [ ] Emotional connection and atmosphere
- [ ] Realistic intimate scene portrayal

#### **Model-Specific Criteria**

**SDXL Jobs:**
- [ ] 6 high-quality images generated
- [ ] Consistent quality across all images
- [ ] Professional photography aesthetic
- [ ] Excellent anatomical accuracy

**WAN Video Jobs:**
- [ ] Stable motion throughout video
- [ ] Consistent lighting and exposure
- [ ] Smooth camera movement
- [ ] Temporal consistency

**Enhanced Jobs:**
- [ ] Superior prompt enhancement quality
- [ ] Professional cinematic descriptions
- [ ] Enhanced anatomical accuracy
- [ ] Advanced production values

---

## **📈 Performance Tracking**

### **Data Collection Template**
```yaml
Test Results Template:
  Job Type: [job_type]
  Test Phase: [phase_number]
  Start Time: [timestamp]
  End Time: [timestamp]
  Generation Time: [duration]
  Status: [completed/failed]
  Quality Score: [1-5]
  Anatomical Accuracy: [1-5]
  Technical Quality: [1-5]
  File Size: [size in MB]
  Resolution: [width x height]
  Notes: [observations]
```

### **Performance Metrics to Track**
```yaml
Success Rate: Percentage of successful jobs
Average Generation Time: Mean time per job type
Quality Distribution: Score distribution across jobs
File Size Optimization: Compression efficiency
Anatomical Accuracy: NSFW content quality
Technical Artifacts: Presence of artifacts
```

---

## **🚨 Troubleshooting**

### **Common Issues and Solutions**

#### **Job Creation Failures**
```yaml
Issue: Invalid job type
Solution: Verify job type spelling and check valid types list

Issue: Authentication failed
Solution: Check token validity and permissions

Issue: Redis queue full
Solution: Wait and retry, or check worker status
```

#### **Job Processing Failures**
```yaml
Issue: Model loading failed
Solution: Check worker GPU memory and restart if needed

Issue: Generation timeout
Solution: Check worker performance and queue depth

Issue: Storage upload failed
Solution: Verify storage bucket permissions and space
```

#### **Quality Issues**
```yaml
Issue: Poor anatomical accuracy
Solution: Review prompt optimization and negative prompts

Issue: Technical artifacts
Solution: Check model parameters and generation settings

Issue: Inconsistent quality
Solution: Verify model loading and memory management
```

---

## **📋 Testing Checklist**

### **Pre-Testing Setup**
- [ ] Verify authentication token
- [ ] Check API endpoint availability
- [ ] Confirm worker status
- [ ] Prepare monitoring tools
- [ ] Set up quality assessment framework

### **Testing Execution**
- [ ] Execute Phase 1 (SDXL) tests
- [ ] Monitor and record results
- [ ] Execute Phase 2 (WAN Video) tests
- [ ] Monitor and record results
- [ ] Execute Phase 3 (WAN Image) tests
- [ ] Monitor and record results

### **Post-Testing Analysis**
- [ ] Compile performance data
- [ ] Assess quality scores
- [ ] Identify optimization opportunities
- [ ] Update performance documentation
- [ ] Plan follow-up testing

---

**This script provides everything needed to execute comprehensive performance testing across all 10 job types with master prompting guide optimization for sexually explicit adult content.** 