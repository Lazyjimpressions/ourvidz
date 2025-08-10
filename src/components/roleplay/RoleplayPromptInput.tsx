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
    <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200">
      {/* Main Input Row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2">
        <div className="flex-1">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Message ${characterName}...`}
            className="min-h-[32px] max-h-[80px] resize-none bg-white border border-gray-200 rounded-full px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            disabled={isDisabled}
          />
        </div>

        <Button
          type="submit"
          disabled={!value.trim() || isDisabled}
          size="sm"
          className="h-8 w-8 p-0 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Send className="w-3 h-3" />
        </Button>
      </form>
    </div>
  );
};