import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  FileText, 
  Play, 
  Image, 
  Library, 
  Settings, 
  LogOut, 
  Brain, 
  Users,
  X
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavDrawer = ({ isOpen, onClose }: MobileNavDrawerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut, isAdmin } = useAuth();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    onClose();
  };

  const isActiveRoute = (path: string, mode?: string) => {
    if (mode && location.pathname === '/workspace') {
      const urlParams = new URLSearchParams(location.search);
      return urlParams.get('mode') === mode;
    }
    return location.pathname === path;
  };

  const creativeToolsItems = [
    { 
      icon: FileText, 
      label: "New Storyboard",
      path: "/storyboard",
      active: isActiveRoute("/storyboard")
    },
    { 
      icon: Play, 
      label: "Generate Motion",
      path: "/workspace?mode=video",
      active: isActiveRoute("/workspace", "video")
    },
    { 
      icon: Image, 
      label: "Generate Images",
      path: "/workspace?mode=image",
      active: isActiveRoute("/workspace", "image")
    },
    { 
      icon: Users, 
      label: "Character Studio",
      path: "/character-studio",
      active: isActiveRoute("/character-studio")
    },
    { 
      icon: Brain, 
      label: "🧠 Playground",
      path: "/playground",
      active: isActiveRoute("/playground")
    },
    { 
      icon: Users, 
      label: "🎭 Roleplay",
      path: "/roleplay",
      active: isActiveRoute("/roleplay")
    }
  ];

  const otherItems = [
    { 
      icon: Library, 
      label: "Library",
      path: "/library",
      active: isActiveRoute("/library")
    },
    { 
      icon: Settings, 
      label: "Settings",
      path: "/profile",
      active: isActiveRoute("/profile")
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 bg-[#111111] border-r border-gray-800 p-0">
        <SheetHeader className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold text-white">OurVidz</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
          <nav className="p-4 space-y-6">
            {/* Home */}
            <div>
              <button
                onClick={() => handleNavigate("/dashboard")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  isActiveRoute("/dashboard") 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="text-sm font-medium">Home</span>
              </button>
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
                      onClick={() => handleNavigate(item.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        item.active 
                          ? 'bg-primary text-primary-foreground' 
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
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                Other
              </h3>
              <ul className="space-y-1">
                {otherItems.map((item, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        item.active 
                          ? 'bg-primary text-primary-foreground' 
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

            {/* Admin Button */}
            {isAdmin && (
              <div>
                <button
                  onClick={() => handleNavigate("/admin")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-sm font-medium">Admin</span>
                </button>
              </div>
            )}
          </nav>
        </ScrollArea>

        {/* User Profile & Sign Out */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-[#111111]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-gray-300">{profile?.username || 'User'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
