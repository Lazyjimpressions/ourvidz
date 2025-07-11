import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Clear all workspace-related session storage data
 * Useful for starting fresh sessions or debugging
 */
export function clearWorkspaceSessionData() {
  // Clear all user-scoped workspace data
  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith('workspaceFilter_') || 
        key.startsWith('workspaceSessionStart_') ||
        key.startsWith('workspaceUserId_') ||
        key.startsWith('workspace-test') ||
        key === 'workspaceFilter' ||
        key === 'workspaceSessionStart' ||
        key === 'workspaceUserId' ||
        key === 'signed_urls') {
      sessionStorage.removeItem(key);
    }
  });
  
  console.log('🗑️ Cleared all workspace session data');
}

/**
 * Clear only signed URL cache to force fresh requests
 * Useful when URLs expire or for debugging
 */
export function clearSignedUrlCache() {
  sessionStorage.removeItem('signed_urls');
  console.log('🗑️ Cleared signed URL cache');
}

/**
 * Get session storage usage statistics
 * Useful for debugging and monitoring
 */
export function getSessionStorageStats() {
  const stats = {
    workspaceFilter: sessionStorage.getItem('workspaceFilter') ? 'present' : 'absent',
    workspaceSessionStart: sessionStorage.getItem('workspaceSessionStart') ? 'present' : 'absent',
    workspaceUserId: sessionStorage.getItem('workspaceUserId') ? 'present' : 'absent',
    workspaceTest: sessionStorage.getItem('workspace-test') ? 'present' : 'absent',
    workspaceTestSession: sessionStorage.getItem('workspace-test-session') ? 'present' : 'absent',
    workspaceTestUser: sessionStorage.getItem('workspace-test-user') ? 'present' : 'absent',
    signedUrls: sessionStorage.getItem('signed_urls') ? 'present' : 'absent',
    signedUrlCacheSize: 0,
    totalSize: 0
  };
  
  // Calculate signed URL cache size
  const signedUrlsData = sessionStorage.getItem('signed_urls');
  if (signedUrlsData) {
    stats.signedUrlCacheSize = signedUrlsData.length * 2; // UTF-16 characters are 2 bytes
  }
  
  // Calculate total size
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      const value = sessionStorage.getItem(key);
      stats.totalSize += (key.length + (value?.length || 0)) * 2; // UTF-16 characters are 2 bytes
    }
  }
  
  return stats;
}
