import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CharacterV2, STYLE_PRESET_OPTIONS } from '@/types/character-hub-v2';
import { cn } from '@/lib/utils';
import { Paintbrush, Film, Box, PenTool } from 'lucide-react';

interface StyleTabProps {
    formData: Partial<CharacterV2>;
    updateField: (field: keyof CharacterV2, value: any) => void;
}

export const StyleTab: React.FC<StyleTabProps> = ({ formData, updateField }) => {

    const getStyleIcon = (style: string) => {
        switch (style) {
            case 'realistic': return <Film className="w-5 h-5 mb-2" />;
            case 'anime': return <Paintbrush className="w-5 h-5 mb-2" />;
            case '3d': return <Box className="w-5 h-5 mb-2" />;
            case 'sketch': return <PenTool className="w-5 h-5 mb-2" />;
            default: return <Film className="w-5 h-5 mb-2" />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="space-y-4">
                <Label className="text-base">Rendering Style</Label>
                <RadioGroup
                    value={formData.style_preset || 'realistic'}
                    onValueChange={(val) => updateField('style_preset', val as CharacterV2['style_preset'])}
                    className="grid grid-cols-2 gap-4"
                >
                    {STYLE_PRESET_OPTIONS.map((option) => (
                        <div key={option.id}>
                            <RadioGroupItem value={option.id} id={option.id} className="peer sr-only" />
                            <Label
                                htmlFor={option.id}
                                className={cn(
                                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all",
                                    formData.style_preset === option.id ? "border-primary bg-secondary/50" : "border-border/50 bg-secondary/20"
                                )}
                            >
                                {getStyleIcon(option.id)}
                                <span className="capitalize font-medium">{option.label}</span>
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-2">
                    This base style affects how the AI interprets visual prompts. "Cinematic" is default for realism.
                </p>
            </div>

            {/* Future: LoRA Configuration */}
            <div className="space-y-2 opacity-50 pointer-events-none">
                <Label>LoRA Model Weights (Coming Soon)</Label>
                <div className="h-10 rounded border border-white/10 bg-secondary/20 flex items-center px-3 text-sm text-muted-foreground">
                    No LoRAs selected
                </div>
            </div>
        </div>
    );
};
