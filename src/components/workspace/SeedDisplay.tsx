
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Dice6 } from 'lucide-react';
import { toast } from 'sonner';

interface SeedDisplayProps {
  seed?: number;
  onUseSeed?: (seed: number) => void;
  className?: string;
}

export const SeedDisplay = ({ seed, onUseSeed, className = "" }: SeedDisplayProps) => {
  if (!seed) return null;

  const handleCopySeed = () => {
    navigator.clipboard.writeText(seed.toString());
    toast.success(`Seed ${seed} copied to clipboard`);
  };

  const handleUseSeed = () => {
    if (onUseSeed) {
      onUseSeed(seed);
      toast.success(`Using seed ${seed} for generation`);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Badge variant="outline" className="text-xs font-mono">
        Seed: {seed}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopySeed}
        className="h-5 w-5 p-0"
        title="Copy seed"
      >
        <Copy className="h-3 w-3" />
      </Button>
      {onUseSeed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUseSeed}
          className="h-5 w-5 p-0"
          title="Use this seed"
        >
          <Dice6 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
