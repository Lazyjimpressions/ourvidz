import React from 'react';
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Image, FileText, Users, Home, Library, Settings, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { MobileBottomNav, MobileBottomNavItem } from "@/components/shared/MobileBottomNav";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const mainCards = [
    {
      id: 'ai-video',
      title: "AI-Powered Video",
      subtitle: "Make a concept or script come to life",
      backgroundImage: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop",
      buttonText: "Generate Video",
      icon: FileText,
      onClick: () => navigate("/storyboard")
    },
    {
      id: 'generate-motion',
      title: "Generate Motion",
      subtitle: "Set an image in motion in the video space",
      backgroundImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop",
      buttonText: "Create Motion",
      icon: Play,
      onClick: () => navigate("/workspace?mode=video")
    },
    {
      id: 'generate-images',
      title: "Generate Images",
      subtitle: "Explore your image-storming space",
      backgroundImage: "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=800&h=600&fit=crop",
      buttonText: "Create Images",
      icon: Image,
      onClick: () => navigate("/workspace?mode=image")
    },
    {
      id: 'blank-storyboard',
      title: "Blank Storyboard",
      subtitle: "Craft your story, shot by shot",
      backgroundImage: "https://images.unsplash.com/photo-1500673922987-e212871fec22?w=800&h=600&fit=crop",
      buttonText: "Start Creating",
      icon: FileText,
      onClick: () => navigate("/storyboard")
    },
    {
      id: 'create-character',
      title: "Create Character",
      subtitle: "Design AI companions for roleplay",
      backgroundImage: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop",
      buttonText: "Create Character",
      icon: Users,
      onClick: () => navigate("/create-character")
    },
    {
      id: 'video-library',
      title: "Video Library",
      subtitle: "Browse and manage your video projects",
      backgroundImage: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=600&fit=crop",
      buttonText: "View Library",
      icon: Play,
      onClick: () => navigate("/library")
    }
  ];

  // Mobile bottom navigation items
  const mobileNavItems: MobileBottomNavItem[] = [
    {
      icon: Home,
      label: 'Home',
      href: '/dashboard',
      active: location.pathname === '/dashboard'
    },
    {
      icon: Play,
      label: 'Create',
      href: '/workspace?mode=video',
      active: location.pathname === '/workspace'
    },
    {
      icon: Library,
      label: 'Library',
      href: '/library',
      active: location.pathname === '/library'
    },
    {
      icon: Settings,
      label: 'Settings',
      href: '/profile',
      active: location.pathname === '/profile'
    }
  ];

  return (
    <OurVidzDashboardLayout>
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 pb-20 sm:pb-6">
        {/* Main Cards Grid - Responsive auto-fill */}
        <div 
          className="grid gap-3 sm:gap-6 mb-8 sm:mb-12"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
        >
          {mainCards.map((card) => (
            <div 
              key={card.id}
              className="group relative rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] aspect-[4/5] sm:aspect-[3/4]"
              style={{
                backgroundImage: `url(${card.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              onClick={card.onClick}
            >
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              
              {/* Icon */}
              <div className="absolute top-3 left-3 sm:top-6 sm:left-6">
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
              </div>
              
              {/* Card Content */}
              <div className="relative h-full flex flex-col justify-end p-3 sm:p-6">
                <div className="space-y-2 sm:space-y-4">
                  <div>
                    <h3 className="text-sm sm:text-xl font-bold text-white mb-1 sm:mb-2 line-clamp-2">
                      {card.title}
                    </h3>
                    <p className="text-gray-200 text-xs sm:text-sm leading-relaxed line-clamp-2 hidden sm:block">
                      {card.subtitle}
                    </p>
                  </div>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <span className="truncate">{card.buttonText}</span>
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* My Projects Section */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-2xl font-bold text-white">My Projects</h2>
          </div>

          {/* Project Tabs */}
          <div className="flex gap-4 sm:gap-6 border-b border-gray-800 overflow-x-auto scrollbar-hide">
            <button className="pb-3 text-white border-b-2 border-primary font-medium text-xs sm:text-sm whitespace-nowrap">
              All Projects
            </button>
            <button className="pb-3 text-gray-400 hover:text-white transition-colors text-xs sm:text-sm whitespace-nowrap">
              Shared Projects
            </button>
          </div>

          {/* Project Grid - Responsive */}
          <div 
            className="grid gap-3 sm:gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
          >
            <div className="bg-card rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer active:scale-[0.98]">
              <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-600"></div>
              <div className="p-3 sm:p-4">
                <h3 className="text-foreground font-medium mb-1 text-xs sm:text-sm">Star-Crossed</h3>
                <p className="text-muted-foreground text-[10px] sm:text-xs">Jun 23, 2024, 18:28</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden">
        <MobileBottomNav 
          items={mobileNavItems}
          floatingAction={{
            icon: Plus,
            onClick: () => navigate('/storyboard'),
            label: 'Create new'
          }}
        />
      </div>
    </OurVidzDashboardLayout>
  );
};

export default Dashboard;
