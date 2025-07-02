
import React from 'react';
import { GenerationModeDropdown } from './GenerationModeDropdown';
import { GenerationFormat } from '@/types/generation';

interface ModeToggleButtonsProps {
  selectedMode: GenerationFormat;
  onModeChange: (mode: GenerationFormat) => void;
  disabled?: boolean;
}

export const ModeToggleButtons: React.FC<ModeToggleButtonsProps> = ({
  selectedMode,
  onModeChange,
  disabled = false
}) => {
  return (
    <GenerationModeDropdown
      value={selectedMode}
      onChange={onModeChange}
      disabled={disabled}
    />
  );
};
