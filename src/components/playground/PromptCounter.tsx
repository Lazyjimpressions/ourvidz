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
  
  // Get limits based on mode - Much higher limits for unrestricted content
  const getLimits = () => {
    switch (mode) {
      case 'roleplay':
        return { optimal: 1000, warning: 2000, max: 5000 }; // Much higher for detailed roleplay
      case 'creative':
        return { optimal: 500, warning: 1000, max: 2000 }; // Higher for creative content
      case 'admin':
        return { optimal: 800, warning: 1500, max: 3000 }; // Higher for admin tools
      default: // chat
        return { optimal: 500, warning: 1000, max: 2000 }; // Higher for general chat
    }
  };

  const limits = getLimits();
  
  // Get color based on character count - More permissive
  const getColor = () => {
    if (charCount <= limits.optimal) return 'text-green-400';
    if (charCount <= limits.warning) return 'text-yellow-400';
    if (charCount <= limits.max) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get message based on character count and mode - More encouraging
  const getMessage = () => {
    if (charCount <= limits.optimal) return '';
    if (charCount <= limits.warning) return 'Detailed prompt';
    if (charCount <= limits.max) return 'Very detailed - good for complex scenarios';
    return 'Extremely detailed - perfect for immersive roleplay';
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