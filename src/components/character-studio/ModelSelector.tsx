import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ImageModelOption } from '@/hooks/useImageModels';

interface ModelSelectorProps {
  models: ImageModelOption[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
  isLoading?: boolean;
  hasReferenceImage?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}

export function ModelSelector({
  models,
  selectedModel,
  onSelect,
  isLoading = false,
  hasReferenceImage = false,
  className,
  size = 'default',
}: ModelSelectorProps) {
  const selectedModelData = models.find(m => m.value === selectedModel);
  
  return (
    <Select value={selectedModel} onValueChange={onSelect} disabled={isLoading}>
      <SelectTrigger 
        className={cn(
          size === 'sm' ? 'h-8 text-xs' : 'h-9',
          className
        )}
      >
        <SelectValue placeholder="Select model...">
          {selectedModelData && (
            <span className="flex items-center gap-1.5 truncate">
              {selectedModelData.type === 'local' && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
              )}
              <span className="truncate">{selectedModelData.label}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[100] bg-popover border border-border shadow-lg">
        {models.length === 0 && (
          <div className="py-2 px-3 text-xs text-muted-foreground">
            {hasReferenceImage ? 'No I2I-capable models available' : 'No models available'}
          </div>
        )}
        {models.map((model) => (
          <SelectItem 
            key={model.value} 
            value={model.value}
            disabled={!model.isAvailable}
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-2 w-full">
              {model.type === 'local' && (
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  model.isAvailable ? 'bg-green-500' : 'bg-red-500'
                )} />
              )}
              <span className="flex-1 truncate">{model.label}</span>
              {model.capabilities?.supports_i2i && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  I2I
                </Badge>
              )}
              {model.capabilities?.cost === 'free' && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-600">
                  Free
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
