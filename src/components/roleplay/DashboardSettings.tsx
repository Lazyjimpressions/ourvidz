import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useImageModels } from '@/hooks/useImageModels';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { SceneStyle } from '@/types/roleplay';

interface DashboardSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedImageModel: string;
  onImageModelChange: (modelId: string) => void;
  selectedChatModel: string;
  onChatModelChange: (modelKey: string) => void;
  contentFilter: 'all' | 'nsfw' | 'sfw';
  onContentFilterChange: (filter: 'all' | 'nsfw' | 'sfw') => void;
  memoryTier: 'conversation' | 'character' | 'profile';
  onMemoryTierChange: (tier: 'conversation' | 'character' | 'profile') => void;
  sceneStyle: SceneStyle;
  onSceneStyleChange: (style: SceneStyle) => void;
}

export const DashboardSettings: React.FC<DashboardSettingsProps> = ({
  isOpen,
  onClose,
  selectedImageModel,
  onImageModelChange,
  selectedChatModel,
  onChatModelChange,
  contentFilter,
  onContentFilterChange,
  memoryTier,
  onMemoryTierChange,
  sceneStyle,
  onSceneStyleChange,
}) => {
  const { modelOptions: imageModelOptions, isLoading: imageLoading, defaultModel: defaultImageModel } = useImageModels();
  const { allModelOptions: chatModelOptions, isLoading: chatLoading, defaultModel: defaultChatModel } = useRoleplayModels();

  // Set defaults if not already set
  useEffect(() => {
    if (!selectedImageModel && defaultImageModel) {
      onImageModelChange(defaultImageModel.value);
    }
    if (!selectedChatModel && defaultChatModel) {
      onChatModelChange(defaultChatModel.value);
    }
  }, [defaultImageModel, defaultChatModel, selectedImageModel, selectedChatModel]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-sm font-medium">Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-2 pb-4">
          {/* Image Model Selector */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Image Model</Label>
            {imageLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </div>
            ) : (
              <Select value={selectedImageModel} onValueChange={onImageModelChange}>
                <SelectTrigger className="w-full bg-card h-9">
                  <SelectValue placeholder="Select image model" />
                </SelectTrigger>
                <SelectContent className="max-w-[280px] max-h-[300px] overflow-y-auto">
                  {imageModelOptions.map((model) => (
                    <SelectItem
                      key={model.value}
                      value={model.value}
                      disabled={!model.isAvailable}
                    >
                      <span>{model.label}</span>
                      {!model.isAvailable && (
                        <Badge variant="outline" className="text-xs ml-2">Offline</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Chat Model Selector */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Chat Model</Label>
            {chatLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </div>
            ) : (
              <Select value={selectedChatModel} onValueChange={onChatModelChange}>
                <SelectTrigger className="w-full bg-card h-9">
                  <SelectValue placeholder="Select chat model" />
                </SelectTrigger>
                <SelectContent className="max-w-[280px] max-h-[300px] overflow-y-auto">
                  {chatModelOptions.map((model) => (
                    <SelectItem
                      key={model.value}
                      value={model.value}
                      disabled={!model.isAvailable}
                    >
                      <span className="truncate max-w-[200px]">{model.label}</span>
                      {!model.isAvailable && (
                        <Badge variant="outline" className="text-xs ml-2">Offline</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Memory Tier */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Memory Tier</Label>
            <Select value={memoryTier} onValueChange={(value: 'conversation' | 'character' | 'profile') => onMemoryTierChange(value)}>
              <SelectTrigger className="w-full bg-card h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[280px]">
                <SelectItem value="conversation">
                  <div className="flex flex-col">
                    <span className="text-xs">Conversation</span>
                    <span className="text-[10px] text-muted-foreground">Only this conversation</span>
                  </div>
                </SelectItem>
                <SelectItem value="character">
                  <div className="flex flex-col">
                    <span className="text-xs">Character</span>
                    <span className="text-[10px] text-muted-foreground">All conversations with this character</span>
                  </div>
                </SelectItem>
                <SelectItem value="profile">
                  <div className="flex flex-col">
                    <span className="text-xs">Profile</span>
                    <span className="text-[10px] text-muted-foreground">All your roleplay conversations</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scene Style */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Scene Style</Label>
            <Select value={sceneStyle} onValueChange={(value: SceneStyle) => onSceneStyleChange(value)}>
              <SelectTrigger className="w-full bg-card h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[280px]">
                <SelectItem value="character_only">
                  <span className="text-xs">Character Only</span>
                </SelectItem>
                <SelectItem value="pov">
                  <span className="text-xs">First Person (POV)</span>
                </SelectItem>
                <SelectItem value="both_characters">
                  <span className="text-xs">Both Characters</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Filter */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Content Filter</Label>
            <div className="flex gap-2">
              <button
                onClick={() => onContentFilterChange('all')}
                className={`flex-1 py-1.5 px-2 text-xs rounded-lg transition-colors ${
                  contentFilter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                All
              </button>
              <button
                onClick={() => onContentFilterChange('nsfw')}
                className={`flex-1 py-1.5 px-2 text-xs rounded-lg transition-colors ${
                  contentFilter === 'nsfw'
                    ? 'bg-purple-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                NSFW
              </button>
              <button
                onClick={() => onContentFilterChange('sfw')}
                className={`flex-1 py-1.5 px-2 text-xs rounded-lg transition-colors ${
                  contentFilter === 'sfw'
                    ? 'bg-green-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                SFW
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
