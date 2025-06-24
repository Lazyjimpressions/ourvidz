
import React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Home, FileText, Play, Image, Library, Settings, User, CreditCard, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface OurVidzDashboardLayoutProps {
  children: React.ReactNode;
}

export const OurVidzDashboardLayout = ({ children }: OurVidzDashboardLayoutProps) => {
  const { profile, isSubscribed, signOut } = useAuth();
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

  const sidebarItems = [
    { 
      icon: Home, 
      label: "Home", 
      path: "/dashboard",
      onClick: () => navigate("/dashboard"),
      active: isActiveRoute("/dashboard")
    },
    { 
      icon: FileText, 
      label: "New Storyboard",
      path: "/storyboard", 
      onClick: () => navigate("/storyboard"),
      active: isActiveRoute("/storyboard")
    },
    { 
      icon: Play, 
      label: "Generate Motion",
      path: "/workspace?mode=video",
      onClick: () => navigate("/workspace?mode=video"),
      active: isActiveRoute("/workspace", "video")
    },
    { 
      icon: Image, 
      label: "Generate Images",
      path: "/workspace?mode=image",
      onClick: () => navigate("/workspace?mode=image"),
      active: isActiveRoute("/workspace", "image")
    },
    { 
      icon: Library, 
      label: "Library",
      path: "/library",
      onClick: () => navigate("/library"),
      active: isActiveRoute("/library")
    },
    { 
      icon: Settings, 
      label: "Settings",
      path: "/profile",
      onClick: () => navigate("/profile"),
      active: isActiveRoute("/profile")
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-[#111111] flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white">OurVidz</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item, index) => (
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
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Unified Top Header */}
        <header className="bg-[#111111] border-b border-gray-800 px-6 py-4">
          <div className="flex justify-end items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <CreditCard className="w-4 h-4" />
                <span>Credits: {profile?.token_balance || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <div className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{isSubscribed ? 'Pro' : 'Free'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <User className="w-4 h-4" />
                <span>{profile?.username || 'User'}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 bg-[#0a0a0a]">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-[#111111] border-t border-gray-800 px-6 py-4">
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
