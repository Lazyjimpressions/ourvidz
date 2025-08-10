/**
 * Debug script for exact copy functionality
 * Run this in the browser console to test metadata extraction
 */

console.log('🎯 EXACT COPY DEBUG SCRIPT LOADED');

// Test function to check workspace assets
function debugWorkspaceAssets() {
  console.log('🎯 DEBUGGING WORKSPACE ASSETS');
  
  // Get workspace assets from the page
  const workspaceAssets = window.workspaceAssets || [];
  console.log('Workspace assets found:', workspaceAssets.length);
  
  if (workspaceAssets.length > 0) {
    const firstAsset = workspaceAssets[0];
    console.log('First asset metadata:', {
      id: firstAsset.id,
      type: firstAsset.type,
      url: firstAsset.url,
      prompt: firstAsset.prompt,
      enhancedPrompt: firstAsset.enhancedPrompt,
      metadata: firstAsset.metadata,
      metadataKeys: firstAsset.metadata ? Object.keys(firstAsset.metadata) : 'none'
    });
    
    // Test metadata extraction
    if (typeof window.extractReferenceMetadata === 'function') {
      const extracted = window.extractReferenceMetadata(firstAsset);
      console.log('Metadata extraction result:', extracted);
    } else {
      console.log('extractReferenceMetadata function not available');
    }
  }
}

// Test function to check current state
function debugCurrentState() {
  console.log('🎯 DEBUGGING CURRENT STATE');
  
  // Check if we can access the workspace state
  if (window.workspaceState) {
    console.log('Workspace state:', {
      exactCopyMode: window.workspaceState.exactCopyMode,
      referenceMetadata: window.workspaceState.referenceMetadata,
      referenceImageUrl: window.workspaceState.referenceImageUrl,
      prompt: window.workspaceState.prompt
    });
  } else {
    console.log('Workspace state not available');
  }
}

// Test function to simulate exact copy workflow
function testExactCopyWorkflow() {
  console.log('🎯 TESTING EXACT COPY WORKFLOW');
  
  // This would need to be run in the context of the workspace
  console.log('To test exact copy workflow:');
  console.log('1. Select a workspace item as reference');
  console.log('2. Enable exact copy mode');
  console.log('3. Enter a modification prompt');
  console.log('4. Check the console logs for debugging info');
}

// Export functions for use in console
window.debugExactCopy = {
  debugWorkspaceAssets,
  debugCurrentState,
  testExactCopyWorkflow
};

console.log('🎯 Available debug functions:');
console.log('- debugExactCopy.debugWorkspaceAssets()');
console.log('- debugExactCopy.debugCurrentState()');
console.log('- debugExactCopy.testExactCopyWorkflow()');
