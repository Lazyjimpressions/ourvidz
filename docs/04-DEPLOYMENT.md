# Deployment Documentation - Consolidated

**Last Updated:** July 30, 2025  
**Status:** Production Active

## 🚀 Overview

OurVidz uses a multi-component deployment strategy with separate services for frontend, backend, and AI workers.

## 🏗️ Deployment Architecture

### **Component Overview**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase       │    │   Workers       │
│   (Vercel)      │◄──►│   (Managed)      │◄──►│   (RunPod)      │
│                 │    │                  │    │                 │
│ • React 18      │    │ • PostgreSQL     │    │ • Python        │
│ • TypeScript    │    │ • Auth           │    │ • FastAPI       │
│ • Vite          │    │ • Storage        │    │ • AI Models     │
│ • Tailwind CSS  │    │ • Edge Functions │    │ • RTX 6000 ADA  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🌐 Frontend Deployment (Vercel)

### **Deployment Process**
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### **Environment Variables**
```bash
# Required environment variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_ENV=production
```

### **Build Configuration**
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
});
```

### **Performance Optimization**
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: WebP format with fallbacks
- **CDN**: Global content delivery network
- **Caching**: Aggressive caching strategies

## 🗄️ Backend Deployment (Supabase)

### **Database Setup**
- **Database**: PostgreSQL 15.8 on aarch64-unknown-linux-gnu
- **Total Tables**: 20 (all with RLS enabled)
- **Total Functions**: 17
- **Total Migrations**: 59 (latest: 20250728040822)
- **Performance Indexes**: 72
- **RLS Policies**: 35 active policies
- **Storage Policies**: 52 policies across 13 buckets

### **Current Production Statistics**
- **Total Images Generated**: 3,393
- **Total Videos Generated**: 272
- **Active Jobs Processed**: 2,257
- **Total Conversations**: 20 (with 191 messages)
- **Registered Users**: 1
- **Active Projects**: 23
- **Usage Log Entries**: 4,169

```sql
-- Run migrations in Supabase dashboard
-- All migrations are in supabase/migrations/
```

### **Database Schema Overview**
```yaml
User Management:
  - profiles: User profiles and subscription data
  - user_roles: Role-based access control
  - user_activity_log: Activity tracking

Content Generation:
  - jobs: Job tracking and status management
  - images: Generated image metadata (3,393 records)
  - videos: Generated video metadata (272 records)
  - conversations: Chat conversations (20 records)
  - messages: Chat messages (191 records)

Project Management:
  - projects: Project organization (23 records)
  - scenes: Scene management for storyboards
  - characters: Character definitions

Analytics & Testing:
  - usage_logs: Usage tracking (4,169 records)
  - model_test_results: AI model testing (5 records)
  - admin_development_progress: Development tracking

Configuration:
  - system_config: Application settings
  - model_config_history: Model configuration tracking
  - model_performance_logs: Performance metrics
  - enhancement_presets: Enhancement configurations
  - compel_configs: Compel weight configurations
  - prompt_ab_tests: A/B testing framework
```

### **Edge Functions Deployment**
```bash
# Deploy all edge functions
supabase functions deploy

# Deploy specific function
supabase functions deploy queue-job
```

### **Environment Configuration**
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis Configuration (Upstash)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Worker Configuration
WAN_WORKER_API_KEY=your_worker_api_key
CHAT_WORKER_URL=your_chat_worker_url
```

### **Storage Buckets (13 Total)**
```bash
# Image Buckets
sdxl_image_fast (5MB, PNG/JPEG/WebP)
sdxl_image_high (10MB, PNG/JPEG/WebP)
image_fast (5MB, PNG/JPEG/WebP)
image_high (10MB, PNG/JPEG/WebP)
image7b_fast_enhanced (20MB, PNG/JPEG/WebP)
image7b_high_enhanced (20MB, PNG/JPEG/WebP)

# Video Buckets
video_fast (50MB, MP4/WebM/QuickTime)
video_high (200MB, MP4/WebM/QuickTime)
video7b_fast_enhanced (100MB, MP4/WebM)
video7b_high_enhanced (100MB, MP4/WebM)

# System Buckets
reference_images (10MB, JPEG/PNG/WebP/GIF)
system_assets (5MB, PNG/JPEG/WebP/SVG)
videos (No limit, All formats)
```

## 🤖 Worker Deployment (RunPod)

### **Container Setup**
```dockerfile
# Dockerfile for worker container
FROM nvidia/cuda:11.8-devel-ubuntu20.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y python3 python3-pip

# Copy worker code
COPY . /app
WORKDIR /app

# Install Python dependencies
RUN pip install -r requirements.txt

# Expose port
EXPOSE 8000

# Start worker
CMD ["python3", "main.py"]
```

