
import React from 'react';
import { Button } from "@/components/ui/button";
import { Crown, Zap } from "lucide-react";

interface QualityToggleSectionProps {
  quality: 'fast' | 'high';
  onQualityChange: (quality: 'fast' | 'high') => void;
}

export const QualityToggleSection = ({ quality, onQualityChange }: QualityToggleSectionProps) => {
  return (
    <Button
      variant="ghost"
      onClick={() => onQualityChange(quality === 'fast' ? 'high' : 'fast')}
      className={`flex items-center gap-2 px-3 py-2 h-10 rounded-lg transition-all ${
        quality === 'high' 
          ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {quality === 'high' ? (
        <>
          <Crown className="w-4 h-4" />
          <span className="text-sm font-medium">High</span>
        </>
      ) : (
        <>
          <Zap className="w-4 h-4" />
          <span className="text-sm font-medium">Fast</span>
        </>
      )}
    </Button>
  );
};
