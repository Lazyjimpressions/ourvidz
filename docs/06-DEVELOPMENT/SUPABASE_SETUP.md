# Supabase Local Development Setup for OurVidz

## ✅ GitHub-Safe File Structure

This setup is designed to work seamlessly with GitHub syncing.

### What Gets Committed to GitHub:
```
ourvidz/
├── supabase/
│   ├── config.toml              ✅ Committed (project config)
│   ├── migrations/              ✅ Committed (schema versions)
│   ├── functions/               ✅ Committed (edge functions)
│   ├── seed.sql                 ✅ Committed (sample data)
│   └── .gitignore              ✅ Committed (ignore rules)
├── scripts/
│   ├── sync-schema-*.js        ✅ Committed (utility scripts)
│   └── setup-local-supabase.sh ✅ Committed (setup guide)
├── docs/
│   └── SUPABASE_SCHEMA.md      ✅ Committed (schema documentation)
└── .env                         ✅ Committed (public keys only)
```

### What Never Gets Committed:
```
ourvidz/
├── supabase/
│   ├── .temp/                   ❌ Ignored (local DB data)
│   ├── .branches/               ❌ Ignored (branch data)
│   └── .env.local              ❌ Ignored (secrets)
├── .env.local                   ❌ Ignored (project secrets)
└── node_modules/                ❌ Ignored (dependencies)
```

## Setting Up Local Supabase

### Step 1: Global Setup (One-time for all projects)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login to Supabase (stores token in ~/.supabase/)
supabase login
```

### Step 2: Project Setup (In ourvidz directory)

```bash
cd /Users/jonathanhughes/Development/ourvidz

# Link to your remote project
supabase link --project-ref ulmdmzhcdwfadbvfpckt

# Pull the remote database schema
supabase db pull

# Start local Supabase (creates .temp/ directory)
supabase start
```

### Step 3: Environment Variables

Create `.env.local` (never committed):
```bash
# Get these from Supabase Dashboard > Settings > API
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_PASSWORD=your-db-password
```

## How This Works with GitHub

### When You Pull from GitHub:
1. You get all migrations, functions, and config
2. Run `supabase start` to create local database
3. Run `supabase db reset` to apply migrations

### When You Push to GitHub:
1. Local `.temp/` directory is ignored
2. Only schema changes (migrations) are committed
3. Collaborators can recreate exact same DB locally

### Making Schema Changes:

```bash
# Option 1: Create migration from changes
supabase db diff --use-migra -f new_feature

# Option 2: Pull changes from remote
supabase db pull

# Apply migrations locally
supabase db reset
```

## Claude Code Integration

### To give Claude Code visibility:

1. **Run the schema sync:**
```bash
npm run sync:schema
```

2. **Claude Code can then read:**
- `docs/SUPABASE_SCHEMA.md` - Current schema documentation
- `supabase/migrations/*.sql` - Schema history
- `src/integrations/supabase/types.ts` - TypeScript types

### Available NPM Scripts:
```json
{
  "sync:schema": "node scripts/fetch-schema-direct.js",
  "sync:schema:cli": "node scripts/sync-schema-cli.js",
  "query:supabase": "node scripts/query-supabase.js"
}
```

## Security Best Practices

### DO Commit:
- ✅ Public anon key in `.env`
- ✅ Migration files
- ✅ Edge function code
- ✅ Config files

### NEVER Commit:
- ❌ Service role keys
- ❌ Database passwords
- ❌ `.env.local` files
- ❌ `.temp/` directories
- ❌ Database dumps with real data

## Troubleshooting

### If supabase/.temp/ was accidentally tracked:
```bash
# Remove from git tracking
git rm -r --cached supabase/.temp/

# Commit the removal
git commit -m "Remove local Supabase temp files from tracking"
```

### To completely reset local database:
```bash
# Stop local Supabase
supabase stop

# Remove temp directory
rm -rf supabase/.temp/

# Start fresh
supabase start
supabase db reset
```

## Benefits of This Setup

1. **GitHub Safe**: No sensitive data or large DB files in repo
2. **Team Friendly**: Anyone can recreate exact DB locally
3. **Version Controlled**: All schema changes tracked in migrations
4. **AI Accessible**: Claude Code can read schema documentation
5. **Secure**: Service keys stay local, never in GitHub
6. **Efficient**: Only text files (SQL migrations) in repo