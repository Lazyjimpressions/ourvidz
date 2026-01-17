import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronDown, 
  User, 
  Palette, 
  MessageSquare,
  Settings,
  Wand2,
  Loader2,
  Save,
  Sparkles,
  Library,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CharacterData } from '@/hooks/useCharacterStudio';
import { PresetChipCarousel } from '@/components/roleplay/PresetChipCarousel';
import { SuggestButton, SuggestionType } from './SuggestButton';
import { ModelSelector } from './ModelSelector';
import { useImageModels, ImageModelOption } from '@/hooks/useImageModels';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Appearance presets for quick character styling
const APPEARANCE_PRESETS = {
  elegant: { icon: '👗', label: 'Elegant', tags: ['elegant', 'refined', 'sophisticated'] },
  casual: { icon: '👕', label: 'Casual', tags: ['casual', 'relaxed', 'everyday'] },
  athletic: { icon: '💪', label: 'Athletic', tags: ['athletic', 'fit', 'toned'] },
  glamorous: { icon: '✨', label: 'Glamorous', tags: ['glamorous', 'stunning', 'gorgeous'] },
  mysterious: { icon: '🌙', label: 'Mysterious', tags: ['mysterious', 'enigmatic', 'alluring'] },
  innocent: { icon: '🌸', label: 'Innocent', tags: ['innocent', 'sweet', 'gentle'] },
  bold: { icon: '🔥', label: 'Bold', tags: ['bold', 'confident', 'striking'] },
  natural: { icon: '🌿', label: 'Natural', tags: ['natural', 'organic', 'earthy'] },
};

interface CharacterStudioSidebarProps {
  character: CharacterData;
  onUpdateCharacter: (updates: Partial<CharacterData>) => void;
  onSave: () => Promise<string | null>;
  onGenerate: (prompt: string, options?: { referenceImageUrl?: string; model?: string }) => Promise<string | null>;
  isSaving: boolean;
  isGenerating: boolean;
  isDirty: boolean;
  isNewCharacter: boolean;
  primaryPortraitUrl?: string | null;
  selectedImageModel: string;
  onImageModelChange: (modelId: string) => void;
  imageModelOptions: ImageModelOption[];
  onOpenImagePicker: () => void;
}

