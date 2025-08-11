import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Send, 
  Image as ImageIcon, 
  MessageCircle, 
  Camera, 
  Upload,
  X,
  Palette,
  Settings
} from 'lucide-react';
import { PromptCounter } from '@/components/playground/PromptCounter';

interface RoleplayPromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onGenerateScene: () => void;
  onOpenSettings: () => void;
  isDisabled?: boolean;
  characterName?: string;
  mode?: 'chat' | 'scene';
  onModeChange?: (mode: 'chat' | 'scene') => void;
}

export const RoleplayPromptInput: React.FC<RoleplayPromptInputProps> = ({
  value,
  onChange,
  onSend,
  onGenerateScene,
  onOpenSettings,
  isDisabled = false,
  characterName = 'Character',
  mode = 'chat',
  onModeChange
}) => {
  const [showReferences, setShowReferences] = useState(false);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReferenceImage(file);
    }
  };

  const clearReference = () => {
    setReferenceImage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isDisabled) {
      if (mode === 'chat') {
        onSend();
      } else {
        onGenerateScene();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-background/95 backdrop-blur-sm border-t border-border shadow-sm">
      {/* Main Input Row */}
      <form onSubmit={handleSubmit} className="p-3">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <div className="flex-1">
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Message ${characterName}...`}
              className="min-h-[36px] max-h-[100px] resize-none bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent shadow-sm"
              disabled={isDisabled}
            />
          </div>

          <Button
            type="submit"
            disabled={!value.trim() || isDisabled}
            size="sm"
            className="h-9 w-9 p-0 rounded-lg shadow-sm"
            title={mode === 'chat' ? 'Send message' : 'Generate scene narrative'}
          >
            {mode === 'chat' ? (
              <Send className="w-4 h-4" />
            ) : (
              <Palette className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};