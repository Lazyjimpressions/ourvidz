import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Wand2, Sparkles, Image as ImageIcon, Video, ChevronDown, Shuffle, Settings2, CheckCircle2, User, Shirt, Palette } from 'lucide-react';
import { ConsistencyControls, CharacterAnchor } from '@/types/character-hub-v2';
import { AnchorReference } from '@/components/character-studio/AnchorReferencePanel';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

// Helper to sign storage URLs for anchor display
async function getSignedAnchorUrl(url: string): Promise<string> {
    if (!url) return '';
    // Already a full URL (http/https or data URI)
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    // Parse bucket and path from storage path
    const knownBuckets = ['workspace-temp', 'user-library', 'characters', 'reference_images'];
    const parts = url.split('/');
    let bucket = 'characters';
    let path = url;

    if (knownBuckets.includes(parts[0])) {
        bucket = parts[0];
        path = parts.slice(1).join('/');
    }

    try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
        if (error) {
            console.error('Failed to sign anchor URL:', error);
            return url;
        }
        return data.signedUrl;
    } catch (err) {
        console.error('Error signing anchor URL:', err);
        return url;
    }
}

/** Options passed when generating */
export interface GenerationOptions {
    batchSize?: number;
    seed?: string;
    negativePrompt?: string;
}

