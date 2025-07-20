
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, Dice6, Lock, Settings } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CompactAdvancedSettingsProps {
  // Reference settings
  hasActiveReferences: boolean;
  referenceStrength: number;
  onReferenceStrengthChange: (value: number) => void;
  referenceType: string;
  onReferenceTypeChange: (type: string) => void;
  
  // Seed control
  seed?: number;
  onSeedChange?: (seed: number | undefined) => void;
  
  // Character optimization
  optimizeForCharacter: boolean;
  onOptimizeChange: (enabled: boolean) => void;
  
  // Compel settings
  showCompel: boolean;
  compelEnabled: boolean;
  setCompelEnabled?: (enabled: boolean) => void;
  compelWeights: string;
  setCompelWeights?: (weights: string) => void;
}

export const CompactAdvancedSettings = ({
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
  setCompelWeights
}: CompactAdvancedSettingsProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSeedGenerate = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    onSeedChange?.(newSeed);
  };

  const referenceTypes = [
    { value: 'style', label: 'Style' },
    { value: 'composition', label: 'Comp' },
    { value: 'character', label: 'Char' }
  ];

  // Always show for SDXL models (showCompel) or when references are active
  const shouldShow = showCompel || hasActiveReferences;

  if (!shouldShow) return null;

  return (
    <div className="px-6 py-2 border-t border-border/50">
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <Settings className="w-3 h-3 mr-1" />
            Advanced
            <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 pt-2">
          {/* Reference Controls - Only show if references are active */}
          {hasActiveReferences && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <div className="flex">
                  {referenceTypes.map((type) => (
                    <Button
                      key={type.value}
                      variant={referenceType === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => onReferenceTypeChange(type.value)}
                      className="h-6 px-2 text-xs"
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Strength</Label>
                <div className="w-16">
                  <Slider
                    value={[referenceStrength]}
                    onValueChange={(values) => onReferenceStrengthChange(values[0])}
                    min={0.1}
                    max={1.0}
                    step={0.01}
                    className="w-full"
                  />
                </div>
                <span className="text-xs font-mono w-10 text-center">{referenceStrength.toFixed(2)}</span>
              </div>

              {referenceType === 'character' && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="optimize-char"
                    checked={optimizeForCharacter}
                    onCheckedChange={onOptimizeChange}
                  />
                  <Label htmlFor="optimize-char" className="text-xs">Optimize</Label>
                </div>
              )}
            </div>
          )}

          {/* Seed Control */}
          {onSeedChange && (
            <div className="flex items-center gap-2 text-xs">
              <Label className="text-xs text-muted-foreground w-8">Seed</Label>
              <Input
                type="number"
                value={seed || ''}
                onChange={(e) => onSeedChange(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Auto"
                className="h-6 text-xs w-20"
              />
              <Button variant="outline" size="sm" onClick={handleSeedGenerate} className="h-6 px-2">
                <Dice6 className="w-3 h-3" />
              </Button>
              <Button
                variant={seed ? "default" : "outline"}
                size="sm"
                onClick={() => onSeedChange(seed ? undefined : Math.floor(Math.random() * 1000000))}
                className="h-6 px-2"
              >
                <Lock className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Compel Settings - Always show for SDXL models */}
          {showCompel && setCompelEnabled && setCompelWeights && (
            <div className="flex items-center gap-2 text-xs">
              <Switch
                id="compel-enabled"
                checked={compelEnabled}
                onCheckedChange={setCompelEnabled}
              />
              <Label htmlFor="compel-enabled" className="text-xs">Compel</Label>
              {compelEnabled && (
                <Input
                  value={compelWeights}
                  onChange={(e) => setCompelWeights(e.target.value)}
                  placeholder="(beautiful:1.3), (detailed:1.2)"
                  className="h-6 text-xs flex-1 font-mono"
                />
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
