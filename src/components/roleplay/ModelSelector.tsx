import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  Zap, 
  DollarSign, 
  Shield, 
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useRoleplayModels, ModelOption } from '@/hooks/useRoleplayModels';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  compact?: boolean;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModel,
  onModelChange,
  compact = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { allModelOptions, isLoading } = useRoleplayModels();
  const { isMobile } = useMobileDetection();

  const currentModelOption: ModelOption = allModelOptions?.find(m => m.value === currentModel) || allModelOptions?.[0] || {
    value: currentModel || 'qwen-local',
    label: currentModel || 'Qwen 2.5-7B-Instruct (Local)',
    description: 'Local model - fast & private',
    provider: 'Local',
    isLocal: true,
    isAvailable: true
  };

  const getModelCapabilities = (model: ModelOption | null | undefined) => {
    if (!model) {
      return {
        speed: 'medium' as const,
        cost: 'free' as const,
        nsfw: true
      };
    }

    const capabilities: {
      speed?: 'fast' | 'medium' | 'slow';
      cost?: 'free' | 'low' | 'medium' | 'high';
      nsfw?: boolean;
    } = {};

    // Use model capabilities if available
    if (model.capabilities) {
      return {
        speed: model.capabilities.speed || 'medium',
        cost: model.capabilities.cost || 'low',
        nsfw: model.capabilities.nsfw !== undefined ? model.capabilities.nsfw : true
      };
    }

    // Determine speed based on model
    if (model.isLocal) {
      capabilities.speed = 'fast';
      capabilities.cost = 'free';
      capabilities.nsfw = true;
    } else if (model.value?.includes('venice-edition') || model.value?.includes('dolphin')) {
      capabilities.speed = 'medium';
      capabilities.cost = 'free';
      capabilities.nsfw = true;
    } else if (model.value?.includes('claude') || model.value?.includes('gpt')) {
      capabilities.speed = 'fast';
      capabilities.cost = 'high';
      capabilities.nsfw = false;
    } else {
      capabilities.speed = 'medium';
      capabilities.cost = 'low';
      capabilities.nsfw = true;
    }

    return capabilities;
  };

  const getSpeedBadge = (speed?: 'fast' | 'medium' | 'slow') => {
    if (!speed) return null;
    const colors = {
      fast: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      slow: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return (
      <Badge variant="outline" className={cn('text-xs px-1.5 py-0.5', colors[speed])}>
        <Zap className="w-3 h-3 mr-1" />
        {speed}
      </Badge>
    );
  };

  const getCostBadge = (cost?: 'free' | 'low' | 'medium' | 'high') => {
    if (!cost) return null;
    if (cost === 'free') {
      return (
        <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 border-green-500/30">
          <DollarSign className="w-3 h-3 mr-1" />
          Free
        </Badge>
      );
    }
    return null; // Only show free badge
  };

  const getNSFWBadge = (nsfw?: boolean) => {
    if (!nsfw) return null;
    return (
      <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border-purple-500/30">
        <Shield className="w-3 h-3 mr-1" />
        NSFW
      </Badge>
    );
  };

  const capabilities = getModelCapabilities(currentModelOption);

  // Group models by provider - safe handling
  const groupedModels = (allModelOptions || []).reduce((acc, model) => {
    const provider = model.provider || 'Other';
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, ModelOption[]>);


  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 px-2 text-xs bg-gray-800/50 border-gray-700 hover:bg-gray-800",
              className
            )}
          >
            <span className="truncate max-w-[120px]">{currentModelOption.label}</span>
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className={cn(
            "w-[280px] p-0 bg-gray-900 border-gray-700",
            isMobile && "w-[calc(100vw-2rem)]"
          )}
          align="end"
        >
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                Loading models...
              </div>
            ) : (
              Object.entries(groupedModels).map(([provider, models]) => (
                <div key={provider} className="border-b border-gray-800 last:border-0">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-800/50">
                    {provider}
                  </div>
                  {models.map((model) => {
                    const modelCaps = getModelCapabilities(model);
                    const isSelected = model.value === currentModel;
                    return (
                      <button
                        key={model.value}
                        onClick={() => {
                          onModelChange(model.value);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2.5 text-left hover:bg-gray-800/50 transition-colors",
                          isSelected && "bg-blue-600/20 border-l-2 border-blue-500"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "text-sm font-medium truncate",
                                isSelected ? "text-blue-400" : "text-white"
                              )}>
                                {model.label}
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-1">
                              {model.description}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {getSpeedBadge(modelCaps.speed)}
                              {getCostBadge(modelCaps.cost)}
                              {getNSFWBadge(modelCaps.nsfw)}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3 bg-gray-800/50 border-gray-700 hover:bg-gray-800 text-sm",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{currentModelOption.label}</span>
            <div className="flex items-center gap-1">
              {getSpeedBadge(capabilities.speed)}
              {getCostBadge(capabilities.cost)}
              {getNSFWBadge(capabilities.nsfw)}
            </div>
            <ChevronDown className="w-4 h-4 ml-1" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "w-[320px] p-0 bg-gray-900 border-gray-700",
          isMobile && "w-[calc(100vw-2rem)]"
        )}
        align="end"
      >
        <div className="max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
              Loading models...
            </div>
          ) : (
            Object.entries(groupedModels).map(([provider, models]) => (
              <div key={provider} className="border-b border-gray-800 last:border-0">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-800/50">
                  {provider}
                </div>
                {models.map((model) => {
                  const modelCaps = getModelCapabilities(model);
                  const isSelected = model.value === currentModel;
                  return (
                    <button
                      key={model.value}
                      onClick={() => {
                        onModelChange(model.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-3 text-left hover:bg-gray-800/50 transition-colors",
                        isSelected && "bg-blue-600/20 border-l-2 border-blue-500"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-sm font-medium truncate",
                              isSelected ? "text-blue-400" : "text-white"
                            )}>
                              {model.label}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                            {model.description}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getSpeedBadge(modelCaps.speed)}
                            {getCostBadge(modelCaps.cost)}
                            {getNSFWBadge(modelCaps.nsfw)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

