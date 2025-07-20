
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Zap } from 'lucide-react';

interface CompelTerm {
  term: string;
  weight: number;
}

interface CompelModalProps {
  isOpen: boolean;
  onClose: () => void;
  compelEnabled: boolean;
  setCompelEnabled: (enabled: boolean) => void;
  compelWeights: string;
  setCompelWeights: (weights: string) => void;
}

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

  // Parse existing weights string on open
  useEffect(() => {
    if (isOpen && compelWeights) {
      try {
        const parsedTerms: CompelTerm[] = [];
        const regex = /\(([^:]+):([^)]+)\)/g;
        let match;
        while ((match = regex.exec(compelWeights)) !== null) {
          parsedTerms.push({
            term: match[1].trim(),
            weight: parseFloat(match[2]) || 1.0
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
      const weightsString = terms
        .map(term => `(${term.term}:${term.weight.toFixed(1)})`)
        .join(', ');
      setCompelWeights(weightsString);
    } else {
      setCompelWeights('');
    }
  }, [terms, setCompelWeights]);

  const addTerm = () => {
    if (newTerm.trim() && !terms.find(t => t.term.toLowerCase() === newTerm.trim().toLowerCase())) {
      setTerms([...terms, { term: newTerm.trim(), weight: 1.0 }]);
      setNewTerm('');
    }
  };

  const removeTerm = (index: number) => {
    setTerms(terms.filter((_, i) => i !== index));
  };

  const updateWeight = (index: number, weight: number) => {
    setTerms(terms.map((term, i) => 
      i === index ? { ...term, weight } : term
    ));
  };

  const updateTerm = (index: number, newTermText: string) => {
    setTerms(terms.map((term, i) => 
      i === index ? { ...term, term: newTermText } : term
    ));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTerm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Compel Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Enable Compel */}
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <Label className="text-sm font-medium">Enable Compel</Label>
              <p className="text-xs text-gray-400">Advanced prompt weighting for precise control</p>
            </div>
            <Switch
              checked={compelEnabled}
              onCheckedChange={setCompelEnabled}
            />
          </div>

          {/* Compel Terms Management */}
          {compelEnabled && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Prompt Terms</Label>
                <p className="text-xs text-gray-400 mb-3">
                  Add terms to emphasize or de-emphasize in your generation
                </p>
                
                {/* Add New Term */}
                <div className="flex gap-2 mb-4">
                  <Input
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., beautiful woman, detailed face, blue eyes"
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                  />
                  <Button 
                    onClick={addTerm}
                    disabled={!newTerm.trim()}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Terms List */}
                {terms.length > 0 ? (
                  <div className="space-y-3">
                    {terms.map((term, index) => (
                      <div key={index} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <Input
                            value={term.term}
                            onChange={(e) => updateTerm(index, e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white text-sm w-48"
                          />
                          <Button
                            onClick={() => removeTerm(index)}
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
                              {term.weight.toFixed(1)}
                            </Badge>
                          </div>
                          <Slider
                            value={[term.weight]}
                            onValueChange={(value) => updateWeight(index, value[0])}
                            min={0.1}
                            max={2.0}
                            step={0.1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>De-emphasize</span>
                            <span>Normal</span>
                            <span>Emphasize</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No terms added yet</p>
                    <p className="text-xs">Add terms above to control prompt weighting</p>
                  </div>
                )}

                {/* Preview */}
                {terms.length > 0 && (
                  <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <Label className="text-sm font-medium mb-2 block">Generated Weights</Label>
                    <div className="bg-gray-700 p-2 rounded text-sm font-mono text-green-400">
                      {terms.map(term => `(${term.term}:${term.weight.toFixed(1)})`).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
