import React from 'react';
import { cn } from '@/lib/utils';

interface PromptCounterProps {
  text: string;
  mode: string;
  className?: string;
}

export const PromptCounter: React.FC<PromptCounterProps> = ({
  text,
  mode,
  className
}) => {
  const charCount = text.length;
  
  // Get limits based on mode
  const getLimits = () => {
    switch (mode) {
      case 'roleplay':
        return { optimal: 300, warning: 500, max: 1000 };
      case 'creative':
        return { optimal: 200, warning: 300, max: 500 };
      case 'admin':
        return { optimal: 400, warning: 600, max: 1000 };
      default: // chat
        return { optimal: 250, warning: 400, max: 750 };
    }
  };

  const limits = getLimits();
  
  // Get color based on character count
  const getColor = () => {
    if (charCount <= limits.optimal) return 'text-green-400';
    if (charCount <= limits.warning) return 'text-yellow-400';
    if (charCount <= limits.max) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get message based on character count and mode
  const getMessage = () => {
    if (charCount <= limits.optimal) return '';
    if (charCount <= limits.warning) return 'Getting long';
    if (charCount <= limits.max) return 'Very long prompt';
    return 'Extremely long - consider breaking up';
  };

  const message = getMessage();

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <span className={getColor()}>
        {charCount} chars
      </span>
      {message && (
        <span className="text-gray-400">
          • {message}
        </span>
      )}
    </div>
  );
};