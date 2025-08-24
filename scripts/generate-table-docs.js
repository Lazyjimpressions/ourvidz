#!/usr/bin/env node

/**
 * Generate table documentation files for missing tables
 * Usage: node scripts/generate-table-docs.js [table_name]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Table definitions with metadata
const tableDefinitions = {
  // Core User & Authentication
  profiles: {
    purpose: "User profile information and authentication data",
    ownership: "System/Auth",
    category: "Core User & Authentication",
    fileNumber: "12"
  },
  user_roles: {
    purpose: "User role assignments and permissions",
    ownership: "Admin",
    category: "Core User & Authentication", 
    fileNumber: "13"
  },
  user_activity_log: {
    purpose: "User activity tracking and analytics",
    ownership: "System/Analytics",
    category: "Core User & Authentication",
    fileNumber: "14"
  },

  // API & Model Management
  api_providers: {
    purpose: "External API provider configurations",
    ownership: "Admin",
    category: "API & Model Management",
    fileNumber: "15"
  },
  api_models: {
    purpose: "Available AI models and their configurations",
    ownership: "Admin",
    category: "API & Model Management",
    fileNumber: "16"
  },
  model_config_history: {
    purpose: "Historical model configuration changes",
    ownership: "Admin",
    category: "API & Model Management",
    fileNumber: "17"
  },
  model_performance_logs: {
    purpose: "Model performance metrics and logs",
    ownership: "Admin/Analytics",
    category: "API & Model Management",
    fileNumber: "18"
  },
  model_test_results: {
    purpose: "A/B testing results for model configurations",
    ownership: "Admin/Analytics",
    category: "API & Model Management",
    fileNumber: "19"
  },

  // Content Generation & Jobs
  negative_prompts: {
    purpose: "Negative prompt configurations for content generation",
    ownership: "Admin",
    category: "Content Generation & Jobs",
    fileNumber: "31"
  },
  enhancement_presets: {
    purpose: "Prompt enhancement configurations and presets",
    ownership: "Admin",
    category: "Content Generation & Jobs",
    fileNumber: "32"
  },
  compel_configs: {
    purpose: "Compel-specific configuration settings",
    ownership: "Admin",
    category: "Content Generation & Jobs",
    fileNumber: "33"
  },

  // Content Library
  user_collections: {
    purpose: "User-created content collections",
    ownership: "User",
    category: "Content Library",
    fileNumber: "41"
  },
  workspace_assets: {
    purpose: "Assets associated with workspaces",
    ownership: "User",
    category: "Content Library",
    fileNumber: "42"
  },
  scenes: {
    purpose: "Scene definitions and metadata",
    ownership: "User",
    category: "Content Library",
    fileNumber: "43"
  },

  // Projects & Workspaces
  projects: {
    purpose: "Project definitions and metadata",
    ownership: "User",
    category: "Projects & Workspaces",
    fileNumber: "60"
  },

  // Testing & Analytics
  prompt_ab_tests: {
    purpose: "A/B testing for prompt variations",
    ownership: "Admin/Analytics",
    category: "Testing & Analytics",
    fileNumber: "70"
  },
  usage_logs: {
    purpose: "System usage analytics and metrics",
    ownership: "System/Analytics",
    category: "Testing & Analytics",
    fileNumber: "71"
  },

  // Admin & Development
  admin_development_progress: {
    purpose: "Development task tracking and progress",
    ownership: "Admin/Development",
    category: "Admin & Development",
    fileNumber: "80"
  }
};

function generateTableDoc(tableName) {
  const table = tableDefinitions[tableName];
  if (!table) {
    console.error(`Unknown table: ${tableName}`);
    console.log('Available tables:', Object.keys(tableDefinitions).join(', '));
    return;
  }

  const template = `# Table: ${tableName}

Purpose: ${table.purpose}

Ownership: ${table.ownership}

## Schema (key columns)
- id (uuid, pk)
- created_at/updated_at (timestamptz)
- [Additional columns to be documented from schema]

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
`;

  const fileName = `${table.fileNumber}-${tableName}.md`;
  const filePath = path.join(__dirname, '..', 'docs', 'tables', fileName);
  
  fs.writeFileSync(filePath, template);
  console.log(`Generated: ${fileName}`);
  console.log(`Category: ${table.category}`);
  console.log(`File: ${filePath}`);
}

function generateAllMissingDocs() {
  console.log('Generating documentation for all missing tables...\n');
  
  Object.keys(tableDefinitions).forEach(tableName => {
    generateTableDoc(tableName);
  });
  
  console.log('\n✅ All table documentation templates generated!');
  console.log('\nNext steps:');
  console.log('1. Run the inventory SQL to get current schema details');
  console.log('2. Update each generated file with actual schema information');
  console.log('3. Add integration maps and business rules');
  console.log('4. Update 00-INVENTORY.md to mark tables as documented');
}

// Main execution
const tableName = process.argv[2];

if (tableName) {
  generateTableDoc(tableName);
} else {
  generateAllMissingDocs();
}
