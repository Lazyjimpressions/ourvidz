
import React, { useState } from 'react';
import { Copy, Check, Dice6 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SeedDisplayProps {
  seed: string | number;
  className?: string;
  onUseSeed?: (seed: string | number) => void;
  showUseButton?: boolean;
}

export const SeedDisplay = ({ 
  seed, 
  className,
  onUseSeed,
  showUseButton = false
}: SeedDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seed.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy seed:', error);
    }
  };

  const handleUseSeed = () => {
    if (onUseSeed) {
      onUseSeed(seed);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Dice6 className="w-3 h-3 text-blue-400" />
      <span className="text-xs font-mono text-blue-400">
        {typeof seed === 'number' ? seed.toString() : seed}
      </span>
      
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-4 w-4 p-0 hover:bg-blue-400/20"
            >
              {copied ? (
                <Check className="w-2.5 h-2.5 text-green-400" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-blue-400" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? 'Copied!' : 'Copy seed'}</p>
          </TooltipContent>
        </Tooltip>
        
        {showUseButton && onUseSeed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUseSeed}
                className="h-4 w-4 p-0 hover:bg-green-400/20"
              >
                <Dice6 className="w-2.5 h-2.5 text-green-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Use this seed</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};
