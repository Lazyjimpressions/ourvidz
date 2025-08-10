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
    <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl bg-background/95 backdrop-blur-sm border border-border shadow-lg">
      <div className="p-3">
        {/* Mode Toggle & Controls Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            <div className="flex rounded-md border border-border overflow-hidden">
              <Button
                variant={mode === 'chat' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange?.('chat')}
                className="rounded-none h-7 px-3"
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Chat
              </Button>
              <Button
                variant={mode === 'scene' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange?.('scene')}
                className="rounded-none h-7 px-3"
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                Scene
              </Button>
            </div>

            {/* Quick Scene Ideas */}
            {mode === 'scene' && (
              <div className="flex gap-1">
                <Badge 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                  onClick={() => onChange(`${characterName} in a cozy coffee shop, warm lighting`)}
                >
                  Coffee Shop
                </Badge>
                <Badge 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                  onClick={() => onChange(`${characterName} walking through a mystical forest at sunset`)}
                >
                  Forest
                </Badge>
                <Badge 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                  onClick={() => onChange(`${characterName} in an elegant ballroom, dramatic lighting`)}
                >
                  Ballroom
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Reference Upload Toggle */}
            <Button
              variant={showReferences ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowReferences(!showReferences)}
              className="h-7 px-2"
            >
              <Camera className="w-3 h-3" />
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className="h-7 px-2"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Reference Upload Area */}
        {showReferences && (
          <div className="mb-2 p-2 border border-border rounded-md bg-muted/50">
            <div className="flex items-center gap-2">
              {referenceImage ? (
                <div className="relative">
                  <img
                    src={URL.createObjectURL(referenceImage)}
                    alt="Reference"
                    className="w-12 h-12 object-cover rounded border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearReference}
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 rounded-full"
                  >
                    <X className="w-2 h-2" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer flex items-center justify-center w-12 h-12 border border-dashed border-border rounded hover:bg-muted/80">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
              <span className="text-xs text-muted-foreground">
                {mode === 'scene' ? 'Reference image for scene generation' : 'Reference image for context'}
              </span>
            </div>
          </div>
        )}

        {/* Main Input Row */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                mode === 'chat' 
                  ? `Message ${characterName}...` 
                  : `Describe a scene with ${characterName}...`
              }
              className="min-h-[60px] max-h-[120px] resize-none bg-background border-border"
              disabled={isDisabled}
            />
            
            {/* Prompt Counter */}
            <div className="mt-1">
              <PromptCounter 
                text={value} 
                mode="roleplay" 
                className="text-right"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!value.trim() || isDisabled}
            className="h-16 w-16 flex-shrink-0"
          >
            {mode === 'chat' ? (
              <Send className="w-4 h-4" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
};