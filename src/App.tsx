
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import { OptimizedLibrary } from "@/components/library/OptimizedLibrary";
import SimplifiedWorkspace from "@/pages/SimplifiedWorkspace";
import MobileSimplifiedWorkspace from "@/pages/MobileSimplifiedWorkspace";
import Admin from "@/pages/Admin";
import Storyboard from "@/pages/Storyboard";
import Profile from "@/pages/Profile";
import Pricing from "@/pages/Pricing";
import Playground from "@/pages/Playground";
import RoleplayDashboard from "@/pages/RoleplayDashboard";
import RoleplayChat from "@/pages/RoleplayChat";

import NotFound from "@/pages/NotFound";
import { useMobileDetection } from "@/hooks/useMobileDetection";

const queryClient = new QueryClient();

// Mobile-aware workspace component
const WorkspaceWithMobileDetection = () => {
  const { isMobile } = useMobileDetection();
  
  return isMobile ? <MobileSimplifiedWorkspace /> : <SimplifiedWorkspace />;
};

function App() {
  console.log('🚀 APP.TSX: App component rendering...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/workspace" element={<ProtectedRoute><WorkspaceWithMobileDetection /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><OptimizedLibrary /></ProtectedRoute>} />
              <Route path="/storyboard" element={<ProtectedRoute><Storyboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/playground" element={<ProtectedRoute><Playground /></ProtectedRoute>} />
                        <Route path="/roleplay" element={<ProtectedRoute><RoleplayDashboard /></ProtectedRoute>} />
            <Route path="/roleplay/chat" element={<ProtectedRoute><RoleplayChat /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
