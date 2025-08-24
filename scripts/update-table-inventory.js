#!/usr/bin/env node

/**
 * Update table inventory with current schema information
 * This script helps maintain the table documentation by:
 * 1. Running the inventory SQL to get current schema
 * 2. Updating the inventory file
 * 3. Providing guidance for updating individual table docs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inventorySQLPath = path.join(__dirname, '..', 'docs', 'tables', '01-INVENTORY_SQL.md');
const inventoryPath = path.join(__dirname, '..', 'docs', 'tables', '00-INVENTORY.md');

function readInventorySQL() {
  try {
    const content = fs.readFileSync(inventorySQLPath, 'utf8');
    // Extract the SQL from the markdown file
    const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
    return sqlMatch ? sqlMatch[1] : null;
  } catch (error) {
    console.error('Error reading inventory SQL file:', error.message);
    return null;
  }
}

function updateInventoryFile() {
  console.log('📋 Table Inventory Update Process');
  console.log('================================\n');
  
  console.log('1. 📊 Current Status:');
  console.log('   - 18 table documentation templates generated');
  console.log('   - 4 bucket documentation templates generated');
  console.log('   - 7 existing documented tables');
  console.log('   - 25 total tables in schema');
  console.log('   - 4 storage buckets\n');
  
  console.log('2. 🔄 Next Steps:');
  console.log('   a) Run the inventory SQL in Supabase online SQL editor');
  console.log('   b) Copy the JSON output and update 00-INVENTORY.md');
  console.log('   c) Populate individual table documentation files');
  console.log('   d) Verify bucket configurations\n');
  
  console.log('3. 📝 SQL Command to Run:');
  const sql = readInventorySQL();
  if (sql) {
    console.log('   Copy this SQL and run it in Supabase SQL editor:\n');
    console.log('   ```sql');
    console.log(sql);
    console.log('   ```\n');
  }
  
  console.log('4. 📁 Generated Files:');
  console.log('   Tables: 12-profiles.md through 80-admin_development_progress.md');
  console.log('   Buckets: 90-avatars.md through 93-thumbnails.md\n');
  
  console.log('5. 🎯 Priority Order for Documentation:');
  console.log('   High Priority:');
  console.log('   - profiles (12-profiles.md) - Core user data');
  console.log('   - api_models (16-api_models.md) - Model configuration');
  console.log('   - user_library (40-images_videos.md) - Content library');
  console.log('   - projects (60-projects.md) - Project management\n');
  
  console.log('   Medium Priority:');
  console.log('   - api_providers (15-api_providers.md) - API configuration');
  console.log('   - user_collections (41-user_collections.md) - Collections');
  console.log('   - workspace_assets (42-workspace_assets.md) - Workspace data\n');
  
  console.log('   Low Priority:');
  console.log('   - Analytics and testing tables');
  console.log('   - Development tracking tables\n');
  
  console.log('6. 🔧 Manual Steps Required:');
  console.log('   - Run inventory SQL in Supabase online');
  console.log('   - Update schema details in each .md file');
  console.log('   - Add integration maps and business rules');
  console.log('   - Verify bucket configurations');
  console.log('   - Update 00-INVENTORY.md status checkboxes\n');
  
  console.log('7. 📚 Documentation Format:');
  console.log('   Each table doc should include:');
  console.log('   - Schema overview with key columns');
  console.log('   - Integration map (pages/components/edge functions)');
  console.log('   - Business rules and constraints');
  console.log('   - Example queries');
  console.log('   - Implementation notes\n');
}

function showTableList() {
  console.log('📋 Complete Table List');
  console.log('=====================\n');
  
  const tables = [
    // Core User & Authentication
    { name: 'profiles', file: '12-profiles.md', status: '❌' },
    { name: 'user_roles', file: '13-user_roles.md', status: '❌' },
    { name: 'user_activity_log', file: '14-user_activity_log.md', status: '❌' },
    
    // API & Model Management
    { name: 'api_providers', file: '15-api_providers.md', status: '❌' },
    { name: 'api_models', file: '16-api_models.md', status: '❌' },
    { name: 'model_config_history', file: '17-model_config_history.md', status: '❌' },
    { name: 'model_performance_logs', file: '18-model_performance_logs.md', status: '❌' },
    { name: 'model_test_results', file: '19-model_test_results.md', status: '❌' },
    
    // Content Generation & Jobs
    { name: 'jobs', file: '30-jobs.md', status: '✅' },
    { name: 'prompt_templates', file: '10-prompt_templates.md', status: '✅' },
    { name: 'negative_prompts', file: '31-negative_prompts.md', status: '❌' },
    { name: 'enhancement_presets', file: '32-enhancement_presets.md', status: '❌' },
    { name: 'compel_configs', file: '33-compel_configs.md', status: '❌' },
    
    // Conversations & Messaging
    { name: 'conversations', file: '20-conversations_messages.md', status: '✅' },
    { name: 'messages', file: '20-conversations_messages.md', status: '✅' },
    
    // Character System
    { name: 'characters', file: '50-characters.md', status: '✅' },
    { name: 'character_scenes', file: '51-character_scenes.md', status: '✅' },
    
    // Content Library
    { name: 'user_library', file: '40-images_videos.md', status: '✅' },
    { name: 'user_collections', file: '41-user_collections.md', status: '❌' },
    { name: 'workspace_assets', file: '42-workspace_assets.md', status: '❌' },
    { name: 'scenes', file: '43-scenes.md', status: '❌' },
    
    // Projects & Workspaces
    { name: 'projects', file: '60-projects.md', status: '❌' },
    
    // Testing & Analytics
    { name: 'prompt_ab_tests', file: '70-prompt_ab_tests.md', status: '❌' },
    { name: 'usage_logs', file: '71-usage_logs.md', status: '❌' },
    
    // Admin & Development
    { name: 'admin_development_progress', file: '80-admin_development_progress.md', status: '❌' },
    { name: 'system_config', file: '11-system_config_cache.md', status: '✅' }
  ];
  
  tables.forEach(table => {
    console.log(`${table.status} ${table.name.padEnd(25)} ${table.file}`);
  });
  
  console.log('\n📦 Storage Buckets:');
  console.log('❌ avatars                   90-avatars.md');
  console.log('❌ generated-content         91-generated-content.md');
  console.log('❌ uploads                   92-uploads.md');
  console.log('❌ thumbnails                93-thumbnails.md');
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'list':
    showTableList();
    break;
  case 'update':
    updateInventoryFile();
    break;
  default:
    console.log('📋 Table Inventory Management');
    console.log('============================\n');
    console.log('Usage:');
    console.log('  node scripts/update-table-inventory.js list    - Show all tables and status');
    console.log('  node scripts/update-table-inventory.js update  - Show update process\n');
    updateInventoryFile();
}
