import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 MAIN.TSX: Starting application...');

const rootElement = document.getElementById("root");
console.log('🎯 MAIN.TSX: Root element found:', !!rootElement);

if (!rootElement) {
  console.error('❌ MAIN.TSX: Root element not found!');
  throw new Error('Root element not found');
}

try {
  console.log('🏗️ MAIN.TSX: Creating React root...');
  const root = createRoot(rootElement);
  
  console.log('🎨 MAIN.TSX: Rendering App component...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ MAIN.TSX: App rendered successfully');
} catch (error) {
  console.error('❌ MAIN.TSX: Error creating or rendering app:', error);
}
