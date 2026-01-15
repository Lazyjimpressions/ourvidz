import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import { useGeneration } from '@/hooks/useGeneration';
import { useImageModels } from '@/hooks/useImageModels';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { supabase } from '@/integrations/supabase/client';
import { buildCharacterPortraitPrompt } from '@/utils/characterPromptBuilder';
import { getSignedUrl } from '@/lib/storage';
import { Plus, Save, Users, Sparkles, X, Wand2, Loader2, ImageIcon, RefreshCw, User } from 'lucide-react';
import type { ContentRating, CharacterLayers, VoiceTone } from '@/types/roleplay';

interface AddCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterAdded?: (character: any) => void;
}

// Voice tone options matching the type
const VOICE_TONE_OPTIONS: { value: VoiceTone; label: string }[] = [
  { value: 'warm', label: 'Warm' },
  { value: 'direct', label: 'Direct' },
  { value: 'teasing', label: 'Teasing' },
  { value: 'formal', label: 'Formal' },
  { value: 'soft-spoken', label: 'Soft-spoken' },
  { value: 'confident', label: 'Confident' },
  { value: 'playful', label: 'Playful' },
];

export const AddCharacterModal = ({
  isOpen,
  onClose,
  onCharacterAdded
}: AddCharacterModalProps) => {
  const [activeTab, setActiveTab] = useState('create');
  const [creationMode, setCreationMode] = useState<'quick' | 'detailed'>('quick');
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    persona: '',
    traits: '',
    voice_tone: 'warm' as VoiceTone,
    mood: 'friendly',
    appearance_tags: [] as string[],
    image_url: '',
    reference_image_url: '',
    is_public: false,
    // New fields for enhanced character creation
    content_rating: 'nsfw' as ContentRating,  // Default to NSFW
    gender: '',
    role: '',
    voice_examples: [] as string[],
    forbidden_phrases: [] as string[],
    // Structured layers for scene_behavior_rules
    character_layers: {} as Partial<CharacterLayers>
  });
  const [newTag, setNewTag] = useState('');
  const [newVoiceExample, setNewVoiceExample] = useState('');
  const [newForbiddenPhrase, setNewForbiddenPhrase] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedImageModel, setSelectedImageModel] = useState<string>('');
  const [selectedRoleplayModel, setSelectedRoleplayModel] = useState<string>('');
  const { createUserCharacter } = useUserCharacters();
  const { characters: publicCharacters, isLoading: loadingPublic } = usePublicCharacters();
  const { toast } = useToast();
  const { generateContent, isGenerating, currentJob, generationProgress } = useGeneration();
  const { imageModels, defaultModel: defaultImageModel } = useImageModels();
  const { allModelOptions: roleplayModels, defaultModel: defaultRoleplayModel } = useRoleplayModels();

  // Set default image model when available
  useEffect(() => {
    if (defaultImageModel && !selectedImageModel) {
      setSelectedImageModel(defaultImageModel.value);
    }
  }, [defaultImageModel, selectedImageModel]);

  // Set default roleplay model when available
  useEffect(() => {
    if (defaultRoleplayModel && !selectedRoleplayModel) {
      setSelectedRoleplayModel(defaultRoleplayModel.value);
    }
  }, [defaultRoleplayModel, selectedRoleplayModel]);

  // Listen for generation completion events
  useEffect(() => {
    const handleGenerationComplete = async (event: CustomEvent) => {
      const { imageUrl, bucket, jobId } = event.detail;
      console.log('🎨 Character image generation completed:', { imageUrl, bucket, jobId });

      if (imageUrl && bucket) {
        try {
          // Get signed URL for the generated image using storage helper
          const { data, error } = await getSignedUrl(bucket, imageUrl, 3600);
          if (!error && data?.signedUrl) {
            setGeneratedImageUrl(data.signedUrl);
            setFormData(prev => ({
              ...prev,
              image_url: data.signedUrl,
              reference_image_url: data.signedUrl
            }));
            toast({
              title: 'Image Generated',
              description: 'Your character portrait is ready!'
            });
          }
        } catch (error) {
          console.error('Failed to get signed URL:', error);
        }
      }
    };

    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    return () => {
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
    };
  }, [toast]);

  // Local state for portrait generation (when using fal-image directly)
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);

  // Generate character portrait using AI
  const generateCharacterImage = useCallback(async () => {
    if (!formData.name || !formData.description) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a name and description before generating an image.',
        variant: 'destructive'
      });
      return;
    }

    // Build optimized prompt for character portrait
    const prompt = buildCharacterPortraitPrompt({
      name: formData.name,
      description: formData.description,
      appearance_tags: formData.appearance_tags,
      traits: formData.traits,
      persona: formData.persona,
      gender: formData.gender
    });

    console.log('🎨 Generating character portrait with prompt:', prompt);

    // Check if selected model is from fal.ai (default model is Seedream from fal.ai)
    const selectedModel = imageModels?.find(m => m.id === selectedImageModel);
    const isFalModel = selectedModel?.model_key?.includes('fal-ai') ||
                       selectedModel?.model_key?.includes('seedream') ||
                       !selectedImageModel; // Default model is fal.ai Seedream

    if (isFalModel) {
      // Use fal-image edge function directly for fal.ai models
      setIsGeneratingPortrait(true);
      try {
        const { data, error } = await supabase.functions.invoke('fal-image', {
          body: {
            prompt,
            apiModelId: selectedImageModel || undefined, // Will use default fal.ai model if not specified
            quality: 'high',
            metadata: {
              contentType: formData.content_rating,
              destination: 'character_portrait',
              characterName: formData.name
            }
          }
        });

        if (error) {
          console.error('❌ fal-image error:', error);
          throw new Error(error.message || 'Failed to generate image');
        }

        if (data?.status === 'completed' && data?.resultUrl) {
          console.log('✅ Portrait generated successfully:', data.resultUrl);
          setGeneratedImageUrl(data.resultUrl);
          setFormData(prev => ({
            ...prev,
            image_url: data.resultUrl,
            reference_image_url: data.resultUrl
          }));
          toast({
            title: 'Image Generated',
            description: 'Your character portrait is ready!'
          });
        } else if (data?.status === 'queued') {
          // Handle async response (rare for Seedream)
          toast({
            title: 'Generating...',
            description: 'Image is being generated. This may take a moment.'
          });
        } else {
          throw new Error('Unexpected response from image generation');
        }
      } catch (error) {
        console.error('Failed to generate portrait:', error);
        toast({
          title: 'Generation Failed',
          description: error instanceof Error ? error.message : 'Could not generate image. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsGeneratingPortrait(false);
      }
    } else {
      // Fall back to useGeneration hook for other models (SDXL, Replicate)
      try {
        await generateContent({
          format: 'sdxl_image_high',
          prompt,
          projectId: '00000000-0000-0000-0000-000000000000',
          metadata: {
            contentType: formData.content_rating,
            destination: 'character_portrait',
            characterName: formData.name,
            apiModelId: selectedImageModel || undefined
          }
        });
      } catch (error) {
        console.error('Failed to start image generation:', error);
        toast({
          title: 'Generation Failed',
          description: 'Could not start image generation. Please try again.',
          variant: 'destructive'
        });
      }
    }
  }, [formData, selectedImageModel, imageModels, generateContent, toast]);

  // AI Suggestion function
  const fetchSuggestions = useCallback(async (
    type: 'traits' | 'voice' | 'appearance' | 'backstory' | 'voice_examples' | 'description' | 'all'
  ) => {
    setIsLoadingSuggestion(type);
    try {
      const { data, error } = await supabase.functions.invoke('character-suggestions', {
        body: {
          type,
          characterName: formData.name || undefined,
          existingDescription: formData.description || undefined,
          existingTraits: formData.traits ? formData.traits.split(',').map(t => t.trim()) : undefined,
          existingAppearance: formData.appearance_tags.length > 0 ? formData.appearance_tags : undefined,
          contentRating: formData.content_rating,
          modelKey: selectedRoleplayModel || undefined
        }
      });

      if (error) throw error;

      if (data?.success && data.suggestions) {
        const suggestions = data.suggestions;

        // Apply suggestions based on type
        if (type === 'traits' && suggestions.suggestedTraits) {
          const currentTraits = formData.traits ? formData.traits.split(',').map(t => t.trim()) : [];
          const newTraits = [...new Set([...currentTraits, ...suggestions.suggestedTraits])];
          setFormData(prev => ({ ...prev, traits: newTraits.join(', ') }));
          toast({ title: 'Traits Suggested', description: `Added ${suggestions.suggestedTraits.length} trait suggestions` });
        }

        if (type === 'voice' && suggestions.suggestedVoiceTone) {
          setFormData(prev => ({
            ...prev,
            voice_tone: suggestions.suggestedVoiceTone as VoiceTone,
            persona: suggestions.suggestedPersona || prev.persona
          }));
          toast({ title: 'Voice Suggested', description: `Suggested tone: ${suggestions.suggestedVoiceTone}` });
        }

        if (type === 'appearance' && suggestions.suggestedAppearance) {
          const newTags = [...new Set([...formData.appearance_tags, ...suggestions.suggestedAppearance])];
          setFormData(prev => ({ ...prev, appearance_tags: newTags }));
          toast({ title: 'Appearance Suggested', description: `Added ${suggestions.suggestedAppearance.length} appearance tags` });
        }

        if (type === 'voice_examples' && suggestions.suggestedVoiceExamples) {
          const newExamples = [...new Set([...formData.voice_examples, ...suggestions.suggestedVoiceExamples])];
          setFormData(prev => ({ ...prev, voice_examples: newExamples }));
          toast({ title: 'Voice Examples Suggested', description: `Added ${suggestions.suggestedVoiceExamples.length} example lines` });
        }

        if (type === 'description' && suggestions.suggestedDescription) {
          setFormData(prev => ({ ...prev, description: suggestions.suggestedDescription }));
          toast({ title: 'Description Generated', description: 'AI-generated character description applied' });
        }

        if (type === 'all') {
          // Apply all suggestions at once
          setFormData(prev => ({
            ...prev,
            description: suggestions.suggestedDescription || prev.description,
            traits: suggestions.suggestedTraits?.join(', ') || prev.traits,
            voice_tone: (suggestions.suggestedVoiceTone as VoiceTone) || prev.voice_tone,
            persona: suggestions.suggestedPersona || prev.persona,
            appearance_tags: suggestions.suggestedAppearance || prev.appearance_tags,
            voice_examples: suggestions.suggestedVoiceExamples || prev.voice_examples,
            forbidden_phrases: suggestions.suggestedForbiddenPhrases || prev.forbidden_phrases
          }));
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
  }, [formData, toast, selectedRoleplayModel]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a name and description.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Build the character data, excluding internal-only fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { character_layers, ...cleanFormData } = formData;

      const characterData = {
        ...cleanFormData,
        content_rating: formData.content_rating,
        // Store structured layers in scene_behavior_rules
        scene_behavior_rules: Object.keys(character_layers).length > 0
          ? { characterLayers: character_layers }
          : undefined
      };

      console.log('📝 Creating character with data:', {
        name: characterData.name,
        description: characterData.description?.substring(0, 50) + '...',
        content_rating: characterData.content_rating,
        hasImage: !!characterData.image_url,
        traitsCount: characterData.traits?.split(',').length || 0,
        appearanceTagsCount: characterData.appearance_tags?.length || 0
      });

      const newCharacter = await createUserCharacter(characterData);

      toast({
        title: "Character Created",
        description: `${formData.name} has been successfully created!`,
      });

      onCharacterAdded?.(newCharacter);
      onClose();
      resetForm();
    } catch (error) {
      console.error('❌ Failed to create character:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Creation Failed",
        description: `Failed to create character: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      persona: '',
      traits: '',
      voice_tone: 'warm' as VoiceTone,
      mood: 'friendly',
      appearance_tags: [],
      image_url: '',
      reference_image_url: '',
      is_public: false,
      content_rating: 'nsfw' as ContentRating,
      gender: '',
      role: '',
      voice_examples: [],
      forbidden_phrases: [],
      character_layers: {}
    });
    setNewTag('');
    setNewVoiceExample('');
    setNewForbiddenPhrase('');
    setCreationMode('quick');
    setGeneratedImageUrl(null);
  };

  const addVoiceExample = () => {
    if (newVoiceExample.trim() && !formData.voice_examples.includes(newVoiceExample.trim())) {
      setFormData(prev => ({
        ...prev,
        voice_examples: [...prev.voice_examples, newVoiceExample.trim()]
      }));
      setNewVoiceExample('');
    }
  };

  const removeVoiceExample = (example: string) => {
    setFormData(prev => ({
      ...prev,
      voice_examples: prev.voice_examples.filter(e => e !== example)
    }));
  };

  const addForbiddenPhrase = () => {
    if (newForbiddenPhrase.trim() && !formData.forbidden_phrases.includes(newForbiddenPhrase.trim())) {
      setFormData(prev => ({
        ...prev,
        forbidden_phrases: [...prev.forbidden_phrases, newForbiddenPhrase.trim()]
      }));
      setNewForbiddenPhrase('');
    }
  };

  const removeForbiddenPhrase = (phrase: string) => {
    setFormData(prev => ({
      ...prev,
      forbidden_phrases: prev.forbidden_phrases.filter(p => p !== phrase)
    }));
  };

  // Suggestion button component for reuse
  const SuggestButton = ({ type, disabled }: { type: 'traits' | 'voice' | 'appearance' | 'voice_examples' | 'description'; disabled?: boolean }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
      onClick={() => fetchSuggestions(type)}
      disabled={disabled || isLoadingSuggestion === type}
    >
      {isLoadingSuggestion === type ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <>
          <Wand2 className="w-3 h-3 mr-1" />
          Suggest
        </>
      )}
    </Button>
  );

  const addTag = () => {
    if (newTag.trim() && !formData.appearance_tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        appearance_tags: [...prev.appearance_tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      appearance_tags: prev.appearance_tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose}>
      <ResponsiveModalContent className="bg-background border-border max-w-3xl">
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
          <ResponsiveModalTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Character
          </ResponsiveModalTitle>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Create New
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Browse Public
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            {/* Mode and Content Rating Toggle */}
            <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Button
                  variant={creationMode === 'quick' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCreationMode('quick')}
                  className="h-8"
                >
                  Quick
                </Button>
                <Button
                  variant={creationMode === 'detailed' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCreationMode('detailed')}
                  className="h-8"
                >
                  Detailed
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="content-rating" className="text-sm text-muted-foreground">
                  {formData.content_rating === 'nsfw' ? 'NSFW' : 'SFW'}
                </Label>
                <Switch
                  id="content-rating"
                  checked={formData.content_rating === 'nsfw'}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    content_rating: checked ? 'nsfw' : 'sfw'
                  }))}
                />
              </div>
            </div>

            {/* AI Enhance Section with Model Selector */}
            <div className="flex items-center justify-between gap-3">
              {/* Roleplay Model Selector */}
              {roleplayModels && roleplayModels.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">AI Model:</Label>
                  <Select value={selectedRoleplayModel} onValueChange={setSelectedRoleplayModel}>
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleplayModels
                        .filter(model => model.isAvailable)
                        .map((model) => (
                          <SelectItem
                            key={model.value}
                            value={model.value}
                            className="text-xs"
                          >
                            <div className="flex flex-col">
                              <span>{model.label}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {model.provider}
                                {model.capabilities?.cost === 'free' && ' • Free'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* AI Enhance All Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                onClick={() => fetchSuggestions('all')}
                disabled={isLoadingSuggestion === 'all' || !formData.name}
              >
                {isLoadingSuggestion === 'all' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                AI Enhance All
              </Button>
            </div>

            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Character name"
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="description">Description *</Label>
                <SuggestButton type="description" disabled={!formData.name} />
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your character's background, appearance, and personality..."
                className="min-h-[80px]"
              />
            </div>

            {/* Traits with Suggest */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="traits">Key Traits</Label>
                <SuggestButton type="traits" disabled={!formData.name} />
              </div>
              <Input
                id="traits"
                value={formData.traits}
                onChange={(e) => setFormData(prev => ({ ...prev, traits: e.target.value }))}
                placeholder="e.g., confident, witty, caring"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mood">Mood</Label>
                <Select value={formData.mood} onValueChange={(value) => setFormData(prev => ({ ...prev, mood: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="flirty">Flirty</SelectItem>
                    <SelectItem value="mysterious">Mysterious</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="romantic">Romantic</SelectItem>
                    <SelectItem value="confident">Confident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="voice_tone">Voice Tone</Label>
                  <SuggestButton type="voice" disabled={!formData.name} />
                </div>
                <Select value={formData.voice_tone} onValueChange={(value: VoiceTone) => setFormData(prev => ({ ...prev, voice_tone: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_TONE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Appearance Tags with Suggest */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Appearance Tags</Label>
                <SuggestButton type="appearance" disabled={!formData.name} />
              </div>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add appearance tag"
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1"
                />
                <Button onClick={addTag} size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.appearance_tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="pr-1">
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 ml-1"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Detailed Mode Fields */}
            {creationMode === 'detailed' && (
              <>
                <div>
                  <Label htmlFor="persona">Personality</Label>
                  <Textarea
                    id="persona"
                    value={formData.persona}
                    onChange={(e) => setFormData(prev => ({ ...prev, persona: e.target.value }))}
                    placeholder="How does your character think, speak, and behave?"
                    className="min-h-[60px]"
                  />
                </div>

                <div>
                  <Label htmlFor="role">Role Type</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="companion">Companion</SelectItem>
                      <SelectItem value="romantic_interest">Romantic Interest</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="rival">Rival</SelectItem>
                      <SelectItem value="authority">Authority Figure</SelectItem>
                      <SelectItem value="equal_partner">Equal Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Voice Examples with Suggest */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Voice Examples</Label>
                    <SuggestButton type="voice_examples" disabled={!formData.name} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Example lines this character might say</p>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newVoiceExample}
                      onChange={(e) => setNewVoiceExample(e.target.value)}
                      placeholder="Add example dialogue..."
                      onKeyPress={(e) => e.key === 'Enter' && addVoiceExample()}
                      className="flex-1"
                    />
                    <Button onClick={addVoiceExample} size="sm" variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.voice_examples.map((example, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm">
                        <span className="flex-1 italic">"{example}"</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1"
                          onClick={() => removeVoiceExample(example)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Forbidden Phrases */}
                <div>
                  <Label>Forbidden Phrases</Label>
                  <p className="text-xs text-muted-foreground mb-2">Phrases the character should never use</p>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newForbiddenPhrase}
                      onChange={(e) => setNewForbiddenPhrase(e.target.value)}
                      placeholder="e.g., 'How can I help you?'"
                      onKeyPress={(e) => e.key === 'Enter' && addForbiddenPhrase()}
                      className="flex-1"
                    />
                    <Button onClick={addForbiddenPhrase} size="sm" variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.forbidden_phrases.map((phrase, idx) => (
                      <Badge key={idx} variant="destructive" className="pr-1">
                        {phrase}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 ml-1 hover:bg-red-700"
                          onClick={() => removeForbiddenPhrase(phrase)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Character Image Section */}
            <div className="border border-border rounded-lg p-4 space-y-4 bg-gradient-to-br from-muted/30 to-muted/10">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Character Portrait
                </Label>
                {imageModels && imageModels.length > 0 && (
                  <Select value={selectedImageModel} onValueChange={setSelectedImageModel}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
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

              <div className="flex gap-4">
                {/* Image Preview */}
                <div className="relative w-32 h-32 flex-shrink-0 bg-muted rounded-lg overflow-hidden border border-border">
                  {(generatedImageUrl || formData.image_url) ? (
                    <img
                      src={generatedImageUrl || formData.image_url}
                      alt={formData.name || 'Character preview'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-muted-foreground/40" />
                    </div>
                  )}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                      <span className="text-xs text-muted-foreground">Generating...</span>
                    </div>
                  )}
                </div>

                {/* Generation Controls */}
                <div className="flex-1 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Generate a portrait based on your character's description and appearance tags, or paste an image URL below.
                  </p>

                  {/* Generate Button */}
                  <Button
                    type="button"
                    onClick={generateCharacterImage}
                    disabled={isGenerating || isGeneratingPortrait || (!formData.name && !formData.description)}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    size="sm"
                  >
                    {(isGenerating || isGeneratingPortrait) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Portrait...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate AI Portrait
                      </>
                    )}
                  </Button>

                  {/* Generation Progress */}
                  {(isGenerating || isGeneratingPortrait) && (
                    <div className="space-y-1">
                      {isGenerating && currentJob ? (
                        <>
                          <Progress value={generationProgress} className="h-1.5" />
                          <p className="text-xs text-muted-foreground text-center">
                            {currentJob.status === 'queued' ? 'Queued...' :
                             currentJob.status === 'processing' ? 'Processing...' :
                             'Preparing...'}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center">
                          Generating with fal.ai...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Regenerate Button */}
                  {generatedImageUrl && !isGenerating && !isGeneratingPortrait && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateCharacterImage}
                      className="w-full text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Regenerate
                    </Button>
                  )}
                </div>
              </div>

              {/* Manual URL Input (collapsible) */}
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Or enter image URL manually ▾
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="image_url" className="text-xs">Avatar URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://..."
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reference_image_url" className="text-xs">Reference URL</Label>
                    <Input
                      id="reference_image_url"
                      value={formData.reference_image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference_image_url: e.target.value }))}
                      placeholder="https://..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </details>
            </div>

          </TabsContent>

          <TabsContent value="browse" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-4">
              Browse and add public characters to your collection
            </div>
            
            {loadingPublic ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border border-primary border-t-transparent mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading characters...</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {publicCharacters?.map((character) => (
                  <div key={character.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    {character.image_url && (
                      <img 
                        src={character.image_url} 
                        alt={character.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{character.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {character.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          ❤️ {character.likes_count || 0}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          💬 {character.interaction_count || 0}
                        </span>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => {
                        onCharacterAdded?.(character);
                        onClose();
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-border flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCreate} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            Create Character
          </Button>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};