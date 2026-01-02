# Supabase Setup for OurVidz

## Overview

OurVidz uses **Supabase Online Only** - no local Supabase development. All database operations, edge functions, and migrations are managed through:

1. **Supabase Online Dashboard** - For edge function deployment and manual operations
2. **MCP Server** - For Claude Code to interact with the database directly

**Project Details:**
- **Account**: lazyjimpressions
- **Project URL**: https://supabase.com/dashboard/project/ulmdmzhcdwfadbvfpckt
- **Project Ref**: `ulmdmzhcdwfadbvfpckt`

## Important: No CLI Usage

Per project guidelines in `CLAUDE.md`:
- **DO NOT** use `supabase` CLI commands
- All edge functions are deployed via the Supabase online dashboard
- Use MCP tools for database operations and schema changes

## File Structure

### What Gets Committed to GitHub:
```
ourvidz/
├── supabase/
│   ├── migrations/              ✅ Schema version history (reference only)
│   └── functions/               ✅ Edge function source code
├── src/
│   └── integrations/supabase/
│       ├── client.ts            ✅ Supabase client setup
│       └── types.ts             ✅ Generated TypeScript types
└── docs/
    └── SUPABASE_SCHEMA.md       ✅ Schema documentation
```

### What Never Gets Committed:
```
ourvidz/
├── .mcp.json                    ❌ Contains access tokens
├── .cursor/mcp.json             ❌ Contains access tokens
├── .env.local                   ❌ Project secrets
└── .env                         ❌ Environment variables (if contains secrets)
```

## MCP Server Setup

Claude Code interacts directly with Supabase using the MCP server. This enables:
- Querying the database with `execute_sql`
- Listing tables and viewing schema with `list_tables`
- Applying migrations with `apply_migration`
- Viewing logs and advisories
- Generating TypeScript types

### Configuration Files

Create these files locally (they are gitignored):

**Claude Code** (`.mcp.json` in project root):
```json
{
  "mcpServers": {
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server@latest",
        "--access-token",
        "<your-supabase-access-token>",
        "--project-ref",
        "ulmdmzhcdwfadbvfpckt"
      ],
      "env": {}
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server@latest",
        "--access-token",
        "<your-supabase-access-token>",
        "--project-ref",
        "ulmdmzhcdwfadbvfpckt"
      ],
      "env": {}
    }
  }
}
```

> **Get your access token from**: https://supabase.com/dashboard/account/tokens
>
> **Never commit real tokens to the repository.**

## Common Operations

### Applying Schema Changes (via MCP)

When Claude Code needs to make schema changes:
```
Use mcp__supabase-lazyjimpressions__apply_migration with:
- project_id: "ulmdmzhcdwfadbvfpckt"
- name: "descriptive_migration_name"
- query: "SQL statement"
```

### Querying Data (via MCP)

For read operations or data modifications:
```
Use mcp__supabase-lazyjimpressions__execute_sql with:
- project_id: "ulmdmzhcdwfadbvfpckt"
- query: "SELECT * FROM table_name"
```

### Deploying Edge Functions

Edge functions are deployed via the **Supabase Online Dashboard**:
1. Go to https://supabase.com/dashboard/project/ulmdmzhcdwfadbvfpckt/functions
2. Create or update the function
3. Paste the code from `supabase/functions/<function-name>/index.ts`

### Generating TypeScript Types (via MCP)

```
Use mcp__supabase-lazyjimpressions__generate_typescript_types with:
- project_id: "ulmdmzhcdwfadbvfpckt"
```

Then update `src/integrations/supabase/types.ts` with the output.

## Security Best Practices

### DO Commit:
- ✅ Edge function source code (`supabase/functions/`)
- ✅ Migration SQL files (for reference/history)
- ✅ TypeScript types
- ✅ Schema documentation

### NEVER Commit:
- ❌ Access tokens or API keys
- ❌ `.mcp.json` or `.cursor/mcp.json` files
- ❌ Service role keys
- ❌ Database passwords
- ❌ `.env` files with secrets

## Environment Variables

For local development, create `.env.local` (gitignored):
```bash
# Public keys (safe to use in frontend)
VITE_SUPABASE_URL=https://ulmdmzhcdwfadbvfpckt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>

# Private keys (server-side only, for test scripts)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Get these values from: https://supabase.com/dashboard/project/ulmdmzhcdwfadbvfpckt/settings/api

## Troubleshooting

### MCP Connection Issues

1. Verify your access token is valid at https://supabase.com/dashboard/account/tokens
2. Check the project ref matches: `ulmdmzhcdwfadbvfpckt`
3. Ensure `.mcp.json` is properly formatted JSON

### Edge Function Deployment

If an edge function isn't working:
1. Check logs at https://supabase.com/dashboard/project/ulmdmzhcdwfadbvfpckt/logs
2. Verify secrets are configured in the dashboard
3. Check the function's import statements use Deno-compatible URLs

### Type Mismatches

If TypeScript types are out of sync:
1. Generate fresh types via MCP
2. Update `src/integrations/supabase/types.ts`
3. Run `npm run build` to verify
