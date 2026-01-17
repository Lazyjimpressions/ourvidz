import React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Home, FileText, Play, Image, Library, Settings, LogOut, Brain, Users, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";


interface OurVidzDashboardLayoutProps {
  children: React.ReactNode;
}

export const OurVidzDashboardLayout = ({ children }: OurVidzDashboardLayoutProps) => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isActiveRoute = (path: string, mode?: string) => {
    if (mode && location.pathname === '/workspace') {
      const urlParams = new URLSearchParams(location.search);
      return urlParams.get('mode') === mode;
    }
    return location.pathname === path;
  };

  const recentItems = [
    {
      icon: FileText,
      label: "Star-Crossed",
      onClick: () => navigate("/storyboard"),
      active: false
    }
  ];

  const creativeToolsItems = [
    { 
      icon: FileText, 
      label: "New Storyboard",
      onClick: () => navigate("/storyboard"),
      active: isActiveRoute("/storyboard")
    },
    { 
      icon: Play, 
      label: "Generate Motion",
      onClick: () => navigate("/workspace?mode=video"),
      active: isActiveRoute("/workspace", "video")
    },
    { 
      icon: Image, 
      label: "Generate Images",
      onClick: () => navigate("/workspace?mode=image"),
      active: isActiveRoute("/workspace", "image")
    },
    { 
      icon: Users, 
      label: "Character Studio",
      onClick: () => navigate("/character-studio"),
      active: isActiveRoute("/character-studio")
    },
    { 
      icon: Brain, 
      label: "🧠 Playground",
      onClick: () => navigate("/playground"),
      active: isActiveRoute("/playground")
    },
    { 
      icon: Users, 
      label: "🎭 Roleplay",
      onClick: () => {
        console.log('🎭 Roleplay: Navigation clicked, navigating to /roleplay');
        navigate("/roleplay");
      },
      active: isActiveRoute("/roleplay")
    }
  ];

  const otherItems = [
    { 
      icon: Library, 
      label: "Library",
      onClick: () => navigate("/library"),
      active: isActiveRoute("/library")
    },
    { 
      icon: Settings, 
      label: "Settings",
      onClick: () => navigate("/profile"),
      active: isActiveRoute("/profile")
    }
  ];

  // Check if we're on workspace, chat, roleplay dashboard, library, or dashboard route for mobile optimization
  // IMPORTANT: avoid JS-driven width detection to prevent "reverting" on resize/viewport quirks.
  const isWorkspaceRoute = location.pathname === '/workspace';
  const isChatRoute = location.pathname.startsWith('/roleplay/chat');
  const isRoleplayDashboard = location.pathname === '/roleplay';
  const isLibraryRoute = location.pathname === '/library';
  const isDashboardRoute = location.pathname === '/dashboard';
  const isCompactRoute = isWorkspaceRoute || isChatRoute || isRoleplayDashboard || isLibraryRoute || isDashboardRoute;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Left Sidebar - hide on small screens for compact routes (CSS breakpoint, no JS) */}
      <div className={`w-64 bg-[#111111] flex-col ${isCompactRoute ? 'hidden md:flex' : 'flex'}`}>
        {/* Logo */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white">OurVidz</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-6">
          {/* Home */}
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                isActiveRoute("/dashboard") 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-sm font-medium">Home</span>
            </button>
          </div>

          {/* Recent Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
              Recent
            </h3>
            <ul className="space-y-1">
              {recentItems.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      item.active 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Creative Tools Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
              Creative Tools
            </h3>
            <ul className="space-y-1">
              {creativeToolsItems.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      item.active 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Other Items */}
          <div className="pt-4">
            <ul className="space-y-1">
              {otherItems.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      item.active 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Compact on mobile workspace */}
        <header className={`bg-[#111111] border-b border-gray-800 ${isCompactRoute ? 'px-3 py-2 md:px-6 md:py-4' : 'px-6 py-4'}`}>
          <div className="flex justify-between items-center">
            {/* Mobile Back Button - Only show on compact routes (small screens) */}
            {isCompactRoute && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="p-2 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex justify-end items-center flex-1">
              <div className={`flex items-center ${isCompactRoute ? 'gap-2 md:gap-4' : 'gap-4'}`}>
                <Button
                    variant="outline"
                    size="sm"
                    className={`text-white border-gray-600 hover:bg-gray-800 ${isCompactRoute ? 'hidden md:inline-flex' : ''}`}
                  >
                    Upgrade
                  </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/admin")}
                    className={`gap-2 text-white border-gray-600 hover:bg-gray-800 ${isCompactRoute ? 'hidden md:inline-flex' : ''}`}
                  >
                    <Settings className="h-4 w-4" />
                    Admin
                  </Button>
                )}
                <div className={`flex items-center ${isCompactRoute ? 'gap-2 md:gap-3' : 'gap-3'} text-sm`}>
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className={`${isCompactRoute ? 'w-6 h-6' : 'w-8 h-8'} bg-blue-600 rounded-full flex items-center justify-center text-white font-medium`}>
                      {profile?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className={isCompactRoute ? 'hidden md:inline' : ''}>{profile?.username || 'User'}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className={`gap-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ${isCompactRoute ? 'hidden md:inline-flex' : ''}`}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area - Scrollable, no padding on mobile workspace/chat for full-width */}
        <main className={`flex-1 min-w-0 bg-[#0a0a0a] overflow-y-auto ${isCompactRoute ? 'p-0 md:p-6' : 'p-6'}`}>
          {children}
        </main>

        {/* Footer - Hidden on mobile workspace and chat */}
        <footer className={`bg-[#111111] border-t border-gray-800 px-6 py-4 ${isCompactRoute ? 'hidden md:block' : ''}`}>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div className="flex items-center gap-6">
              <span>© 2024 OurVidz</span>
              <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Support</a>
            </div>
            <div className="flex items-center gap-4">
              <span>Version 1.0</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
