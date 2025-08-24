#!/usr/bin/env node

/**
 * Generate SQL commands to get details for each table
 * Usage: node scripts/get-table-details.js [table_name]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tables that need documentation (from your SQL results)
const tables = [
  { name: 'profiles', columns: 7, priority: 'high' },
  { name: 'user_roles', columns: 4, priority: 'medium' },
  { name: 'user_activity_log', columns: 9, priority: 'low' },
  { name: 'api_providers', columns: 12, priority: 'high' },
  { name: 'api_models', columns: 19, priority: 'high' },
  { name: 'model_config_history', columns: 8, priority: 'low' },
  { name: 'model_performance_logs', columns: 11, priority: 'low' },
  { name: 'model_test_results', columns: 30, priority: 'low' },
  { name: 'negative_prompts', columns: 10, priority: 'medium' },
  { name: 'enhancement_presets', columns: 13, priority: 'medium' },
  { name: 'compel_configs', columns: 10, priority: 'medium' },
  { name: 'user_collections', columns: 6, priority: 'high' },
  { name: 'scenes', columns: 10, priority: 'medium' },
  { name: 'projects', columns: 14, priority: 'high' },
  { name: 'prompt_ab_tests', columns: 13, priority: 'low' },
  { name: 'usage_logs', columns: 8, priority: 'low' },
  { name: 'admin_development_progress', columns: 14, priority: 'low' }
];

function generateSQLForTable(tableName) {
  return `-- Get detailed information for ${tableName}
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = '${tableName}'
ORDER BY ordinal_position;`;
}

function generateAllSQL() {
  console.log('📋 SQL Commands for All Tables');
  console.log('==============================\n');
  
  // Group by priority
  const highPriority = tables.filter(t => t.priority === 'high');
  const mediumPriority = tables.filter(t => t.priority === 'medium');
  const lowPriority = tables.filter(t => t.priority === 'low');
  
  console.log('🔥 HIGH PRIORITY TABLES:');
  console.log('========================');
  highPriority.forEach(table => {
    console.log(`\n-- ${table.name} (${table.columns} columns)`);
    console.log(generateSQLForTable(table.name));
  });
  
  console.log('\n\n🔶 MEDIUM PRIORITY TABLES:');
  console.log('==========================');
  mediumPriority.forEach(table => {
    console.log(`\n-- ${table.name} (${table.columns} columns)`);
    console.log(generateSQLForTable(table.name));
  });
  
  console.log('\n\n🔵 LOW PRIORITY TABLES:');
  console.log('=======================');
  lowPriority.forEach(table => {
    console.log(`\n-- ${table.name} (${table.columns} columns)`);
    console.log(generateSQLForTable(table.name));
  });
  
  console.log('\n\n📦 STORAGE BUCKETS:');
  console.log('==================');
  console.log(`
-- Get storage bucket information
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
ORDER BY name;`);
  
  console.log('\n\n🎯 RECOMMENDED ORDER:');
  console.log('====================');
  console.log('1. Start with HIGH PRIORITY tables (core functionality)');
  console.log('2. Then MEDIUM PRIORITY tables (important features)');
  console.log('3. Finally LOW PRIORITY tables (analytics/admin)');
  console.log('4. Don\'t forget storage buckets!');
}

function generateSQLForSpecificTable(tableName) {
  const table = tables.find(t => t.name === tableName);
  if (!table) {
    console.error(`Table '${tableName}' not found in the list.`);
    console.log('Available tables:', tables.map(t => t.name).join(', '));
    return;
  }
  
  console.log(`📋 SQL for ${tableName} (${table.columns} columns, ${table.priority} priority)`);
  console.log('='.repeat(60));
  console.log(generateSQLForTable(tableName));
  
  // Also show foreign keys and primary keys
  console.log('\n-- Get foreign keys for this table');
  console.log(`SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name = '${tableName}';`);
  
  console.log('\n-- Get primary key for this table');
  console.log(`SELECT 
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
    AND kcu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name = '${tableName}';`);
}

// Main execution
const tableName = process.argv[2];

if (tableName) {
  generateSQLForSpecificTable(tableName);
} else {
  generateAllSQL();
}
