/**
 * VisualsTab Component
 *
 * Combines portrait image management with physical traits for Character Studio V2.
 * Features:
 * - Portrait image upload (file or library)
 * - AI portrait generation using fal-image
 * - Physical traits input
 * - Outfit/signature items
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CharacterV2 } from '@/types/character-hub-v2';
import { buildCharacterPortraitPrompt } from '@/utils/characterPromptBuilder';
import { uploadToAvatarsBucket } from '@/utils/avatarUtils';
import { ImagePickerDialog } from '@/components/storyboard/ImagePickerDialog';
import { SuggestButton, SuggestionType } from '@/components/character-studio/SuggestButton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useImageModels } from '@/hooks/useImageModels';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
    Upload,
    Library,
    Wand2,
    Loader2,
    RefreshCw,
    User,
    ImageIcon,
} from 'lucide-react';

interface VisualsTabProps {
    formData: Partial<CharacterV2>;
    updateField: (field: keyof CharacterV2, value: any) => void;
    /** Current portrait URL (from character.image_url or preview) */
    currentPortraitUrl?: string;
    /** Callback when portrait is generated or uploaded */
    onPortraitChange?: (url: string) => void;
    /** Whether the component is in compact mode */
    compact?: boolean;
}

export const VisualsTab: React.FC<VisualsTabProps> = ({
    formData,
    updateField,
    currentPortraitUrl,
    onPortraitChange,
    compact = false,
}) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const { imageModels, defaultModel } = useImageModels();

    // Local state
    const [selectedImageModel, setSelectedImageModel] = useState<string>('');
    const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    const [loadingSuggestionType, setLoadingSuggestionType] = useState<SuggestionType | null>(null);

    // Physical traits
    const physicalTraits = formData.physical_traits || {};

    const handleTraitChange = (key: string, value: string) => {
        updateField('physical_traits', { ...physicalTraits, [key]: value });
    };

    // Set default image model when available
    useEffect(() => {
        if (defaultModel && !selectedImageModel) {
            setSelectedImageModel(defaultModel.value);
        }
    }, [defaultModel, selectedImageModel]);

    // Build character data for prompt builder
    const buildCharacterForPrompt = useCallback(() => {
        return {
            name: formData.name || 'Character',
            description: formData.bio || formData.tagline || '',
            persona: '',
            traits: formData.personality_traits
                ? Object.entries(formData.personality_traits)
                      .filter(([_, val]) => typeof val === 'number' && Math.abs(val) > 30)
                      .map(([key, _]) => key.replace('_', ' '))
                      .join(', ')
                : '',
            appearance_tags: [
                physicalTraits.age,
                physicalTraits.ethnicity,
                physicalTraits.hair,
                physicalTraits.eyes,
                physicalTraits.body_type,
            ].filter(Boolean) as string[],
            gender: (Array.isArray(physicalTraits.gender) ? physicalTraits.gender[0] : physicalTraits.gender) || '',
        };
    }, [formData, physicalTraits]);

    // Generate character portrait using AI
    const generateCharacterPortrait = useCallback(async () => {
        if (!formData.name && !formData.bio) {
            toast({
                title: 'Missing Information',
                description: 'Please provide a name or bio before generating an image.',
                variant: 'destructive',
            });
            return;
        }

        // Check if we have a reference image for I2I generation
        const referenceImageUrl = currentPortraitUrl || generatedImageUrl;
        const hasReferenceImage = !!referenceImageUrl;

        // Build optimized prompt for character portrait
        const characterData = buildCharacterForPrompt();
        const prompt = buildCharacterPortraitPrompt(characterData, { isI2I: hasReferenceImage });

        console.log('🎨 Generating character portrait with prompt:', prompt);
        console.log('🎨 Reference image URL:', referenceImageUrl);

        setIsGeneratingPortrait(true);

        try {
            const { data, error } = await supabase.functions.invoke('fal-image', {
                body: {
                    prompt,
                    apiModelId: selectedImageModel || undefined,
                    quality: 'high',
                    // Use Seedream v4.5 Edit model for I2I when reference image is available
                    model_key_override: hasReferenceImage
                        ? 'fal-ai/bytedance/seedream/v4.5/edit'
                        : undefined,
                    input: hasReferenceImage
                        ? {
                              image_url: referenceImageUrl,
                          }
                        : undefined,
                    metadata: {
                        contentType: formData.content_rating || 'nsfw',
                        destination: 'character_portrait',
                        characterName: formData.name,
                        is_i2i: hasReferenceImage,
                        reference_image_url: hasReferenceImage ? referenceImageUrl : undefined,
                    },
                },
            });

            if (error) {
                console.error('❌ fal-image error:', error);
                throw new Error(error.message || 'Failed to generate image');
            }

            if (data?.status === 'completed' && data?.resultUrl) {
                console.log('✅ Portrait generated successfully:', data.resultUrl);
                setGeneratedImageUrl(data.resultUrl);
                onPortraitChange?.(data.resultUrl);

                // Show different toast if this is the first portrait (sets character image)
                const isFirstPortrait = !currentPortraitUrl;
                toast({
                    title: isFirstPortrait ? 'Character Image Set' : 'Image Generated',
                    description: isFirstPortrait
                        ? 'Portrait generated and set as character image!'
                        : 'Your character portrait is ready!',
                });
            } else if (data?.status === 'queued') {
                toast({
                    title: 'Generating...',
                    description: 'Image is being generated. This may take a moment.',
                });
            } else {
                throw new Error('Unexpected response from image generation');
            }
        } catch (error) {
            console.error('Failed to generate portrait:', error);
            toast({
                title: 'Generation Failed',
                description:
                    error instanceof Error ? error.message : 'Could not generate image. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsGeneratingPortrait(false);
        }
    }, [formData, buildCharacterForPrompt, selectedImageModel, currentPortraitUrl, generatedImageUrl, onPortraitChange, toast]);

    // Handle file upload for character portrait
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.id) {
            if (!user?.id) {
                toast({
                    title: 'Not logged in',
                    description: 'Please log in to upload images.',
                    variant: 'destructive',
                });
            }
            return;
        }

        setIsUploading(true);
        try {
            const avatarUrl = await uploadToAvatarsBucket(file, user.id, 'character');
            setGeneratedImageUrl(avatarUrl);
            onPortraitChange?.(avatarUrl);
            toast({
                title: 'Image uploaded',
                description: 'Portrait image uploaded successfully!',
            });
        } catch (error) {
            console.error('Failed to upload image:', error);
            toast({
                title: 'Upload failed',
                description: 'Failed to upload image. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Handle library image selection
    const handleSelectFromLibrary = (imageUrl: string, source: 'library' | 'workspace') => {
        setGeneratedImageUrl(imageUrl);
        onPortraitChange?.(imageUrl);
        setShowImagePicker(false);
        toast({
            title: 'Image selected',
            description: 'Library image set as portrait',
        });
    };

    // Display URL - prioritize generated, then current
    const displayUrl = generatedImageUrl || currentPortraitUrl;

    // AI Suggestion handler for appearance traits
    const handleSuggestAppearance = useCallback(async () => {
        setIsLoadingSuggestion(true);
        setLoadingSuggestionType('appearance');
        try {
            const { data, error } = await supabase.functions.invoke('character-suggestions', {
                body: {
                    type: 'appearance',
                    characterName: formData.name || undefined,
                    existingDescription: formData.bio || formData.tagline || undefined,
                    existingAppearance: [
                        physicalTraits.hair,
                        physicalTraits.eyes,
                        physicalTraits.body_type,
                        physicalTraits.ethnicity,
                    ].filter(Boolean),
                    contentRating: formData.content_rating || 'nsfw',
                },
            });

            if (error) throw error;

            if (data?.success && data.suggestions?.suggestedAppearance) {
                const suggested = data.suggestions.suggestedAppearance as string[];
                const traitUpdates: Record<string, string> = {};

                // Categorize suggested tags into physical trait fields
                suggested.forEach((tag) => {
                    const lower = tag.toLowerCase();
                    if (
                        (lower.includes('hair') ||
                            lower.includes('blonde') ||
                            lower.includes('brunette') ||
                            lower.includes('redhead')) &&
                        !traitUpdates.hair
                    ) {
                        traitUpdates.hair = tag;
                    } else if (
                        (lower.includes('eye') || lower.includes('eyes')) &&
                        !traitUpdates.eyes
                    ) {
                        traitUpdates.eyes = tag;
                    } else if (
                        (lower.includes('athletic') ||
                            lower.includes('slim') ||
                            lower.includes('curvy') ||
                            lower.includes('petite') ||
                            lower.includes('muscular') ||
                            lower.includes('toned')) &&
                        !traitUpdates.body_type
                    ) {
                        traitUpdates.body_type = tag;
                    } else if (
                        (lower.includes('asian') ||
                            lower.includes('european') ||
                            lower.includes('african') ||
                            lower.includes('latin') ||
                            lower.includes('japanese') ||
                            lower.includes('korean') ||
                            lower.includes('chinese') ||
                            lower.includes('american')) &&
                        !traitUpdates.ethnicity
                    ) {
                        traitUpdates.ethnicity = tag;
                    }
                });

                if (Object.keys(traitUpdates).length > 0) {
                    updateField('physical_traits', { ...physicalTraits, ...traitUpdates });
                    toast({
                        title: 'Appearance Suggested',
                        description: `Applied ${Object.keys(traitUpdates).length} trait suggestions.`,
                    });
                } else {
                    toast({
                        title: 'No Matches',
                        description: 'AI suggestions did not match trait categories. Try adding more character details.',
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch appearance suggestions:', error);
            toast({
                title: 'Suggestion Failed',
                description: 'Could not generate AI suggestions. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoadingSuggestion(false);
            setLoadingSuggestionType(null);
        }
    }, [formData, physicalTraits, updateField, toast]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Portrait Image Section */}
            <div className="border border-border rounded-lg p-4 space-y-4 bg-gradient-to-br from-muted/30 to-muted/10">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Character Portrait
                    </Label>
                    {imageModels && imageModels.length > 0 && (
                        <Select value={selectedImageModel} onValueChange={setSelectedImageModel}>
                            <SelectTrigger className="w-[160px] h-7 text-xs">
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                                {imageModels.map((model) => (
                                    <SelectItem key={model.id} value={model.id} className="text-xs">
                                        {model.display_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className={cn('flex gap-4', compact && 'flex-col')}>
                    {/* Image Preview */}
                    <div
                        className={cn(
                            'relative flex-shrink-0 bg-muted rounded-lg overflow-hidden border border-border',
                            compact ? 'w-full aspect-square max-w-[120px] mx-auto' : 'w-28 h-28'
                        )}
                    >
                        {displayUrl ? (
                            <img
                                src={displayUrl}
                                alt={formData.name || 'Character preview'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User className="w-10 h-10 text-muted-foreground/40" />
                            </div>
                        )}
                        {isGeneratingPortrait && (
                            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                                <Loader2 className="w-5 h-5 animate-spin text-primary mb-1" />
                                <span className="text-[10px] text-muted-foreground">Generating...</span>
                            </div>
                        )}
                    </div>

                    {/* Generation Controls */}
                    <div className="flex-1 space-y-2">
                        <p className="text-[10px] text-muted-foreground">
                            Generate from description, upload, or select from library.
                        </p>

                        {/* Generate Button */}
                        <Button
                            type="button"
                            onClick={generateCharacterPortrait}
                            disabled={isGeneratingPortrait || (!formData.name && !formData.bio)}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-8 text-xs"
                            size="sm"
                        >
                            {isGeneratingPortrait ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                                    AI Generate Portrait
                                </>
                            )}
                        </Button>

                        {/* Upload + Library Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Upload Button */}
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isUploading}
                                    className="w-full h-8 text-xs"
                                >
                                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                                    {isUploading ? 'Uploading...' : 'Upload'}
                                </Button>
                            </div>

                            {/* Library Button */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowImagePicker(true)}
                                className="h-8 text-xs"
                            >
                                <Library className="w-3.5 h-3.5 mr-1.5" />
                                Library
                            </Button>
                        </div>

                        {/* Generation Progress */}
                        {isGeneratingPortrait && (
                            <div className="space-y-1">
                                <Progress value={50} className="h-1" />
                                <p className="text-[10px] text-muted-foreground text-center">
                                    Generating with fal.ai...
                                </p>
                            </div>
                        )}

                        {/* Regenerate Button */}
                        {displayUrl && !isGeneratingPortrait && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={generateCharacterPortrait}
                                className="w-full text-[10px] h-6"
                            >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Regenerate
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Physical Traits Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Physical Traits</Label>
                    <SuggestButton
                        type="appearance"
                        onClick={handleSuggestAppearance}
                        isLoading={isLoadingSuggestion}
                        loadingType={loadingSuggestionType}
                        disabled={!formData.name}
                        variant="text"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="age" className="text-xs text-muted-foreground">
                            Age
                        </Label>
                        <Input
                            id="age"
                            value={physicalTraits.age || ''}
                            onChange={(e) => handleTraitChange('age', e.target.value)}
                            placeholder="e.g. 25"
                            className="h-8 text-sm bg-secondary/50 border-white/10"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="ethnicity" className="text-xs text-muted-foreground">
                            Ethnicity
                        </Label>
                        <Input
                            id="ethnicity"
                            value={physicalTraits.ethnicity || ''}
                            onChange={(e) => handleTraitChange('ethnicity', e.target.value)}
                            placeholder="e.g. Japanese"
                            className="h-8 text-sm bg-secondary/50 border-white/10"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="hair" className="text-xs text-muted-foreground">
                            Hair Style/Color
                        </Label>
                        <Input
                            id="hair"
                            value={physicalTraits.hair || ''}
                            onChange={(e) => handleTraitChange('hair', e.target.value)}
                            placeholder="e.g. Long black hair"
                            className="h-8 text-sm bg-secondary/50 border-white/10"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="eyes" className="text-xs text-muted-foreground">
                            Eye Color
                        </Label>
                        <Input
                            id="eyes"
                            value={physicalTraits.eyes || ''}
                            onChange={(e) => handleTraitChange('eyes', e.target.value)}
                            placeholder="e.g. Green"
                            className="h-8 text-sm bg-secondary/50 border-white/10"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="body_type" className="text-xs text-muted-foreground">
                        Body Type
                    </Label>
                    <Input
                        id="body_type"
                        value={physicalTraits.body_type || ''}
                        onChange={(e) => handleTraitChange('body_type', e.target.value)}
                        placeholder="e.g. Athletic, Curvy, Slim"
                        className="h-8 text-sm bg-secondary/50 border-white/10"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="distinguishing_features" className="text-xs text-muted-foreground">
                        Distinguishing Features
                    </Label>
                    <Textarea
                        id="distinguishing_features"
                        value={physicalTraits.distinguishing_features || ''}
                        onChange={(e) => handleTraitChange('distinguishing_features', e.target.value)}
                        placeholder="Scars, tattoos, accessories..."
                        className="min-h-[60px] text-sm bg-secondary/50 border-white/10 resize-y"
                    />
                </div>
            </div>

            {/* Outfit & Items Section */}
            <div className="space-y-4">
                <Label className="text-sm font-medium">Outfit & Items</Label>

                <div className="space-y-1.5">
                    <Label htmlFor="outfit" className="text-xs text-muted-foreground">
                        Default Outfit
                    </Label>
                    <Textarea
                        id="outfit"
                        value={formData.outfit_defaults || ''}
                        onChange={(e) => updateField('outfit_defaults', e.target.value)}
                        placeholder="Description of their default clothing..."
                        className="min-h-[80px] text-sm bg-secondary/50 border-white/10 resize-y"
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Used as the base prompt for their appearance.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="signature_items" className="text-xs text-muted-foreground">
                        Signature Items
                    </Label>
                    <Input
                        id="signature_items"
                        value={formData.signature_items || ''}
                        onChange={(e) => updateField('signature_items', e.target.value)}
                        placeholder="e.g. Silver pendant, leather jacket, round glasses"
                        className="h-8 text-sm bg-secondary/50 border-white/10"
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Items that should appear consistently.
                    </p>
                </div>
            </div>

            {/* Library Picker Dialog */}
            <ImagePickerDialog
                isOpen={showImagePicker}
                onClose={() => setShowImagePicker(false)}
                onSelect={handleSelectFromLibrary}
                title="Select Character Portrait"
            />
        </div>
    );
};
