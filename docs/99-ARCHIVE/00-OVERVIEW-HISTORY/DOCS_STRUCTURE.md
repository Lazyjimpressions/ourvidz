# Documentation Structure & Governance

**Last Updated:** January 2026
**Purpose:** Define the documentation structure for AI efficiency and maintainability

---

## Folder Structure

```
docs/
├── 00-OVERVIEW/           # North star, architecture, AI context
│   ├── PRD.md             # Product vision, phases, success metrics
│   ├── ARCHITECTURE.md    # System architecture overview
│   ├── ENVIRONMENT.md     # Environment setup, env vars
│   ├── AI_CONTEXT.md      # Quick context for AI sessions
│   └── DOCS_STRUCTURE.md  # This file - governance & structure
│
├── 01-PAGES/              # Page PRDs and UX specs
│   ├── 00-PAGES_INVENTORY.md
│   ├── 00-PAGE_PURPOSE_TEMPLATE.md
│   ├── 01-WORKSPACE_PURPOSE.md
│   ├── 02-STORYBOARD_PURPOSE.md
│   ├── 03-PLAYGROUND_PURPOSE.md
│   ├── 04-LIBRARY_PURPOSE.md
│   ├── 05-ADMIN_PURPOSE.md
│   ├── 06-DASHBOARD_PURPOSE.md
│   └── 07-ROLEPLAY/       # Complex page with subpages
│       ├── PURPOSE.md     # Business PRD, requirements
│       ├── UX_DASHBOARD.md    # Character selection grid
│       ├── UX_CHAT.md         # Chat interface spec
│       ├── UX_CHARACTER.md    # Character create/edit
│       └── UX_SCENE.md        # Scene builder
│
├── 02-COMPONENTS/         # Component inventory, sunset tracking
│   ├── 00-COMPONENT_INVENTORY.md
│   ├── 01-COMPONENT_REFACTORING_PLAN.md
│   ├── 02-SHARED_COMPONENT_LIBRARY.md
│   └── ARCHIVED/          # Deprecated component docs
│
├── 03-SYSTEMS/            # Cross-cutting system documentation
│   ├── I2I_SYSTEM.md      # Image-to-image across pages
│   ├── PROMPTING_SYSTEM.md    # Dynamic prompting
│   └── STORYBOARD_SYSTEM.md   # Storyboard functionality
│
├── 04-WORKERS/            # Local RunPod worker documentation
│   ├── OVERVIEW.md        # Triple worker system overview
│   ├── SDXL_WORKER.md     # Image generation
│   ├── WAN_WORKER.md      # Video generation
│   ├── CHAT_WORKER.md     # Qwen chat
│   └── WORKER_API.md      # API specifications
│
├── 05-APIS/               # Third-party API setup & integration
│   ├── FAL_AI.md          # fal.ai setup, auth, endpoints
│   ├── REPLICATE_API.md   # Replicate setup, auth
│   ├── OPENROUTER_API.md  # OpenRouter setup, auth
│   └── LEGACY_API.md      # Deprecated API docs
│
├── 06-DEVELOPMENT/        # Development workflow
│   ├── SETUP/             # Environment setup guides
│   │   ├── RUNPOD_SETUP.md
│   │   ├── SUPABASE_SETUP.md
│   │   └── DEPLOYMENT.md
│   ├── TESTING/           # Testing guides
│   │   ├── TESTING.md
│   │   └── MOBILE_TESTING_GUIDE.md
│   ├── ACTIVE/            # Current development plans
│   │   └── [active dev plans here]
│   └── CLAUDE.md          # AI session instructions
│
├── 07-DESIGN/             # UI/UX design system (NEW)
│   ├── STYLE_GUIDE.md     # Colors, typography, spacing
│   ├── MOBILE_FIRST.md    # Mobile-first principles
│   └── COMPONENTS.md      # Component design patterns
│
├── 08-DATABASE/           # Database & edge functions
│   ├── SCHEMA_OVERVIEW.md # Table relationships diagram
│   ├── TABLES/            # Key table documentation
│   │   ├── characters.md
│   │   ├── character_scenes.md
│   │   ├── conversations.md
│   │   ├── messages.md
│   │   ├── api_models.md
│   │   └── prompt_templates.md
│   └── EDGE_FUNCTIONS/    # Edge function docs
│       ├── INDEX.md       # Function inventory & routing
│       ├── roleplay-chat.md
│       ├── fal-image.md
│       └── replicate-image.md
│
├── 09-REFERENCE/          # Usage guides, best practices
│   ├── MODEL_GUIDES/      # Model-specific prompting
│   │   ├── Seedream_model_guide.md
│   │   ├── WAN2.1_i2v_FAL_AI_GUIDE.md
│   │   └── Qwen_prompting.md
│   ├── USER_GUIDES/       # User-facing documentation
│   │   ├── IMAGE_CREATION_GUIDE.md
│   │   └── STORYBOARD_USER_GUIDE.md
│   └── BEST_PRACTICES/    # Development best practices
│       ├── PROMPTING_BEST_PRACTICES.md
│       └── NSFW_PROMPTING.md
│
└── 99-ARCHIVE/            # Historical, superseded docs
    ├── ROLEPLAY/          # Archived roleplay docs
    ├── SYSTEMS/           # Archived system docs
    ├── ISSUES/            # Resolved issue docs
    └── [other archived content]
```

