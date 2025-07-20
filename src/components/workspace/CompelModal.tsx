
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, X, Zap, Info, Copy, GripVertical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CompelTerm {
  id: string;
  term: string;
  weight: number;
  category: 'positive' | 'negative';
}

interface CompelModalProps {
  isOpen: boolean;
  onClose: () => void;
  compelEnabled: boolean;
  setCompelEnabled: (enabled: boolean) => void;
  compelWeights: string;
  setCompelWeights: (weights: string) => void;
}

const WEIGHT_PRESETS = [
  { label: 'Weak', value: 0.5 },
  { label: 'Soft', value: 0.8 },
  { label: 'Strong', value: 1.2 },
  { label: 'Heavy', value: 1.5 }
];

export const CompelModal = ({
  isOpen,
  onClose,
  compelEnabled,
  setCompelEnabled,
  compelWeights,
  setCompelWeights
}: CompelModalProps) => {
  const [terms, setTerms] = useState<CompelTerm[]>([]);
  const [newTerm, setNewTerm] = useState('');
  const [globalMultiplier, setGlobalMultiplier] = useState(1.0);
  const [attentionLayer, setAttentionLayer] = useState('all');
  const [enableBlending, setEnableBlending] = useState(false);
  const [blendRatio, setBlendRatio] = useState(0.5);

  // Parse existing weights string on open
  useEffect(() => {
    if (isOpen && compelWeights) {
      try {
        const parsedTerms: CompelTerm[] = [];
        const regex = /\(([^:]+):([^)]+)\)/g;
        let match;
        while ((match = regex.exec(compelWeights)) !== null) {
          const weight = parseFloat(match[2]) || 1.0;
          parsedTerms.push({
            id: Math.random().toString(36).substr(2, 9),
            term: match[1].trim(),
            weight,
            category: weight < 1.0 ? 'negative' : 'positive'
          });
        }
        setTerms(parsedTerms);
      } catch (error) {
        console.error('Error parsing compel weights:', error);
        setTerms([]);
      }
    } else if (isOpen) {
      setTerms([]);
    }
  }, [isOpen, compelWeights]);

  // Update weights string when terms change
  useEffect(() => {
    if (terms.length > 0) {
      let weightsString = terms
        .map(term => `(${term.term}:${(term.weight * globalMultiplier).toFixed(1)})`)
        .join(', ');
      
      if (enableBlending && terms.length >= 2) {
        const positiveTerms = terms.filter(t => t.category === 'positive');
        if (positiveTerms.length >= 2) {
          const blendedTerms = positiveTerms.slice(0, 2)
            .map(t => `(${t.term}:${(t.weight * globalMultiplier).toFixed(1)})`)
            .join(` .blend(${blendRatio.toFixed(1)}) `);
          weightsString = weightsString.replace(
            positiveTerms.slice(0, 2).map(t => `(${t.term}:${(t.weight * globalMultiplier).toFixed(1)})`).join(', '),
            blendedTerms
          );
        }
      }

      setCompelWeights(weightsString);
    } else {
      setCompelWeights('');
    }
  }, [terms, globalMultiplier, enableBlending, blendRatio, setCompelWeights]);

  const addTerm = (category: 'positive' | 'negative' = 'positive') => {
    if (newTerm.trim() && !terms.find(t => t.term.toLowerCase() === newTerm.trim().toLowerCase())) {
      const defaultWeight = category === 'negative' ? 0.8 : 1.2;
      setTerms([...terms, { 
        id: Math.random().toString(36).substr(2, 9),
        term: newTerm.trim(), 
        weight: defaultWeight,
        category 
      }]);
      setNewTerm('');
    }
  };

  const removeTerm = (id: string) => {
    setTerms(terms.filter(t => t.id !== id));
  };

  const updateTerm = (id: string, updates: Partial<CompelTerm>) => {
    setTerms(terms.map(term => 
      term.id === id ? { ...term, ...updates } : term
    ));
  };

  const applyPreset = (termId: string, weight: number) => {
    updateTerm(termId, { weight });
  };

  const copyToClipboard = () => {
    if (compelWeights) {
      navigator.clipboard.writeText(compelWeights);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTerm();
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl min-h-[600px] bg-gray-900 text-white border-gray-700">
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
                    <p>Advanced prompt weighting and blending controls</p>
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
            <div className="flex-1 space-y-6 overflow-y-auto">
              {/* Add New Terms */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Add Prompt Terms</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter term to weight"
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 flex-1"
                  />
                  <Button 
                    onClick={() => addTerm('positive')}
                    disabled={!newTerm.trim()}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={() => addTerm('negative')}
                    disabled={!newTerm.trim()}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Terms List */}
              <div className="max-h-48 overflow-y-auto space-y-2">
                {terms.map((term) => (
                  <div key={term.id} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="w-4 h-4 text-gray-500 cursor-move" />
                      <Input
                        value={term.term}
                        onChange={(e) => updateTerm(term.id, { term: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white text-sm flex-1"
                      />
                      <Badge 
                        variant={term.category === 'positive' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {term.category}
                      </Badge>
                      <Button
                        onClick={() => removeTerm(term.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Weight</span>
                        <Badge variant="secondary" className="text-xs">
                          {(term.weight * globalMultiplier).toFixed(1)}
                        </Badge>
                      </div>
                      <Slider
                        value={[term.weight]}
                        onValueChange={(value) => updateTerm(term.id, { weight: value[0] })}
                        min={0.1}
                        max={2.0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex gap-1">
                        {WEIGHT_PRESETS.map((preset) => (
                          <Button
                            key={preset.label}
                            onClick={() => applyPreset(term.id, preset.value)}
                            size="sm"
                            variant="outline"
                            className="text-xs h-6"
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Global Settings */}
              <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-300">Global Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-gray-400">Global Multiplier</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Multiply all weights by this factor</p>
                        </TooltipContent>
                      </Tooltip>
                      <Badge variant="secondary" className="text-xs">{globalMultiplier.toFixed(1)}x</Badge>
                    </div>
                    <Slider
                      value={[globalMultiplier]}
                      onValueChange={(value) => setGlobalMultiplier(value[0])}
                      min={0.1}
                      max={3.0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-gray-400">Attention Layer</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Which attention layers to apply weighting to</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <RadioGroup
                      value={attentionLayer}
                      onValueChange={setAttentionLayer}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all" className="text-xs">All</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="cross" id="cross" />
                        <Label htmlFor="cross" className="text-xs">Cross</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="self" id="self" />
                        <Label htmlFor="self" className="text-xs">Self</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {/* Blending Settings */}
              <div className="space-y-3 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-300">Enable Blending</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Smoothly blend the first two positive terms</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Button
                    onClick={() => setEnableBlending(!enableBlending)}
                    size="sm"
                    variant={enableBlending ? "default" : "outline"}
                  >
                    {enableBlending ? 'On' : 'Off'}
                  </Button>
                </div>

                {enableBlending && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-400">Blend Ratio</Label>
                      <Badge variant="secondary" className="text-xs">{blendRatio.toFixed(1)}</Badge>
                    </div>
                    <Slider
                      value={[blendRatio]}
                      onValueChange={(value) => setBlendRatio(value[0])}
                      min={0.1}
                      max={0.9}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Preview */}
              {terms.length > 0 && (
                <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Generated Compel String</Label>
                    <Button
                      onClick={copyToClipboard}
                      size="sm"
                      variant="outline"
                      className="h-6"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="bg-gray-700 p-2 rounded text-sm font-mono text-green-400 max-h-20 overflow-y-auto">
                    {compelWeights || 'No terms configured'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Compel is disabled</p>
                <p className="text-sm">Click "Enable Compel" above to access advanced prompt weighting</p>
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
