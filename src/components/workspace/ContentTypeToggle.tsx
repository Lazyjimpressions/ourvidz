import React from 'react';
import { Button } from "@/components/ui/button";

interface ContentTypeToggleProps {
  contentType: 'sfw' | 'nsfw';
  onContentTypeChange: (type: 'sfw' | 'nsfw') => void;
  disabled?: boolean;
}

export const ContentTypeToggle: React.FC<ContentTypeToggleProps> = ({
  contentType,
  onContentTypeChange,
  disabled = false
}) => {
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={contentType === 'sfw' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onContentTypeChange('sfw')}
        disabled={disabled}
        className="text-xs"
      >
        SFW
      </Button>
      <Button
        variant={contentType === 'nsfw' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onContentTypeChange('nsfw')}
        disabled={disabled}
        className="text-xs"
      >
        NSFW
      </Button>
    </div>
  );
}; 