
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  username: string | null;
  subscription_status: 'inactive' | 'starter' | 'pro' | 'creator';
  token_balance: number;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isSubscribed: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileFetchAttempts, setProfileFetchAttempts] = useState(0);

  const isSubscribed = profile?.subscription_status !== 'inactive';

  const fetchProfile = useCallback(async (userId: string, retryCount = 0) => {
    const maxRetries = 3;
    const baseDelay = 1000;
    
    try {
      console.log(`Fetching profile for user ${userId}, attempt ${retryCount + 1}`);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, subscription_status, token_balance, created_at, updated_at')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        
        // Implement exponential backoff for retries
        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`Retrying profile fetch in ${delay}ms...`);
          setTimeout(() => {
            fetchProfile(userId, retryCount + 1);
          }, delay);
          return;
        }
        return;
      }
      
      if (data) {
        // Type cast the subscription_status to ensure it matches our interface
        const typedProfile: Profile = {
          ...data,
          subscription_status: data.subscription_status as 'inactive' | 'starter' | 'pro' | 'creator'
        };
        setProfile(typedProfile);
        setProfileFetchAttempts(0); // Reset attempts on success
        console.log('Profile fetched successfully:', typedProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // Implement exponential backoff for retries
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`Retrying profile fetch in ${delay}ms...`);
        setTimeout(() => {
          fetchProfile(userId, retryCount + 1);
        }, delay);
      }
    }
  }, []);

  const refreshSession = async () => {
    try {
      console.log('Refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        return;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        console.log('Session refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  };

  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    console.log('Auth state change:', event, session?.user?.email);
    
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user && event !== 'TOKEN_REFRESHED') {
      // Only fetch profile on significant auth changes, not token refreshes
      setTimeout(() => {
        fetchProfile(session.user.id);
      }, 100);
    } else if (!session) {
      setProfile(null);
      setProfileFetchAttempts(0);
    }
    
    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
          
          setLoading(false);
          console.log('Auth initialized successfully');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Implement session refresh with connection health check
    const refreshInterval = setInterval(() => {
      if (session && session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        // Refresh 5 minutes before expiry
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          console.log('Session near expiry, refreshing...');
          refreshSession();
        }
      }
    }, 60000); // Check every minute

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []); // Remove session dependency to prevent infinite loop

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      setUser(null);
      setSession(null);
      setProfile(null);
      setProfileFetchAttempts(0);
      
      await supabase.auth.signOut();
      console.log('Signed out successfully');
      
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user logged in' };
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    
    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }
    
    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isSubscribed,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
