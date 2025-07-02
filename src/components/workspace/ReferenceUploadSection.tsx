
import React from 'react';
import { Button } from "@/components/ui/button";
import { Upload, RotateCcw, X, Image } from "lucide-react";

interface ReferenceUploadSectionProps {
  mode: 'image' | 'video';
  onReferenceImageUpload: () => void;
  referenceImage?: File | null;
  referenceImageUrl?: string;
}

export const ReferenceUploadSection = ({ 
  mode, 
  onReferenceImageUpload, 
  referenceImage, 
  referenceImageUrl 
}: ReferenceUploadSectionProps) => {
  if (mode === 'image') {
    return (
      <div className="flex flex-col items-center gap-3">
        <label className="text-xs font-medium text-gray-400 text-center">
          Reference Image
        </label>
        
        {referenceImage && referenceImageUrl ? (
          <div className="relative group">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-600/50 bg-gray-700/50">
              <img 
                src={referenceImageUrl} 
                alt="Reference" 
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => {/* Clear reference image logic */}}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={onReferenceImageUpload}
            className="w-16 h-16 p-0 bg-gray-700/30 hover:bg-gray-600/50 border-2 border-dashed border-gray-600/50 hover:border-gray-500/50 rounded-xl transition-all duration-200 group"
          >
            <div className="flex flex-col items-center gap-1">
              <Upload className="w-5 h-5 text-gray-400 group-hover:text-gray-300" />
              <span className="text-xs text-gray-500 group-hover:text-gray-400">Upload</span>
            </div>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center gap-2">
        <label className="text-xs font-medium text-gray-400">
          Start Frame
        </label>
        <Button
          variant="ghost"
          onClick={onReferenceImageUpload}
          className="w-12 h-12 p-0 bg-gray-700/30 hover:bg-gray-600/50 border-2 border-dashed border-gray-600/50 hover:border-gray-500/50 rounded-lg transition-all duration-200"
        >
          <Upload className="w-4 h-4 text-gray-400" />
        </Button>
      </div>
      
      <Button
        variant="ghost"
        className="w-8 h-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
      
      <div className="flex flex-col items-center gap-2">
        <label className="text-xs font-medium text-gray-400">
          End Frame
        </label>
        <Button
          variant="ghost"
          onClick={onReferenceImageUpload}
          className="w-12 h-12 p-0 bg-gray-700/30 hover:bg-gray-600/50 border-2 border-dashed border-gray-600/50 hover:border-gray-500/50 rounded-lg transition-all duration-200"
        >
          <Upload className="w-4 h-4 text-gray-400" />
        </Button>
      </div>
    </div>
  );
};
