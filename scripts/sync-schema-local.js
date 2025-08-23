#!/usr/bin/env node

/**
 * Local Supabase Schema Sync
 * 
 * This script connects to your LOCAL Supabase instance to get complete schema information
 * without RLS restrictions. Run this when your local Supabase is running.
 * 
 * Usage: node scripts/sync-schema-local.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local Supabase connection (no RLS restrictions)
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY);

async function fetchTableSchema(tableName) {
  console.log(`  📋 Fetching schema for: ${tableName}`);
  
  try {
    // Query information_schema directly for complete column info
    const { data, error } = await supabase.rpc('sql', {
      query: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
        ORDER BY ordinal_position;
      `
    });

    if (error) {
      // Fallback: Try direct table query with LIMIT 0 to get structure
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      if (sampleError) {
        console.warn(`    ⚠️ Could not fetch schema for ${tableName}: ${sampleError.message}`);
        return null;
      }

      // If we get here, we have an empty result but can infer from the query structure
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn(`    ⚠️ Error with table ${tableName}: ${err.message}`);
    return null;
  }
}

async function fetchAllTables() {
  console.log('📊 Fetching all tables from local database...');
  
  try {
    // Get all table names from information_schema
    const { data, error } = await supabase.rpc('sql', {
      query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    });

    if (error) {
      console.error('Error fetching table list:', error);
      return null;
    }

    return data.map(row => row.table_name);
  } catch (err) {
    console.error('Failed to fetch table list:', err);
    return null;
  }
}

async function fetchStorageBuckets() {
  console.log('🗂️ Fetching storage buckets from local instance...');
  
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.warn('Could not fetch buckets:', error.message);
      return [];
    }
    
    return data || [];
  } catch (err) {
    return [];
  }
}

async function fetchEdgeFunctions() {
  console.log('⚡ Scanning local Edge Functions...');
  
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
> Project ID: ulmdmzhcdwfadbvfpckt (Local Mirror)
> Local URL: ${LOCAL_SUPABASE_URL}

This file is auto-generated from your LOCAL Supabase instance by \`scripts/sync-schema-local.js\`
Run \`npm run sync:schema:local\` to update.

## Database Tables (${Object.keys(tables).length} tables)

`;

  // Add tables with full schema information
  for (const [tableName, columns] of Object.entries(tables)) {
    md += `### ${tableName}\n\n`;
    
    if (columns && columns.length > 0) {
      md += `| Column | Type | Nullable | Default | Length/Precision |\n`;
      md += `|--------|------|----------|---------|------------------|\n`;
      
      for (const col of columns) {
        const type = col.data_type || 'unknown';
        const nullable = col.is_nullable === 'YES' ? '✅' : '❌';
        const defaultVal = col.column_default || '-';
        const length = col.character_maximum_length 
          ? `${col.character_maximum_length}` 
          : col.numeric_precision 
          ? `${col.numeric_precision}${col.numeric_scale ? ',' + col.numeric_scale : ''}`
          : '-';
        
        md += `| ${col.column_name} | \`${type}\` | ${nullable} | ${defaultVal} | ${length} |\n`;
      }
    } else {
      md += `*No columns found or access restricted*\n`;
    }
    
    md += '\n';
  }

  // Add Edge Functions
  md += `## Edge Functions (${functions.length} functions)\n\n`;
  
  for (const func of functions) {
    md += `- \`${func}\` → http://127.0.0.1:54321/functions/v1/${func}\n`;
  }
  
  md += '\n';

  // Add Storage Buckets
  md += `## Storage Buckets (${buckets.length} buckets)\n\n`;
  md += `| Bucket | Public | ID |\n`;
  md += `|--------|--------|----|;\n`;
  
  for (const bucket of buckets) {
    md += `| ${bucket.name} | ${bucket.public ? '✅' : '🔒'} | ${bucket.id} |\n`;
  }
  
  md += '\n';

  // Add helpful queries section
  md += `## Local Development Queries\n\n`;
  md += `\`\`\`javascript\n`;
  md += `// Connect to local Supabase\n`;
  md += `const supabase = createClient(\n`;
  md += `  'http://127.0.0.1:54321',\n`;
  md += `  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'\n`;
  md += `);\n\n`;
  
  md += `// Example queries (no RLS restrictions locally)\n`;
  md += `const { data: profiles } = await supabase.from('profiles').select('*').limit(5);\n`;
  md += `const { data: jobs } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(10);\n`;
  md += `\`\`\`\n`;

  return md;
}

async function main() {
  console.log('🚀 Starting local Supabase schema sync...\n');
  
  // Check if local Supabase is running
  try {
    const response = await fetch(`${LOCAL_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': LOCAL_SERVICE_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error('Local Supabase not responding');
    }
  } catch (error) {
    console.error('❌ Local Supabase is not running!');
    console.log('Start it with: supabase start');
    console.log('Then run this script again.');
    process.exit(1);
  }
  
  try {
    // Fetch all data
    const tableNames = await fetchAllTables();
    
    if (!tableNames) {
      console.error('❌ Failed to fetch table list');
      process.exit(1);
    }
    
    console.log(`📋 Found ${tableNames.length} tables\n`);
    
    const tableSchemas = {};
    
    for (const tableName of tableNames) {
      const schema = await fetchTableSchema(tableName);
      if (schema) {
        tableSchemas[tableName] = schema;
      }
    }
    
    const buckets = await fetchStorageBuckets();
    const functions = await fetchEdgeFunctions();
    
    // Generate markdown
    const markdown = generateMarkdown({
      tables: tableSchemas,
      buckets,
      functions
    });
    
    // Save to file
    const outputPath = path.join(__dirname, '..', 'docs', 'SUPABASE_SCHEMA.md');
    await fs.writeFile(outputPath, markdown, 'utf-8');
    
    console.log(`\n✅ Schema exported to: docs/SUPABASE_SCHEMA.md`);
    console.log(`📊 Found ${Object.keys(tableSchemas).length} accessible tables with full schema`);
    console.log(`⚡ Found ${functions.length} edge functions`);
    console.log(`🗂️ Found ${buckets.length} storage buckets`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();