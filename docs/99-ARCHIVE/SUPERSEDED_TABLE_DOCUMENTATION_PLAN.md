# Table Documentation Structure & Implementation Plan

## Overview

The `docs/tables/` directory has been reorganized to provide a clear, comprehensive documentation structure for all Supabase tables and storage buckets in the OurVidz application.

## Current Status

### ✅ Completed
- **Master Inventory**: `00-INVENTORY.md` - Complete table of contents with all tables and buckets
- **Documentation Templates**: 18 table and 4 bucket documentation files generated
- **Scripts**: Automated tools for generating and managing documentation
- **Existing Docs**: 7 tables already documented with detailed information

### ❌ Pending
- **Schema Population**: 18 table docs need actual schema information
- **Bucket Configuration**: 4 bucket docs need configuration details
- **Integration Maps**: All new docs need integration information
- **Business Rules**: All new docs need business logic documentation

## File Structure

```
docs/tables/
├── 00-INVENTORY.md                    # Master table of contents
├── 01-INVENTORY_SQL.md                # SQL to generate current schema
├── TABLE_DOCUMENTATION_PLAN.md        # This file
├── README.md                          # Legacy navigation (to be updated)
│
├── 10-19/ Core System Tables
│   ├── 10-prompt_templates.md         # ✅ Documented
│   ├── 11-system_config_cache.md      # ✅ Documented
│   ├── 12-profiles.md                 # ❌ Template only
│   ├── 13-user_roles.md               # ❌ Template only
│   ├── 14-user_activity_log.md        # ❌ Template only
│   ├── 15-api_providers.md            # ❌ Template only
│   ├── 16-api_models.md               # ❌ Template only
│   ├── 17-model_config_history.md     # ❌ Template only
│   ├── 18-model_performance_logs.md   # ❌ Template only
│   └── 19-model_test_results.md       # ❌ Template only
│
├── 20-29/ Content Generation & Jobs
│   ├── 20-conversations_messages.md   # ✅ Documented
│   └── 30-jobs.md                     # ✅ Documented
│
├── 30-39/ Content Generation & Jobs
│   ├── 31-negative_prompts.md         # ❌ Template only
│   ├── 32-enhancement_presets.md      # ❌ Template only
│   └── 33-compel_configs.md           # ❌ Template only
│
├── 40-49/ Content Library
│   ├── 40-images_videos.md            # ✅ Documented
│   ├── 41-user_collections.md         # ❌ Template only
│   ├── 42-workspace_assets.md         # ❌ Template only
│   └── 43-scenes.md                   # ❌ Template only
│
├── 50-59/ Character System
│   ├── 50-characters.md               # ✅ Documented
│   └── 51-character_scenes.md         # ✅ Documented
│
├── 60-69/ Projects & Workspaces
│   └── 60-projects.md                 # ❌ Template only
│
├── 70-79/ Testing & Analytics
│   ├── 70-prompt_ab_tests.md          # ❌ Template only
│   └── 71-usage_logs.md               # ❌ Template only
│
├── 80-89/ Admin & Development
│   └── 80-admin_development_progress.md # ❌ Template only
│
└── 90-99/ Storage Buckets
    ├── 90-avatars.md                  # ❌ Template only
    ├── 91-generated-content.md        # ❌ Template only
    ├── 92-uploads.md                  # ❌ Template only
    └── 93-thumbnails.md               # ❌ Template only
```

## Available Scripts

### 1. Generate Documentation Templates
```bash
# Generate all missing table docs
node scripts/generate-table-docs.js

# Generate specific table doc
node scripts/generate-table-docs.js profiles

# Generate all bucket docs
node scripts/generate-bucket-docs.js

# Generate specific bucket doc
node scripts/generate-bucket-docs.js avatars
```

### 2. Inventory Management
```bash
# Show current status of all tables
node scripts/update-table-inventory.js list

# Show update process and next steps
node scripts/update-table-inventory.js update
```

## Implementation Priority

### 🔥 High Priority (Core Functionality)
1. **profiles** (12-profiles.md) - User authentication and profile data
2. **api_models** (16-api_models.md) - AI model configurations
3. **projects** (60-projects.md) - Project management system
4. **user_collections** (41-user_collections.md) - Content organization

### 🔶 Medium Priority (Important Features)
1. **api_providers** (15-api_providers.md) - External API configuration
2. **workspace_assets** (42-workspace_assets.md) - Workspace content
3. **scenes** (43-scenes.md) - Scene definitions
4. **negative_prompts** (31-negative_prompts.md) - Content generation

### 🔵 Low Priority (Analytics & Admin)
1. **user_activity_log** (14-user_activity_log.md) - User analytics
2. **model_performance_logs** (18-model_performance_logs.md) - Model metrics
3. **usage_logs** (71-usage_logs.md) - System analytics
4. **admin_development_progress** (80-admin_development_progress.md) - Dev tracking

### 📦 Storage Buckets (All Priority)
1. **avatars** (90-avatars.md) - Character images
2. **generated-content** (91-generated-content.md) - AI-generated content
3. **uploads** (92-uploads.md) - User uploads
4. **thumbnails** (93-thumbnails.md) - Content thumbnails

## Documentation Standards

### Required Sections
Each table/bucket documentation should include:

1. **Purpose** - What the table/bucket is used for
2. **Ownership** - Who manages this data
3. **Schema/Configuration** - Structure and settings
4. **Integration Map** - Connected components and services
5. **Business Rules** - Constraints and logic
6. **Example Queries** - Common operations
7. **Notes** - Implementation details

### Example Format
```markdown
# Table: table_name

Purpose: Brief description of the table's purpose

Ownership: Who owns/manages this data

## Schema (key columns)
- id (uuid, pk)
- created_at/updated_at (timestamptz)
- [Additional key columns]

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- [Document business rules and constraints]

## Example Queries
- [Common queries for this table]

## Notes
- [Additional implementation notes]
```

## Next Steps

### Immediate Actions (This Week)
1. **Run Inventory SQL** - Execute the SQL in `01-INVENTORY_SQL.md` in Supabase online
2. **Update High Priority Tables** - Complete docs for profiles, api_models, projects
3. **Verify Bucket Configurations** - Check actual bucket settings in Supabase dashboard
4. **Update Integration Maps** - Document which components use each table

### Short Term (Next 2 Weeks)
1. **Complete Medium Priority Tables** - Finish remaining core functionality docs
2. **Add Business Rules** - Document constraints and validation logic
3. **Create Example Queries** - Add common query patterns
4. **Update README.md** - Refresh the main navigation file

### Long Term (Ongoing)
1. **Maintain Documentation** - Keep docs current with schema changes
2. **Add Low Priority Tables** - Complete analytics and admin documentation
3. **Review and Refine** - Improve documentation quality and completeness
4. **Automate Updates** - Create scripts to sync documentation with schema changes

## Success Metrics

- [ ] All 25 tables have complete documentation
- [ ] All 4 storage buckets have configuration docs
- [ ] Integration maps are accurate and complete
- [ ] Business rules are documented and validated
- [ ] Example queries are tested and working
- [ ] Documentation is kept current with schema changes

## Notes

- **Supabase Online**: Remember to use Supabase online SQL editor, not local
- **Schema Changes**: Update documentation whenever tables are modified
- **Integration Tracking**: Keep track of which components use which tables
- **Business Logic**: Document not just structure, but also how data flows and is used
