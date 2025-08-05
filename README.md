# OurVidz.com - AI-Powered Adult Content Generation Platform

**Status:** 🚀 Production Ready - Library-First Event-Driven Architecture  
**Last Updated:** August 5, 2025  
**System:** Triple Worker (SDXL + WAN + Chat) on RTX 6000 ADA (48GB VRAM)

---

## 🎯 Project Overview

OurVidz.com is an AI-powered platform for generating adult content videos and images. Built with cutting-edge AI models including SDXL for ultra-fast image generation and WAN 2.1 for video generation with Qwen 7B enhancement.

### ✨ Key Features
- **Ultra-Fast Images**: SDXL generation in 3-8 seconds
- **AI Video Generation**: WAN 2.1 with Qwen 7B enhancement
- **NSFW-Capable**: Apache 2.0 licensed models, no content restrictions
- **Preview-Approve Workflow**: User approval before final generation
- **Mobile-First Design**: Optimized for modern usage patterns

### 🏗️ System Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Queue**: Upstash Redis (REST API)
- **Workers**: RunPod RTX 6000 ADA (48GB VRAM)
- **Models**: SDXL + WAN 2.1 + Qwen 7B enhancement
- **Architecture**: Library-First Event-Driven with LTX-Style Workspace

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account and project
- Upstash Redis account
- RunPod account with RTX 6000 ADA instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ourvidz-1.git
   cd ourvidz-1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:5173
   ```

---

## 📁 Project Structure

```
ourvidz-1/
├── docs/                    # Project documentation
│   ├── PROJECT.md          # Complete project context
│   ├── ARCHITECTURE.md     # Technical architecture
│   └── SERVICES.md         # Service configurations
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── generation/    # Generation components
│   │   └── workspace/     # Workspace components
│   ├── pages/             # Route components
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React context providers
│   ├── lib/               # Utility functions and services
│   └── types/             # TypeScript type definitions
├── supabase/              # Backend configuration
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations
└── workers/               # AI worker scripts
```

---

## 🔧 Current Job Types (10 Total)

### SDXL Jobs (2) - Ultra-Fast Images
- `sdxl_image_fast`: 3-8 seconds, excellent NSFW quality
- `sdxl_image_high`: 8-15 seconds, premium NSFW quality

### WAN Standard Jobs (4) - Videos + Backup Images
- `image_fast`: 73 seconds, backup images
- `image_high`: 90 seconds, backup images
- `video_fast`: 180 seconds, 5s duration videos
- `video_high`: 280 seconds, 6s duration videos

### WAN Enhanced Jobs (4) - AI-Enhanced with Qwen 7B
- `image7b_fast_enhanced`: 87 seconds (73s + 14s enhancement)
- `image7b_high_enhanced`: 104 seconds (90s + 14s enhancement)
- `video7b_fast_enhanced`: 194 seconds (180s + 14s enhancement)
- `video7b_high_enhanced`: 294 seconds (280s + 14s enhancement)

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking

# Database
npm run db:generate  # Generate Supabase types
npm run db:push      # Push migrations to Supabase
npm run db:reset     # Reset database
```

### Code Style

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for component library

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

---

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to your platform**
   - Vercel: Connect GitHub repository
   - Netlify: Drag and drop `dist` folder

3. **Configure environment variables**
   - Set production Supabase credentials
   - Configure custom domain if needed

### Worker Deployment (RunPod)

1. **Upload worker scripts**
   ```bash
   # Upload to RunPod instance
   scp -r workers/ user@runpod-instance:/workspace/
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start workers**
   ```bash
   python dual_orchestrator.py
   ```

---

## 📊 Performance Benchmarks

### GPU Performance (RTX 6000 ADA 48GB)
- **SDXL Generation**: 3-8 seconds per image
- **WAN Generation**: 67-280 seconds per video
- **Qwen Enhancement**: 14.6 seconds per prompt
- **Concurrent Operation**: SDXL + WAN simultaneously

### System Capacity
- **Total VRAM**: 48GB
- **Peak Usage**: ~35GB during concurrent operation
- **Available Headroom**: 13GB for safety
- **Model Storage**: 48GB network volume

---

## 🔒 Security

### Authentication
- Supabase Auth with JWT tokens
- Row-level security (RLS) on all database tables
- User isolation for data access

### Data Protection
- Encrypted data in transit (HTTPS)
- Encrypted data at rest
- Secure environment variables
- No sensitive data in client-side code

---

## 📈 Monitoring & Analytics

### Health Monitoring
- **Supabase**: Database and API monitoring
- **RunPod**: GPU utilization and worker status
- **Upstash**: Queue depth and performance
- **Lovable**: Automated testing and quality assurance

### Key Metrics
- Job success rate (>95% target)
- Average generation time per job type
- Queue processing latency
- User session duration
- Asset generation volume

---

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'feat: add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Commit Message Convention
```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

---

## 📚 Documentation

- **[PROJECT.md](docs/PROJECT.md)** - Complete project context and current status
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Technical architecture and implementation details
- **[SERVICES.md](docs/SERVICES.md)** - Service configurations and setup guides

---

## 🆘 Support

### Common Issues

**Q: Workers not processing jobs?**
A: Check Redis connection and queue configuration in `SERVICES.md`

**Q: Generation times are slow?**
A: Verify GPU utilization and model loading in RunPod dashboard

**Q: Frontend not connecting to backend?**
A: Verify Supabase environment variables and RLS policies

### Getting Help
- Check the [documentation](docs/)
- Review [ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details
- Open an issue for bugs or feature requests

---

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

### Model Licensing
- **SDXL**: Apache 2.0 License
- **WAN 2.1**: Apache 2.0 License
- **Qwen 7B**: Apache 2.0 License

---

## 🎯 Current Status

### ✅ Complete
- Dual worker system operational
- Qwen 7B integration working (14s enhancement)
- All 10 job types defined and supported
- Performance benchmarks established
- Storage optimization completed

### 🚀 Ready for Deployment
- Enhanced WAN worker with Qwen integration
- Storage buckets configured
- Edge functions supporting all job types
- Database schema complete

### ❌ Pending
- Frontend UI integration (4 enhanced job types)
- End-to-end testing
- Production deployment
- User experience optimization

**Next Priority: Frontend Integration for Enhanced Job Types**

---

## 🔄 Update Frequency

### Documentation Updates
- **PROJECT.md**: Update on major system changes or status updates
- **ARCHITECTURE.md**: Update on technical architecture changes
- **SERVICES.md**: Update on service configuration changes
- **README.md**: Update on project overview and setup changes

### Version Control
- Use semantic versioning for releases
- Tag releases with descriptive commit messages
- Maintain changelog for major updates

**Last Updated: July 5, 2025**