interface CharacterStudioPromptBarV2Props {
    prompt: string;
    onPromptChange: (value: string) => void;
    onGenerate: (options: GenerationOptions) => void;
    isGenerating: boolean;
    consistencyControls: ConsistencyControls;
    onConsistencyChange: (controls: ConsistencyControls) => void;
    primaryAnchor: CharacterAnchor | null;
    /** Session-based anchor references for i2i generation (from Column C panel) */
    anchorRefs?: {
        face: AnchorReference | null;
        body: AnchorReference | null;
        style: AnchorReference | null;
    };
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
    anchorRefs,
    mediaType,
    onMediaTypeChange,
    isCreateMode = false
}) => {
    // Signed anchor URL state (for legacy primaryAnchor display)
    const [signedAnchorUrl, setSignedAnchorUrl] = useState<string>('');
    // Batch size state
    const [batchSize, setBatchSize] = useState<number>(1);
    // Advanced settings state
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [seed, setSeed] = useState<string>('');
    const [negativePrompt, setNegativePrompt] = useState<string>('');

    // Sign the anchor URL when primaryAnchor changes
    useEffect(() => {
        const signUrl = async () => {
            if (primaryAnchor?.image_url) {
                const signed = await getSignedAnchorUrl(primaryAnchor.image_url);
                setSignedAnchorUrl(signed);
            } else {
                setSignedAnchorUrl('');
            }
        };
        signUrl();
    }, [primaryAnchor?.image_url]);

    // Check if any anchor references are set (from Column C panel)
    const hasAnchorRefs = anchorRefs && (anchorRefs.face || anchorRefs.body || anchorRefs.style);
    const anchorCount = anchorRefs ? [anchorRefs.face, anchorRefs.body, anchorRefs.style].filter(Boolean).length : 0;

    // Generate is disabled only if already generating
    // Note: Create mode now auto-saves before generating
    const generateDisabled = isGenerating;
    const generateDisabledReason: string | null = null;
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
                        className="min-h-[80px] bg-secondary/50 border-white/10 resize-y focus:ring-primary/50"
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Describe <strong>what happens</strong> in the scene.
                    </p>
                </div>

                {/* Quick Prompt Buttons */}
                <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">Quick Prompt Buttons</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                        {['Portrait', 'Full Body', 'Action Pose', 'Outdoor'].map((btn) => {
                            const isActive = prompt.toLowerCase().includes(btn.toLowerCase());
                            return (
                                <button
                                    key={btn}
                                    className={cn(
                                        "px-2 py-1.5 text-[10px] rounded border transition-colors",
                                        isActive
                                            ? "bg-primary/20 border-primary text-primary"
                                            : "bg-secondary/30 border-border/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                    )}
                                    onClick={() => {
                                        if (isActive) {
                                            // Remove the keyword
                                            const regex = new RegExp(`\\b${btn}\\b[,\\s]*`, 'gi');
                                            onPromptChange(prompt.replace(regex, '').trim());
                                        } else {
                                            // Add the keyword at the beginning
                                            onPromptChange(btn + (prompt ? ', ' + prompt : ''));
                                        }
                                    }}
                                >
                                    {btn}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Anchor Status (shows which reference anchors are set from Column C panel) */}
                {hasAnchorRefs && (
                    <div className="space-y-3 rounded-lg bg-secondary/20 p-4 border border-white/5">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                Reference Mode
                            </Label>
                            <span className="text-[10px] text-muted-foreground">
                                {anchorCount}/3 anchors set
                            </span>
                        </div>

                        {/* Anchor Icons */}
                        <div className="flex gap-2">
                            {[
                                { key: 'face', icon: User, label: 'Face', ref: anchorRefs?.face },
                                { key: 'body', icon: Shirt, label: 'Body', ref: anchorRefs?.body },
                                { key: 'style', icon: Palette, label: 'Style', ref: anchorRefs?.style },
                            ].map(({ key, icon: Icon, label, ref }) => (
                                <div
                                    key={key}
                                    className={cn(
                                        'flex-1 p-2 rounded border text-center',
                                        ref
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : 'bg-muted/10 border-white/5'
                                    )}
                                >
                                    <Icon className={cn(
                                        'w-4 h-4 mx-auto mb-1',
                                        ref ? 'text-green-400' : 'text-muted-foreground/50'
                                    )} />
                                    <span className={cn(
                                        'text-[9px]',
                                        ref ? 'text-green-300' : 'text-muted-foreground/50'
                                    )}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Variation Slider */}
                        <div className="space-y-2 pt-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex justify-between text-[10px] cursor-help">
                                            <span>Strict</span>
                                            <span className="text-muted-foreground/70">{consistencyControls.variation}%</span>
                                            <span>Creative</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[260px]">
                                        <p className="text-xs">
                                            <strong>0% (Strict):</strong> Stay very close to reference appearance.<br />
                                            <strong>100% (Creative):</strong> More artistic freedom while maintaining identity.
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
                    </div>
                )}

                {/* Generation Tips */}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h4 className="text-xs font-semibold text-blue-400 mb-1 flex items-center gap-1">
                        <Wand2 className="w-3 h-3" /> Pro Tip
                    </h4>
                    <p className="text-[11px] text-blue-200/70">
                        {hasAnchorRefs
                            ? "Anchors set! The AI will use your references to maintain character consistency."
                            : "Set reference anchors above to lock your character's appearance during generation."}
                    </p>
                </div>

                {/* Advanced Settings (Collapsible) */}
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                        <Settings2 className="w-3 h-3" />
                        <span>Advanced Settings</span>
                        <ChevronDown className={cn("w-3 h-3 ml-auto transition-transform", advancedOpen && "rotate-180")} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-3 animate-in slide-in-from-top-2 duration-200">
                        {/* Seed Input */}
                        <div className="space-y-2">
                            <Label className="text-[10px] text-muted-foreground">Seed (for reproducibility)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={seed}
                                    onChange={(e) => setSeed(e.target.value)}
                                    placeholder="Random"
                                    className="h-7 text-xs bg-secondary/50 border-white/10 flex-1"
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setSeed(Math.floor(Math.random() * 9999999).toString())}
                                    title="Generate random seed"
                                >
                                    <Shuffle className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>

                        {/* Negative Prompt */}
                        <div className="space-y-2">
                            <Label className="text-[10px] text-muted-foreground">Negative Prompt</Label>
                            <Textarea
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                placeholder="Things to avoid in generation..."
                                className="min-h-[60px] text-xs bg-secondary/50 border-white/10 resize-y"
                            />
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm space-y-3">
                {/* Batch Size Selector */}
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground">Batch Size</Label>
                    <Select value={batchSize.toString()} onValueChange={(v) => setBatchSize(parseInt(v))}>
                        <SelectTrigger className="w-20 h-7 text-xs bg-secondary/50 border-white/10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1x</SelectItem>
                            <SelectItem value="4">4x</SelectItem>
                            <SelectItem value="9">9x</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="block w-full">
                                <Button
                                    className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg"
                                    size="lg"
                                    onClick={() => onGenerate({
                                        batchSize,
                                        seed: seed || undefined,
                                        negativePrompt: negativePrompt || undefined
                                    })}
                                    disabled={generateDisabled}
                                >
                                    {isGenerating ? (
                                        <>Generating...</>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4 mr-2" />
                                            Generate {batchSize > 1 ? `${batchSize} ${mediaType === 'image' ? 'Images' : 'Videos'}` : (mediaType === 'image' ? 'Image' : 'Video')}
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
