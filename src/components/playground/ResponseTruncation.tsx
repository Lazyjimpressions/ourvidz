import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

  const getTruncationLimit = () => {
    switch (mode) {
      case 'roleplay': return 2000;
      case 'admin': return 1200;
      default: return 1500;
    }
  };

  const limit = getTruncationLimit();
  const shouldTruncate = content.length > limit;

  const getTruncatedContent = () => {
    if (!shouldTruncate) return content;
    let truncatedText = content.substring(0, limit);
    const sentenceEnd = truncatedText.lastIndexOf('. ');
    const paragraphEnd = truncatedText.lastIndexOf('\n\n');
    const breakPoint = Math.max(sentenceEnd, paragraphEnd);
    if (breakPoint > limit * 0.7) {
      truncatedText = content.substring(0, breakPoint + (sentenceEnd > paragraphEnd ? 2 : 0));
    }
    return truncatedText;
  };

  const displayContent = shouldTruncate && !isExpanded ? getTruncatedContent() : content;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_pre]:text-xs [&_code]:bg-muted/50 [&_code]:rounded [&_code]:px-1 [&_code]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {displayContent + (shouldTruncate && !isExpanded ? '...' : '')}
        </ReactMarkdown>
      </div>
      
      {shouldTruncate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Continue reading ({content.length - displayContent.length} chars)
            </>
          )}
        </Button>
      )}
    </div>
  );
};