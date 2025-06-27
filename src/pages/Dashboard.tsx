
import React from 'react';
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Image, FileText, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

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
      id: 'create-actor',
      title: "Create an Actor",
      subtitle: "Create realistic and consistent models",
      backgroundImage: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop",
      buttonText: "Create Actor",
      icon: Users,
      onClick: () => navigate("/workspace?mode=character")
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

  return (
    <OurVidzDashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Main Cards Grid */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          {mainCards.map((card) => (
            <div 
              key={card.id}
              className="group relative rounded-2xl overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.02] h-80"
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
              <div className="absolute top-6 left-6">
                <card.icon className="w-6 h-6 text-white/80" />
              </div>
              
              {/* Card Content */}
              <div className="relative h-full flex flex-col justify-end p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                      {card.title}
                    </h3>
                    <p className="text-gray-200 text-sm leading-relaxed line-clamp-2">
                      {card.subtitle}
                    </p>
                  </div>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    <span className="truncate">{card.buttonText}</span>
                    <ArrowRight className="w-4 h-4 flex-shrink-0" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* My Projects Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">My Projects</h2>
          </div>

          {/* Project Tabs */}
          <div className="flex gap-6 border-b border-gray-800">
            <button className="pb-3 text-white border-b-2 border-blue-500 font-medium text-sm">
              All Projects
            </button>
            <button className="pb-3 text-gray-400 hover:text-white transition-colors text-sm">
              Shared Projects
            </button>
          </div>

          {/* Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#111111] rounded-xl overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer">
              <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-600"></div>
              <div className="p-4">
                <h3 className="text-white font-medium mb-1 text-sm">Star-Crossed</h3>
                <p className="text-gray-400 text-xs">Jun 23, 2024, 18:28</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OurVidzDashboardLayout>
  );
};

export default Dashboard;
