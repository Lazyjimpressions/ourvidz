
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReferenceStrengthSlider } from './ReferenceStrengthSlider';
import { EnhancedSeedInput } from './EnhancedSeedInput';
import { ChevronDown, Settings, HelpCircle, Dice6, Lock } from 'lucide-react';

interface UnifiedReferencePanelProps {
  // Reference props
  hasActiveReferences: boolean;
  referenceStrength: number;
  onReferenceStrengthChange: (value: number) => void;
  referenceType: string;
  onReferenceTypeChange: (type: string) => void;
  
  // Advanced settings props
  seed?: number;
  onSeedChange?: (seed: number | undefined) => void;
  
  // Character optimization
  optimizeForCharacter: boolean;
  onOptimizeChange: (enabled: boolean) => void;
  
  // Compel (SDXL only)
  showCompel: boolean;
  compelEnabled: boolean;
  setCompelEnabled?: (enabled: boolean) => void;
  compelWeights: string;
  setCompelWeights?: (weights: string) => void;
  
  // Additional info
  numImages: number;
}

const compelPresets = [
  { label: 'Emphasis', value: '(beautiful:1.3), (detailed:1.2)' },
  { label: 'Character Focus', value: '(portrait:1.2), (face:1.3), (detailed eyes:1.1)' },
  { label: 'Style Enhancement', value: '(artistic:1.2), (masterpiece:1.1), (high quality:1.2)' }
];

export const UnifiedReferencePanel = ({
  hasActiveReferences,
  referenceStrength,
  onReferenceStrengthChange,
  referenceType,
  onReferenceTypeChange,
  seed,
  onSeedChange,
  optimizeForCharacter,
  onOptimizeChange,
  showCompel,
  compelEnabled,
  setCompelEnabled,
  compelWeights,
  setCompelWeights,
  numImages
}: UnifiedReferencePanelProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCompelHelp, setShowCompelHelp] = useState(false);

  if (!hasActiveReferences) return null;

  const handleSeedGenerate = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    onSeedChange?.(newSeed);
  };

  const handleCompelPreset = (preset: string) => {
    setCompelWeights?.(preset);
  };

  return (
    <TooltipProvider>
      <Card className="mx-6 mb-4 border-blue-200 bg-blue-50/30">
        <CardContent className="p-4 space-y-4">
          {/* Header with Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Reference Active
              </Badge>
              <Badge variant="outline" className="text-xs">
                {referenceStrength.toFixed(2)}
              </Badge>
              {numImages > 1 && (
                <Badge variant="outline" className="text-xs text-amber-600">
                  {numImages} images
                </Badge>
              )}
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 text-xs">
                  <p><strong>Character:</strong> 0.85-0.95 optimal</p>
                  <p><strong>Style:</strong> 0.50-0.70 optimal</p>
                  <p><strong>Composition:</strong> 0.60-0.80 optimal</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Reference Type & Strength */}
          <ReferenceStrengthSlider
            value={referenceStrength}
            onChange={onReferenceStrengthChange}
            referenceType={referenceType}
            onTypeChange={onReferenceTypeChange}
          />

          {/* Advanced Settings Section */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-8">
                <div className="flex items-center gap-2">
                  <Settings className="w-3 h-3" />
                  <span className="text-sm">Advanced Settings</span>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 pt-2">
              {/* Seed Control */}
              {onSeedChange && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Seed Control</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={seed || ''}
                      onChange={(e) => onSeedChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Auto"
                      className="flex-1 h-8 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSeedGenerate}
                      className="h-8 px-2"
                    >
                      <Dice6 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant={seed ? "default" : "outline"}
                      size="sm"
                      onClick={() => onSeedChange(seed ? undefined : Math.floor(Math.random() * 1000000))}
                      className="h-8 px-2"
                    >
                      <Lock className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Character Optimization */}
              {referenceType === 'character' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="optimize-character"
                    checked={optimizeForCharacter}
                    onCheckedChange={onOptimizeChange}
                  />
                  <Label htmlFor="optimize-character" className="text-xs">
                    Optimize prompt for character consistency
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs max-w-xs">
                        <p>Automatically adjusts prompt for better character consistency:</p>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          <li>Replaces "same person" → "this person"</li>
                          <li>Adds "single portrait" and "solo" tags</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Compel Settings (SDXL only) */}
              {showCompel && setCompelEnabled && setCompelWeights && (
                <div className="space-y-3 p-3 bg-orange-50/30 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="compel-enabled"
                        checked={compelEnabled}
                        onCheckedChange={setCompelEnabled}
                      />
                      <Label htmlFor="compel-enabled" className="text-xs font-medium">
                        Compel Prompt Weighting
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs max-w-xs">
                            <p>Control the influence of different parts of your prompt:</p>
                            <p className="mt-1">Format: (word:weight)</p>
                            <p>Weight range: 0.1-2.0</p>
                            <p className="mt-1">Example: (beautiful:1.3), (woman:1.2)</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {compelEnabled && (
                    <div className="space-y-2">
                      <Input
                        value={compelWeights}
                        onChange={(e) => setCompelWeights(e.target.value)}
                        placeholder="(beautiful:1.3), (detailed:1.2)"
                        className="text-xs font-mono"
                        onFocus={() => setShowCompelHelp(true)}
                        onBlur={() => setTimeout(() => setShowCompelHelp(false), 200)}
                      />
                      
                      {showCompelHelp && (
                        <div className="text-xs text-muted-foreground p-2 bg-background rounded border">
                          <p>Format: (word:weight), (phrase:weight)</p>
                          <p>Weight range: 0.1-2.0 (1.0 = normal)</p>
                        </div>
                      )}

                      {/* Preset Buttons */}
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground mr-2">Presets:</span>
                        {compelPresets.map((preset) => (
                          <Button
                            key={preset.label}
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompelPreset(preset.value)}
                            className="h-6 px-2 text-xs"
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Multiple Images Warning */}
              {numImages > 1 && referenceType === 'character' && (
                <div className="text-xs text-amber-600 p-2 bg-amber-50 rounded border border-amber-200">
                  <p>⚠️ Multiple images may reduce character consistency. Consider generating 1 image at a time for best results.</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
