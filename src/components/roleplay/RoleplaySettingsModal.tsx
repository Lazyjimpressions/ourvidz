import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { useImageModels } from '@/hooks/useImageModels';
import { ConsistencySettings } from '@/services/ImageConsistencyService';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  
  // Local state for form data
  const [localMemoryTier, setLocalMemoryTier] = useState(memoryTier);
  const [localModelProvider, setLocalModelProvider] = useState(modelProvider);
  const [localSelectedImageModel, setLocalSelectedImageModel] = useState(selectedImageModel);
  const [localConsistencySettings, setLocalConsistencySettings] = useState(consistencySettings);
  
  // Load saved settings from localStorage
  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem('roleplay-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setLocalMemoryTier(parsed.memoryTier || memoryTier);
          setLocalModelProvider(parsed.modelProvider || modelProvider);
          setLocalSelectedImageModel(parsed.selectedImageModel || selectedImageModel);
          setLocalConsistencySettings(parsed.consistencySettings || consistencySettings);
        } catch (error) {
          console.warn('Failed to parse saved roleplay settings:', error);
        }
      }
    }
  }, [isOpen, memoryTier, modelProvider, selectedImageModel, consistencySettings]);
  
  // Save settings to localStorage
  const saveSettings = () => {
    const settings = {
      memoryTier: localMemoryTier,
      modelProvider: localModelProvider,
      selectedImageModel: localSelectedImageModel,
      consistencySettings: localConsistencySettings
    };
    
    localStorage.setItem('roleplay-settings', JSON.stringify(settings));
    
    // Update parent state
    onMemoryTierChange(localMemoryTier);
    onModelProviderChange(localModelProvider);
    onSelectedImageModelChange(localSelectedImageModel);
    onConsistencySettingsChange(localConsistencySettings);
    
    toast({
      title: 'Settings saved',
      description: 'Your roleplay settings have been saved successfully.'
    });
    
    onClose();
  };
  
  // Reset to current props when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalMemoryTier(memoryTier);
      setLocalModelProvider(modelProvider);
      setLocalSelectedImageModel(selectedImageModel);
      setLocalConsistencySettings(consistencySettings);
    }
  }, [isOpen, memoryTier, modelProvider, selectedImageModel, consistencySettings]);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Roleplay Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Memory Tier */}
          <div className="space-y-2">
            <Label>Memory Tier</Label>
            <Select value={localMemoryTier} onValueChange={(value: 'conversation' | 'character' | 'profile') => setLocalMemoryTier(value)}>
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
            <Select value={localModelProvider} onValueChange={setLocalModelProvider}>
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
            <Select value={localSelectedImageModel} onValueChange={setLocalSelectedImageModel}>
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
                  value={localConsistencySettings.method} 
                  onValueChange={(value: 'hybrid' | 'i2i_reference' | 'seed_locked') => 
                    setLocalConsistencySettings({ ...localConsistencySettings, method: value })
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
                    value={localConsistencySettings.reference_strength}
                    onChange={(e) => 
                      setLocalConsistencySettings({ 
                        ...localConsistencySettings, 
                        reference_strength: parseFloat(e.target.value) 
                      })
                    }
                    className="w-full"
                  />
                  <span className="text-xs text-muted-foreground">
                    {localConsistencySettings.reference_strength}
                  </span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="denoise_strength" className="text-xs">Denoise Strength</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={localConsistencySettings.denoise_strength}
                    onChange={(e) => 
                      setLocalConsistencySettings({ 
                        ...localConsistencySettings, 
                        denoise_strength: parseFloat(e.target.value) 
                      })
                    }
                    className="w-full"
                  />
                  <span className="text-xs text-muted-foreground">
                    {localConsistencySettings.denoise_strength}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveSettings}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};