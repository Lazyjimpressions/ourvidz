import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  X, 
  Settings, 
  Brain, 
  Database, 
  User, 
  Sparkles,
  Info
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface Character {
  id: string;
  name: string;
  description: string;
  image_url: string;
  preview_image_url?: string;
  category: string;
  consistency_method: string;
  base_prompt: string;
  quick_start: boolean;
}

interface MobileCharacterSheetProps {
  character: Character;
  onClose: () => void;
  memoryTier: 'conversation' | 'character' | 'profile';
  onMemoryTierChange: (tier: 'conversation' | 'character' | 'profile') => void;
  modelProvider: 'chat_worker' | 'openrouter' | 'claude' | 'gpt';
  onModelProviderChange: (provider: 'chat_worker' | 'openrouter' | 'claude' | 'gpt') => void;
}

export const MobileCharacterSheet: React.FC<MobileCharacterSheetProps> = ({
  character,
  onClose,
  memoryTier,
  onMemoryTierChange,
  modelProvider,
  onModelProviderChange
}) => {
  const { isMobile } = useMobileDetection();

  const memoryTierOptions = [
    { value: 'conversation', label: 'Conversation Memory', description: 'Remembers only this conversation' },
    { value: 'character', label: 'Character Memory', description: 'Remembers all conversations with this character' },
    { value: 'profile', label: 'Profile Memory', description: 'Remembers all your conversations and preferences' }
  ];

  const modelProviderOptions = [
    { value: 'chat_worker', label: 'Chat Worker', description: 'Our custom AI model' },
    { value: 'openrouter', label: 'OpenRouter', description: 'Multiple AI models via OpenRouter' },
    { value: 'claude', label: 'Claude', description: 'Anthropic Claude model' },
    { value: 'gpt', label: 'GPT', description: 'OpenAI GPT model' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="relative w-full bg-gray-900 rounded-t-xl max-h-[80vh] overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-600 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-white">Character Settings</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Character Info */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700">
                <img 
                  src={character.image_url} 
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white">{character.name}</h4>
                <p className="text-gray-400 text-sm mt-1">{character.description}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {character.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {character.consistency_method}
                  </Badge>
                  {character.quick_start && (
                    <Badge variant="default" className="text-xs bg-blue-600">
                      Quick Start
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Memory Settings */}
          <div className="p-4 border-b border-gray-700">
                      <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-blue-400" />
            <h4 className="text-white font-medium">Memory Settings</h4>
          </div>
            
            <div className="space-y-3">
              {memoryTierOptions.map((option) => (
                <div
                  key={option.value}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-colors
                    ${memoryTier === option.value 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }
                  `}
                  onClick={() => onMemoryTierChange(option.value as any)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{option.label}</div>
                      <div className="text-gray-400 text-sm mt-1">{option.description}</div>
                    </div>
                    {memoryTier === option.value && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Model Settings */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-purple-400" />
              <h4 className="text-white font-medium">AI Model</h4>
            </div>
            
            <Select value={modelProvider} onValueChange={(value: any) => onModelProviderChange(value)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {modelProviderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-white">
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-gray-400 text-sm">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Character Base Prompt */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-green-400" />
              <h4 className="text-white font-medium">Character Base Prompt</h4>
            </div>
            
            <Card className="bg-gray-800 border-gray-700 p-3">
              <p className="text-gray-300 text-sm leading-relaxed">
                {character.base_prompt}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
