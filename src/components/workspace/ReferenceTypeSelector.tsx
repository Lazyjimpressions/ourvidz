
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Palette, Layout, User, Info } from 'lucide-react';

interface ReferenceTypeInfo {
  id: 'style' | 'composition' | 'character';
  label: string;
  description: string;
  icon: React.ReactNode;
  optimalStrength: [number, number];
  tips: string[];
}

const referenceTypes: ReferenceTypeInfo[] = [
  {
    id: 'style',
    label: 'Style',
    description: 'Colors, lighting, artistic technique',
    icon: <Palette className="w-3 h-3" />,
    optimalStrength: [0.5, 0.7],
    tips: [
      'Works best with artistic or stylized images',
      'Focus on lighting and color schemes',
      'Lower strength for subtle style influence'
    ]
  },
  {
    id: 'composition',
    label: 'Composition',
    description: 'Layout, pose, framing, perspective',
    icon: <Layout className="w-3 h-3" />,
    optimalStrength: [0.6, 0.8],
    tips: [
      'Use images with clear subject positioning',
      'Great for pose and camera angle reference',
      'Higher strength for precise composition matching'
    ]
  },
  {
    id: 'character',
    label: 'Character',
    description: 'Facial features, identity, appearance',
    icon: <User className="w-3 h-3" />,
    optimalStrength: [0.85, 0.95],
    tips: [
      'Requires high-quality face images',
      'Use consistent lighting for best results',
      'Higher strength for better character consistency'
    ]
  }
];

interface ReferenceTypeSelectorProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
  currentStrength: number;
  onStrengthSuggestion: (strength: number) => void;
  className?: string;
}

export const ReferenceTypeSelector = ({
  selectedType,
  onTypeChange,
  currentStrength,
  onStrengthSuggestion,
  className = ''
}: ReferenceTypeSelectorProps) => {
  const selectedTypeInfo = referenceTypes.find(t => t.id === selectedType);
  const isOptimalStrength = selectedTypeInfo ? 
    currentStrength >= selectedTypeInfo.optimalStrength[0] && 
    currentStrength <= selectedTypeInfo.optimalStrength[1] : true;

  return (
    <TooltipProvider>
      <div className={`space-y-3 ${className}`}>
        {/* Type Selection */}
        <div className="flex flex-wrap gap-2">
          {referenceTypes.map((type) => (
            <Button
              key={type.id}
              variant={selectedType === type.id ? "default" : "outline"}
              size="sm"
              onClick={() => onTypeChange(type.id)}
              className="flex items-center gap-2 h-8"
            >
              {type.icon}
              <span className="text-xs">{type.label}</span>
            </Button>
          ))}
        </div>

        {/* Selected Type Info */}
        {selectedTypeInfo && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {selectedTypeInfo.description}
              </Badge>
              
              {!isOptimalStrength && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const optimal = (selectedTypeInfo.optimalStrength[0] + selectedTypeInfo.optimalStrength[1]) / 2;
                        onStrengthSuggestion(optimal);
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      Optimize
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adjust to optimal strength ({selectedTypeInfo.optimalStrength[0]}-{selectedTypeInfo.optimalStrength[1]})</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Strength Indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Strength:</span>
              <Badge variant={isOptimalStrength ? "default" : "secondary"}>
                {currentStrength.toFixed(2)}
              </Badge>
              <span className="text-muted-foreground">
                (optimal: {selectedTypeInfo.optimalStrength[0]}-{selectedTypeInfo.optimalStrength[1]})
              </span>
            </div>

            {/* Tips */}
            <div className="text-xs text-muted-foreground space-y-1">
              {selectedTypeInfo.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Info className="w-3 h-3 mt-0.5 text-primary" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
