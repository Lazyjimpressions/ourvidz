import React from 'react';

interface NegativePromptPresetsProps {
  onSelect: (preset: string) => void;
  currentPrompt: string;
}

const NEGATIVE_PRESETS = [
  {
    name: "No Shirts/Tops",
    prompt: "t-shirt, shirt, top, sleeves, collars, neck seam, logos, graphics, text, stripes, plaid, undershirt, bra straps, hoodie, jacket"
  },
  {
    name: "No Clothing Text",
    prompt: "text on clothing, logos, graphics, words, letters, numbers, brand names, writing"
  },
  {
    name: "Face Quality",
    prompt: "blurry face, distorted face, extra limbs, malformed hands, bad anatomy, disfigured"
  },
  {
    name: "General Quality",
    prompt: "low quality, blurry, pixelated, artifacts, noise, distorted, deformed"
  }
];

export const NegativePromptPresets: React.FC<NegativePromptPresetsProps> = ({
  onSelect,
  currentPrompt
}) => {
  const handlePresetClick = (preset: string) => {
    const existing = currentPrompt.trim();
    const newPrompt = existing ? `${existing}, ${preset}` : preset;
    onSelect(newPrompt);
  };

  return (
    <div className="space-y-1">
      <div className="text-[9px] text-muted-foreground font-medium mb-1">Quick Presets</div>
      <div className="flex flex-wrap gap-1">
        {NEGATIVE_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset.prompt)}
            className="px-2 py-1 text-[8px] bg-muted hover:bg-muted/80 rounded transition-colors"
            title={preset.prompt}
          >
            + {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
};