# Unified Model Testing Plan

## Overview
This comprehensive testing plan establishes a unified framework for testing all AI models (SDXL, WAN, LoRA) with consistent methodology, quality metrics, and tracking systems.

## Database Architecture

### Unified Table Structure
```sql
model_test_results (
  -- Core Fields
  model_type: 'SDXL' | 'WAN' | 'LORA'
  model_version: Specific version info
  prompt_text: The actual prompt used
  
  -- Quality Metrics (Universal)
  overall_quality: 1-10 scale
  technical_quality: 1-10 scale  
  content_quality: 1-10 scale
  consistency: 1-10 scale
  
  -- Flexible Metadata (JSONB)
  test_metadata: Model-specific data
  test_series: Testing series name
  test_tier: Content tier (artistic/explicit/unrestricted)
  test_category: Specific test category
)
```

### Model-Specific Metadata Structure
```json
// SDXL Metadata
{
  "tier": "artistic|explicit|unrestricted",
  "series": "couples-intimacy|shower-bath|bedroom|multi-person",
  "token_count": 75,
  "anatomical_accuracy": 8,
  "nsfw_content_level": 3,
  "quality_tags": ["score_9", "score_8_up", "masterpiece"]
}

// WAN Metadata  
{
  "tier": "artistic|explicit|unrestricted",
  "series": "couples-motion|shower-motion|bedroom-motion|group-motion",
  "token_count": 100,
  "motion_quality": 8,
  "temporal_consistency": 9,
  "enhancement_used": true,
  "enhancement_model": "qwen-7b"
}

// LoRA Metadata (Future)
{
  "lora_name": "custom-style-1",
  "lora_strength": 0.8,
  "base_model": "SDXL",
  "style_category": "anime|realistic|artistic",
  "training_data": "custom-dataset-1"
}
```

---

## Testing Framework

### 1. SDXL LUSTIFY Testing

#### Test Series Structure
```yaml
Series 1: Couples Intimacy Progression
  - Artistic Tier: Romantic, tasteful content
  - Explicit Tier: Direct, anatomical content  
  - Unrestricted Tier: Maximum explicit content

Series 2: Shower/Bath Scenes
  - Artistic Tier: Steamy, intimate atmosphere
  - Explicit Tier: Wet, sensual content
  - Unrestricted Tier: Maximum wet content

Series 3: Bedroom Intimacy
  - Artistic Tier: Soft lighting, romantic
  - Explicit Tier: Passionate, detailed
  - Unrestricted Tier: Maximum bedroom content

Series 4: Multi-Person Scenes
  - Artistic Tier: Group intimacy, tasteful
  - Explicit Tier: Multi-person interactions
  - Unrestricted Tier: Maximum group content
```

#### SDXL Quality Metrics
```yaml
Overall Quality (1-10):
  - Technical execution and artistic merit
  - Composition, lighting, color grading
  - Professional photography standards

Technical Quality (1-10):
  - Resolution and detail quality
  - No artifacts or distortions
  - Proper file format and compression

Content Quality (1-10):
  - Anatomical accuracy
  - NSFW content appropriateness
  - Emotional expression and realism

Consistency (1-10):
  - Reliability across multiple generations
  - Stable quality with same prompt
  - Predictable results
```

### 2. WAN 2.1 Testing

#### Test Series Structure
```yaml
Series 1: Couples Motion Testing
  - Artistic Tier: Smooth romantic motion
  - Explicit Tier: Passionate motion sequences
  - Unrestricted Tier: Maximum motion content

Series 2: Shower Motion Scenes
  - Artistic Tier: Steamy motion atmosphere
  - Explicit Tier: Wet motion interactions
  - Unrestricted Tier: Maximum wet motion

Series 3: Bedroom Motion
  - Artistic Tier: Intimate motion sequences
  - Explicit Tier: Passionate motion content
  - Unrestricted Tier: Maximum bedroom motion

Series 4: Group Motion Scenes
  - Artistic Tier: Multi-person motion
  - Explicit Tier: Group motion interactions
  - Unrestricted Tier: Maximum group motion
```

#### WAN Quality Metrics
```yaml
Overall Quality (1-10):
  - Cinematic quality and production value
  - Motion fluidity and natural movement
  - Professional video standards

Technical Quality (1-10):
  - Video resolution and compression
  - Frame rate consistency
  - No motion artifacts or glitches

Content Quality (1-10):
  - Motion anatomical accuracy
  - NSFW motion appropriateness
  - Emotional motion expression

Consistency (1-10):
  - Temporal consistency across frames
  - Stable motion quality
  - Predictable motion results
```

### 3. LoRA Model Testing (Future)

