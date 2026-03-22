# Documentation Organization Guide

**Last Updated:** 2026-03-22
**Status:** Active
**Purpose:** North star for documentation structure and placement decisions

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

## Page Directory Structure

Each page directory in `01-PAGES/` should follow this structure:

```
docs/01-PAGES/{PAGE}/
├── PURPOSE.md              # PRD - business goals, requirements
├── DEVELOPMENT_STATUS.md   # Implementation tracking
├── UX_SPEC.md              # Unified UX specification
├── {FEATURE}.md            # Page-specific features (if any)
└── CLAUDE.md               # AI context (optional)
```

### What Belongs in Page Directories

- **PURPOSE.md** - Business goals, user intent, success metrics, requirements
- **UX_SPEC.md** - Layout, interactions, workflows, mobile behaviors
- **DEVELOPMENT_STATUS.md** - Implementation progress, file structure, testing
- **Feature docs** - Page-specific features not shared with other pages

### What Does NOT Belong in Page Directories

- Model-specific prompting guides → `09-REFERENCE/{MODEL}/`
- Cross-cutting system architecture → `03-SYSTEMS/`
- Completed bug fixes/analysis → `99-ARCHIVE/{PAGE}-HISTORY/`
- API integration details → `05-APIS/`

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

## Reference Directory Structure

Model-specific guides live in `09-REFERENCE/`:

```
docs/09-REFERENCE/
├── FLUX/               # Flux image model guides
├── SEEDREAM/           # Seedream image model guides
├── WAN2.1/             # WAN video model guides
├── LTX/                # LTX video model guides
└── {other models}/     # Future model guides
```

Each model subdirectory contains:
- Prompting guides
- API parameter references
- Model-specific I2I/features
- Best practices

---

## Systems Directory Structure

Cross-cutting features live in `03-SYSTEMS/`:

```
docs/03-SYSTEMS/
├── I2I_SYSTEM.md           # Image-to-image architecture
├── PROMPTING_SYSTEM.md     # Prompt enhancement system
├── PROMPT_SCORING_SYSTEM.md # Prompt evaluation
└── {other systems}/         # Future cross-cutting features
```

A feature belongs in 03-SYSTEMS if:
- It's used by 2+ pages
- It has its own architectural patterns
- It requires consistent behavior across the app

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
- [DOCS_STRUCTURE.md](./DOCS_STRUCTURE.md) - Additional governance rules
