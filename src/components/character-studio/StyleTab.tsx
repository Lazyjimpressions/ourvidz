import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    CharacterV2,
    STYLE_PRESET_OPTIONS,
    LIGHTING_OPTIONS,
    MOOD_OPTIONS,
    RenderingRules,
    DEFAULT_RENDERING_RULES,
    LightingPreset,
    MoodPreset
} from '@/types/character-hub-v2';
import { cn } from '@/lib/utils';
import {
    Paintbrush,
    Film,
    Box,
    PenTool,
    Sun,
    CloudSun,
    Lightbulb,
    Trees,
    Sunrise,
    Zap,
    Clapperboard
} from 'lucide-react';

interface StyleTabProps {
    formData: Partial<CharacterV2>;
    updateField: (field: keyof CharacterV2, value: any) => void;
}

export const StyleTab: React.FC<StyleTabProps> = ({ formData, updateField }) => {
    const renderingRules: RenderingRules = formData.rendering_rules || DEFAULT_RENDERING_RULES;

    const updateRenderingRule = (key: keyof RenderingRules, value: number) => {
        updateField('rendering_rules', {
            ...renderingRules,
            [key]: value
        });
    };

    const getStyleIcon = (style: string) => {
        switch (style) {
            case 'realistic': return <Film className="w-4 h-4" />;
            case 'anime': return <Paintbrush className="w-4 h-4" />;
            case 'cinematic': return <Clapperboard className="w-4 h-4" />;
            case '3d': return <Box className="w-4 h-4" />;
            case 'sketch': return <PenTool className="w-4 h-4" />;
            default: return <Film className="w-4 h-4" />;
        }
    };

    const getLightingIcon = (lighting: string) => {
        switch (lighting) {
            case 'dramatic': return <Sun className="w-4 h-4" />;
            case 'soft': return <CloudSun className="w-4 h-4" />;
            case 'studio': return <Lightbulb className="w-4 h-4" />;
            case 'natural': return <Trees className="w-4 h-4" />;
            case 'golden_hour': return <Sunrise className="w-4 h-4" />;
            case 'neon': return <Zap className="w-4 h-4" />;
            default: return <Sun className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Rendering Style Presets */}
            <div className="space-y-3">
                <Label className="text-sm font-medium">Rendering Style</Label>
                <RadioGroup
                    value={formData.style_preset || 'realistic'}
                    onValueChange={(val) => updateField('style_preset', val as CharacterV2['style_preset'])}
                    className="grid grid-cols-2 gap-2"
                >
                    {STYLE_PRESET_OPTIONS.map((option) => (
                        <div key={option.id}>
                            <RadioGroupItem value={option.id} id={option.id} className="peer sr-only" />
                            <Label
                                htmlFor={option.id}
                                className={cn(
                                    "flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-all",
                                    formData.style_preset === option.id
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border/50 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {getStyleIcon(option.id)}
                                <span className="text-xs font-medium">{option.label}</span>
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
                <p className="text-[10px] text-muted-foreground">
                    Base visual style for image generation.
                </p>
            </div>

            {/* Lighting Presets */}
            <div className="space-y-3 pt-4 border-t border-border/30">
                <Label className="text-sm font-medium">Lighting</Label>
                <div className="grid grid-cols-3 gap-2">
                    {LIGHTING_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            className={cn(
                                "p-2 rounded-lg border flex flex-col items-center gap-1 transition-all",
                                formData.lighting === opt.id
                                    ? "bg-primary/20 border-primary text-primary"
                                    : "bg-secondary/20 border-border/50 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                            )}
                            onClick={() => updateField('lighting', opt.id)}
                        >
                            {getLightingIcon(opt.id)}
                            <span className="text-[10px] font-medium">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Mood Chips */}
            <div className="space-y-3 pt-4 border-t border-border/30">
                <Label className="text-sm font-medium">Mood</Label>
                <div className="flex flex-wrap gap-1.5">
                    {MOOD_OPTIONS.map((mood) => (
                        <button
                            key={mood}
                            type="button"
                            className={cn(
                                "px-2.5 py-1 text-[10px] rounded-full border transition-colors",
                                formData.mood === mood
                                    ? "bg-primary/20 border-primary text-primary"
                                    : "bg-secondary/30 border-border/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                            onClick={() => updateField('mood', formData.mood === mood ? undefined : mood)}
                        >
                            {mood}
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                    Overall emotional tone for scenes.
                </p>
            </div>

            {/* Rendering Rules */}
            <div className="space-y-4 pt-4 border-t border-border/30">
                <Label className="text-sm font-medium">Rendering Rules</Label>

                {/* Sharpness Slider */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Soft Focus</span>
                        <span className="text-[9px] opacity-70">{renderingRules.sharpness}%</span>
                        <span>Sharp</span>
                    </div>
                    <Slider
                        value={[renderingRules.sharpness]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={([val]) => updateRenderingRule('sharpness', val)}
                        className="py-0.5"
                    />
                </div>

                {/* Film Grain Slider */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Clean</span>
                        <span className="text-[9px] opacity-70">{renderingRules.grain}%</span>
                        <span>Film Grain</span>
                    </div>
                    <Slider
                        value={[renderingRules.grain]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={([val]) => updateRenderingRule('grain', val)}
                        className="py-0.5"
                    />
                </div>

                {/* Texture Slider */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Smooth</span>
                        <span className="text-[9px] opacity-70">{renderingRules.texture}%</span>
                        <span>Textured</span>
                    </div>
                    <Slider
                        value={[renderingRules.texture]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={([val]) => updateRenderingRule('texture', val)}
                        className="py-0.5"
                    />
                </div>

                <p className="text-[10px] text-muted-foreground">
                    Fine-tune the visual quality and texture of generated images.
                </p>
            </div>

            {/* Future: LoRA Configuration */}
            <div className="space-y-2 pt-4 border-t border-border/30 opacity-50 pointer-events-none">
                <Label className="text-xs">LoRA Model Weights (Coming Soon)</Label>
                <div className="h-8 rounded border border-white/10 bg-secondary/20 flex items-center px-3 text-[10px] text-muted-foreground">
                    No LoRAs selected
                </div>
            </div>
        </div>
    );
};
