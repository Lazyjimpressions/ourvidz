
import React from 'react';
import { Button } from "@/components/ui/button";
import { Upload, RotateCcw } from "lucide-react";

interface ReferenceUploadSectionProps {
  mode: 'image' | 'video';
  onReferenceImageUpload: () => void;
}

export const ReferenceUploadSection = ({ mode, onReferenceImageUpload }: ReferenceUploadSectionProps) => {
  if (mode === 'image') {
    return (
      <Button
        variant="ghost"
        onClick={onReferenceImageUpload}
        className="w-8 h-8 p-0 bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-500 hover:border-gray-400 rounded-lg"
      >
        <Upload className="w-3.5 h-3.5 text-gray-400" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        onClick={onReferenceImageUpload}
        className="w-8 h-8 p-0 bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-500 hover:border-gray-400 rounded-lg"
      >
        <Upload className="w-3.5 h-3.5 text-gray-400" />
      </Button>
      
      <Button
        variant="ghost"
        className="w-6 h-6 p-0 text-gray-400 hover:text-white"
      >
        <RotateCcw className="w-3 h-3" />
      </Button>
      
      <Button
        variant="ghost"
        onClick={onReferenceImageUpload}
        className="w-8 h-8 p-0 bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-500 hover:border-gray-400 rounded-lg"
      >
        <Upload className="w-3.5 h-3.5 text-gray-400" />
      </Button>
    </div>
  );
};
