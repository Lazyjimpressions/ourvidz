
import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music, Brush, Zap } from "lucide-react";

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
      <div className={`flex items-center gap-2 ${layout === 'mobile' ? 'flex-wrap' : 'flex-1'}`}>
        <Select defaultValue="16:9">
          <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-xs h-8 ${layout === 'mobile' ? 'w-16' : 'w-20'}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 z-50">
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="4:3">4:3</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-xs h-8 ${layout === 'mobile' ? 'w-20' : 'w-32'}`}>
            <SelectValue placeholder="Shot" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 z-50">
            <SelectItem value="close-up">Close-up</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="wide">Wide</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-xs h-8 ${layout === 'mobile' ? 'w-16' : 'w-24'}`}>
            <SelectValue placeholder="Angle" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 z-50">
            <SelectItem value="front">Front</SelectItem>
            <SelectItem value="side">Side</SelectItem>
            <SelectItem value="back">Back</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-xs h-8 ${layout === 'mobile' ? 'w-20' : 'w-28'}`}>
            <div className="flex items-center gap-1">
              <Brush className="w-3 h-3" />
              <SelectValue placeholder="Style" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 z-50">
            <SelectItem value="realistic">Realistic</SelectItem>
            <SelectItem value="artistic">Artistic</SelectItem>
            <SelectItem value="cartoon">Cartoon</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${layout === 'mobile' ? 'flex-wrap' : 'flex-1'}`}>
      <Select defaultValue="16:9">
        <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-xs h-8 ${layout === 'mobile' ? 'w-16' : 'w-20'}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 border-gray-600 z-50">
          <SelectItem value="16:9">16:9</SelectItem>
          <SelectItem value="4:3">4:3</SelectItem>
          <SelectItem value="1:1">1:1</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue="5s">
        <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-xs h-8 ${layout === 'mobile' ? 'w-12' : 'w-16'}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 border-gray-600 z-50">
          <SelectItem value="3s">3s</SelectItem>
          <SelectItem value="5s">5s</SelectItem>
          <SelectItem value="10s">10s</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        onClick={onMotionClick}
        className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs h-8 px-2"
        title={`Motion: ${motionIntensity}`}
      >
        <Zap className="w-3 h-3 mr-1" />
        {motionIntensity === 'low' ? 'L' : motionIntensity === 'medium' ? 'M' : 'H'}
      </Button>

      {layout === 'mobile' && (
        <Button
          variant="ghost"
          className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg h-8 px-2 flex items-center gap-1"
        >
          <Music className="w-3 h-3" />
          <span className="text-xs">Music</span>
        </Button>
      )}
    </div>
  );
};
