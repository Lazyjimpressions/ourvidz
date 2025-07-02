import React from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

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
      <div className="flex items-center">
        {referenceImage && referenceImageUrl ? (
          <div className="relative group">
            <div className="w-10 h-10 rounded border border-gray-600 overflow-hidden">
              <img 
                src={referenceImageUrl} 
                alt="Reference" 
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => {/* Clear reference image logic */}}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2 h-2 text-white" />
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={onReferenceImageUpload}
            className="w-10 h-10 p-0 bg-transparent border border-dashed border-gray-600 hover:border-gray-400 rounded"
          >
            <Upload className="w-4 h-4 text-gray-400" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        onClick={onReferenceImageUpload}
        className="w-8 h-8 p-0 bg-transparent border border-dashed border-gray-600 hover:border-gray-400 rounded text-xs"
      >
        <Upload className="w-3 h-3 text-gray-400" />
      </Button>
      
      <Button
        variant="ghost"
        onClick={onReferenceImageUpload}
        className="w-8 h-8 p-0 bg-transparent border border-dashed border-gray-600 hover:border-gray-400 rounded text-xs"
      >
        <Upload className="w-3 h-3 text-gray-400" />
      </Button>
    </div>
  );
};
