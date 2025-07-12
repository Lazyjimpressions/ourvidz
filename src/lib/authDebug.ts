// Emergency Auth Debugging Utilities
import { supabase } from "@/integrations/supabase/client";

export const debugAuthState = async () => {
  console.log('🔍 === AUTH DEBUG REPORT ===');
  
  // Check current session
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('📋 Current session:', {
    hasSession: !!session,
    userId: session?.user?.id,
    email: session?.user?.email,
    expiresAt: session?.expires_at,
    error: error?.message
  });

  // Check localStorage
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || key.includes('sb-')
  );
  console.log('🔑 Auth keys in localStorage:', authKeys);
  
  authKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      console.log(`   ${key}:`, value ? 'Present' : 'Empty');
    } catch (e) {
      console.log(`   ${key}: Error reading`);
    }
  });

  // Test auth.uid() access
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    console.log('🔒 RLS Test (profiles table):', {
      success: !error,
      error: error?.message,
      hasData: !!data?.length
    });
  } catch (e) {
    console.log('🔒 RLS Test failed:', e);
  }

  console.log('=== END AUTH DEBUG ===');
};

export const clearAuthState = () => {
  console.log('🧹 Clearing all auth state...');
  
  // Clear all Supabase auth keys
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('sb-')) {
      localStorage.removeItem(key);
      console.log(`   Removed: ${key}`);
    }
  });
  
  // Clear sessionStorage too
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
      console.log(`   Removed from session: ${key}`);
    }
  });
  
  console.log('✅ Auth state cleared. Please refresh the page.');
};

// Auto-run debug on import in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  setTimeout(() => {
    debugAuthState();
  }, 1000);
}