
import React from 'react';
import { Upload, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReferenceImageBoxProps {
  references: Array<{
    id: string;
    label: string;
    enabled: boolean;
    url?: string;
  }>;
  onClick: () => void;
  className?: string;
}

export const ReferenceImageBox = ({ references, onClick, className }: ReferenceImageBoxProps) => {
  const activeReferences = references.filter(ref => ref.enabled && ref.url);
  const hasReferences = activeReferences.length > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center w-12 h-12 rounded-md border-2 border-dashed transition-colors hover:border-gray-500",
        hasReferences 
          ? "border-green-500 bg-green-500/10" 
          : "border-gray-600 bg-gray-800/50 hover:bg-gray-700/50",
        className
      )}
    >
      {hasReferences ? (
        <div className="relative">
          <Image className="w-5 h-5 text-green-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
            {activeReferences.length}
          </div>
        </div>
      ) : (
        <Upload className="w-5 h-5 text-gray-400" />
      )}
    </button>
  );
};
