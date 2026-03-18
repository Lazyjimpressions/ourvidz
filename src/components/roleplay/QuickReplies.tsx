import React from 'react';
import { cn } from '@/lib/utils';

interface QuickRepliesProps {
  suggestions: string[];
  onSelect: (reply: string) => void;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_SUGGESTIONS = [
  "Tell me more...",
  "What happens next?",
  "Come closer..."
];

/**
 * Contextual quick-reply chips displayed after AI messages.
 * Provides quick interaction options without typing.
 */
export const QuickReplies: React.FC<QuickRepliesProps> = ({
  suggestions,
  onSelect,
  disabled = false,
  className
}) => {
  const chips = suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS;

  return (
    <div className={cn(
      "flex flex-wrap gap-2 py-2 animate-fade-in",
      className
    )}>
      {chips.slice(0, 3).map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className={cn(
            "px-3.5 py-2 rounded-full text-sm",
            "bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground",
            "border border-border/50 hover:border-border",
            "transition-all duration-200 hover:scale-[1.03]",
            "disabled:opacity-40 disabled:pointer-events-none",
            "backdrop-blur-sm"
          )}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};
