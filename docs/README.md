# OurVidz Documentation

**Last Updated:** January 2026
**Governance:** See [DOCS_STRUCTURE.md](./00-OVERVIEW/DOCS_STRUCTURE.md) for complete structure and conventions

---

## Quick Navigation

| Need | Location |
|------|----------|
| AI session context | [00-OVERVIEW/AI_CONTEXT.md](./00-OVERVIEW/AI_CONTEXT.md) |
| Product vision/PRD | [00-OVERVIEW/PRD.md](./00-OVERVIEW/PRD.md) |
| Page requirements | [01-PAGES/](./01-PAGES/) |
| Component inventory | [02-COMPONENTS/](./02-COMPONENTS/) |
| Database schema | [08-DATABASE/](./08-DATABASE/) |
| Model usage guides | [09-REFERENCE/](./09-REFERENCE/) |

---

## Folder Structure

```
docs/
├── 00-OVERVIEW/           # PRD, architecture, AI context
├── 01-PAGES/              # Page PRDs and UX specs
│   ├── 07-ROLEPLAY/       # Complex page with subdocs
│   │   ├── PURPOSE.md     # Business requirements
│   │   ├── UX_DASHBOARD.md
│   │   └── UX_CHAT.md
│   └── [other pages]
├── 02-COMPONENTS/         # Component inventory, sunset tracking
├── 03-SYSTEMS/            # Cross-cutting systems (I2I, Prompting)
├── 04-WORKERS/            # Local RunPod worker docs
├── 05-APIS/               # Third-party API setup/integration
├── 06-DEVELOPMENT/        # Development workflow
│   ├── SETUP/             # Environment setup guides
│   ├── TESTING/           # Testing guides
│   └── ACTIVE/            # Current dev plans
├── 08-DATABASE/           # Schema docs, edge functions
├── 09-REFERENCE/          # Usage guides, best practices
└── 99-ARCHIVE/            # Historical/superseded docs
```

---

## Document Types

| Type | Purpose | Example |
|------|---------|---------|
| **PURPOSE** | Business requirements, success metrics | `07-ROLEPLAY/PURPOSE.md` |
| **UX_** | UI workflows, component specs | `UX_DASHBOARD.md` |
| **SYSTEM** | Cross-cutting functionality | `I2I_SYSTEM.md` |
| **API** | Third-party integration setup | `FAL_AI.md` |
| **GUIDE** | How to use models/features | `Seedream_model_guide.md` |

---

## For AI Sessions

1. Start with [AI_CONTEXT.md](./00-OVERVIEW/AI_CONTEXT.md) for quick orientation
2. Load relevant PAGE PURPOSE doc for feature area
3. Load UX doc if implementing UI changes
4. Reference [DOCS_STRUCTURE.md](./00-OVERVIEW/DOCS_STRUCTURE.md) for governance

---

## Current Development Status

### Production Ready
- Workspace Page - I2I functionality complete
- Playground Page - Dynamic prompting system
- Roleplay - 85% complete, production ready

### In Development
- Storyboard Page - Core functionality
- Scene Continuity - I2I iteration system

See [01-PAGES/07-PAGE_DEVELOPMENT_STATUS.md](./01-PAGES/07-PAGE_DEVELOPMENT_STATUS.md) for full status.

---

## Key Technical Docs

| Topic | Location |
|-------|----------|
| Model routing | [00-OVERVIEW/ARCHITECTURE.md](./00-OVERVIEW/ARCHITECTURE.md) |
| Prompt system | [03-SYSTEMS/PROMPTING_SYSTEM.md](./03-SYSTEMS/PROMPTING_SYSTEM.md) |
| I2I system | [03-SYSTEMS/I2I_SYSTEM.md](./03-SYSTEMS/I2I_SYSTEM.md) |
| fal.ai setup | [05-APIS/FAL_AI.md](./05-APIS/FAL_AI.md) |
| Database schema | [08-DATABASE/DATABASE.md](./08-DATABASE/DATABASE.md) |
