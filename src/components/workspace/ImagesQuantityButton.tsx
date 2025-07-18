
import React from 'react';
import { Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ImagesQuantityButtonProps {
  numImages: number;
  onQuantityChange: (quantity: number) => void;
  layout: 'mobile' | 'desktop';
  hasCharacterReference?: boolean;
}

export const ImagesQuantityButton = ({ 
  numImages, 
  onQuantityChange, 
  layout,
  hasCharacterReference = false
}: ImagesQuantityButtonProps) => {
  // Limit quantities when character reference is active
  const quantities = hasCharacterReference 
    ? [
        { value: 1, label: '1 img' },
        { value: 3, label: '3 imgs' }
      ]
    : [
        { value: 1, label: '1 img' },
        { value: 3, label: '3 imgs' },
        { value: 6, label: '6 imgs' }
      ];

  const currentLabel = quantities.find(q => q.value === numImages)?.label || '1 img';

  const buttonContent = (
    <Button 
      variant="outline" 
      size="sm"
      className={`bg-transparent border-gray-600 text-white h-8 hover:bg-gray-700/50 gap-2 ${
        hasCharacterReference ? 'border-primary/50' : ''
      }`}
    >
      <Images className="w-4 h-4" />
      <span className="text-sm">{currentLabel}</span>
    </Button>
  );

  return (
    <TooltipProvider>
      <Popover>
        <PopoverTrigger asChild>
          {hasCharacterReference ? (
            <Tooltip>
              <TooltipTrigger asChild>
                {buttonContent}
              </TooltipTrigger>
              <TooltipContent>
                <p>Character references work best with 1-3 images for consistency</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            buttonContent
          )}
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
                {hasCharacterReference && quantity.value === 1 && (
                  <span className="ml-2 text-xs text-primary">✓ Best for character</span>
                )}
              </button>
            ))}
            {hasCharacterReference && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <p className="text-xs text-muted-foreground">
                  Higher quantities may reduce character consistency
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};
