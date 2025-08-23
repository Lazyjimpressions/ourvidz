#!/usr/bin/env node

/**
 * Query Supabase Directly
 * 
 * This script allows Claude Code to run arbitrary queries against your Supabase database
 * and save the results to a markdown file for reference.
 * 
 * Usage: 
 *   node scripts/query-supabase.js "SELECT * FROM profiles LIMIT 5"
 *   node scripts/query-supabase.js --sql-file queries/my-query.sql
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ulmdmzhcdwfadbvfpckt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY not found in environment variables');
  console.log('Add it to your .env file: SUPABASE_SERVICE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeQuery(sql) {
  try {
    // Use the Supabase SQL API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Fallback: Try using pg connection if available
      console.log('Direct SQL not available, using Supabase client...');
      
      // Parse the SQL to determine table and operation
      const match = sql.match(/FROM\s+(\w+)/i);
      if (match) {
        const tableName = match[1];
        const { data, error } = await supabase.from(tableName).select('*').limit(100);
        
        if (error) throw error;
        return data;
      }
      
      throw new Error('Could not execute query');
    }

    return await response.json();
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
}

function formatResultsAsMarkdown(results, query) {
  const timestamp = new Date().toISOString();
  
  let markdown = `# Supabase Query Results

**Timestamp:** ${timestamp}
**Query:** 
\`\`\`sql
${query}
\`\`\`

## Results

`;

  if (!results || results.length === 0) {
    markdown += 'No results found.\n';
    return markdown;
  }

  // Create table from results
  const columns = Object.keys(results[0]);
  
  markdown += `| ${columns.join(' | ')} |\n`;
  markdown += `| ${columns.map(() => '---').join(' | ')} |\n`;
  
  for (const row of results) {
    const values = columns.map(col => {
      const val = row[col];
      if (val === null) return 'NULL';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val).replace(/\|/g, '\\|');
    });
    markdown += `| ${values.join(' | ')} |\n`;
  }

  markdown += `\n**Total Rows:** ${results.length}\n`;

  return markdown;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/query-supabase.js "SELECT * FROM profiles LIMIT 5"');
    console.log('  node scripts/query-supabase.js --sql-file queries/my-query.sql');
    process.exit(0);
  }

  let query;
  
  if (args[0] === '--sql-file') {
    const filePath = path.join(__dirname, '..', args[1]);
    query = await fs.readFile(filePath, 'utf-8');
  } else {
    query = args.join(' ');
  }

  console.log('🔍 Executing query...\n');
  
  try {
    const results = await executeQuery(query);
    
    // Format and save results
    const markdown = formatResultsAsMarkdown(results, query);
    
    const outputPath = path.join(__dirname, '..', 'docs', 'LAST_QUERY_RESULTS.md');
    await fs.writeFile(outputPath, markdown, 'utf-8');
    
    console.log(`✅ Results saved to: docs/LAST_QUERY_RESULTS.md`);
    console.log(`📊 Returned ${results?.length || 0} rows`);
    
    // Also output to console for immediate viewing
    if (results && results.length > 0) {
      console.log('\nFirst 3 results:');
      console.table(results.slice(0, 3));
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
}

main();