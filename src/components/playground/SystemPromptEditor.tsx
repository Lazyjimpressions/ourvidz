import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface SystemPromptEditorProps {
  conversationId: string | null;
  onSystemPromptChange: (prompt: string) => void;
}

export const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({
  conversationId,
  onSystemPromptChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');

  // Load from localStorage keyed by conversation
  useEffect(() => {
    if (!conversationId) {
      setSystemPrompt('');
      return;
    }
    const stored = localStorage.getItem(`sys-prompt-${conversationId}`);
    if (stored) {
      setSystemPrompt(stored);
      onSystemPromptChange(stored);
    } else {
      setSystemPrompt('');
      onSystemPromptChange('');
    }
  }, [conversationId]);

  const handleChange = (value: string) => {
    setSystemPrompt(value);
    onSystemPromptChange(value);
    if (conversationId) {
      localStorage.setItem(`sys-prompt-${conversationId}`, value);
    }
  };

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>
          System Prompt
          {systemPrompt && (
            <span className="ml-1 text-[11px] opacity-60">
              ({systemPrompt.length} chars)
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-2">
          <Textarea
            value={systemPrompt}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Enter a custom system prompt to control AI behavior..."
            className="min-h-[60px] max-h-[120px] text-xs resize-none"
            rows={3}
          />
        </div>
      )}
    </div>
  );
};