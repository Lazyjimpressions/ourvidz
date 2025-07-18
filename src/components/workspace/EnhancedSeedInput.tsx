
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dice6, Copy, X } from 'lucide-react';
import { toast } from 'sonner';

interface EnhancedSeedInputProps {
  seed?: number;
  onSeedChange: (seed: number | undefined) => void;
}

export const EnhancedSeedInput = ({ seed, onSeedChange }: EnhancedSeedInputProps) => {
  const [inputValue, setInputValue] = useState(seed?.toString() || '');

  const generateRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1000000);
    setInputValue(randomSeed.toString());
    onSeedChange(randomSeed);
    toast.success(`Generated random seed: ${randomSeed}`);
  };

  const clearSeed = () => {
    setInputValue('');
    onSeedChange(undefined);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value === '') {
      onSeedChange(undefined);
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 0) {
        onSeedChange(numValue);
      }
    }
  };

  const copySeed = () => {
    if (seed) {
      navigator.clipboard.writeText(seed.toString());
      toast.success(`Seed ${seed} copied to clipboard`);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Seed (optional)</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Random"
          className="h-7 text-xs flex-1"
          min="0"
          max="999999"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={generateRandomSeed}
          className="h-7 px-2"
          title="Generate random seed"
        >
          <Dice6 className="w-3 h-3" />
        </Button>
        {seed && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={copySeed}
              className="h-7 px-2"
              title="Copy seed"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSeed}
              className="h-7 px-2"
              title="Clear seed"
            >
              <X className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Use the same seed for reproducible results. Leave empty for random generation.
      </p>
    </div>
  );
};
