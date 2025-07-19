
import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { User, AlertTriangle, Settings } from 'lucide-react';
import { EnhancedSeedInput } from './EnhancedSeedInput';

interface CharacterReferenceWarningProps {
  hasCharacterReference: boolean;
  referenceStrength: number;
  numImages: number;
  onOptimizeChange: (enabled: boolean) => void;
  optimizeEnabled: boolean;
  seed?: number;
  onSeedChange?: (seed: number | undefined) => void;
}

export const CharacterReferenceWarning = ({
  hasCharacterReference,
  referenceStrength,
  numImages,
  onOptimizeChange,
  optimizeEnabled,
  seed,
  onSeedChange
}: CharacterReferenceWarningProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!hasCharacterReference) return null;

  const getStrengthRecommendation = () => {
    if (referenceStrength < 0.850) return { type: 'warning', message: 'Consider strength ≥ 0.850 for better character consistency' };
    if (referenceStrength > 0.950) return { type: 'info', message: 'Very high strength may reduce prompt creativity' };
    return { type: 'success', message: 'Good strength for character consistency' };
  };

  const recommendation = getStrengthRecommendation();

  return (
    <Alert className="border-blue-200 bg-blue-50/30">
      <User className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Character Reference Active</span>
            <Badge variant="secondary" className="text-xs">
              {referenceStrength.toFixed(3)}
            </Badge>
            {numImages > 1 && (
              <Badge variant="outline" className="text-xs text-amber-600">
                {numImages} images
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-6 px-2 text-xs"
          >
            <Settings className="w-3 h-3 mr-1" />
            {showAdvanced ? 'Hide' : 'Show'} Options
          </Button>
        </div>

        <div className={`text-xs ${
          recommendation.type === 'warning' ? 'text-amber-600' : 
          recommendation.type === 'success' ? 'text-green-600' : 'text-blue-600'
        }`}>
          {recommendation.message}
        </div>

        {numImages > 1 && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="w-3 h-3" />
            <span>Multiple images may reduce character consistency</span>
          </div>
        )}

        {showAdvanced && (
          <div className="space-y-3 pt-2 border-t border-blue-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="optimize-character"
                checked={optimizeEnabled}
                onCheckedChange={onOptimizeChange}
              />
              <label htmlFor="optimize-character" className="text-xs font-medium">
                Optimize prompt for character consistency
              </label>
            </div>
            
            {optimizeEnabled && (
              <div className="text-xs text-muted-foreground pl-6 bg-blue-50 p-2 rounded">
                <strong>Applied optimizations:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Replaces "same girl/person" → "this person"</li>
                  <li>Adds "single portrait" to prevent comparisons</li>
                  <li>Ensures "solo" character focus</li>
                </ul>
              </div>
            )}

            {onSeedChange && (
              <EnhancedSeedInput 
                seed={seed}
                onSeedChange={onSeedChange}
              />
            )}

            <div className="text-xs text-muted-foreground">
              <strong>Tips for better character consistency:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Use descriptive prompts: "Transform this person to..."</li>
                <li>Avoid comparison language</li>
                <li>Set strength between 0.850-0.950</li>
                <li>Generate 1 image at a time</li>
                <li>Use consistent seed values for reproducible results</li>
              </ul>
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
