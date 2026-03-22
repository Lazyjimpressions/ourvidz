# Documentation Guide

**Document Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Active
**Purpose:** North star for documentation structure, governance, and placement decisions

---

## Table of Contents

1. [Directory Purpose Matrix](#directory-purpose-matrix)
2. [Document Placement Decision Tree](#document-placement-decision-tree)
3. [Folder Structure](#folder-structure)
4. [Document Types & Governance](#document-types--governance)
5. [File Naming Conventions](#file-naming-conventions)
6. [Document Lifecycle](#document-lifecycle)
7. [Incremental Conformance](#incremental-conformance)
8. [AI Context Loading](#ai-context-loading)

---

## Directory Purpose Matrix

| Directory | Purpose | Contains | Does NOT Contain |
|-----------|---------|----------|------------------|
| **00-OVERVIEW** | System-level north star | Architecture, PRD, environment, design system, AI context, this guide | Page-specific docs, implementation details |
| **01-PAGES** | Page-level specifications | PURPOSE.md, UX specs, development status for each page | Model guides, system architecture, API docs |
| **02-COMPONENTS** | Component library | Component inventory, refactoring plans, shared component docs | Page logic, business requirements |
| **03-SYSTEMS** | Cross-cutting functionality | I2I system, prompting system, any feature used by multiple pages | Page-specific implementations, model-specific guides |
| **04-WORKERS** | Local worker infrastructure | Chat, SDXL, WAN worker docs, worker API | Cloud API docs, edge functions |
| **05-APIS** | Third-party integrations | fal.ai, Replicate, OpenRouter setup and endpoints | Local worker docs, model prompting guides |
| **06-DEVELOPMENT** | Active development | Current tasks, setup guides, testing docs | Completed features, archived work |
| **08-DATABASE** | Data layer | Schema docs, migrations, table relationships | Application logic, API docs |
| **09-REFERENCE** | Model-specific guides | Prompting guides per model, API parameter references | Page-specific UX, system architecture |
| **99-ARCHIVE** | Historical docs | Superseded docs, completed fixes, old versions | Active documentation |

---

## Document Placement Decision Tree

```
Is this about a SPECIFIC AI MODEL (Seedream, LTX, FLUX, WAN)?
├── YES → 09-REFERENCE/{MODEL}/
│
└── NO → Is this a CROSS-CUTTING FEATURE used by multiple pages?
         ├── YES → 03-SYSTEMS/
         │
         └── NO → Is this about a SPECIFIC PAGE's behavior/UX?
                  ├── YES → 01-PAGES/{PAGE}/
                  │
                  └── NO → Is this about LOCAL WORKERS (RunPod)?
                           ├── YES → 04-WORKERS/
                           │
                           └── NO → Is this about CLOUD APIs (fal, Replicate)?
                                    ├── YES → 05-APIS/
                                    │
                                    └── NO → 00-OVERVIEW/ (system-wide)
```

---

## Folder Structure

```
docs/
├── 00-OVERVIEW/                 # North star, architecture, AI context
│   ├── PRD.md                   # Product vision, phases, success metrics
│   ├── ARCHITECTURE.md          # System architecture overview
│   ├── ENVIRONMENT.md           # Infrastructure snapshot
│   ├── DESIGN_SYSTEM.md         # UI/UX standards
│   ├── AI_CONTEXT.md            # Quick context for AI sessions
│   └── DOCUMENTATION_GUIDE.md   # This file - governance & structure
│
├── 01-PAGES/                    # Page PRDs and UX specs
│   ├── 01-WORKSPACE/            # Main workspace page
│   │   ├── PURPOSE.md           # Business PRD, requirements
│   │   ├── DEVELOPMENT_STATUS.md # Implementation tracking
│   │   ├── UX_SPEC.md           # Unified UX specification
│   │   ├── VIDEO_MULTI_REF.md   # Video multi-reference feature
│   │   └── CLAUDE.md            # AI context (optional)
│   ├── 02-STORYBOARD/           # Storyboard page
│   ├── 07-ROLEPLAY/             # Roleplay chat system
│   └── [other pages]/
│
├── 02-COMPONENTS/               # Component inventory, sunset tracking
│   ├── 00-COMPONENT_INVENTORY.md
│   ├── 01-COMPONENT_REFACTORING_PLAN.md
│   └── ARCHIVED/                # Deprecated component docs
│
├── 03-SYSTEMS/                  # Cross-cutting system documentation
│   ├── I2I_SYSTEM.md            # Image-to-image across pages
│   ├── PROMPTING_SYSTEM.md      # Dynamic prompting system
│   └── MULTI_REF_SYSTEM_DESIGN.md # Multi-reference video system
│
├── 04-WORKERS/                  # Local RunPod worker documentation
│   ├── OVERVIEW.md              # Triple worker system overview
│   ├── SDXL_WORKER.md           # Image generation
│   ├── WAN_WORKER.md            # Video generation
│   └── CHAT_WORKER.md           # Qwen chat
│
├── 05-APIS/                     # Third-party API setup & integration
│   ├── FAL_AI.md                # fal.ai setup, auth, endpoints
│   ├── REPLICATE_API.md         # Replicate setup, auth
│   └── OPENROUTER_API.md        # OpenRouter setup, auth
│
├── 06-DEVELOPMENT/              # Development workflow
│   ├── SETUP/                   # Environment setup guides
│   ├── TESTING/                 # Testing guides
│   └── ACTIVE/                  # Current development plans
│
├── 08-DATABASE/                 # Database & edge functions
│   ├── SCHEMA_OVERVIEW.md       # Table relationships diagram
│   ├── TABLES/                  # Key table documentation
│   └── EDGE_FUNCTIONS/          # Edge function docs
│
├── 09-REFERENCE/                # Model-specific guides
│   ├── SEEDREAM/                # Seedream image model guides
│   │   └── SEEDREAM_I2I.md
│   ├── LTX/                     # LTX video model guides
│   │   └── LTX_VIDEO_13B_FAL_AI_GUIDE.md
│   ├── WAN2.1/                  # WAN video model guides
│   └── FLUX/                    # Flux image model guides
│
└── 99-ARCHIVE/                  # Historical, superseded docs
    ├── 00-OVERVIEW-HISTORY/     # Archived overview docs
    ├── 01-WORKSPACE-HISTORY/    # Archived workspace docs
    └── [other archives]/
```

---

## Document Types & Governance

### PURPOSE Documents (01-PAGES/)

**What**: Business requirements, user intent, success metrics
**When to update**: Feature scope changes, business priority shifts
**Who**: Product decisions, strategic direction

### UX Specification Documents (01-PAGES/[page]/)

**What**: UI workflows, component layout, interaction specs
**When to update**: UI changes, new features, UX improvements
**Who**: Implementation guidance, preventing AI drift
**Format**: Consolidated into single `UX_SPEC.md` per page

### System Documents (03-SYSTEMS/)

**What**: Cross-cutting functionality shared across pages
**When to update**: System architecture changes
**Who**: Understanding shared behavior
**Examples**: I2I system, prompting system, multi-reference video system

### API Documents (05-APIS/)

**What**: Setup, authentication, endpoint documentation
**When to update**: Provider changes, new integrations
**Who**: Technical integration reference

### Reference Documents (09-REFERENCE/)

**What**: How to use models, prompting guides, best practices
**When to update**: New learnings, model updates
**Who**: Practical usage guidance
**Structure**: Organized by model (SEEDREAM/, LTX/, WAN2.1/, FLUX/)

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| PRD/Requirements | `PURPOSE.md` | `01-WORKSPACE/PURPOSE.md` |
| UX Specification | `UX_SPEC.md` | `UX_SPEC.md` |
| Implementation Status | `DEVELOPMENT_STATUS.md` | `DEVELOPMENT_STATUS.md` |
| Feature Specification | `{FEATURE_NAME}.md` | `VIDEO_MULTI_REF.md` |
| Model Guide | `{MODEL}_GUIDE.md` or `{MODEL}_I2I.md` | `SEEDREAM_I2I.md` |
| System Architecture | `{SYSTEM}_SYSTEM.md` | `PROMPTING_SYSTEM.md` |

---

## Document Lifecycle

### Creating New Docs

1. Use appropriate template if available
2. Place in correct folder per decision tree above
3. Include Last Updated date
4. Link from relevant inventory files

### Archiving Docs

**Trigger**: Issue resolved, feature superseded, doc outdated

**Process**:
1. Move to `99-ARCHIVE/{category}-HISTORY/`
2. Add note at top: "ARCHIVED: [date] - [reason]"
3. If contains valuable knowledge, extract to relevant Reference doc
4. Remove from inventory files

### Keeping Docs Current

| Document Type | Review Frequency |
|---------------|------------------|
| PURPOSE docs | Monthly or on scope changes |
| UX docs | Update with each UI change |
| System docs | Update with architecture changes |
| Reference docs | Update on new learnings |

---

## Incremental Conformance

When working on a page, apply this checklist:

- [ ] **Audit files** - List all files with purposes
- [ ] **Identify duplicates** - Find overlapping content
- [ ] **Consolidate UX docs** - Merge into single `UX_SPEC.md`
- [ ] **Archive historical** - Move to `99-ARCHIVE/{PAGE}-HISTORY/`
- [ ] **Relocate model guides** - Move to `09-REFERENCE/{MODEL}/`
- [ ] **Update dates** - Set to current
- [ ] **Fix file references** - Update component paths
- [ ] **Update cross-references** - Point to consolidated files
- [ ] **Add related docs section** - Link to reference and system docs

### Expected Final State per Page Directory

```
docs/01-PAGES/{PAGE}/
├── PURPOSE.md              # PRD - business goals, requirements
├── DEVELOPMENT_STATUS.md   # Implementation tracking
├── UX_SPEC.md              # Unified UX specification
├── {FEATURE}.md            # Page-specific features (if any)
└── CLAUDE.md               # AI context (optional)
```

---

## AI Context Loading

When starting a session, AI should load:

1. `00-OVERVIEW/AI_CONTEXT.md` - Quick system state
2. `00-OVERVIEW/PRD.md` - Vision and priorities
3. Relevant PAGE PURPOSE doc for the feature area
4. Relevant UX doc if implementing UI changes

This structure optimizes token usage by allowing targeted doc loading.

---

## Examples

### Good: Feature in Correct Location

```
# Video multi-reference is workspace-specific
docs/01-PAGES/01-WORKSPACE/VIDEO_MULTI_REF.md  ✓

# Seedream model guide used by multiple pages
docs/09-REFERENCE/SEEDREAM/SEEDREAM_I2I.md  ✓

# I2I system used by workspace and roleplay
docs/03-SYSTEMS/I2I_SYSTEM.md  ✓
```

### Bad: Feature in Wrong Location

```
# Model guide in page folder (should be in 09-REFERENCE)
docs/01-PAGES/01-WORKSPACE/SEEDREAM_I2I.md  ✗

# System design in reference folder (should be in 03-SYSTEMS)
docs/09-REFERENCE/MULTI_REF_SYSTEM_DESIGN_BRIEF.md  ✗

# Completed fix still in active docs (should be in 99-ARCHIVE)
docs/01-PAGES/01-WORKSPACE/REFERENCE_IMAGE_VISUAL_FIX.md  ✗
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [PRD.md](./PRD.md) - Product requirements
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Infrastructure snapshot
- [AI_CONTEXT.md](./AI_CONTEXT.md) - Quick AI session context