---

## Document Types & Governance

### PURPOSE Documents (01-PAGES/)
**What**: Business requirements, user intent, success metrics
**When to update**: Feature scope changes, business priority shifts
**Who**: Product decisions, strategic direction

### UX Documents (01-PAGES/[page]/)
**What**: UI workflows, component layout, interaction specs
**When to update**: UI changes, new features, UX improvements
**Who**: Implementation guidance, preventing AI drift
**Format**: Light by default - component lists, key interactions. Expand for complex areas.

### System Documents (03-SYSTEMS/)
**What**: Cross-cutting functionality shared across pages
**When to update**: System architecture changes
**Who**: Understanding shared behavior

### API Documents (05-APIS/)
**What**: Setup, authentication, endpoint documentation
**When to update**: Provider changes, new integrations
**Who**: Technical integration reference

### Reference Documents (09-REFERENCE/)
**What**: How to use models, prompting guides, best practices
**When to update**: New learnings, model updates
**Who**: Practical usage guidance

---

## Document Lifecycle

### Creating New Docs
1. Use appropriate template if available
2. Place in correct folder per structure above
3. Include Last Updated date
4. Link from relevant inventory files

### Archiving Docs
**Trigger**: Issue resolved, feature superseded, doc outdated
**Process**:
1. Move to `99-ARCHIVE/[category]/`
2. Add note at top: "ARCHIVED: [date] - [reason]"
3. If contains valuable knowledge, extract to relevant Reference doc
4. Remove from inventory files

### Keeping Docs Current
- PURPOSE docs: Review monthly or on scope changes
- UX docs: Update with each UI change
- System docs: Update with architecture changes
- Reference docs: Update on new learnings

---

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Purpose docs | `XX-NAME_PURPOSE.md` | `07_ROLEPLAY_PURPOSE.md` |
| UX docs | `UX_FEATURE.md` | `UX_CHAT.md` |
| System docs | `SYSTEM_NAME.md` | `I2I_SYSTEM.md` |
| Guide docs | `NAME_GUIDE.md` | `Seedream_model_guide.md` |
| Table docs | `table_name.md` | `characters.md` |

---

## AI Context Loading

When starting a session, AI should load:
1. `00-OVERVIEW/AI_CONTEXT.md` - Quick system state
2. `00-OVERVIEW/PRD.md` - Vision and priorities
3. Relevant PAGE PURPOSE doc for the feature area
4. Relevant UX doc if implementing UI changes

This structure optimizes token usage by allowing targeted doc loading.
