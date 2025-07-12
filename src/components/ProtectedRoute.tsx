
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, session } = useAuth();

  // Enhanced debugging for auth state
  console.log('🛡️ ProtectedRoute state:', {
    loading,
    hasUser: !!user,
    hasSession: !!session,
    userId: user?.id,
    sessionExpiry: session?.expires_at,
    timestamp: new Date().toISOString()
  });

  // Check localStorage for auth tokens
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || key.includes('sb-')
  );
  console.log('🔑 Auth keys in localStorage:', authKeys);

  if (loading) {
    console.log('⏳ ProtectedRoute: Showing loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    console.log('🚫 ProtectedRoute: No user found, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('✅ ProtectedRoute: User authenticated, rendering children');
  return <>{children}</>;
};
