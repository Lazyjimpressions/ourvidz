# OurVidz Deployment Guide

**Last Updated:** July 8, 2025 at 10:26 AM CST  
**Status:** ✅ Production Ready - 9/10 Job Types Verified  
**System:** Dual Worker (SDXL + WAN) on RTX 6000 ADA (48GB VRAM)

---

## **🚀 Production Deployment Status**

### **✅ Currently Deployed**
- **Frontend**: Lovable (https://ourvidz.lovable.app/)
- **Backend**: Supabase production environment
- **Workers**: RunPod RTX 6000 ADA (48GB VRAM)
- **Storage**: 12 buckets configured with RLS policies
- **Authentication**: Fully implemented with admin roles

### **📊 Deployment Metrics**
```yaml
Uptime: >99% (production)
Response Time: <500ms (API endpoints)
Job Success Rate: >95% (tested job types)
Storage Availability: 100%
Authentication: Fully operational
```

---

## **🏗️ Infrastructure Overview**

### **Frontend Deployment (Lovable)**
```yaml
Platform: Lovable
URL: https://ourvidz.lovable.app/
Framework: React 18.x + TypeScript + Vite
Styling: Tailwind CSS + shadcn/ui
Build Tool: Vite 5.4.1
Status: ✅ Production deployed

Environment Variables:
  VITE_SUPABASE_URL: [prod-supabase-url]
  VITE_SUPABASE_ANON_KEY: [prod-anon-key]
  VITE_API_BASE_URL: https://ourvidz.lovable.app/
```

### **Backend Deployment (Supabase)**
```yaml
Platform: Supabase
Database: PostgreSQL 15.8
Storage: Object storage with CDN
Auth: Built-in authentication system
Edge Functions: Deno runtime
Status: ✅ Production operational

Environment Variables:
  SUPABASE_URL: [prod-supabase-url]
  SUPABASE_ANON_KEY: [prod-anon-key]
  SUPABASE_SERVICE_KEY: [prod-service-key]
```

### **Worker Deployment (RunPod)**
```yaml
Platform: RunPod
Instance: RTX 6000 ADA (48GB VRAM)
OS: Ubuntu 22.04 LTS
Storage: 100GB SSD + 100GB Network Volume
Status: ✅ Production operational

Environment Variables:
  SUPABASE_URL: [prod-supabase-url]
  SUPABASE_SERVICE_KEY: [prod-service-key]
  UPSTASH_REDIS_REST_URL: [prod-redis-url]
  UPSTASH_REDIS_REST_TOKEN: [prod-redis-token]
  HF_HOME: /workspace/models/huggingface_cache
  PYTHONPATH: /workspace/python_deps/lib/python3.11/site-packages
```

### **Queue System (Upstash Redis)**
```yaml
Provider: Upstash Redis
Plan: Free Tier (10,000 requests/day)
Region: us-east-1
Database: Redis 7.0
Status: ✅ Production operational

Queues:
  sdxl_queue: SDXL job processing (2s polling)
  wan_queue: WAN job processing (5s polling)
```

---

## **🔧 Deployment Process**

### **Frontend Deployment (Lovable)**

#### **1. Build Process**
```bash
# Install dependencies
npm install

# Build for production
npm run build

# The build output is in the dist/ directory
```

#### **2. Environment Configuration**
```bash
# Production environment variables
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key-for-frontend]
VITE_API_BASE_URL=https://ourvidz.lovable.app/
```

#### **3. Deployment Steps**
1. **Connect Repository**: Link GitHub repository to Lovable
2. **Configure Build**: Set build command to `npm run build`
3. **Set Environment Variables**: Configure production environment variables
4. **Deploy**: Trigger deployment from Lovable dashboard
5. **Verify**: Check deployment status and functionality

### **Backend Deployment (Supabase)**

#### **1. Database Setup**
```sql
-- Run migrations in order
-- All migrations are in supabase/migrations/
-- Supabase automatically applies migrations on deployment
```

#### **2. Storage Buckets Configuration**
```yaml
# All 12 buckets must be created with proper RLS policies
SDXL Buckets:
  - sdxl_image_fast (5MB limit, private)
  - sdxl_image_high (10MB limit, private)

WAN Standard Buckets:
  - image_fast (5MB limit, private)
  - image_high (10MB limit, private)
  - video_fast (50MB limit, private)
  - video_high (200MB limit, private)

WAN Enhanced Buckets:
  - image7b_fast_enhanced (20MB limit, private)
  - image7b_high_enhanced (20MB limit, private)
  - video7b_fast_enhanced (100MB limit, private)
  - video7b_high_enhanced (100MB limit, private)

Public Buckets:
  - videos (no limit, public)
  - system_assets (5MB limit, public)
```

#### **3. Edge Functions Deployment**
```bash
# Deploy edge functions
supabase functions deploy queue-job
supabase functions deploy job-callback
supabase functions deploy generate-admin-image

# Set environment variables for edge functions
supabase secrets set UPSTASH_REDIS_REST_URL=[redis-url]
supabase secrets set UPSTASH_REDIS_REST_TOKEN=[redis-token]
```

### **Worker Deployment (RunPod)**

#### **1. Instance Setup**
```yaml
Instance Configuration:
  GPU: RTX 6000 ADA (48GB VRAM)
  CPU: 8 vCPUs
  RAM: 32GB
  Storage: 100GB SSD + 100GB Network Volume
  OS: Ubuntu 22.04 LTS
```

#### **2. Environment Preparation**
```bash
# Set up Python environment
python --version  # Should be 3.11.10
pip --version     # Should be latest

# Verify PyTorch installation
python -c "
import torch
print(f'PyTorch: {torch.__version__}')
print(f'CUDA: {torch.version.cuda}')
print(f'CUDA Available: {torch.cuda.is_available()}')
"
```

#### **3. Model Storage Setup**
```bash
# Mount network volume
# Models should be stored in /workspace/models/
# Structure:
/workspace/models/
├── huggingface_cache/     # Qwen models
├── wan2.1-t2v-1.3b/      # WAN 2.1 model
└── sdxl-lustify/         # SDXL model

# Verify model storage
ls -la /workspace/models/
du -sh /workspace/models/*  # Should show ~48GB total
```

#### **4. Worker Code Deployment**
```bash
# Clone worker repository
cd /workspace
git clone https://github.com/Lazyjimpressions/ourvidz-worker.git
cd ourvidz-worker

# Set environment variables
export SUPABASE_URL=[prod-supabase-url]
export SUPABASE_SERVICE_KEY=[prod-service-key]
export UPSTASH_REDIS_REST_URL=[prod-redis-url]
export UPSTASH_REDIS_REST_TOKEN=[prod-redis-token]
export HF_HOME=/workspace/models/huggingface_cache
export PYTHONPATH=/workspace/python_deps/lib/python3.11/site-packages:$PYTHONPATH

# Test worker startup
python -c "
import sys
sys.path.append('/workspace/python_deps/lib/python3.11/site-packages')
try:
    import easydict, omegaconf, diffusers, transformers
    print('✅ All dependencies available')
except ImportError as e:
    print(f'❌ Missing dependency: {e}')
"

# Start workers
python dual_orchestrator.py
```

---

## **🔍 Deployment Verification**

### **Frontend Verification**
```yaml
Checklist:
  - [ ] Site loads at https://ourvidz.lovable.app/
  - [ ] Authentication works (sign up/sign in)
  - [ ] All 10 job types available in UI
  - [ ] Job creation works
  - [ ] Asset display works
  - [ ] Mobile responsiveness
  - [ ] Error handling works
```

### **Backend Verification**
```yaml
Database Checks:
  - [ ] All tables created with proper schema
  - [ ] RLS policies working
  - [ ] User authentication working
  - [ ] Job creation in database

Storage Checks:
  - [ ] All 12 buckets created
  - [ ] File uploads working
  - [ ] File downloads working
  - [ ] RLS policies on buckets

Edge Functions:
  - [ ] queue-job function responding
  - [ ] job-callback function responding
  - [ ] generate-admin-image function responding
  - [ ] Redis queue integration working
```

### **Worker Verification**
```yaml
System Checks:
  - [ ] PyTorch 2.4.1+cu124 working
  - [ ] CUDA 12.4 available
  - [ ] All models loaded successfully
  - [ ] Dependencies available

Worker Checks:
  - [ ] SDXL worker starting
  - [ ] WAN worker starting
  - [ ] Queue polling working
  - [ ] Job processing working
  - [ ] File uploads working

Performance Checks:
  - [ ] SDXL jobs completing in expected time
  - [ ] WAN jobs completing in expected time
  - [ ] Memory usage within limits
  - [ ] No memory leaks
```

---

## **🚨 Troubleshooting**

### **Common Deployment Issues**

#### **Frontend Issues**
```yaml
Build Failures:
  - Check Node.js version (should be 18+)
  - Verify all dependencies installed
  - Check environment variables
  - Review build logs for errors

Runtime Errors:
  - Check browser console for errors
  - Verify API endpoints responding
  - Check authentication flow
  - Test on different browsers
```

#### **Backend Issues**
```yaml
Database Issues:
  - Check Supabase project status
  - Verify RLS policies
  - Check migration status
  - Review error logs

Storage Issues:
  - Verify bucket permissions
  - Check file size limits
  - Test upload/download
  - Review storage policies

Edge Function Issues:
  - Check function logs
  - Verify environment variables
  - Test function endpoints
  - Check Redis connectivity
```

#### **Worker Issues**
```yaml
Startup Issues:
  - Check PyTorch version compatibility
  - Verify CUDA installation
  - Check model file integrity
  - Review dependency installation

Runtime Issues:
  - Monitor GPU memory usage
  - Check queue connectivity
  - Review error logs
  - Test job processing
```

### **Performance Issues**
```yaml
Slow Generation:
  - Check GPU utilization
  - Monitor memory usage
  - Verify model loading
  - Check queue depth

High Error Rates:
  - Review error logs
  - Check system resources
  - Verify network connectivity
  - Test individual components
```

---

## **📊 Monitoring & Alerting**

### **System Monitoring**
```yaml
Frontend Monitoring:
  - Uptime monitoring
  - Error rate tracking
  - Performance metrics
  - User experience monitoring

Backend Monitoring:
  - Database performance
  - Storage usage
  - API response times
  - Error rates

Worker Monitoring:
  - GPU utilization
  - Memory usage
  - Queue depth
  - Job success rates
```

### **Alerting Setup**
```yaml
Critical Alerts:
  - Service downtime
  - High error rates (>5%)
  - Queue depth >100 jobs
  - GPU utilization <50%
  - Memory usage >90%

Warning Alerts:
  - Slow response times
  - High queue depth
  - Storage usage >80%
  - Worker restarts
```

---

## **🔄 Maintenance Procedures**

### **Regular Maintenance**
```yaml
Daily:
  - Check system status
  - Review error logs
  - Monitor performance metrics
  - Verify backup status

Weekly:
  - Update dependencies
  - Review security logs
  - Check storage usage
  - Performance optimization

Monthly:
  - Security updates
  - Performance review
  - Capacity planning
  - Documentation updates
```

### **Backup Procedures**
```yaml
Database Backups:
  - Supabase automatic daily backups
  - Point-in-time recovery available
  - Cross-region backup replication

Storage Backups:
  - Supabase storage redundancy
  - Multiple availability zones
  - Automatic backup verification

Model Backups:
  - Models stored on persistent network volume
  - Version control for model configurations
  - Recovery procedures documented
```

---

## **🔒 Security Considerations**

### **Production Security**
```yaml
Authentication:
  - JWT tokens for user sessions
  - Service keys for backend operations
  - API rate limiting

Authorization:
  - Row-level security (RLS) on all tables
  - User isolation for data access
  - Role-based access control (admin roles)

Data Protection:
  - Encrypted data in transit (HTTPS)
  - Encrypted data at rest
  - Secure environment variables
  - No sensitive data in client-side code
```

### **Infrastructure Security**
```yaml
RunPod Security:
  - Isolated GPU instances
  - Secure network access
  - Encrypted storage volumes
  - Regular security updates

Supabase Security:
  - SOC 2 compliance
  - GDPR compliance
  - Regular security audits
  - Automated vulnerability scanning

Upstash Security:
  - Encrypted Redis connections
  - Access token authentication
  - Network isolation
  - Regular security updates
```

---

## **📋 Deployment Checklist**

### **Pre-Deployment**
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Dependencies updated
- [ ] Documentation updated
- [ ] Security review completed

### **Deployment**
- [ ] Frontend deployed to Lovable
- [ ] Backend deployed to Supabase
- [ ] Workers deployed to RunPod
- [ ] Storage buckets configured
- [ ] Edge functions deployed

### **Post-Deployment**
- [ ] All systems verified
- [ ] Performance tested
- [ ] Security tested
- [ ] Monitoring configured
- [ ] Backup procedures tested

---

## **📚 Related Documentation**

- **[API Reference](API.md)** - Complete API documentation
- **[Performance Data](PERFORMANCE.md)** - Performance benchmarks and optimization
- **[Architecture](ARCHITECTURE.md)** - Technical system architecture
- **[Services](SERVICES.md)** - Service configurations and setup
- **[Changelog](CHANGELOG.md)** - Version history and changes

---

**This deployment guide provides comprehensive instructions for deploying and maintaining the OurVidz system in production. For technical implementation details, see the API documentation and architecture guides.** 