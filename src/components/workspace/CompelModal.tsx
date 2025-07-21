
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, Info, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CompelModalProps {
  isOpen: boolean;
  onClose: () => void;
  compelEnabled: boolean;
  setCompelEnabled: (enabled: boolean) => void;
  compelWeights: string;
  setCompelWeights: (weights: string) => void;
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

  // Track which sliders have been manually adjusted
  const [manualSliders, setManualSliders] = useState<{[key:string]: boolean}>({});

  // Helper function to get slider value by name
  const getSliderValue = (sliderName: string): number => {
    switch (sliderName) {
      case 'qualitySlider': return qualitySlider;
      case 'detailSlider': return detailSlider;
      case 'nsfwSlider': return nsfwSlider;
      case 'styleSlider': return styleSlider;
      default: return 1.0;
    }
  };

  // Parse existing weights on open
  useEffect(() => {
    if (isOpen && compelWeights) {
      try {
        // Parse existing Compel weights and set visual controls
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
    setManualSliders({});
  };

  // Helper to set slider and mark as manual if needed
  const setSlider = (slider: string, value: number, manual = false) => {
    console.log('🎛️ Setting slider:', { slider, value, manual });
    
    switch (slider) {
      case 'qualitySlider': setQualitySlider(value); break;
      case 'detailSlider': setDetailSlider(value); break;
      case 'nsfwSlider': setNsfwSlider(value); break;
      case 'styleSlider': setStyleSlider(value); break;
    }
    
    if (manual) {
      setManualSliders(prev => {
        const newManual = { ...prev, [slider]: true };
        console.log('🔧 Manual sliders updated:', newManual);
        return newManual;
      });
    }
  };

  // Helper to clear manual override for a slider
  const clearManualSlider = (slider: string) => {
    setManualSliders(prev => {
      const newManual = { ...prev };
      delete newManual[slider];
      console.log('🧹 Cleared manual slider:', slider, 'remaining manual:', newManual);
      return newManual;
    });
  };

  // When a preset is checked, set its sliders (allow coexistence with manual adjustments)
  const handlePresetChange = (boostId: string, checked: boolean) => {
    console.log('🎚️ Preset change:', { boostId, checked });
    
    const boost = QUICK_BOOSTS.find(b => b.id === boostId);
    if (!boost) return;
    
    setQuickBoosts(prev => {
      const newBoosts = checked ? [...prev, boostId] : prev.filter(id => id !== boostId);
      console.log('📊 Quick boosts updated:', newBoosts);
      
      if (checked) {
        // When checking a preset, set its sliders to preset values
        boost.sliders.forEach((slider, idx) => {
          setSlider(slider, boost.weights[idx]);
          // Clear manual flag when preset is applied
          clearManualSlider(slider);
        });
      } else {
        // When unchecking a preset, reset sliders only if no other preset controls them
        boost.sliders.forEach((slider) => {
          const stillControlled = newBoosts.some(bid => {
            const b = QUICK_BOOSTS.find(x => x.id === bid);
            return b && b.sliders.includes(slider);
          });
          
          if (!stillControlled) {
            console.log('🔄 Resetting slider:', slider, 'no longer controlled by presets');
            setSlider(slider, 1.0);
            clearManualSlider(slider);
          }
        });
      }
      
      return newBoosts;
    });
  };

  // When a slider is changed manually, mark it as manual but don't uncheck presets
  const handleSliderChange = (slider: string, value: number) => {
    console.log('🎚️ Manual slider change:', { slider, value });
    setSlider(slider, value, true);
    
    // Don't automatically uncheck presets - allow coexistence
    // Users can manually uncheck presets if they want different behavior
  };

  // Generate Compel weights from visual controls (fixed eval issue)
  useEffect(() => {
    if (!compelEnabled) {
      setCompelWeights('');
      return;
    }
    
    const termMap: {[term:string]: number} = {};
    
    // Add quick boost terms first (lower priority)
    quickBoosts.forEach(boostId => {
      const boost = QUICK_BOOSTS.find(b => b.id === boostId);
      if (boost) {
        boost.terms.forEach((term, idx) => {
          // Only add preset terms if slider is not manually adjusted or is at 1.0
          const sliderName = boost.sliders[idx] || '';
          const sliderValue = getSliderValue(sliderName);
          const isManual = manualSliders[sliderName];
          
          if (!isManual || sliderValue === 1.0) {
            termMap[term] = boost.weights[idx];
          }
        });
      }
    });
    
    // Add slider-based terms (higher priority - override preset terms)
    if (qualitySlider !== 1.0) termMap['high quality'] = qualitySlider;
    if (detailSlider !== 1.0) termMap['detailed'] = detailSlider;
    if (nsfwSlider !== 1.0) termMap['perfect anatomy'] = nsfwSlider;
    if (styleSlider !== 1.0) termMap['professional photography'] = styleSlider;
    
    // Build string
    const terms = Object.entries(termMap).map(([term, weight]) => `(${term}:${weight.toFixed(1)})`);
    const newWeights = terms.join(', ');
    
    console.log('🔮 Generated Compel weights:', {
      termMap,
      finalString: newWeights,
      quickBoosts,
      manualSliders,
      sliderValues: {
        quality: qualitySlider,
        detail: detailSlider,
        nsfw: nsfwSlider,
        style: styleSlider
      }
    });
    
    setCompelWeights(newWeights);
  }, [compelEnabled, quickBoosts, qualitySlider, detailSlider, nsfwSlider, styleSlider, setCompelWeights, manualSliders]);

  const getSliderColor = (value: number) => {
    if (value < 0.8) return 'text-red-400';
    if (value < 1.0) return 'text-yellow-400';
    if (value < 1.3) return 'text-green-400';
    return 'text-purple-400';
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-gray-900 text-white border-gray-700">
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
          
          {compelEnabled ? (
            <div className="space-y-6">
              {/* Quick Boost Checkboxes */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-300">Quick Adjustments</Label>
                <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-300">Fine Control</Label>
                
                {/* Quality Slider */}
                <div className="space-y-2">
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
                    className="w-full h-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Reduced</span>
                    <span>Normal</span>
                    <span>Enhanced</span>
                  </div>
                </div>

                {/* Detail Slider */}
                <div className="space-y-2">
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
                    className="w-full h-2"
                  />
                </div>

                {/* Anatomy Slider (formerly NSFW) */}
                <div className="space-y-2">
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
                    className="w-full h-2"
                  />
                </div>

                {/* Style Slider */}
                <div className="space-y-2">
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
                    className="w-full h-2"
                  />
                </div>
              </div>

              {/* Preview */}
              {compelWeights && (
                <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <Label className="text-sm font-medium text-gray-300 mb-2 block">
                    Generated Weights
                  </Label>
                  <div className="bg-gray-700 p-2 rounded text-sm font-mono text-green-400 max-h-20 overflow-y-auto">
                    {compelWeights}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center text-gray-500 py-8">
              <div className="text-center">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Compel is disabled</p>
                <p className="text-sm">Click "Enable Compel" above to access visual prompt weighting</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-700">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
