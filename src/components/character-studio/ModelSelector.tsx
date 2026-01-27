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
            {hasReferenceImage ? 'No models support reference images' : 'No models available'}
          </div>
        )}
        {models.map((model) => (
          <SelectItem 
            key={model.value} 
            value={model.value}
            disabled={!model.isAvailable}
            className="flex items-center gap-2"
          >
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {model.type === 'local' && (
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    model.isAvailable ? 'bg-green-500' : 'bg-red-500'
                  )} />
                )}
                <span className="truncate text-xs">{model.label}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {model.avg_generation_time && (
                  <Badge variant="outline" className="h-4 text-[10px] px-1">
                    ~{model.avg_generation_time}s
                  </Badge>
                )}
                {model.cost_per_use !== undefined && (
                  <Badge
                    variant={model.cost_per_use === 0 ? 'default' : 'secondary'}
                    className="h-4 text-[10px] px-1"
                  >
                    {model.cost_per_use === 0 ? 'Free' : `$${model.cost_per_use}`}
                  </Badge>
                )}
                {model.capabilities?.supports_i2i && (
                  <Badge variant="outline" className="h-4 text-[10px] px-1">
                    Ref
                  </Badge>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
