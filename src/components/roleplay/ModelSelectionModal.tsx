import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Brain, 
  Zap, 
  Shield, 
  Clock, 
  DollarSign, 
  Check,
  Info,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ApiModel {
  id: string;
  model_key: string;
  display_name: string;
  modality: string;
  task: string;
  model_family: string;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  provider_name: string;
  provider_display_name: string;
}

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onModelSelect: (modelKey: string) => void;
  useCase: 'roleplay' | 'prompt_enhancement' | 'storytelling';
}

export const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onModelSelect,
  useCase
}) => {
  const [apiModels, setApiModels] = useState<ApiModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Local models (Qwen and others)
  const localModels = [
    {
      id: 'qwen-local',
      model_key: 'qwen-local',
      display_name: 'Qwen 2.5-7B-Instruct (Local)',
      modality: 'roleplay',
      task: 'roleplay',
      model_family: 'qwen',
      provider_name: 'local',
      provider_display_name: 'Local',
      is_active: true,
      is_default: false,
      priority: 0,
      capabilities: {
        nsfw: true,
        speed: 'fast',
        cost: 'free',
        quality: 'high'
      }
    }
  ];

  // Load API models from database
  useEffect(() => {
    const loadApiModels = async () => {
      try {
        const { data, error } = await supabase
          .from('api_models')
          .select(`
            id,
            model_key,
            display_name,
            modality,
            task,
            model_family,
            is_active,
            is_default,
            priority,
            api_providers!inner(name, display_name)
          `)
          .eq('modality', 'roleplay')
          .eq('is_active', true)
          .order('priority', { ascending: true });

        if (error) {
          console.error('Error loading API models:', error);
          return;
        }

        const formattedModels = data.map(model => ({
          ...model,
          provider_name: model.api_providers.name,
          provider_display_name: model.api_providers.display_name
        }));

        setApiModels(formattedModels);
      } catch (error) {
        console.error('Error in loadApiModels:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      loadApiModels();
    }
  }, [isOpen]);

  const allModels = [...localModels, ...apiModels];

  const getModelCapabilities = (model: any) => {
    const capabilities = {
      nsfw: true, // All models support NSFW
      speed: 'medium',
      cost: 'free',
      quality: 'high'
    };

    // OpenRouter models are free
    if (model.provider_name === 'openrouter') {
      capabilities.cost = 'free';
      capabilities.speed = 'fast';
    }

    // Local Qwen model
    if (model.model_key === 'qwen-local') {
      capabilities.speed = 'fast';
      capabilities.cost = 'free';
    }

    return capabilities;
  };

  const getModelDescription = (model: any) => {
    if (model.model_key === 'qwen-local') {
      return 'Local Qwen 2.5-7B-Instruct model for fast, private roleplay with no external API calls';
    }
    
    if (model.provider_name === 'openrouter') {
      if (model.model_key.includes('venice-edition')) {
        return 'Most uncensored model with user control over alignment and behavior';
      }
      if (model.model_key.includes('dolphin-3.0-r1')) {
        return 'Advanced reasoning model trained on 800k reasoning traces';
      }
      if (model.model_key.includes('dolphin-3.0')) {
        return 'General-purpose uncensored instruct model for versatile roleplay';
      }
      return 'Uncensored model optimized for unrestricted roleplay scenarios';
    }

    return 'AI model for roleplay conversations';
  };

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'fast': return <Zap className="w-4 h-4 text-green-400" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'slow': return <Clock className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCostIcon = (cost: string) => {
    switch (cost) {
      case 'free': return <DollarSign className="w-4 h-4 text-green-400" />;
      case 'low': return <DollarSign className="w-4 h-4 text-yellow-400" />;
      case 'high': return <DollarSign className="w-4 h-4 text-red-400" />;
      default: return <DollarSign className="w-4 h-4 text-gray-400" />;
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'high': return <Star className="w-4 h-4 text-yellow-400" />;
      case 'medium': return <Star className="w-4 h-4 text-gray-400" />;
      case 'low': return <Star className="w-4 h-4 text-gray-600" />;
      default: return <Star className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleModelSelect = (modelKey: string) => {
    onModelSelect(modelKey);
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select AI Model</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400">Loading models...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Select AI Model for {useCase === 'roleplay' ? 'Roleplay' : useCase === 'prompt_enhancement' ? 'Prompt Enhancement' : 'Storytelling'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] space-y-4">
          {/* Local Models Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Local Models (Private & Fast)
            </h3>
            <div className="space-y-2">
              {localModels.map((model) => {
                const capabilities = getModelCapabilities(model);
                const isSelected = selectedModel === model.model_key;
                
                return (
                  <Card
                    key={model.id}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                    onClick={() => handleModelSelect(model.model_key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-white">{model.display_name}</h4>
                          {model.is_default && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {model.provider_display_name}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm mb-3">
                          {getModelDescription(model)}
                        </p>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            {getSpeedIcon(capabilities.speed)}
                            <span className="text-gray-400 capitalize">{capabilities.speed}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {getCostIcon(capabilities.cost)}
                            <span className="text-gray-400 capitalize">{capabilities.cost}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {getQualityIcon(capabilities.quality)}
                            <span className="text-gray-400 capitalize">{capabilities.quality}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="w-4 h-4 text-green-400" />
                            <span className="text-gray-400">Private</span>
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-4">
                          <Check className="w-6 h-6 text-blue-500" />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* API Models Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              API Models (Advanced & Uncensored)
            </h3>
            <div className="space-y-2">
              {apiModels.map((model) => {
                const capabilities = getModelCapabilities(model);
                const isSelected = selectedModel === model.model_key;
                
                return (
                  <Card
                    key={model.id}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                    onClick={() => handleModelSelect(model.model_key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-white">{model.display_name}</h4>
                          {model.is_default && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {model.provider_display_name}
                          </Badge>
                          {model.model_key.includes('venice') && (
                            <Badge variant="destructive" className="text-xs">Most Uncensored</Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-3">
                          {getModelDescription(model)}
                        </p>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            {getSpeedIcon(capabilities.speed)}
                            <span className="text-gray-400 capitalize">{capabilities.speed}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {getCostIcon(capabilities.cost)}
                            <span className="text-gray-400 capitalize">{capabilities.cost}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {getQualityIcon(capabilities.quality)}
                            <span className="text-gray-400 capitalize">{capabilities.quality}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="w-4 h-4 text-red-400" />
                            <span className="text-gray-400">Uncensored</span>
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-4">
                          <Check className="w-6 h-6 text-blue-500" />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Info Section */}
          <Card className="p-4 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-medium text-blue-400 mb-1">Model Selection Guide</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• <strong>Local Models:</strong> Qwen 2.5-7B-Instruct - fast, private, no external API calls</li>
                  <li>• <strong>OpenRouter Models:</strong> Advanced uncensored models with no content restrictions</li>
                  <li>• <strong>Venice Dolphin:</strong> Most uncensored model, best for unrestricted roleplay</li>
                  <li>• <strong>Dolphin 3.0 R1:</strong> Advanced reasoning, great for complex scenarios</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
