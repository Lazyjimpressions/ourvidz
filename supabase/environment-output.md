# Supabase Environment Output

**Generated:** July 5, 2025  
**Project:** OurVidz.com  
**Environment:** Production

---

## 📊 **Query Results**

Paste your SQL query output here in a table format:

| Category | Item | Value |
|----------|------|-------|
| Database Info | PostgreSQL Version | PostgreSQL 15.8 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit |
| Database Info | Current Database | postgres |
| Database Info | Current User | postgres |
| Storage | Bucket: image7b_fast_enhanced | Public: false, Size Limit: 20MB |
| Storage | Bucket: image7b_high_enhanced | Public: false, Size Limit: 20MB |
| Storage | Bucket: image_fast | Public: false, Size Limit: 5MB |
| Storage | Bucket: image_high | Public: false, Size Limit: 10MB |
| Storage | Bucket: sdxl_image_fast | Public: false, Size Limit: 5MB |
| Storage | Bucket: sdxl_image_high | Public: false, Size Limit: 10MB |
| Storage | Bucket: system_assets | Public: true, Size Limit: 5MB |
| Storage | Bucket: video7b_fast_enhanced | Public: false, Size Limit: 100MB |
| Storage | Bucket: video7b_high_enhanced | Public: false, Size Limit: 100MB |
| Storage | Bucket: video_fast | Public: false, Size Limit: 50MB |
| Storage | Bucket: video_high | Public: false, Size Limit: 200MB |
| Storage | Bucket: videos | Public: true, Size Limit: No limit |
| Tables | Total Tables | 9 |
| Functions | Total Functions | 5 |
| Migrations | Total Migrations | 35 |
| Data Stats | Images Count | 59 |
| Data Stats | Videos Count | 12 |
| Data Stats | Jobs Count | 75 |
| Data Stats | Users Count | 1 |
| Job System | Active Job Types | image7b_fast_enhanced, image7b_high_enhanced, image_high, sdxl_image_fast, sdxl_image_high, video7b_fast_enhanced, video7b_high_enhanced, video_fast, video_high |
| Security | Tables with RLS | 9 |
| Performance | Indexes Count | 31 |
| Extensions | pg_graphql | 1.5.11 |
| Extensions | pg_stat_statements | 1.10 |
| Extensions | pgcrypto | 1.3 |
| Extensions | pgjwt | 0.2.0 |
| Extensions | plpgsql | 1.0 |
| Extensions | supabase_vault | 0.3.1 |
| Extensions | uuid-ossp | 1.1 |

---

## 🔧 **Additional Configuration**

### **Project Details**
- **Project URL:** [From Supabase dashboard]
- **API Keys:** [From Settings → General]
- **Database Connection:** [From Settings → Database]

### **Edge Functions**
- **queue-job:** ✅ Active (JWT verification enabled)
- **job-callback:** ✅ Active (JWT verification disabled)
- **generate-admin-image:** ✅ Active (Admin bypass)

### **Storage Buckets**
- **sdxl_image_fast:** [Details]
- **sdxl_image_high:** [Details]
- **image_fast:** [Details]
- **image_high:** [Details]
- **video_fast:** [Details]
- **video_high:** [Details]
- **image7b_fast_enhanced:** [Details]
- **image7b_high_enhanced:** [Details]
- **video7b_fast_enhanced:** [Details]
- **video7b_high_enhanced:** [Details]

### **External Services**
- **Upstash Redis:** [Configuration details]
- **RunPod Workers:** [Configuration details]

---

## 📈 **Performance Metrics**

### **Current Usage**
- **Total Images:** 59
- **Total Videos:** 12
- **Active Jobs:** 75
- **Registered Users:** 1

### **Job Types Supported**
- SDXL Fast Images (3-8s)
- SDXL High Images (8-15s)
- WAN Fast Images (73s)
- WAN High Images (90s)
- WAN Fast Videos (180s)
- WAN High Videos (280s)
- Enhanced Fast Images (87s)
- Enhanced High Images (104s)
- Enhanced Fast Videos (194s)
- Enhanced High Videos (294s)

---

## 🔒 **Security Configuration**

### **Row Level Security (RLS)**
- **Tables with RLS:** 9
- **Total RLS Policies:** [Count]
- **Storage Policies:** [Count]

### **Authentication**
- **JWT Verification:** Enabled for queue-job
- **Service Role Access:** Available for internal operations
- **User Authentication:** Supabase Auth integration

---

## 🚀 **Deployment Information**

### **Environment Variables**
```bash
# Supabase Configuration
SUPABASE_URL=[your_url]
SUPABASE_ANON_KEY=[your_key]
SUPABASE_SERVICE_ROLE_KEY=[your_key]

# Redis Configuration
UPSTASH_REDIS_REST_URL=[your_url]
UPSTASH_REDIS_REST_TOKEN=[your_token]
```

### **Migration Status**
- **Latest Migration:** [Migration name]
- **Total Migrations:** 35
- **Schema Version:** [Version]

---

*This file should be updated whenever you run the environment queries to keep Cursor informed of the current state.* 