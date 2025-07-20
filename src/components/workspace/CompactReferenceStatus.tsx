
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface CompactReferenceStatusProps {
  activeReferences: Array<{
    id: string;
    enabled: boolean;
    url?: string;
  }>;
  referenceStrength: number;
  numImages: number;
}

export const CompactReferenceStatus = ({
  activeReferences,
  referenceStrength,
  numImages
}: CompactReferenceStatusProps) => {
  const enabledRefs = activeReferences.filter(ref => ref.enabled && ref.url);
  
  if (enabledRefs.length === 0) return null;

  const hasCharacterRef = enabledRefs.some(ref => ref.id === 'character');
  const refTypes = enabledRefs.map(ref => ref.id.charAt(0).toUpperCase()).join('');

  return (
    <div className="px-6 py-1 flex items-center gap-2 text-xs text-muted-foreground bg-blue-50/30 border-t border-blue-200/50">
      <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
        {refTypes} {referenceStrength.toFixed(2)}
      </Badge>
      
      {numImages > 1 && hasCharacterRef && (
        <div className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          <span>Multi-image may reduce character consistency</span>
        </div>
      )}
    </div>
  );
};
