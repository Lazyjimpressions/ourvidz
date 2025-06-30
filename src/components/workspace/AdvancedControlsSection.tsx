
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
      <div className={`flex items-center gap-3 ${layout === 'mobile' ? 'grid grid-cols-2 gap-3' : 'flex-1'}`}>
        <Select defaultValue="16:9">
          <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-sm h-10 ${layout === 'mobile' ? '' : 'w-20'}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 z-50">
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="4:3">4:3</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-sm h-10 ${layout === 'mobile' ? '' : 'w-32'}`}>
            <SelectValue placeholder="Shot Type" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 z-50">
            <SelectItem value="close-up">Close-up</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="wide">Wide</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-sm h-10 ${layout === 'mobile' ? '' : 'w-24'}`}>
            <SelectValue placeholder="Angle" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 z-50">
            <SelectItem value="front">Front</SelectItem>
            <SelectItem value="side">Side</SelectItem>
            <SelectItem value="back">Back</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-sm h-10 ${layout === 'mobile' ? '' : 'w-28'}`}>
            <div className="flex items-center gap-2">
              <Brush className="w-4 h-4" />
              <SelectValue placeholder="Style" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 z-50">
            <SelectItem value="realistic">Realistic</SelectItem>
            <SelectItem value="artistic">Artistic</SelectItem>
            <SelectItem value="cartoon">Cartoon</SelectItem>
          </SelectContent>
        </Select>

        {layout === 'desktop' && (
          <Button
            variant="ghost"
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm h-10"
          >
            Style ref
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${layout === 'mobile' ? 'grid grid-cols-3 gap-3' : 'flex-1'}`}>
      <Select defaultValue="16:9">
        <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-sm h-10 ${layout === 'mobile' ? '' : 'w-20'}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 border-gray-600 z-50">
          <SelectItem value="16:9">16:9</SelectItem>
          <SelectItem value="4:3">4:3</SelectItem>
          <SelectItem value="1:1">1:1</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue="5s">
        <SelectTrigger className={`bg-gray-700 border-gray-600 text-white text-sm h-10 ${layout === 'mobile' ? '' : 'w-16'}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 border-gray-600 z-50">
          <SelectItem value="3s">3s</SelectItem>
          <SelectItem value="5s">5s</SelectItem>
          <SelectItem value="10s">10s</SelectItem>
        </SelectContent>
      </Select>

      {layout === 'desktop' && (
        <Button
          variant="ghost"
          className="w-10 h-10 p-0 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          <Music className="w-4 h-4" />
        </Button>
      )}

      <Button
        variant="ghost"
        onClick={onMotionClick}
        className={`bg-gray-700 hover:bg-gray-600 text-white rounded-lg relative text-sm h-10 ${
          layout === 'mobile' ? '' : 'w-10 p-0'
        }`}
        title={`Motion: ${motionIntensity}`}
      >
        <Zap className="w-4 h-4 mr-1" />
        {motionIntensity === 'low' ? 'L' : motionIntensity === 'medium' ? 'M' : 'H'}
        {layout === 'desktop' && (
          <span className="absolute -bottom-1 -right-1 text-xs bg-gray-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
            {motionIntensity === 'low' ? 'L' : motionIntensity === 'medium' ? 'M' : 'H'}
          </span>
        )}
      </Button>

      {layout === 'mobile' && mode === 'video' && (
        <Button
          variant="ghost"
          className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-lg h-10 col-span-3"
        >
          <Music className="w-4 h-4 mr-2" />
          Add Music
        </Button>
      )}
    </div>
  );
};
