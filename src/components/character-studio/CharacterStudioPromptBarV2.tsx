import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Wand2, Sparkles, Image as ImageIcon, Video, AlertCircle } from 'lucide-react';
import { ConsistencyControls, CharacterAnchor } from '@/types/character-hub-v2';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CharacterStudioPromptBarV2Props {
    prompt: string;
    onPromptChange: (value: string) => void;
    onGenerate: () => void;
    isGenerating: boolean;
    consistencyControls: ConsistencyControls;
    onConsistencyChange: (controls: ConsistencyControls) => void;
    primaryAnchor: CharacterAnchor | null;
    mediaType: 'image' | 'video';
    onMediaTypeChange: (type: 'image' | 'video') => void;
    /** When true, generate is disabled with tooltip "Save character first to generate". */
    isCreateMode?: boolean;
}

export const CharacterStudioPromptBarV2: React.FC<CharacterStudioPromptBarV2Props> = ({
    prompt,
    onPromptChange,
    onGenerate,
    isGenerating,
    consistencyControls,
    onConsistencyChange,
    primaryAnchor,
    mediaType,
    onMediaTypeChange,
    isCreateMode = false
}) => {
    const generateDisabled = isGenerating || isCreateMode || (consistencyControls.consistency_mode && !primaryAnchor);
    const generateDisabledReason = isCreateMode
        ? 'Save character first to generate.'
        : consistencyControls.consistency_mode && !primaryAnchor
            ? 'Set a primary anchor in Visuals tab or turn off Character Consistency.'
            : null;
    return (
        <div className="flex flex-col h-full bg-card/30 border-l border-border/50">
            {/* Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Generation
                </h3>
                <div className="flex bg-secondary/50 rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => onMediaTypeChange('image')}
                        className={cn(
                            "p-1.5 rounded-md transition-colors",
                            mediaType === 'image' ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
                        )}
                        title="Generate Image"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onMediaTypeChange('video')}
                        className={cn(
                            "p-1.5 rounded-md transition-colors",
                            mediaType === 'video' ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
                        )}
                        title="Generate Video"
                    >
                        <Video className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {/* Scene Prompt */}
                <div className="space-y-2">
                    <Label htmlFor="scene-prompt">Scene Prompt</Label>
                    <Textarea
                        id="scene-prompt"
                        value={prompt}
                        onChange={(e) => onPromptChange(e.target.value)}
                        placeholder={mediaType === 'image'
                            ? "Describe the scene, lighting, and action..."
                            : "Describe the movement and camera motion..."}
                        className="min-h-[120px] bg-secondary/50 border-white/10 resize-y focus:ring-primary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                        Describe <strong>what happens</strong> in the scene. The character's appearance is already defined.
                    </p>
                </div>

                {/* Consistency Controls */}
                <div className="space-y-4 rounded-lg bg-secondary/20 p-4 border border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Character Consistency</Label>
                            <p className="text-[10px] text-muted-foreground">Keep appearance stable</p>
                        </div>
                        <Switch
                            checked={consistencyControls.consistency_mode}
                            onCheckedChange={(checked) => onConsistencyChange({
                                ...consistencyControls,
                                consistency_mode: checked
                            })}
                        />
                    </div>

                    {consistencyControls.consistency_mode && (
                        <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
                            {/* Primary Anchor Display */}
                            <div className="flex items-center gap-3 bg-black/20 p-2 rounded-md border border-white/5">
                                {primaryAnchor ? (
                                    <>
                                        <img
                                            src={primaryAnchor.image_url}
                                            alt="Reference"
                                            className="w-10 h-10 rounded object-cover border border-white/10"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">Using Primary Anchor</p>
                                            <p className="text-[10px] text-green-400">Ready</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 text-amber-400">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <p className="text-xs leading-tight">
                                            No primary anchor set. Upload an image in the <strong>Visuals</strong> tab.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Variation Slider */}
                            <div className="space-y-2">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex justify-between text-xs cursor-help">
                                                <span>Strict</span>
                                                <span className="text-muted-foreground/70">{consistencyControls.variation}%</span>
                                                <span>Creative</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[260px]">
                                            <p className="text-xs">
                                                <strong>0% (Strict):</strong> Stay very close to anchor appearance.<br />
                                                <strong>100% (Creative):</strong> Allow more artistic freedom while maintaining character identity.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <Slider
                                    value={[consistencyControls.variation]}
                                    min={0}
                                    max={100}
                                    step={1}
                                    onValueChange={([val]) => onConsistencyChange({
                                        ...consistencyControls,
                                        variation: val
                                    })}
                                    className="py-1"
                                />
                            </div>

                            {/* Advanced Options Toggle (Simplified for now) */}
                            <div className="flex items-center justify-between pt-2">
                                <Label className="text-xs text-muted-foreground cursor-pointer decoration-dotted underline">
                                    Referencing: {consistencyControls.use_pinned_canon ? "Canon + Anchor" : "Anchor Only"}
                                </Label>
                                <Switch
                                    checked={consistencyControls.use_pinned_canon}
                                    onCheckedChange={(checked) => onConsistencyChange({
                                        ...consistencyControls,
                                        use_pinned_canon: checked
                                    })}
                                    className="scale-75 origin-right"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Generation Tips or History Placeholder */}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h4 className="text-xs font-semibold text-blue-400 mb-1 flex items-center gap-1">
                        <Wand2 className="w-3 h-3" /> Pro Tip
                    </h4>
                    <p className="text-[11px] text-blue-200/70">
                        {consistencyControls.consistency_mode
                            ? "Higher variation allows more dynamic poses but may alter facial details slightly."
                            : "Consistency mode is off. The AI will reimagine the character based on the description only."}
                    </p>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="block w-full">
                                <Button
                                    className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg"
                                    size="lg"
                                    onClick={onGenerate}
                                    disabled={generateDisabled}
                                >
                                    {isGenerating ? (
                                        <>Generating...</>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4 mr-2" />
                                            Generate {mediaType === 'image' ? 'Image' : 'Video'}
                                        </>
                                    )}
                                </Button>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px]">
                            {generateDisabled && generateDisabledReason ? generateDisabledReason : 'Generate scene with current prompt and consistency settings.'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
};