### **RunPod Configuration**
```yaml
# runpod.yaml
name: ourvidz-worker
image: ourvidz/worker:latest
gpu: RTX 6000 ADA
memory: 64GB
storage: 100GB
ports:
  - 8000:8000
env:
  - SUPABASE_URL=https://your-project.supabase.co
  - SUPABASE_ANON_KEY=your_anon_key
  - WORKER_TYPE=sdxl
  - POLLING_INTERVAL=2
```

### **Worker Types & Scaling**
```bash
# Triple Worker System (Production)
./startup.sh  # Starts all workers: SDXL, Chat, WAN

# Individual Workers (Development)
python sdxl_worker.py    # SDXL image generation (Port 7859)
python chat_worker.py    # Chat worker with Flask API (Port 7861)
python wan_worker.py     # WAN video/image generation (Port 7860)

# Memory Management
python memory_manager.py # Smart VRAM allocation
```

### **Worker Configuration**
- **SDXL Worker**: 10GB VRAM (always loaded), 2s polling
- **Chat Worker**: 15GB VRAM (load when possible), 3s polling  
- **WAN Worker**: 30GB VRAM (load on demand), 5s polling
- **Memory Manager**: Coordinates VRAM allocation across all workers

## 🔧 Environment Management

### **Development Environment**
```bash
# .env.development
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev_anon_key
VITE_APP_ENV=development
```

### **Staging Environment**
```bash
# .env.staging
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=staging_anon_key
VITE_APP_ENV=staging
```

### **Production Environment**
```bash
# .env.production
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod_anon_key
VITE_APP_ENV=production
```

## 🔄 CI/CD Pipeline

### **GitHub Actions Workflow**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### **Database Migrations**
```bash
# Automated migration deployment
supabase db push --linked
```

## 📊 Monitoring & Health Checks

### **Frontend Monitoring**
- **Vercel Analytics**: Performance and error tracking
- **Sentry**: Error monitoring and reporting
- **Uptime Monitoring**: External health checks

### **Backend Monitoring**
- **Supabase Dashboard**: Database and function monitoring
- **Edge Function Logs**: Real-time function execution logs
- **Database Performance**: Query performance tracking

### **Worker Monitoring**
- **RunPod Dashboard**: GPU utilization and health
- **Custom Health Checks**: `/health` endpoints
- **Job Success Rates**: Automated success/failure tracking

### **Health Check Endpoints**
```bash
# Frontend health
curl https://ourvidz.com/api/health

# Backend health
curl https://your-project.supabase.co/functions/v1/health-check-workers

# Worker health
curl https://worker-url.runpod.net/health
```

## 🔐 Security Configuration

### **SSL/TLS**
- **Frontend**: Automatic SSL via Vercel
- **Backend**: Automatic SSL via Supabase
- **Workers**: SSL certificates via RunPod

### **Authentication**
```typescript
// Supabase Auth configuration
const supabase = createClient(url, anon_key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

### **CORS Configuration**
```typescript
// Edge function CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
```

## 🚨 Disaster Recovery

### **Backup Strategy**
- **Database**: Daily automated backups via Supabase
- **Storage**: Redundant storage with versioning
- **Code**: Git repository with version control

### **Recovery Procedures**
```bash
# Database recovery
supabase db reset --linked

# Worker restart
docker restart ourvidz-worker

# Frontend rollback
vercel rollback
```

### **Failover Configuration**
- **Multiple Workers**: Redundant worker instances
- **Load Balancing**: Automatic traffic distribution
- **Geographic Distribution**: Multi-region deployment

## 📈 Performance Optimization

### **Frontend Optimization**
- **Bundle Splitting**: Code splitting by routes
- **Image Optimization**: WebP with fallbacks
- **Caching**: Aggressive browser caching
- **CDN**: Global content delivery

### **Backend Optimization**
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections
- **Edge Functions**: Serverless execution
- **Caching**: Redis for frequently accessed data

### **Worker Optimization**
- **GPU Utilization**: Optimal VRAM usage
- **Concurrent Processing**: Multiple job handling
- **Model Caching**: Pre-loaded AI models
- **Memory Management**: Efficient resource usage

## 🔧 Troubleshooting

### **Common Issues**
```bash
# Frontend build failures
npm run build --verbose

# Database connection issues
supabase status

# Worker health problems
curl -f https://worker-url.runpod.net/health

# Edge function errors
supabase functions logs
```

### **Debug Commands**
```bash
# Check deployment status
vercel ls

# Monitor worker logs
docker logs ourvidz-worker

# Test database connection
supabase db ping

# Validate environment
npm run validate:env
```

---

**For API details, see [03-API.md](./03-API.md)**  
**For worker setup, see [07-RUNPOD_SETUP.md](./07-RUNPOD_SETUP.md)** 