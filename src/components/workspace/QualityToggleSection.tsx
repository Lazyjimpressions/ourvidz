
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
      className={`flex items-center gap-1.5 px-2.5 py-1.5 h-8 rounded-lg transition-all text-sm ${
        quality === 'high' 
          ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {quality === 'high' ? (
        <>
          <Crown className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">High</span>
        </>
      ) : (
        <>
          <Zap className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Fast</span>
        </>
      )}
    </Button>
  );
};
