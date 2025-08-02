#!/usr/bin/env node

/**
 * Documentation Update Script
 * Automates documentation maintenance and updates
 * 
 * Usage: node scripts/update-docs.js [command]
 * Commands: jsdoc, consolidate, status, all
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Updates JSDoc for all functions
 */
function updateJSDoc() {
  console.log('🔄 Updating JSDoc documentation...');
  
  try {
    // Run JSDoc generation script
    execSync('node scripts/generate-jsdoc.js', { stdio: 'inherit' });
    console.log('✅ JSDoc updated successfully');
  } catch (error) {
    console.error('❌ JSDoc update failed:', error.message);
  }
}

/**
 * Consolidates documentation files
 */
function consolidateDocs() {
  console.log('📚 Consolidating documentation...');
  
  const docsDir = './docs';
  const files = fs.readdirSync(docsDir);
  
  // List all documentation files
  console.log('\n📋 Current documentation files:');
  files.forEach(file => {
    if (file.endsWith('.md')) {
      const stats = fs.statSync(path.join(docsDir, file));
      console.log(`  - ${file} (${stats.size} bytes)`);
    }
  });
  
  console.log('\n✅ Documentation consolidation check complete');
}

/**
 * Shows documentation status
 */
function showStatus() {
  console.log('📊 Documentation Status Report');
  console.log('==============================');
  
  // Check JSDoc coverage
  try {
    const result = execSync('npm run lint:jsdoc 2>&1', { encoding: 'utf8' });
    const warnings = (result.match(/warning/g) || []).length;
    console.log(`📝 JSDoc Warnings: ${warnings}`);
  } catch (error) {
    console.log('📝 JSDoc Status: Check failed');
  }
  
  // Check documentation files
  const docsDir = './docs';
  if (fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
    console.log(`📚 Documentation Files: ${files.length}`);
    
    // Check for key files
    const keyFiles = [
      '01-AI_CONTEXT.md',
      '02-ARCHITECTURE.md',
      '03-API.md',
      '04-DEPLOYMENT.md',
      '05-WORKER_SYSTEM.md',
      '06-WORKER_API.md',
      '07-RUNPOD_SETUP.md',
      '08-ADMIN.md',
      '09-TESTING.md',
      '10-CHANGELOG.md'
    ];
    
    keyFiles.forEach(file => {
      const exists = fs.existsSync(path.join(docsDir, file));
      console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    });
  }
  
  console.log('\n✅ Status report complete');
}

/**
 * Updates all documentation
 */
function updateAll() {
  console.log('🚀 Running complete documentation update...\n');
  
  updateJSDoc();
  console.log('');
  consolidateDocs();
  console.log('');
  showStatus();
}

/**
 * Main function
 */
function main() {
  const command = process.argv[2] || 'status';
  
  console.log('📖 OurVidz Documentation Update Tool\n');
  
  switch (command) {
    case 'jsdoc':
      updateJSDoc();
      break;
    case 'consolidate':
      consolidateDocs();
      break;
    case 'status':
      showStatus();
      break;
    case 'all':
      updateAll();
      break;
    default:
      console.log('❌ Unknown command:', command);
      console.log('\nAvailable commands:');
      console.log('  jsdoc      - Update JSDoc for all functions');
      console.log('  consolidate - Check documentation consolidation');
      console.log('  status     - Show documentation status');
      console.log('  all        - Run all updates');
      process.exit(1);
  }
}

// Run the script
main(); 