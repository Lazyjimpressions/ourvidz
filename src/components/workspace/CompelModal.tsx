
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CompelModalProps {
  isOpen: boolean;
  onClose: () => void;
  compelEnabled: boolean;
  setCompelEnabled: (enabled: boolean) => void;
  compelWeights: string;
  setCompelWeights: (weights: string) => void;
}

// Utility function to estimate token count
function countTokens(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Quick boost presets that automatically add common quality terms
const QUICK_BOOSTS = [
  { 
    id: 'more_detail', 
    label: 'More Detail', 
    terms: ['highly detailed', 'intricate', 'fine details'],
    weights: [1.3, 1.2, 1.1],
    sliders: ['detailSlider']
  },
  { 
    id: 'better_quality', 
    label: 'Better Quality', 
    terms: ['masterpiece', 'best quality', 'professional'],
    weights: [1.2, 1.3, 1.1],
    sliders: ['qualitySlider']
  },
  { 
    id: 'nsfw_optimize', 
    label: 'NSFW Optimize', 
    terms: ['perfect anatomy', 'realistic', 'natural proportions'],
    weights: [1.2, 1.3, 1.1],
    sliders: ['nsfwSlider']
  },
  { 
    id: 'professional_style', 
    label: 'Professional Style', 
    terms: ['professional photography', 'studio lighting', 'cinematic'],
    weights: [1.2, 1.1, 1.1],
    sliders: ['styleSlider']
  }
];

export const CompelModal = ({
  isOpen,
  onClose,
  compelEnabled,
  setCompelEnabled,
  compelWeights,
  setCompelWeights
}: CompelModalProps) => {
  // Visual control states
  const [quickBoosts, setQuickBoosts] = useState<string[]>([]);
  const [qualitySlider, setQualitySlider] = useState(1.0);
  const [detailSlider, setDetailSlider] = useState(1.0);
  const [nsfwSlider, setNsfwSlider] = useState(1.0);
  const [styleSlider, setStyleSlider] = useState(1.0);

  // Parse existing weights on open
  useEffect(() => {
    if (isOpen && compelWeights) {
      try {
        const regex = /\(([^:]+):([^)]+)\)/g;
        let match;
        const parsedTerms: { term: string; weight: number }[] = [];
        
        while ((match = regex.exec(compelWeights)) !== null) {
          const term = match[1].trim();
          const weight = parseFloat(match[2]) || 1.0;
          parsedTerms.push({ term, weight });
        }

        // Set quick boosts based on detected terms
        const detectedBoosts: string[] = [];
        QUICK_BOOSTS.forEach(boost => {
          const hasBoost = boost.terms.some(term => 
            parsedTerms.some(pt => pt.term.toLowerCase().includes(term.toLowerCase()))
          );
          if (hasBoost) {
            detectedBoosts.push(boost.id);
          }
        });
        setQuickBoosts(detectedBoosts);

        // Set sliders based on detected weights
        const qualityTerms = parsedTerms.filter(pt => 
          ['masterpiece', 'best quality', 'professional', 'high quality'].some(qt => 
            pt.term.toLowerCase().includes(qt.toLowerCase())
          )
        );
        if (qualityTerms.length > 0) {
          setQualitySlider(Math.max(...qualityTerms.map(t => t.weight)));
        }

        const detailTerms = parsedTerms.filter(pt => 
          ['detailed', 'intricate', 'fine details', 'highly detailed'].some(dt => 
            pt.term.toLowerCase().includes(dt.toLowerCase())
          )
        );
        if (detailTerms.length > 0) {
          setDetailSlider(Math.max(...detailTerms.map(t => t.weight)));
        }

        const nsfwTerms = parsedTerms.filter(pt => 
          ['anatomy', 'realistic', 'proportions', 'natural'].some(nt => 
            pt.term.toLowerCase().includes(nt.toLowerCase())
          )
        );
        if (nsfwTerms.length > 0) {
          setNsfwSlider(Math.max(...nsfwTerms.map(t => t.weight)));
        }

        const styleTerms = parsedTerms.filter(pt => 
          ['photography', 'cinematic', 'studio', 'artistic'].some(st => 
            pt.term.toLowerCase().includes(st.toLowerCase())
          )
        );
        if (styleTerms.length > 0) {
          setStyleSlider(Math.max(...styleTerms.map(t => t.weight)));
        }

      } catch (error) {
        console.error('Error parsing compel weights:', error);
        resetToDefaults();
      }
    } else if (isOpen) {
      resetToDefaults();
    }
  }, [isOpen, compelWeights]);

  const resetToDefaults = () => {
    setQuickBoosts([]);
    setQualitySlider(1.0);
    setDetailSlider(1.0);
    setNsfwSlider(1.0);
    setStyleSlider(1.0);
  };

  // When a preset is checked/unchecked
  const handlePresetChange = (boostId: string, checked: boolean) => {
    const boost = QUICK_BOOSTS.find(b => b.id === boostId);
    if (!boost) return;
    
    setQuickBoosts(prev => {
      const newBoosts = checked ? [...prev, boostId] : prev.filter(id => id !== boostId);
      
      if (checked) {
        // When checking a preset, set its sliders to preset values
        boost.sliders.forEach((slider, idx) => {
          setSliderValue(slider, boost.weights[idx]);
        });
      } else {
        // When unchecking a preset, reset sliders only if no other preset controls them
        boost.sliders.forEach((slider) => {
          const stillControlled = newBoosts.some(bid => {
            const b = QUICK_BOOSTS.find(x => x.id === bid);
            return b && b.sliders.includes(slider);
          });
          
          if (!stillControlled) {
            setSliderValue(slider, 1.0);
          }
        });
      }
      
      return newBoosts;
    });
  };

  // Helper function to set slider value by name
  const setSliderValue = (sliderName: string, value: number) => {
    switch (sliderName) {
      case 'qualitySlider': 
        setQualitySlider(value);
        break;
      case 'detailSlider': 
        setDetailSlider(value);
        break;
      case 'nsfwSlider': 
        setNsfwSlider(value);
        break;
      case 'styleSlider': 
        setStyleSlider(value);
        break;
    }
  };

  // When a slider is changed manually
  const handleSliderChange = (slider: string, value: number) => {
    setSliderValue(slider, value);
  };

  // Generate Compel weights from visual controls
  useEffect(() => {
    if (!compelEnabled) {
      setCompelWeights('');
      return;
    }
    
    const termMap: {[term:string]: number} = {};
    
    // Add slider-based terms directly (manual adjustments take priority)
    if (qualitySlider !== 1.0) termMap['high quality'] = qualitySlider;
    if (detailSlider !== 1.0) termMap['detailed'] = detailSlider;
    if (nsfwSlider !== 1.0) termMap['perfect anatomy'] = nsfwSlider;
    if (styleSlider !== 1.0) termMap['professional photography'] = styleSlider;
    
    // Build string
    const terms = Object.entries(termMap).map(([term, weight]) => `(${term}:${weight.toFixed(1)})`);
    const newWeights = terms.join(', ');
    
    // Token safety check
    const totalTokens = countTokens(newWeights);
    if (totalTokens > 75) {
      console.warn(`⚠️ Compel weight string too long (${totalTokens} tokens). Clearing weights.`);
      setCompelWeights(''); // Prevent broken generations
      return;
    }
    
    setCompelWeights(newWeights);
  }, [compelEnabled, quickBoosts, qualitySlider, detailSlider, nsfwSlider, styleSlider, setCompelWeights]);

  const getSliderColor = (value: number) => {
    if (value < 0.8) return 'text-red-400';
    if (value < 1.0) return 'text-yellow-400';
    if (value < 1.3) return 'text-green-400';
    return 'text-purple-400';
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl min-h-[600px] bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Compel Settings
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Visual prompt weighting controls</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <Button
                onClick={() => setCompelEnabled(!compelEnabled)}
                className={compelEnabled 
                  ? "bg-purple-600 hover:bg-purple-700 text-white" 
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                }
              >
                {compelEnabled ? 'Disable Compel' : 'Enable Compel'}
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col">
            {compelEnabled ? (
              <div className="space-y-4 flex-1">
                {/* Quick Boost Checkboxes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-300">Quick Adjustments</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_BOOSTS.map((boost) => (
                      <div key={boost.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={boost.id}
                          checked={quickBoosts.includes(boost.id)}
                          onCheckedChange={(checked) => handlePresetChange(boost.id, !!checked)}
                          className="data-[state=checked]:bg-purple-600"
                        />
                        <Label 
                          htmlFor={boost.id} 
                          className="text-sm cursor-pointer"
                        >
                          {boost.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fine Control Sliders */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-300">Fine Control</Label>
                  
                  {/* Quality Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-gray-400">Quality</Label>
                      <Badge variant="secondary" className={`text-xs ${getSliderColor(qualitySlider)}`}>
                        {qualitySlider.toFixed(1)}x
                      </Badge>
                    </div>
                    <Slider
                      value={[qualitySlider]}
                      onValueChange={(value) => handleSliderChange('qualitySlider', value[0])}
                      min={0.5}
                      max={1.5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Detail Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-gray-400">Detail</Label>
                      <Badge variant="secondary" className={`text-xs ${getSliderColor(detailSlider)}`}>
                        {detailSlider.toFixed(1)}x
                      </Badge>
                    </div>
                    <Slider
                      value={[detailSlider]}
                      onValueChange={(value) => handleSliderChange('detailSlider', value[0])}
                      min={0.5}
                      max={1.5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Anatomy Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-gray-400">Anatomy</Label>
                      <Badge variant="secondary" className={`text-xs ${getSliderColor(nsfwSlider)}`}>
                        {nsfwSlider.toFixed(1)}x
                      </Badge>
                    </div>
                    <Slider
                      value={[nsfwSlider]}
                      onValueChange={(value) => handleSliderChange('nsfwSlider', value[0])}
                      min={0.0}
                      max={1.5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Style Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-gray-400">Style</Label>
                      <Badge variant="secondary" className={`text-xs ${getSliderColor(styleSlider)}`}>
                        {styleSlider.toFixed(1)}x
                      </Badge>
                    </div>
                    <Slider
                      value={[styleSlider]}
                      onValueChange={(value) => handleSliderChange('styleSlider', value[0])}
                      min={0.5}
                      max={1.5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Token limit warning */}
                {compelWeights && countTokens(compelWeights) > 75 && (
                  <div className="text-red-400 text-xs">
                    ⚠️ Too many terms. Weights disabled to prevent generation errors.
                  </div>
                )}

                {/* Preview */}
                {compelWeights && (
                  <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <Label className="text-sm font-medium text-gray-300 mb-2 block">
                      Generated Weights
                    </Label>
                    <div className="bg-gray-700 p-2 rounded text-sm font-mono text-green-400 max-h-16 overflow-y-auto">
                      {compelWeights}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center text-gray-500 flex-1">
                <div className="text-center">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Compel is disabled</p>
                  <p className="text-sm">Click "Enable Compel" above to access visual prompt weighting</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-700 mt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
