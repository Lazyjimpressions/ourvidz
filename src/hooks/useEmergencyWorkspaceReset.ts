import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Emergency workspace reset hook - forces clean workspace on every page load
 */
export const useEmergencyWorkspaceReset = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🚨 EMERGENCY WORKSPACE RESET TRIGGERED');
    
    // Clear ALL React Query cache
    queryClient.clear();
    
    // Clear ALL storage
    if (typeof sessionStorage !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('workspace') || key.includes('Workspace') || key.includes('signed_url'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      console.log('🗑️ Emergency cleared sessionStorage keys:', keysToRemove);
    }
    
    if (typeof localStorage !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('workspace') || key.includes('Workspace') || key.includes('signed_url'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('🗑️ Emergency cleared localStorage keys:', keysToRemove);
    }
    
    console.log('✅ EMERGENCY WORKSPACE RESET COMPLETED');
  }, [queryClient]);
};