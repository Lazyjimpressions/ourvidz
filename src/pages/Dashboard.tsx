
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
      subtitle: "Make a concept or a script come to life",
      backgroundImage: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop",
      buttonText: "Generate Storyboard",
      icon: FileText,
      onClick: () => navigate("/storyboard"),
      size: "large",
      gridArea: "1 / 1 / 3 / 3"
    },
    {
      id: 'generate-motion',
      title: "Generate Motion",
      subtitle: "Set an image in motion in the video Gen Space",
      backgroundImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop",
      buttonText: "Generate Motion",
      icon: Play,
      onClick: () => navigate("/workspace?mode=video"),
      size: "large",
      gridArea: "1 / 3 / 3 / 5"
    },
    {
      id: 'generate-images',
      title: "Generate Images",
      subtitle: "Explore your image-storming Gen Space",
      backgroundImage: "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=800&h=600&fit=crop",
      buttonText: "Create Images",
      icon: Image,
      onClick: () => navigate("/workspace?mode=image"),
      size: "medium",
      gridArea: "3 / 1 / 5 / 3"
    },
    {
      id: 'blank-storyboard',
      title: "Blank Storyboard",
      subtitle: "Craft your story, shot by shot",
      backgroundImage: "https://images.unsplash.com/photo-1500673922987-e212871fec22?w=800&h=600&fit=crop",
      buttonText: "Start Creating",
      icon: FileText,
      onClick: () => navigate("/storyboard"),
      size: "medium",
      gridArea: "3 / 3 / 5 / 4"
    },
    {
      id: 'create-actor',
      title: "Create an Actor",
      subtitle: "Create realistic & consistent models",
      backgroundImage: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop",
      buttonText: "Create Actor",
      icon: Users,
      onClick: () => navigate("/workspace?mode=character"),
      size: "large",
      gridArea: "3 / 4 / 5 / 6"
    }
  ];

  return (
    <OurVidzDashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Main Cards Grid */}
        <div className="grid grid-cols-5 grid-rows-4 gap-4 h-[600px] mb-12">
          {mainCards.map((card) => (
            <div 
              key={card.id}
              className="group relative rounded-2xl overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
              style={{
                backgroundImage: `url(${card.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                gridArea: card.gridArea
              }}
              onClick={card.onClick}
            >
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              
              {/* Icon */}
              <div className="absolute top-4 left-4">
                <card.icon className="w-6 h-6 text-white/80" />
              </div>
              
              {/* Card Content */}
              <div className="relative h-full flex flex-col justify-end p-6">
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white">
                    {card.title}
                  </h3>
                  <p className="text-gray-200 text-sm leading-relaxed">
                    {card.subtitle}
                  </p>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {card.buttonText}
                    <ArrowRight className="w-4 h-4" />
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
            <button className="pb-3 text-white border-b-2 border-blue-500 font-medium">
              All Projects
            </button>
            <button className="pb-3 text-gray-400 hover:text-white transition-colors">
              Shared Projects
            </button>
          </div>

          {/* Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#111111] rounded-xl overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer">
              <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-600"></div>
              <div className="p-4">
                <h3 className="text-white font-medium mb-1">Star-Crossed</h3>
                <p className="text-gray-400 text-sm">Jun 23, 2024, 18:28</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OurVidzDashboardLayout>
  );
};

export default Dashboard;
