console.log('🚀 MAIN.TSX: Script loaded, starting imports...');

import React from 'react'
console.log('✅ MAIN.TSX: React imported successfully');

import { createRoot } from 'react-dom/client'
console.log('✅ MAIN.TSX: createRoot imported successfully');

import App from './App.tsx'
console.log('✅ MAIN.TSX: App imported successfully');

import './index.css'
console.log('✅ MAIN.TSX: CSS imported successfully');

// Initialize mobile console for development (auto-detects local network)
import './utils/mobileConsole'

console.log('🧪 MAIN.TSX: All imports successful, testing DOM...');

try {
  const rootElement = document.getElementById("root");
  console.log('🎯 MAIN.TSX: Root element found:', !!rootElement);
  
  if (!rootElement) {
    const error = new Error('Root element not found');
    console.error('❌ MAIN.TSX: Root element not found!');
    throw error;
  }

  // Show that basic JS is working
  rootElement.innerHTML = '<div style="padding: 20px; color: green; font-size: 18px;">🟢 DEBUGGING: Basic JS working, attempting React render...</div>';
  
  console.log('🏗️ MAIN.TSX: Creating React root...');
  const root = createRoot(rootElement);
  
  console.log('🎨 MAIN.TSX: Rendering App component...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ MAIN.TSX: App rendered successfully');
  
} catch (error: any) {
  console.error('❌ MAIN.TSX: Critical error:', error);
  console.error('❌ MAIN.TSX: Error message:', error?.message);
  console.error('❌ MAIN.TSX: Error stack:', error?.stack);
  
  // Show error on page
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace; background: #fff;">
        <h2>🚨 APPLICATION ERROR</h2>
        <p><strong>Error:</strong> ${error?.message || 'Unknown error'}</p>
        <p><strong>Type:</strong> ${error?.constructor?.name || 'Unknown'}</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; color: black; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">${error?.stack || 'No stack trace available'}</pre>
        <p style="margin-top: 20px; color: blue;"><strong>Debug info:</strong> React imports successful, error occurred during rendering.</p>
      </div>
    `;
  }
}