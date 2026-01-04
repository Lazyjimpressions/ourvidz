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
import { Loader2, Zap, Server } from 'lucide-react';

interface DashboardSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedImageModel: string;
  onImageModelChange: (modelId: string) => void;
  selectedChatModel: string;
  onChatModelChange: (modelKey: string) => void;
  contentFilter: 'all' | 'nsfw' | 'sfw';
  onContentFilterChange: (filter: 'all' | 'nsfw' | 'sfw') => void;
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
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base font-medium">Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* Image Model Selector */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Image Model</Label>
            {imageLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading models...
              </div>
            ) : (
              <Select value={selectedImageModel} onValueChange={onImageModelChange}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue placeholder="Select image model" />
                </SelectTrigger>
                <SelectContent>
                  {imageModelOptions.map((model) => (
                    <SelectItem
                      key={model.value}
                      value={model.value}
                      disabled={!model.isAvailable}
                    >
                      <div className="flex items-center gap-2">
                        {model.type === 'local' ? (
                          <Server className="w-3 h-3 text-blue-400" />
                        ) : (
                          <Zap className="w-3 h-3 text-yellow-400" />
                        )}
                        <span>{model.label}</span>
                        {!model.isAvailable && (
                          <Badge variant="outline" className="text-xs ml-1">Offline</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Chat Model Selector */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Chat Model</Label>
            {chatLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading models...
              </div>
            ) : (
              <Select value={selectedChatModel} onValueChange={onChatModelChange}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue placeholder="Select chat model" />
                </SelectTrigger>
                <SelectContent>
                  {chatModelOptions.map((model) => (
                    <SelectItem
                      key={model.value}
                      value={model.value}
                      disabled={!model.isAvailable}
                    >
                      <div className="flex items-center gap-2">
                        {model.isLocal ? (
                          <Server className="w-3 h-3 text-blue-400" />
                        ) : (
                          <Zap className="w-3 h-3 text-yellow-400" />
                        )}
                        <span className="truncate max-w-[200px]">{model.label}</span>
                        {!model.isAvailable && (
                          <Badge variant="outline" className="text-xs ml-1">Offline</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Content Filter */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Content Filter</Label>
            <div className="flex gap-2">
              <button
                onClick={() => onContentFilterChange('all')}
                className={`flex-1 py-2 px-3 text-sm rounded-lg transition-colors ${
                  contentFilter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                All
              </button>
              <button
                onClick={() => onContentFilterChange('nsfw')}
                className={`flex-1 py-2 px-3 text-sm rounded-lg transition-colors ${
                  contentFilter === 'nsfw'
                    ? 'bg-purple-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                NSFW
              </button>
              <button
                onClick={() => onContentFilterChange('sfw')}
                className={`flex-1 py-2 px-3 text-sm rounded-lg transition-colors ${
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
