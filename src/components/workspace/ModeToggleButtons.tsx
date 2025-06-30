
import React from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Play } from "lucide-react";

interface ModeToggleButtonsProps {
  mode: 'image' | 'video';
  onModeChange: (mode: 'image' | 'video') => void;
  layout: 'mobile' | 'desktop';
}

export const ModeToggleButtons = ({ mode, onModeChange, layout }: ModeToggleButtonsProps) => {
  const buttonClass = (isActive: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
      isActive 
        ? 'bg-white text-black hover:bg-gray-100' 
        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
    }`;

  if (layout === 'mobile') {
    return (
      <div className="flex gap-2">
        <Button
          onClick={() => onModeChange('image')}
          variant="default"
          className={buttonClass(mode === 'image')}
        >
          <Camera className="w-4 h-4" />
          IMAGE
        </Button>
        
        <Button
          onClick={() => onModeChange('video')}
          variant="default"
          className={buttonClass(mode === 'video')}
        >
          <Play className="w-4 h-4" />
          VIDEO
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={() => onModeChange('image')}
        variant="default"
        className={buttonClass(mode === 'image')}
      >
        <Camera className="w-4 h-4" />
        IMAGE
      </Button>
      
      <Button
        onClick={() => onModeChange('video')}
        variant="default"
        className={buttonClass(mode === 'video')}
      >
        <Play className="w-4 h-4" />
        VIDEO
      </Button>
    </div>
  );
};
