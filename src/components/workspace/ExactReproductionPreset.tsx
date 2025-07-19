
import React from 'react';
import { Button } from "@/components/ui/button";
import { Copy, Target, Settings } from "lucide-react";
import { toast } from "sonner";

interface ExactReproductionPresetProps {
  onApplyPreset: () => void;
  isActive: boolean;
  className?: string;
}

export const ExactReproductionPreset = ({
  onApplyPreset,
  isActive,
  className = ""
}: ExactReproductionPresetProps) => {
  const handleApplyPreset = () => {
    onApplyPreset();
    toast.success("Exact reproduction preset applied - Reference strength set to 100%");
  };

  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={handleApplyPreset}
      className={`flex items-center gap-2 ${className} ${
        isActive 
          ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
          : 'border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Target className="w-3 h-3" />
      <span className="text-xs">Exact Copy</span>
      {isActive && <Settings className="w-3 h-3 animate-pulse" />}
    </Button>
  );
};