#### Test Series Structure
```yaml
Series 1: Style Transfer Testing
  - Base Model: SDXL with LoRA
  - Style Categories: Anime, Realistic, Artistic
  - Strength Testing: 0.1 to 1.0 increments

Series 2: Content Enhancement
  - Base Model: SDXL with Content LoRA
  - Enhancement Types: Anatomy, Style, Quality
  - Combination Testing: Multiple LoRAs

Series 3: Custom Training Validation
  - Base Model: SDXL with Custom LoRA
  - Training Data Validation
  - Overfitting Detection
```

#### LoRA Quality Metrics
```yaml
Overall Quality (1-10):
  - Style transfer effectiveness
  - Quality preservation
  - Artistic enhancement

Technical Quality (1-10):
  - LoRA integration stability
  - No artifacts from LoRA
  - Performance impact assessment

Content Quality (1-10):
  - Style accuracy
  - Content appropriateness
  - Enhancement effectiveness

Consistency (1-10):
  - LoRA reliability across prompts
  - Stable enhancement quality
  - Predictable style application
```

---

## Testing Protocol

### Standard Testing Workflow
```yaml
1. Test Setup:
   - Select model type (SDXL/WAN/LoRA)
   - Choose test series and tier
   - Generate test prompt
   - Set generation parameters

2. Generation:
   - Submit prompt to generation API
   - Record generation time and parameters
   - Capture output file (image/video)
   - Store file metadata

3. Quality Assessment:
   - Rate overall quality (1-10)
   - Rate technical quality (1-10)
   - Rate content quality (1-10)
   - Rate consistency (1-10)
   - Add detailed notes

4. Result Storage:
   - Save to model_test_results table
   - Link to generated content
   - Store model-specific metadata
   - Update analytics
```

### Batch Testing Strategy
```yaml
Per Series Testing:
  - Generate 3-5 variations per prompt
  - Test all tiers (artistic → explicit → unrestricted)
  - Complete all 4 series per model
  - Document quality degradation patterns

Cross-Model Comparison:
  - Same prompts across different models
  - Quality comparison analysis
  - Performance benchmarking
  - Best practice identification
```

---

## Analytics and Reporting

### Quality Tracking
```yaml
Quality Trends:
  - Average quality by model type
  - Quality degradation by tier
  - Performance over time
  - Model comparison metrics

Performance Metrics:
  - Generation time analysis
  - Success rate tracking
  - File size optimization
  - Resource usage patterns
```

### Baseline Establishment
```yaml
SDXL Baselines:
  - Artistic Tier: Target 8-9/10 quality
  - Explicit Tier: Target 7-8/10 quality
  - Unrestricted Tier: Target 6-7/10 quality

WAN Baselines:
  - Artistic Tier: Target 7-8/10 quality
  - Explicit Tier: Target 6-7/10 quality
  - Unrestricted Tier: Target 5-6/10 quality

LoRA Baselines (Future):
  - Style Transfer: Target 8-9/10 quality
  - Content Enhancement: Target 7-8/10 quality
  - Custom Training: Target 6-8/10 quality
```

---

## Implementation Timeline

### Phase 1: SDXL Testing (Week 1-2)
- [ ] Database migration deployment
- [ ] SDXL testing UI implementation
- [ ] 4-series testing completion
- [ ] Baseline establishment

### Phase 2: WAN Testing (Week 3-4)
- [ ] WAN testing UI enhancement
- [ ] Motion quality assessment
- [ ] Enhanced model testing
- [ ] Video quality baselines

### Phase 3: LoRA Integration (Future)
- [ ] LoRA testing framework
- [ ] Style transfer validation
- [ ] Custom training testing
- [ ] Advanced analytics

### Phase 4: Advanced Analytics (Ongoing)
- [ ] Cross-model comparison
- [ ] Performance optimization
- [ ] Quality prediction models
- [ ] Automated testing

---

## Success Criteria

### Quality Targets
```yaml
SDXL Targets:
  - Artistic Tier: >8/10 average quality
  - Explicit Tier: >7/10 average quality
  - Unrestricted Tier: >6/10 average quality

WAN Targets:
  - Artistic Tier: >7/10 average quality
  - Explicit Tier: >6/10 average quality
  - Unrestricted Tier: >5/10 average quality

Overall Targets:
  - 95% test completion rate
  - <2% generation failures
  - <5% data quality issues
  - >90% user satisfaction
```

### Performance Targets
```yaml
Generation Efficiency:
  - SDXL: <60s average generation time
  - WAN: <300s average generation time
  - LoRA: <90s average generation time

Data Management:
  - <1s query response time
  - <100MB total test data
  - 99.9% data integrity
  - Automated backup system
```

This unified testing plan provides a comprehensive framework for establishing quality baselines across all AI models while maintaining flexibility for future enhancements and LoRA integration. 