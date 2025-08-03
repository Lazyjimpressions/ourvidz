import React from 'react';
import { Button } from "@/components/ui/button";
import { Image, Play } from "lucide-react";

interface ModeToggleProps {
  mode: 'image' | 'video';
  onModeChange: (mode: 'image' | 'video') => void;
  disabled?: boolean;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  mode,
  onModeChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={mode === 'image' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('image')}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <Image className="w-4 h-4" />
        IMAGE
      </Button>
      <Button
        variant={mode === 'video' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('video')}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <Play className="w-4 h-4" />
        VIDEO
      </Button>
    </div>
  );
}; 