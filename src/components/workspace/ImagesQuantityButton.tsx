import React from 'react';
import { Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ImagesQuantityButtonProps {
  numImages: number;
  onQuantityChange: (quantity: number) => void;
  layout: 'mobile' | 'desktop';
}

export const ImagesQuantityButton = ({ 
  numImages, 
  onQuantityChange, 
  layout 
}: ImagesQuantityButtonProps) => {
  const quantities = [
    { value: 1, label: '1 img' },
    { value: 3, label: '3 imgs' },
    { value: 6, label: '6 imgs' }
  ];

  const currentLabel = quantities.find(q => q.value === numImages)?.label || '1 img';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-transparent border-gray-600 text-white h-8 hover:bg-gray-700/50 gap-2"
        >
          <Images className="w-4 h-4" />
          <span className="text-sm">{currentLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-40 p-2 bg-gray-800 border-gray-600" 
        align={layout === 'desktop' ? 'center' : 'start'}
      >
        <div className="space-y-1">
          {quantities.map((quantity) => (
            <button
              key={quantity.value}
              onClick={() => onQuantityChange(quantity.value)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                numImages === quantity.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {quantity.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};