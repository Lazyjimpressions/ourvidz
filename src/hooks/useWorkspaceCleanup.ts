import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Dedicated hook for workspace cleanup on authentication changes
 * Ensures workspace starts fresh for each user session
 */
export const useWorkspaceCleanup = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('🔄 Workspace cleanup check for user:', user.id);
    
    // Force clear any remaining workspace data on mount
    const clearWorkspaceKeys = () => {
      if (typeof sessionStorage !== 'undefined') {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.includes('workspace') || 
              key.includes('Workspace') ||
              key.includes('signed_url')) {
            sessionStorage.removeItem(key);
          }
        });
      }
      
      if (typeof localStorage !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.includes('workspace') || 
              key.includes('Workspace') ||
              key.includes('signed_url')) {
            localStorage.removeItem(key);
          }
        });
      }
    };

    // Clean workspace on user change
    clearWorkspaceKeys();
    console.log('✅ Workspace cleanup completed for user:', user.id);
    
  }, [user?.id]); // Only run when user ID changes
};