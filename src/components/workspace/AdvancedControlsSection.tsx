
import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music, Brush, Zap, Settings, Camera, Film } from "lucide-react";

interface AdvancedControlsSectionProps {
  mode: 'image' | 'video';
  motionIntensity?: 'low' | 'medium' | 'high';
  onMotionClick?: () => void;
  layout: 'mobile' | 'desktop';
}

export const AdvancedControlsSection = ({ 
  mode, 
  motionIntensity = 'medium', 
  onMotionClick, 
  layout 
}: AdvancedControlsSectionProps) => {
  if (mode === 'image') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-300">Image Settings</span>
        </div>
        
        <div className={`flex items-center gap-3 ${layout === 'mobile' ? 'flex-wrap' : ''}`}>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Aspect Ratio</label>
            <Select defaultValue="16:9">
              <SelectTrigger className="bg-gray-700/50 border-gray-600/50 text-white text-sm h-10 w-20 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Shot Type</label>
            <Select>
              <SelectTrigger className="bg-gray-700/50 border-gray-600/50 text-white text-sm h-10 w-32 rounded-lg">
                <SelectValue placeholder="Shot" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="close-up">Close-up</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="wide">Wide</SelectItem>
                <SelectItem value="extreme-wide">Extreme Wide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Camera Angle</label>
            <Select>
              <SelectTrigger className="bg-gray-700/50 border-gray-600/50 text-white text-sm h-10 w-28 rounded-lg">
                <SelectValue placeholder="Angle" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="front">Front</SelectItem>
                <SelectItem value="side">Side</SelectItem>
                <SelectItem value="back">Back</SelectItem>
                <SelectItem value="overhead">Overhead</SelectItem>
                <SelectItem value="low-angle">Low Angle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Art Style</label>
            <Select>
              <SelectTrigger className="bg-gray-700/50 border-gray-600/50 text-white text-sm h-10 w-32 rounded-lg">
                <div className="flex items-center gap-2">
                  <Brush className="w-3 h-3" />
                  <SelectValue placeholder="Style" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="realistic">Realistic</SelectItem>
                <SelectItem value="artistic">Artistic</SelectItem>
                <SelectItem value="cartoon">Cartoon</SelectItem>
                <SelectItem value="anime">Anime</SelectItem>
                <SelectItem value="cinematic">Cinematic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Film className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-300">Video Settings</span>
      </div>
      
      <div className={`flex items-center gap-3 ${layout === 'mobile' ? 'flex-wrap' : ''}`}>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">Aspect Ratio</label>
          <Select defaultValue="16:9">
            <SelectTrigger className="bg-gray-700/50 border-gray-600/50 text-white text-sm h-10 w-20 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="16:9">16:9</SelectItem>
              <SelectItem value="4:3">4:3</SelectItem>
              <SelectItem value="1:1">1:1</SelectItem>
              <SelectItem value="9:16">9:16</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">Duration</label>
          <Select defaultValue="5s">
            <SelectTrigger className="bg-gray-700/50 border-gray-600/50 text-white text-sm h-10 w-16 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="3s">3s</SelectItem>
              <SelectItem value="5s">5s</SelectItem>
              <SelectItem value="10s">10s</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">Motion</label>
          <Button
            variant="ghost"
            onClick={onMotionClick}
            className="bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg text-sm h-10 px-4 border border-gray-600/50 hover:border-gray-500/50 transition-all duration-200"
            title={`Motion: ${motionIntensity}`}
          >
            <Zap className="w-3 h-3 mr-2" />
            {motionIntensity === 'low' ? 'Low' : motionIntensity === 'medium' ? 'Medium' : 'High'}
          </Button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">Audio</label>
          <Button
            variant="ghost"
            className="bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg h-10 px-4 border border-gray-600/50 hover:border-gray-500/50 transition-all duration-200"
          >
            <Music className="w-3 h-3 mr-2" />
            <span className="text-sm">Music</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
