import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { useImageModels } from '@/hooks/useImageModels';
import { ConsistencySettings } from '@/services/ImageConsistencyService';

interface RoleplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoryTier: 'conversation' | 'character' | 'profile';
  onMemoryTierChange: (tier: 'conversation' | 'character' | 'profile') => void;
  modelProvider: string;
  onModelProviderChange: (provider: string) => void;
  selectedImageModel: string;
  onSelectedImageModelChange: (model: string) => void;
  consistencySettings: ConsistencySettings;
  onConsistencySettingsChange: (settings: ConsistencySettings) => void;
}

export const RoleplaySettingsModal: React.FC<RoleplaySettingsModalProps> = ({
  isOpen,
  onClose,
  memoryTier,
  onMemoryTierChange,
  modelProvider,
  onModelProviderChange,
  selectedImageModel,
  onSelectedImageModelChange,
  consistencySettings,
  onConsistencySettingsChange
}) => {
  const { allModelOptions, isLoading: modelsLoading } = useRoleplayModels();
  const { modelOptions: imageModelOptions, isLoading: imageModelsLoading } = useImageModels();
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Roleplay Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Memory Tier */}
          <div className="space-y-2">
            <Label>Memory Tier</Label>
            <Select value={memoryTier} onValueChange={onMemoryTierChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversation">Conversation</SelectItem>
                <SelectItem value="character">Character</SelectItem>
                <SelectItem value="profile">Profile</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model Provider */}
          <div className="space-y-2">
            <Label>Model Provider</Label>
            <Select value={modelProvider} onValueChange={onModelProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelsLoading ? (
                  <SelectItem value="" disabled>Loading models...</SelectItem>
                ) : (
                  allModelOptions.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Image Model Selection */}
          <div className="space-y-2">
            <Label>Image Model</Label>
            <Select value={selectedImageModel} onValueChange={onSelectedImageModelChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {imageModelsLoading ? (
                  <SelectItem value="" disabled>Loading image models...</SelectItem>
                ) : (
                  imageModelOptions.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Consistency Settings */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="font-medium">Image Consistency</Label>
              
              <div className="space-y-2">
                <Label htmlFor="method" className="text-sm">Method</Label>
                <Select 
                  value={consistencySettings.method} 
                  onValueChange={(value: 'hybrid' | 'i2i_reference' | 'seed_locked') => 
                    onConsistencySettingsChange({ ...consistencySettings, method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="i2i_reference">Reference Image</SelectItem>
                    <SelectItem value="seed_locked">Seed Locked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="reference_strength" className="text-xs">Reference Strength</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={consistencySettings.reference_strength}
                    onChange={(e) => 
                      onConsistencySettingsChange({ 
                        ...consistencySettings, 
                        reference_strength: parseFloat(e.target.value) 
                      })
                    }
                    className="w-full"
                  />
                  <span className="text-xs text-muted-foreground">
                    {consistencySettings.reference_strength}
                  </span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="denoise_strength" className="text-xs">Denoise Strength</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={consistencySettings.denoise_strength}
                    onChange={(e) => 
                      onConsistencySettingsChange({ 
                        ...consistencySettings, 
                        denoise_strength: parseFloat(e.target.value) 
                      })
                    }
                    className="w-full"
                  />
                  <span className="text-xs text-muted-foreground">
                    {consistencySettings.denoise_strength}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};