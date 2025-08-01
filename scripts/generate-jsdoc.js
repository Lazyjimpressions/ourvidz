#!/usr/bin/env node

/**
 * JSDoc Generator Script
 * Automatically generates JSDoc comments for functions missing documentation
 * 
 * Usage: node scripts/generate-jsdoc.js [file-path]
 */

import fs from 'fs';
import path from 'path';

/**
 * Generates JSDoc comment for a function
 * @param {string} functionName - Name of the function
 * @param {string} className - Name of the class (if applicable)
 * @param {string} returnType - Return type of the function
 * @param {Array} params - Array of parameter objects
 * @returns {string} Generated JSDoc comment
 */
function generateJSDocComment(functionName, className = '', returnType = 'void', params = []) {
  const description = functionName
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^./, str => str.toUpperCase());
  
  let jsdoc = `/**
 * ${description}`;
  
  // Add parameter documentation
  params.forEach(param => {
    jsdoc += `\n * @param {${param.type}} ${param.name} - ${param.description}`;
  });
  
  // Add return documentation
  if (returnType !== 'void') {
    jsdoc += `\n * @returns {${returnType}} ${getReturnDescription(returnType)}`;
  }
  
  jsdoc += '\n */';
  
  return jsdoc;
}

/**
 * Gets a description for the return type
 * @param {string} returnType - The return type
 * @returns {string} Description of what the function returns
 */
function getReturnDescription(returnType) {
  const descriptions = {
    'string': 'The result string',
    'number': 'The result number',
    'boolean': 'Whether the operation was successful',
    'Promise<string>': 'Promise that resolves to the result',
    'Promise<number>': 'Promise that resolves to the result number',
    'Promise<boolean>': 'Promise that resolves to success status',
    'Promise<void>': 'Promise that resolves when operation completes',
    'void': 'Nothing (void function)'
  };
  
  return descriptions[returnType] || 'The result';
}

/**
 * Extracts function information from TypeScript code
 * @param {string} code - The TypeScript code
 * @param {string} functionName - The function name to look for
 * @returns {Object} Function information
 */
function extractFunctionInfo(code, functionName) {
  const functionRegex = new RegExp(
    `(?:export\\s+)?(?:static\\s+)?(?:async\\s+)?(?:function\\s+)?${functionName}\\s*\\(([^)]*)\\)\\s*:\\s*([^{]+)`,
    'g'
  );
  
  const match = functionRegex.exec(code);
  if (!match) return null;
  
  const params = match[1].split(',').map(param => {
    const [name, type] = param.trim().split(':').map(s => s.trim());
    return {
      name: name.replace(/\?$/, ''), // Remove optional marker
      type: type || 'any',
      description: `${name} parameter`
    };
  });
  
  const returnType = match[2].trim();
  
  return { params, returnType };
}

/**
 * Main function to process a file and add JSDoc
 * @param {string} filePath - Path to the file to process
 */
function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const newLines = [...lines];
  
  // Find functions that need JSDoc
  const functionsToDocument = [
    'GenerationService',
    'queueGeneration',
    'useJobQueue',
    'useAutoEnhancement',
    'ErrorBoundary'
  ];
  
  functionsToDocument.forEach(funcName => {
    const funcInfo = extractFunctionInfo(content, funcName);
    if (funcInfo) {
      const jsdoc = generateJSDocComment(funcName, '', funcInfo.returnType, funcInfo.params);
      
      // Find the function line and add JSDoc before it
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(funcName) && lines[i].includes('(')) {
          newLines.splice(i, 0, jsdoc);
          break;
        }
      }
    }
  });
  
  // Write the updated content back
  fs.writeFileSync(filePath, newLines.join('\n'));
  console.log(`✅ Updated ${filePath} with JSDoc comments`);
}

// Main execution
const filePath = process.argv[2];
if (filePath) {
  processFile(filePath);
} else {
  console.log('Usage: node scripts/generate-jsdoc.js <file-path>');
  console.log('Example: node scripts/generate-jsdoc.js src/lib/services/GenerationService.ts');
} 