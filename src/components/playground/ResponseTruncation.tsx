import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResponseTruncationProps {
  content: string;
  mode?: string;
  className?: string;
}

export const ResponseTruncation: React.FC<ResponseTruncationProps> = ({
  content,
  mode = 'chat',
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get truncation limits based on mode
  const getTruncationLimit = () => {
    switch (mode) {
      case 'roleplay':
        return 2000; // Longer for immersive roleplay
      case 'admin':
        return 1200; // Shorter for technical content
      case 'creative':
        return 1500; // Standard for creative content
      default:
        return 1500; // Default for chat
    }
  };

  const limit = getTruncationLimit();
  const shouldTruncate = content.length > limit;

  // Smart truncation at sentence boundaries
  const getTruncatedContent = () => {
    if (!shouldTruncate) return content;

    let truncatedText = content.substring(0, limit);
    
    // Try to find a good breaking point
    const sentenceEnd = truncatedText.lastIndexOf('. ');
    const paragraphEnd = truncatedText.lastIndexOf('\n\n');
    const codeBlockEnd = truncatedText.lastIndexOf('```');
    
    // Use the best breaking point
    const breakPoint = Math.max(sentenceEnd, paragraphEnd);
    if (breakPoint > limit * 0.7) { // Only use if it's not too short
      truncatedText = content.substring(0, breakPoint + (sentenceEnd > paragraphEnd ? 2 : 0));
    }
    
    return truncatedText;
  };

  const displayContent = shouldTruncate && !isExpanded 
    ? getTruncatedContent() 
    : content;

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm leading-relaxed max-w-none">
        {displayContent}
        {shouldTruncate && !isExpanded && (
          <span className="text-muted-foreground">...</span>
        )}
      </div>
      
      {shouldTruncate && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpansion}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Continue reading...
              </>
            )}
          </Button>
          
          {!isExpanded && (
            <span className="text-xs text-muted-foreground">
              {content.length - displayContent.length} more characters
            </span>
          )}
        </div>
      )}
    </div>
  );
};