import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Lock, 
  Image as ImageIcon, 
  Sparkles,
  Info,
  Save,
  RotateCcw
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { ConsistencySettings as IConsistencySettings, imageConsistencyService } from '@/services/ImageConsistencyService';
import { referenceImageManager } from '@/services/ReferenceImageManager';

interface ConsistencySettingsProps {
  characterId: string;
  onSettingsChange: (settings: IConsistencySettings) => void;
  onSave?: () => void;
}

export const ConsistencySettings: React.FC<ConsistencySettingsProps> = ({
  characterId,
  onSettingsChange,
  onSave
}) => {
  const { isMobile } = useMobileDetection();
  const [settings, setSettings] = useState<IConsistencySettings>({
    method: 'hybrid',
    reference_strength: 0.35,
    denoise_strength: 0.25,
    modify_strength: 0.5
  });
  const [loading, setLoading] = useState(false);
  const [referenceStats, setReferenceStats] = useState<any>(null);

  useEffect(() => {
    loadSettings();
    loadReferenceStats();
  }, [characterId]);

  const loadSettings = async () => {
    try {
      const savedSettings = await imageConsistencyService.getConsistencySettings(characterId);
      setSettings(savedSettings);
      onSettingsChange(savedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadReferenceStats = async () => {
    try {
      const stats = await referenceImageManager.getReferenceStats(characterId);
      setReferenceStats(stats);
    } catch (error) {
      console.error('Error loading reference stats:', error);
    }
  };

  const handleMethodChange = (method: IConsistencySettings['method']) => {
    const newSettings = { ...settings, method };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleSliderChange = (key: keyof IConsistencySettings, value: number[]) => {
    const newSettings = { ...settings, [key]: value[0] };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update character's consistency method in database
      await imageConsistencyService.updateSeedLock(characterId, settings.seed_value || 0);
      onSave?.();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const defaultSettings: IConsistencySettings = {
      method: 'hybrid',
      reference_strength: 0.35,
      denoise_strength: 0.25,
      modify_strength: 0.5
    };
    setSettings(defaultSettings);
    onSettingsChange(defaultSettings);
  };

  const methodOptions = [
    {
      value: 'seed_locked',
      label: 'Seed Locked',
      description: 'Uses fixed seed for consistent character generation',
      icon: Lock
    },
    {
      value: 'i2i_reference',
      label: 'Image-to-Image',
      description: 'Uses reference image for character consistency',
      icon: ImageIcon
    },
    {
      value: 'hybrid',
      label: 'Hybrid',
      description: 'Combines seed locking with reference images',
      icon: Sparkles
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Consistency Settings</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-gray-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Method Selection */}
      <Card className="bg-gray-800 border-gray-700 p-4">
        <div className="mb-3">
          <h4 className="text-white font-medium mb-2">Consistency Method</h4>
          <p className="text-gray-400 text-sm">
            Choose how to maintain character consistency across generated scenes
          </p>
        </div>
        
        <div className="space-y-2">
          {methodOptions.map((option) => (
            <div
              key={option.value}
              className={`
                p-3 rounded-lg border cursor-pointer transition-colors
                ${settings.method === option.value 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-700 bg-gray-700 hover:border-gray-600'
                }
              `}
              onClick={() => handleMethodChange(option.value as IConsistencySettings['method'])}
            >
              <div className="flex items-center gap-3">
                <option.icon className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <div className="text-white font-medium">{option.label}</div>
                  <div className="text-gray-400 text-sm">{option.description}</div>
                </div>
                {settings.method === option.value && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Reference Image Stats */}
      {referenceStats && (
        <Card className="bg-gray-800 border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-green-400" />
            <h4 className="text-white font-medium">Reference Images</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Total References</div>
              <div className="text-white font-medium">{referenceStats.totalReferences}</div>
            </div>
            <div>
              <div className="text-gray-400">Best Score</div>
              <div className="text-white font-medium">
                {Math.round(referenceStats.bestConsistencyScore * 100)}%
              </div>
            </div>
            <div>
              <div className="text-gray-400">Average Score</div>
              <div className="text-white font-medium">
                {Math.round(referenceStats.averageConsistencyScore * 100)}%
              </div>
            </div>
            <div>
              <div className="text-gray-400">Last Updated</div>
              <div className="text-white font-medium">
                {new Date(referenceStats.lastUpdated).toLocaleDateString()}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Advanced Settings */}
      <Card className="bg-gray-800 border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-purple-400" />
          <h4 className="text-white font-medium">Advanced Settings</h4>
        </div>
        
        <div className="space-y-4">
          {/* Reference Strength */}
          {settings.method !== 'seed_locked' && (
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-gray-300 text-sm">Reference Strength</label>
                <span className="text-gray-400 text-sm">
                  {Math.round((settings.reference_strength || 0.35) * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.reference_strength || 0.35]}
                onValueChange={(value) => handleSliderChange('reference_strength', value)}
                max={1}
                min={0}
                step={0.05}
                className="w-full"
              />
              <p className="text-gray-500 text-xs mt-1">
                How strongly to follow the reference image
              </p>
            </div>
          )}

          {/* Denoise Strength */}
          {settings.method !== 'seed_locked' && (
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-gray-300 text-sm">Denoise Strength</label>
                <span className="text-gray-400 text-sm">
                  {Math.round((settings.denoise_strength || 0.25) * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.denoise_strength || 0.25]}
                onValueChange={(value) => handleSliderChange('denoise_strength', value)}
                max={1}
                min={0}
                step={0.05}
                className="w-full"
              />
              <p className="text-gray-500 text-xs mt-1">
                How much to modify the reference image
              </p>
            </div>
          )}

          {/* Modify Strength */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-gray-300 text-sm">Modify Strength</label>
              <span className="text-gray-400 text-sm">
                {Math.round((settings.modify_strength || 0.5) * 100)}%
              </span>
            </div>
            <Slider
              value={[settings.modify_strength || 0.5]}
              onValueChange={(value) => handleSliderChange('modify_strength', value)}
              max={1}
              min={0}
              step={0.05}
              className="w-full"
            />
            <p className="text-gray-500 text-xs mt-1">
              How much to modify the character appearance
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
