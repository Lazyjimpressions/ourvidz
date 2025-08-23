#!/usr/bin/env node

/**
 * Supabase Schema Sync using CLI
 * 
 * This script uses the Supabase CLI to fetch the actual database schema
 * and saves it to a markdown file for AI reference.
 * 
 * Prerequisites:
 * - Supabase CLI installed: brew install supabase/tap/supabase
 * - Logged in: supabase login
 * 
 * Usage: node scripts/sync-schema-cli.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_REF = 'ulmdmzhcdwfadbvfpckt';

async function runSupabaseCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(`supabase ${command}`);
    if (stderr && !stderr.includes('Warning')) {
      console.warn('Warning:', stderr);
    }
    return stdout;
  } catch (error) {
    console.error(`Error running: supabase ${command}`);
    console.error(error.message);
    return null;
  }
}

async function fetchDatabaseSchema() {
  console.log('📊 Fetching database schema from Supabase...');
  
  // Use db dump to get the schema
  const schema = await runSupabaseCommand(`db dump --schema-only --project-ref ${PROJECT_REF}`);
  
  if (!schema) {
    return null;
  }

  // Parse the SQL dump to extract table information
  const tables = {};
  let currentTable = null;
  let inCreateTable = false;
  
  const lines = schema.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for CREATE TABLE statements
    if (line.includes('CREATE TABLE') && line.includes('public.')) {
      const match = line.match(/CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/);
      if (match) {
        currentTable = match[1];
        tables[currentTable] = { columns: [], indexes: [], constraints: [] };
        inCreateTable = true;
      }
    }
    
    // Parse columns within CREATE TABLE
    if (inCreateTable && currentTable && line.trim() && !line.includes('CREATE TABLE')) {
      const trimmed = line.trim();
      
      // Check for end of CREATE TABLE
      if (trimmed.startsWith(');')) {
        inCreateTable = false;
        currentTable = null;
        continue;
      }
      
      // Skip constraints and other non-column definitions
      if (trimmed.startsWith('CONSTRAINT') || 
          trimmed.startsWith('PRIMARY KEY') || 
          trimmed.startsWith('FOREIGN KEY') ||
          trimmed.startsWith('CHECK') ||
          trimmed.startsWith('UNIQUE')) {
        continue;
      }
      
      // Parse column definition
      const columnMatch = trimmed.match(/^"?(\w+)"?\s+(.+?)(?:,)?$/);
      if (columnMatch) {
        const [, columnName, columnDef] = columnMatch;
        
        // Extract type and constraints
        let type = columnDef;
        let nullable = true;
        let defaultValue = null;
        
        if (columnDef.includes('NOT NULL')) {
          nullable = false;
          type = type.replace('NOT NULL', '').trim();
        }
        
        const defaultMatch = columnDef.match(/DEFAULT (.+?)(?:\s|,|$)/);
        if (defaultMatch) {
          defaultValue = defaultMatch[1];
          type = type.replace(/DEFAULT .+?(?:\s|,|$)/, '').trim();
        }
        
        // Clean up the type
        type = type.replace(/,$/, '').trim();
        
        tables[currentTable].columns.push({
          name: columnName,
          type: type,
          nullable: nullable,
          default: defaultValue
        });
      }
    }
    
    // Look for indexes
    if (line.includes('CREATE INDEX') || line.includes('CREATE UNIQUE INDEX')) {
      const match = line.match(/ON public\.(\w+)/);
      if (match) {
        const tableName = match[1];
        if (tables[tableName]) {
          const indexMatch = line.match(/CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?"?(\w+)"?/);
          if (indexMatch) {
            tables[tableName].indexes.push(indexMatch[1]);
          }
        }
      }
    }
  }
  
  return tables;
}

async function fetchStorageBuckets() {
  console.log('🗂️ Fetching storage buckets...');
  
  const output = await runSupabaseCommand(`storage ls --project-ref ${PROJECT_REF}`);
  
  if (!output) {
    return [];
  }
  
  const buckets = [];
  const lines = output.split('\n').slice(1); // Skip header
  
  for (const line of lines) {
    if (line.trim()) {
      // Parse the table output
      const parts = line.split(/\s+/);
      if (parts[0] && parts[0] !== 'NAME') {
        buckets.push({
          name: parts[0],
          public: parts[1] === 'true'
        });
      }
    }
  }
  
  return buckets;
}

async function fetchEdgeFunctions() {
  console.log('⚡ Scanning Edge Functions...');
  
  const functionsDir = path.join(__dirname, '..', 'supabase', 'functions');
  
  try {
    const items = await fs.readdir(functionsDir);
    const functions = [];
    
    for (const item of items) {
      if (!item.startsWith('_')) {
        const indexPath = path.join(functionsDir, item, 'index.ts');
        try {
          await fs.access(indexPath);
          functions.push(item);
        } catch {
          // No index.ts file
        }
      }
    }
    
    return functions.sort();
  } catch (error) {
    console.error('Error reading functions directory:', error);
    return [];
  }
}

function generateMarkdown(data) {
  const { tables, buckets, functions } = data;
  const timestamp = new Date().toISOString();
  
  let md = `# Supabase Schema Reference

> Last Updated: ${timestamp}
> Project ID: ${PROJECT_REF}
> URL: https://${PROJECT_REF}.supabase.co

This file is auto-generated by \`scripts/sync-schema-cli.js\`
Run \`npm run sync:schema:cli\` to update.

## Table of Contents

- [Database Tables](#database-tables) (${Object.keys(tables).length} tables)
- [Edge Functions](#edge-functions) (${functions.length} functions)
- [Storage Buckets](#storage-buckets) (${buckets.length} buckets)

## Database Tables

`;

  // Add tables sorted alphabetically
  const sortedTables = Object.keys(tables).sort();
  
  for (const tableName of sortedTables) {
    const table = tables[tableName];
    md += `### ${tableName}\n\n`;
    
    if (table.columns.length > 0) {
      md += `| Column | Type | Nullable | Default |\n`;
      md += `|--------|------|----------|----------|\n`;
      
      for (const col of table.columns) {
        md += `| ${col.name} | \`${col.type}\` | ${col.nullable ? 'YES' : 'NO'} | ${col.default || '-'} |\n`;
      }
    } else {
      md += `*No columns found*\n`;
    }
    
    if (table.indexes.length > 0) {
      md += `\n**Indexes:** ${table.indexes.join(', ')}\n`;
    }
    
    md += '\n';
  }

  // Add Edge Functions
  md += `## Edge Functions\n\n`;
  
  for (const func of functions) {
    md += `- \`${func}\` → /functions/v1/${func}\n`;
  }
  
  md += '\n';

  // Add Storage Buckets
  md += `## Storage Buckets\n\n`;
  md += `| Bucket | Public | Purpose |\n`;
  md += `|--------|--------|----------|\n`;
  
  const bucketPurposes = {
    'videos': 'Generated videos',
    'image_fast': 'Fast quality images',
    'image_high': 'High quality images',
    'system_assets': 'System assets and placeholders',
    'avatars': 'User avatars',
    'video_fast': 'Fast quality videos',
    'video_high': 'High quality videos',
    'sdxl_image_fast': 'SDXL fast images',
    'sdxl_image_high': 'SDXL high quality images',
    'reference_images': 'Reference images for generation',
    'workspace-temp': 'Temporary workspace files',
    'user-library': 'User saved assets'
  };
  
  for (const bucket of buckets) {
    const purpose = bucketPurposes[bucket.name] || 'Storage';
    md += `| ${bucket.name} | ${bucket.public ? '✅' : '🔒'} | ${purpose} |\n`;
  }
  
  md += '\n';

  // Add quick reference
  md += `## Quick Reference for Claude Code\n\n`;
  md += `### Key Tables\n\n`;
  md += `- **profiles** - User profiles and authentication\n`;
  md += `- **projects** - User projects and media generation requests\n`;
  md += `- **jobs** - Job queue for generation tasks\n`;
  md += `- **workspace_assets** - Temporary workspace files (auto-cleanup)\n`;
  md += `- **user_library** - Permanently saved user assets\n`;
  md += `- **characters** - Roleplay character definitions\n`;
  md += `- **conversations** - Chat conversations\n`;
  md += `- **messages** - Individual messages in conversations\n`;
  md += `- **api_models** - Available AI models and configurations\n`;
  md += `- **api_providers** - API provider settings\n`;
  md += `- **prompt_templates** - Prompt enhancement templates\n\n`;
  
  md += `### Key Edge Functions\n\n`;
  md += `- **queue-job** - Queue generation jobs\n`;
  md += `- **generate-content** - Generate images/videos\n`;
  md += `- **enhance-prompt** - Enhance prompts with AI\n`;
  md += `- **playground-chat** - Handle chat conversations\n`;
  md += `- **workspace-actions** - Manage workspace assets\n`;

  return md;
}

async function main() {
  console.log('🚀 Starting Supabase CLI schema sync...\n');
  
  try {
    // Check if CLI is available
    await execAsync('supabase --version');
  } catch (error) {
    console.error('❌ Supabase CLI not found!');
    console.log('Install it with: brew install supabase/tap/supabase');
    console.log('Then login with: supabase login');
    process.exit(1);
  }
  
  const tables = await fetchDatabaseSchema();
  const buckets = await fetchStorageBuckets();
  const functions = await fetchEdgeFunctions();
  
  if (!tables) {
    console.error('❌ Failed to fetch database schema');
    console.log('Make sure you are logged in: supabase login');
    process.exit(1);
  }
  
  const markdown = generateMarkdown({ tables, buckets, functions });
  
  // Save to file
  const outputPath = path.join(__dirname, '..', 'docs', 'SUPABASE_SCHEMA.md');
  await fs.writeFile(outputPath, markdown, 'utf-8');
  
  console.log(`\n✅ Schema exported to: docs/SUPABASE_SCHEMA.md`);
  console.log(`📊 Found ${Object.keys(tables).length} tables`);
  console.log(`⚡ Found ${functions.length} edge functions`);
  console.log(`🗂️ Found ${buckets.length} storage buckets`);
}

main().catch(console.error);