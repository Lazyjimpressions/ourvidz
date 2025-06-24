
import React from 'react';
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const featureCards = [
    {
      title: "New Storyboard",
      subtitle: "Create AI-powered video narratives with intelligent scene planning",
      backgroundImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop",
      buttonText: "Start Creating",
      onClick: () => navigate("/create-video")
    },
    {
      title: "Generate Motion",
      subtitle: "Transform static images into dynamic motion sequences",
      backgroundImage: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop",
      buttonText: "Generate Now",
      onClick: () => navigate("/workspace?mode=video")
    },
    {
      title: "Generate Images",
      subtitle: "Create stunning visuals with AI-powered image generation",
      backgroundImage: "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=800&h=600&fit=crop",
      buttonText: "Create Images",
      onClick: () => navigate("/workspace?mode=image")
    }
  ];

  return (
    <OurVidzDashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome to OurVidz
          </h1>
          <p className="text-gray-400 text-lg">
            Create stunning videos and images with the power of AI
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featureCards.map((card, index) => (
            <div 
              key={index}
              className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
              style={{
                backgroundImage: `url(${card.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              
              {/* Card Content */}
              <div className="relative h-full flex flex-col justify-end p-6">
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white">
                    {card.title}
                  </h3>
                  <p className="text-gray-200 text-sm leading-relaxed">
                    {card.subtitle}
                  </p>
                  <Button 
                    onClick={card.onClick}
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

        {/* Additional Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111111] rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-2">Getting Started</h3>
            <p className="text-gray-400 text-sm">
              New to OurVidz? Start with our guided tutorials and create your first AI-powered content.
            </p>
          </div>
          
          <div className="bg-[#111111] rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-2">Latest Features</h3>
            <p className="text-gray-400 text-sm">
              Discover our newest AI capabilities including enhanced motion generation and style transfer.
            </p>
          </div>
          
          <div className="bg-[#111111] rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-2">Community</h3>
            <p className="text-gray-400 text-sm">
              Join thousands of creators sharing their AI-generated content and creative techniques.
            </p>
          </div>
        </div>
      </div>
    </OurVidzDashboardLayout>
  );
};

export default Dashboard;