export function CharacterStudioSidebar({
  character,
  onUpdateCharacter,
  onSave,
  onGenerate,
  isSaving,
  isGenerating,
  isDirty,
  isNewCharacter,
  primaryPortraitUrl,
  selectedImageModel,
  onImageModelChange,
  imageModelOptions,
  onOpenImagePicker
}: CharacterStudioSidebarProps) {
  const { toast } = useToast();
  const [openSections, setOpenSections] = React.useState({
    basic: true,
    appearance: true,
    personality: false,
    advanced: false
  });
  
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | undefined>(undefined);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState<SuggestionType | null>(null);
  const [newAppearanceTag, setNewAppearanceTag] = useState('');
  
  // Get roleplay models for AI suggestions
  const { allModelOptions: roleplayModels, defaultModel: defaultRoleplayModel } = useRoleplayModels();
  const [selectedRoleplayModel, setSelectedRoleplayModel] = useState<string>('');

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Build appearance prompt from character data
  const buildAppearancePrompt = () => {
    const parts: string[] = [];
    
    if (character.name) parts.push(character.name);
    if (character.gender) parts.push(character.gender);
    if (character.appearance_tags.length > 0) {
      parts.push(character.appearance_tags.join(', '));
    }
    if (character.traits) parts.push(character.traits);
    
    return parts.join(', ') || 'beautiful woman, portrait';
  };

  const handleGeneratePortrait = () => {
    const prompt = buildAppearancePrompt();
    onGenerate(prompt, { 
      referenceImageUrl: character.reference_image_url || undefined,
      model: selectedImageModel // Pass model ID from api_models table
    });
  };

  const handlePresetSelect = (key: string | undefined) => {
    setSelectedPresetKey(key);
    if (key && APPEARANCE_PRESETS[key as keyof typeof APPEARANCE_PRESETS]) {
      const preset = APPEARANCE_PRESETS[key as keyof typeof APPEARANCE_PRESETS];
      const updatedTags = [...new Set([...character.appearance_tags, ...preset.tags])];
      onUpdateCharacter({ appearance_tags: updatedTags });
    }
  };

  // Add appearance tag handler
  const handleAddAppearanceTag = () => {
    const tag = newAppearanceTag.trim();
    if (tag && !character.appearance_tags.includes(tag)) {
      onUpdateCharacter({ 
        appearance_tags: [...character.appearance_tags, tag] 
      });
      setNewAppearanceTag('');
    }
  };

  const handleAppearanceTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAppearanceTag();
    }
  };
  const fetchSuggestions = useCallback(async (type: SuggestionType) => {
    setIsLoadingSuggestion(type);
    try {
      const { data, error } = await supabase.functions.invoke('character-suggestions', {
        body: {
          type: type === 'persona' ? 'backstory' : type, // Map persona to backstory for API
          characterName: character.name || undefined,
          existingDescription: character.description || undefined,
          existingTraits: character.traits ? character.traits.split(',').map(t => t.trim()) : undefined,
          existingAppearance: character.appearance_tags.length > 0 ? character.appearance_tags : undefined,
          contentRating: character.content_rating,
          modelKey: selectedRoleplayModel || defaultRoleplayModel?.value || undefined
        }
      });

      if (error) throw error;

      if (data?.success && data.suggestions) {
        const suggestions = data.suggestions;

        if (type === 'traits' && suggestions.suggestedTraits) {
          const currentTraits = character.traits ? character.traits.split(',').map(t => t.trim()) : [];
          const newTraits = [...new Set([...currentTraits, ...suggestions.suggestedTraits])];
          onUpdateCharacter({ traits: newTraits.join(', ') });
          toast({ title: 'Traits Suggested', description: `Added ${suggestions.suggestedTraits.length} trait suggestions` });
        }

        if (type === 'voice' && suggestions.suggestedVoiceTone) {
          onUpdateCharacter({
            voice_tone: suggestions.suggestedVoiceTone,
            persona: suggestions.suggestedPersona || character.persona
          });
          toast({ title: 'Voice Suggested', description: `Suggested tone: ${suggestions.suggestedVoiceTone}` });
        }

        if (type === 'appearance' && suggestions.suggestedAppearance) {
          const newTags = [...new Set([...character.appearance_tags, ...suggestions.suggestedAppearance])];
          onUpdateCharacter({ appearance_tags: newTags });
          toast({ title: 'Appearance Suggested', description: `Added ${suggestions.suggestedAppearance.length} appearance tags` });
        }

        if (type === 'description' && suggestions.suggestedDescription) {
          onUpdateCharacter({ description: suggestions.suggestedDescription });
          toast({ title: 'Description Generated', description: 'AI-generated character description applied' });
        }

        if (type === 'persona' && suggestions.suggestedPersona) {
          onUpdateCharacter({ persona: suggestions.suggestedPersona });
          toast({ title: 'Persona Generated', description: 'AI-generated persona applied' });
        }

        if (type === 'all') {
          onUpdateCharacter({
            description: suggestions.suggestedDescription || character.description,
            traits: suggestions.suggestedTraits?.join(', ') || character.traits,
            voice_tone: suggestions.suggestedVoiceTone || character.voice_tone,
            persona: suggestions.suggestedPersona || character.persona,
            appearance_tags: suggestions.suggestedAppearance || character.appearance_tags,
          });
          toast({ title: 'Character Enhanced', description: 'Applied AI suggestions to all fields' });
        }
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      toast({
        title: 'Suggestion Failed',
        description: 'Could not generate AI suggestions. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingSuggestion(null);
    }
  }, [character, toast, selectedRoleplayModel, defaultRoleplayModel, onUpdateCharacter]);

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Character Details</h2>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className="gap-1.5"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {isNewCharacter ? 'Create' : 'Save'}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 pb-20">
          {/* Character Avatar Preview */}
          <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border">
              {primaryPortraitUrl || character.image_url ? (
                <img 
                  src={primaryPortraitUrl || character.image_url || ''} 
                  alt={character.name || 'Character'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-foreground">
              {character.name || 'New Character'}
            </span>
            
            {/* Enhance All Button */}
            <SuggestButton
              type="all"
              onClick={() => fetchSuggestions('all')}
              isLoading={isLoadingSuggestion !== null}
              loadingType={isLoadingSuggestion}
              disabled={!character.name}
              variant="full"
              className="w-full"
            />
          </div>

          {/* Basic Info Section */}
          <Collapsible open={openSections.basic} onOpenChange={() => toggleSection('basic')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Basic Info
              </div>
              <ChevronDown className={cn('w-4 h-4 transition-transform', openSections.basic && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-muted-foreground">Name</Label>
                <Input
                  id="name"
                  value={character.name}
                  onChange={(e) => onUpdateCharacter({ name: e.target.value })}
                  placeholder="Character name"
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  <Select 
                    value={character.gender} 
                    onValueChange={(value) => onUpdateCharacter({ gender: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-popover">
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="unspecified">Unspecified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Rating</Label>
                  <Select 
                    value={character.content_rating} 
                    onValueChange={(value: 'sfw' | 'nsfw') => onUpdateCharacter({ content_rating: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-popover">
                      <SelectItem value="sfw">SFW</SelectItem>
                      <SelectItem value="nsfw">NSFW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-xs text-muted-foreground">Description</Label>
                  <SuggestButton
                    type="description"
                    onClick={() => fetchSuggestions('description')}
                    isLoading={isLoadingSuggestion !== null}
                    loadingType={isLoadingSuggestion}
                    disabled={!character.name}
                    variant="text"
                  />
                </div>
                <Textarea
                  id="description"
                  value={character.description}
                  onChange={(e) => onUpdateCharacter({ description: e.target.value })}
                  placeholder="Brief character description..."
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Appearance Section */}
          <Collapsible open={openSections.appearance} onOpenChange={() => toggleSection('appearance')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Appearance
              </div>
              <ChevronDown className={cn('w-4 h-4 transition-transform', openSections.appearance && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {/* Appearance Presets */}
              <PresetChipCarousel 
                label="Quick Presets"
                presets={APPEARANCE_PRESETS}
                selectedKey={selectedPresetKey}
                onSelect={handlePresetSelect}
              />

              {/* Appearance Tags */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="traits" className="text-xs text-muted-foreground">Appearance Details</Label>
                  <SuggestButton
                    type="appearance"
                    onClick={() => fetchSuggestions('appearance')}
                    isLoading={isLoadingSuggestion !== null}
                    loadingType={isLoadingSuggestion}
                    disabled={!character.name}
                    variant="text"
                  />
                </div>
                <Textarea
                  id="traits"
                  value={character.traits}
                  onChange={(e) => onUpdateCharacter({ traits: e.target.value })}
                  placeholder="blonde hair, blue eyes, athletic build..."
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>

              {/* Add Appearance Tag Input */}
              <div className="flex gap-2">
                <Input
                  value={newAppearanceTag}
                  onChange={(e) => setNewAppearanceTag(e.target.value)}
                  onKeyPress={handleAppearanceTagKeyPress}
                  placeholder="Add appearance tag..."
                  className="flex-1 h-8 text-sm"
                />
                <Button 
                  onClick={handleAddAppearanceTag} 
                  size="sm" 
                  variant="outline" 
                  className="h-8 px-2"
                  disabled={!newAppearanceTag.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Current Tags */}
              {character.appearance_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {character.appearance_tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-destructive/20"
                      onClick={() => {
                        const newTags = character.appearance_tags.filter((_, i) => i !== index);
                        onUpdateCharacter({ appearance_tags: newTags });
                      }}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}

              {/* Reference Image */}
              {character.reference_image_url && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <img 
                    src={character.reference_image_url} 
                    alt="Reference" 
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">Reference Image</p>
                    <p className="text-xs text-muted-foreground">I2I mode enabled</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdateCharacter({ reference_image_url: null })}
                    className="h-6 px-2 text-xs"
                  >
                    Remove
                  </Button>
                </div>
              )}

              {/* Library Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenImagePicker}
                className="w-full gap-2"
              >
                <Library className="w-4 h-4" />
                Select Reference from Library
              </Button>

              {/* Image Model Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Image Model</Label>
                <ModelSelector
                  models={imageModelOptions}
                  selectedModel={selectedImageModel}
                  onSelect={onImageModelChange}
                  hasReferenceImage={!!character.reference_image_url}
                  size="sm"
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGeneratePortrait}
                disabled={isGenerating}
                className="w-full gap-2"
                variant="secondary"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Portrait'}
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Personality Section */}
          <Collapsible open={openSections.personality} onOpenChange={() => toggleSection('personality')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Personality & Voice
              </div>
              <ChevronDown className={cn('w-4 h-4 transition-transform', openSections.personality && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="persona" className="text-xs text-muted-foreground">Persona</Label>
                  <SuggestButton
                    type="persona"
                    onClick={() => fetchSuggestions('persona')}
                    isLoading={isLoadingSuggestion !== null}
                    loadingType={isLoadingSuggestion}
                    disabled={!character.name}
                    variant="text"
                  />
                </div>
                <Textarea
                  id="persona"
                  value={character.persona}
                  onChange={(e) => onUpdateCharacter({ persona: e.target.value })}
                  placeholder="Character's personality, background, motivations..."
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Voice Tone</Label>
                  <Select 
                    value={character.voice_tone} 
                    onValueChange={(value) => onUpdateCharacter({ voice_tone: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-popover">
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                      <SelectItem value="confident">Confident</SelectItem>
                      <SelectItem value="teasing">Teasing</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Mood</Label>
                  <Select 
                    value={character.mood} 
                    onValueChange={(value) => onUpdateCharacter({ mood: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-popover">
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="flirty">Flirty</SelectItem>
                      <SelectItem value="mysterious">Mysterious</SelectItem>
                      <SelectItem value="dominant">Dominant</SelectItem>
                      <SelectItem value="submissive">Submissive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="traits_personality" className="text-xs text-muted-foreground">Personality Traits</Label>
                  <SuggestButton
                    type="traits"
                    onClick={() => fetchSuggestions('traits')}
                    isLoading={isLoadingSuggestion !== null}
                    loadingType={isLoadingSuggestion}
                    disabled={!character.name}
                    variant="text"
                  />
                </div>
                <Input
                  id="traits_personality"
                  value={character.traits}
                  onChange={(e) => onUpdateCharacter({ traits: e.target.value })}
                  placeholder="kind, adventurous, witty..."
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="first_message" className="text-xs text-muted-foreground">First Message</Label>
                <Textarea
                  id="first_message"
                  value={character.first_message}
                  onChange={(e) => onUpdateCharacter({ first_message: e.target.value })}
                  placeholder="The character's opening message when starting a conversation..."
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Advanced Section */}
          <Collapsible open={openSections.advanced} onOpenChange={() => toggleSection('advanced')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced
              </div>
              <ChevronDown className={cn('w-4 h-4 transition-transform', openSections.advanced && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {/* AI Model for Suggestions */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">AI Model (for suggestions)</Label>
                <Select 
                  value={selectedRoleplayModel || defaultRoleplayModel?.value || ''} 
                  onValueChange={setSelectedRoleplayModel}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select model..." />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover">
                    {roleplayModels.map((model) => (
                      <SelectItem key={model.value} value={model.value} disabled={!model.isAvailable}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm">Make Public</Label>
                  <p className="text-xs text-muted-foreground">Allow others to chat with this character</p>
                </div>
                <Switch 
                  checked={character.is_public} 
                  onCheckedChange={(checked) => onUpdateCharacter({ is_public: checked })} 
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="system_prompt" className="text-xs text-muted-foreground">System Prompt</Label>
                <Textarea
                  id="system_prompt"
                  value={character.system_prompt}
                  onChange={(e) => onUpdateCharacter({ system_prompt: e.target.value })}
                  placeholder="Advanced instructions for the AI..."
                  className="min-h-[100px] resize-none text-sm font-mono text-xs"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
