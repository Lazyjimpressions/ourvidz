import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronUp, Copy, Check, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/components/ui/collapsible';
import { CharacterV2, PersonalityTraits, DEFAULT_PERSONALITY_SLIDERS, GENRE_OPTIONS } from '@/types/character-hub-v2';
import { buildCanonSpec, getCanonSpecSummary } from '@/lib/utils/canonSpecBuilder';

interface IdentityTabProps {
    formData: Partial<CharacterV2>;
    updateField: (field: keyof CharacterV2, value: any) => void;
    /** Callback to generate character fields from description using AI */
    onGenerateCharacter?: () => Promise<void>;
    /** Whether character generation is in progress */
    isGeneratingCharacter?: boolean;
}

export const IdentityTab: React.FC<IdentityTabProps> = ({
    formData,
    updateField,
    onGenerateCharacter,
    isGeneratingCharacter = false
}) => {
    const [newLockedTrait, setNewLockedTrait] = useState('');
    const [newAvoidTrait, setNewAvoidTrait] = useState('');
    const [newCustomTag, setNewCustomTag] = useState('');
    const [canonSpecOpen, setCanonSpecOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Auto-generate canon spec from identity fields
    const canonSpec = useMemo(() => buildCanonSpec(formData), [formData]);
    const canonSummary = useMemo(() => getCanonSpecSummary(formData), [formData]);

    const handleCopyCanonSpec = async () => {
        try {
            await navigator.clipboard.writeText(canonSpec.canonSpec);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy canon spec:', err);
        }
    };

    // Update a specific personality trait
    const updatePersonalityTrait = (traitId: keyof PersonalityTraits, value: number) => {
        const currentTraits = formData.personality_traits || {};
        updateField('personality_traits', {
            ...currentTraits,
            [traitId]: value
        });
    };

    // Tags management
    const currentTags = formData.appearance_tags || [];

    const toggleGenreTag = (genre: string) => {
        if (currentTags.includes(genre)) {
            updateField('appearance_tags', currentTags.filter(t => t !== genre));
        } else {
            updateField('appearance_tags', [...currentTags, genre]);
        }
    };

    const addCustomTag = () => {
        if (!newCustomTag.trim()) return;
        const tag = newCustomTag.trim();
        if (!currentTags.includes(tag)) {
            updateField('appearance_tags', [...currentTags, tag]);
        }
        setNewCustomTag('');
    };

    const removeTag = (tag: string) => {
        updateField('appearance_tags', currentTags.filter(t => t !== tag));
    };

    const handleCustomTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCustomTag();
        }
    };

    // Locked traits (must-keep)
    const addLockedTrait = () => {
        if (!newLockedTrait.trim()) return;
        const currentTraits = formData.locked_traits || [];
        if (!currentTraits.includes(newLockedTrait.trim())) {
            updateField('locked_traits', [...currentTraits, newLockedTrait.trim()]);
        }
        setNewLockedTrait('');
    };

    const removeLockedTrait = (trait: string) => {
        const currentTraits = formData.locked_traits || [];
        updateField('locked_traits', currentTraits.filter(t => t !== trait));
    };

    const handleLockedKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addLockedTrait();
        }
    };

    // Avoid traits
    const addAvoidTrait = () => {
        if (!newAvoidTrait.trim()) return;
        const currentTraits = formData.avoid_traits || [];
        if (!currentTraits.includes(newAvoidTrait.trim())) {
            updateField('avoid_traits', [...currentTraits, newAvoidTrait.trim()]);
        }
        setNewAvoidTrait('');
    };

    const removeAvoidTrait = (trait: string) => {
        const currentTraits = formData.avoid_traits || [];
        updateField('avoid_traits', currentTraits.filter(t => t !== trait));
    };

    const handleAvoidKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addAvoidTrait();
        }
    };

    // Get custom tags (tags not in GENRE_OPTIONS)
    const customTags = currentTags.filter(tag => !GENRE_OPTIONS.includes(tag as any));

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Character Name */}
            <div className="space-y-1.5">
                <Label htmlFor="name">Character Name</Label>
                <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="bg-secondary/50 border-white/10 focus:border-primary/50"
                />
            </div>

            {/* Tagline */}
            <div className="space-y-1.5">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                    id="tagline"
                    value={formData.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Short description (e.g. A fearless warrior)"
                    className="bg-secondary/50 border-white/10 focus:border-primary/50"
                />
                <p className="text-[10px] text-muted-foreground">Appears on the character card.</p>
            </div>

            {/* Generate Character Button */}
            {onGenerateCharacter && (
                <div className="pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onGenerateCharacter}
                        disabled={isGeneratingCharacter || !formData.description?.trim()}
                        className="w-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/50 hover:from-purple-500/20 hover:to-pink-500/20 text-purple-300 hover:text-purple-200"
                    >
                        {isGeneratingCharacter ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                ✨ Generate Character
                            </>
                        )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                        AI will fill in personality, appearance, and style from description.
                    </p>
                </div>
            )}

            {/* Tags (Genre + Custom) */}
            <div className="space-y-2 pt-3 border-t border-border/30">
                <Label>Tags</Label>

                {/* Genre Chips */}
                <div className="flex flex-wrap gap-1.5">
                    {GENRE_OPTIONS.map((genre) => (
                        <button
                            key={genre}
                            type="button"
                            className={cn(
                                "px-2 py-1 text-[10px] rounded-full border transition-colors",
                                currentTags.includes(genre)
                                    ? "bg-primary/20 border-primary text-primary"
                                    : "bg-secondary/30 border-border/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                            onClick={() => toggleGenreTag(genre)}
                        >
                            {genre}
                        </button>
                    ))}
                </div>

                {/* Custom Tags */}
                <div className="flex flex-wrap gap-1.5">
                    {customTags.map((tag) => (
                        <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] h-5 pl-2 pr-1 gap-1"
                        >
                            {tag}
                            <button
                                onClick={() => removeTag(tag)}
                                className="hover:bg-white/10 rounded p-0.5"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </Badge>
                    ))}
                    <Input
                        value={newCustomTag}
                        onChange={(e) => setNewCustomTag(e.target.value)}
                        onKeyDown={handleCustomTagKeyDown}
                        placeholder="Add custom..."
                        className="h-5 w-24 text-[10px] px-1.5 bg-secondary/30 border-dashed"
                    />
                </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select
                    value={formData.role || 'ai'}
                    onValueChange={(val) => updateField('role', val)}
                >
                    <SelectTrigger className="bg-secondary/50 border-white/10">
                        <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ai">AI Character (NPC)</SelectItem>
                        <SelectItem value="narrator">Assistant</SelectItem>
                        <SelectItem value="user">User Persona (Avatar)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Bio & Backstory */}
            <div className="space-y-1.5">
                <Label htmlFor="bio">Bio & Backstory</Label>
                <Textarea
                    id="bio"
                    value={formData.traits || ''}
                    onChange={(e) => updateField('traits', e.target.value)}
                    placeholder="Detailed backstory, personality quirks, and history..."
                    className="min-h-[100px] bg-secondary/50 border-white/10 focus:border-primary/50 resize-y"
                />
            </div>

            {/* Personality Sliders */}
            <div className="space-y-3 pt-3 border-t border-border/30">
                <Label className="text-[11px]">Personality Sliders</Label>
                <div className="space-y-3">
                    {DEFAULT_PERSONALITY_SLIDERS.map((slider) => {
                        const value = formData.personality_traits?.[slider.id] ?? slider.defaultValue ?? 0;
                        return (
                            <div key={slider.id} className="space-y-1">
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>{slider.leftLabel}</span>
                                    <span className="text-[9px] opacity-50">{value > 0 ? '+' : ''}{value}</span>
                                    <span>{slider.rightLabel}</span>
                                </div>
                                <Slider
                                    value={[value]}
                                    min={-100}
                                    max={100}
                                    step={5}
                                    onValueChange={([val]) => updatePersonalityTrait(slider.id, val)}
                                    className="py-0.5"
                                />
                            </div>
                        );
                    })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                    These influence how the character is portrayed in scenes.
                </p>
            </div>

            {/* Tone & Voice Notes */}
            <div className="space-y-1.5 pt-3 border-t border-border/30">
                <Label htmlFor="voice_tone">Tone & Voice Notes</Label>
                <Textarea
                    id="voice_tone"
                    value={formData.voice_tone || ''}
                    onChange={(e) => updateField('voice_tone', e.target.value)}
                    placeholder="Describe speaking style, catchphrases, verbal quirks..."
                    className="min-h-[60px] bg-secondary/50 border-white/10 focus:border-primary/50 resize-y"
                />
                <p className="text-[10px] text-muted-foreground">
                    Used for roleplay and voice synthesis.
                </p>
            </div>

            {/* Visual Guardrails */}
            <div className="space-y-3 pt-3 border-t border-border/30">
                <Label>Visual Guardrails</Label>

                {/* Must Include (Locked Traits) */}
                <div className="space-y-1.5">
                    <span className="text-[10px] text-green-400">Must Include:</span>
                    <div className="flex flex-wrap gap-1.5">
                        {(formData.locked_traits || []).map((trait) => (
                            <Badge
                                key={trait}
                                className="text-[10px] h-5 pl-2 pr-1 gap-1 bg-green-500/20 text-green-400 border-green-500/30"
                            >
                                {trait}
                                <button
                                    onClick={() => removeLockedTrait(trait)}
                                    className="hover:bg-white/10 rounded p-0.5"
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </Badge>
                        ))}
                        <Input
                            value={newLockedTrait}
                            onChange={(e) => setNewLockedTrait(e.target.value)}
                            onKeyDown={handleLockedKeyDown}
                            placeholder="Add..."
                            className="h-5 w-16 text-[10px] px-1.5 bg-secondary/30 border-dashed"
                        />
                    </div>
                </div>

                {/* Must Avoid */}
                <div className="space-y-1.5">
                    <span className="text-[10px] text-red-400">Must Avoid:</span>
                    <div className="flex flex-wrap gap-1.5">
                        {(formData.avoid_traits || []).map((trait) => (
                            <Badge
                                key={trait}
                                className="text-[10px] h-5 pl-2 pr-1 gap-1 bg-red-500/20 text-red-400 border-red-500/30"
                            >
                                {trait}
                                <button
                                    onClick={() => removeAvoidTrait(trait)}
                                    className="hover:bg-white/10 rounded p-0.5"
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </Badge>
                        ))}
                        <Input
                            value={newAvoidTrait}
                            onChange={(e) => setNewAvoidTrait(e.target.value)}
                            onKeyDown={handleAvoidKeyDown}
                            placeholder="Add..."
                            className="h-5 w-16 text-[10px] px-1.5 bg-secondary/30 border-dashed"
                        />
                    </div>
                </div>

                <p className="text-[10px] text-muted-foreground">
                    Visual features that must or must not appear in generated images.
                </p>
            </div>

            {/* Canon Spec Preview */}
            <Collapsible
                open={canonSpecOpen}
                onOpenChange={setCanonSpecOpen}
                className="pt-3 border-t border-border/30"
            >
                <CollapsibleTrigger asChild>
                    <button
                        type="button"
                        className="flex items-center justify-between w-full text-left group"
                    >
                        <div>
                            <Label className="text-[11px] cursor-pointer group-hover:text-primary transition-colors">
                                Canon Spec (Auto-Generated)
                            </Label>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {canonSummary}
                            </p>
                        </div>
                        {canonSpecOpen ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                    <div className="relative">
                        <div className="p-3 bg-secondary/30 rounded-md border border-border/30">
                            <p className="text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                {canonSpec.canonSpec || 'No canon spec data yet. Fill in identity fields above.'}
                            </p>
                            {canonSpec.negativePrompt && (
                                <div className="mt-2 pt-2 border-t border-border/30">
                                    <span className="text-[10px] text-red-400">Negative: </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {canonSpec.negativePrompt}
                                    </span>
                                </div>
                            )}
                        </div>
                        {canonSpec.canonSpec && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyCanonSpec}
                                className="absolute top-2 right-2 h-6 px-2 text-[10px]"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3 h-3 mr-1" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                        This prompt is automatically injected when Consistency Mode is enabled.
                    </p>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};
