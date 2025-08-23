#!/usr/bin/env node

/**
 * Parse Supabase Schema Dump
 * 
 * This script parses the output from `supabase db dump --data-only=false`
 * and generates a comprehensive schema documentation.
 * 
 * Usage: node scripts/parse-schema-dump.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseSchemaDump(dumpContent) {
  const tables = {};
  const functions = [];
  const policies = [];
  
  // Parse CREATE TABLE statements
  const createTableRegex = /CREATE TABLE (?:IF NOT EXISTS )?"public"\."([^"]+)"\s*\(([\s\S]*?)\);/g;
  let match;
  
  while ((match = createTableRegex.exec(dumpContent)) !== null) {
    const tableName = match[1];
    const tableDefinition = match[2];
    
    // Parse columns
    const columns = [];
    const columnLines = tableDefinition.split('\n').filter(line => line.trim());
    
    for (const line of columnLines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('"') && !trimmedLine.startsWith('CONSTRAINT')) {
        // This is a column definition
        const columnMatch = trimmedLine.match(/"([^"]+)"\s+([^,\s]+)(?:\(([^)]+)\))?/);
        if (columnMatch) {
          const columnName = columnMatch[1];
          const dataType = columnMatch[2];
          const length = columnMatch[3] || null;
          
          columns.push({
            name: columnName,
            type: dataType,
            length: length,
            nullable: !trimmedLine.includes('NOT NULL'),
            default: trimmedLine.includes('DEFAULT') ? 'DEFAULT' : null
          });
        }
      }
    }
    
    tables[tableName] = columns;
  }
  
  // Parse CREATE FUNCTION statements
  const createFunctionRegex = /CREATE (?:OR REPLACE )?FUNCTION "public"\."([^"]+)"\s*\(([\s\S]*?)\)/g;
  while ((match = createFunctionRegex.exec(dumpContent)) !== null) {
    const functionName = match[1];
    functions.push(functionName);
  }
  
  // Parse CREATE POLICY statements
  const createPolicyRegex = /CREATE POLICY "([^"]+)" ON "public"\."([^"]+)"/g;
  while ((match = createPolicyRegex.exec(dumpContent)) !== null) {
    const policyName = match[1];
    const tableName = match[2];
    policies.push({ name: policyName, table: tableName });
  }
  
  return { tables, functions, policies };
}

function generateMarkdown(data) {
  const { tables, functions, policies } = data;
  const timestamp = new Date().toISOString();
  
  let md = `# Supabase Schema Reference

> Last Updated: ${timestamp}
> Project ID: ulmdmzhcdwfadbvfpckt
> URL: https://ulmdmzhcdwfadbvfpckt.supabase.co

This file is auto-generated from the Supabase schema dump.
Run \`supabase db dump --data-only=false | node scripts/parse-schema-dump.js\` to update.

## Database Tables (${Object.keys(tables).length} tables)

`;

  // Add tables
  for (const [tableName, columns] of Object.entries(tables)) {
    md += `### ${tableName}\n\n`;
    
    if (columns && columns.length > 0) {
      md += `| Column | Type | Nullable | Default |\n`;
      md += `|--------|------|----------|---------|\n`;
      
      for (const col of columns) {
        const type = col.length ? `${col.type}(${col.length})` : col.type;
        const nullable = col.nullable ? '✅' : '❌';
        const defaultVal = col.default || '-';
        
        md += `| ${col.name} | \`${type}\` | ${nullable} | ${defaultVal} |\n`;
      }
    } else {
      md += `*No columns found*\n`;
    }
    
    md += '\n';
  }

  // Add Functions
  md += `## Database Functions (${functions.length} functions)\n\n`;
  
  for (const func of functions) {
    md += `- \`${func}\`\n`;
  }
  
  md += '\n';

  // Add Policies
  md += `## Row Level Security Policies (${policies.length} policies)\n\n`;
  
  const policiesByTable = {};
  for (const policy of policies) {
    if (!policiesByTable[policy.table]) {
      policiesByTable[policy.table] = [];
    }
    policiesByTable[policy.table].push(policy.name);
  }
  
  for (const [tableName, tablePolicies] of Object.entries(policiesByTable)) {
    md += `### ${tableName}\n\n`;
    for (const policyName of tablePolicies) {
      md += `- \`${policyName}\`\n`;
    }
    md += '\n';
  }

  return md;
}

async function main() {
  console.log('🚀 Parsing Supabase schema dump...\n');
  
  try {
    // Read the schema dump from stdin or from a file
    let dumpContent;
    
    try {
      // Try to read from stdin first
      dumpContent = await new Promise((resolve, reject) => {
        let data = '';
        process.stdin.on('data', chunk => data += chunk);
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', reject);
      });
    } catch (err) {
      // If stdin fails, try to read from a file
      const dumpPath = path.join(__dirname, '..', 'supabase', 'schema-dump.sql');
      dumpContent = await fs.readFile(dumpPath, 'utf-8');
    }
    
    if (!dumpContent || dumpContent.trim().length === 0) {
      console.error('❌ No schema dump content found');
      console.log('Run: supabase db dump --data-only=false | node scripts/parse-schema-dump.js');
      process.exit(1);
    }
    
    // Parse the schema
    const schema = parseSchemaDump(dumpContent);
    
    // Generate markdown
    const markdown = generateMarkdown(schema);
    
    // Save to file
    const outputPath = path.join(__dirname, '..', 'docs', 'SUPABASE_SCHEMA.md');
    await fs.writeFile(outputPath, markdown, 'utf-8');
    
    console.log(`✅ Schema exported to: docs/SUPABASE_SCHEMA.md`);
    console.log(`📊 Found ${Object.keys(schema.tables).length} tables`);
    console.log(`⚡ Found ${schema.functions.length} functions`);
    console.log(`🔒 Found ${schema.policies.length} RLS policies`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
