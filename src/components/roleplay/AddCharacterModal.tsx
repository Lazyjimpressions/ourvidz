import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Save, Users, Sparkles, X, Wand2, Loader2 } from 'lucide-react';
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
  const { createUserCharacter } = useUserCharacters();
  const { characters: publicCharacters, isLoading: loadingPublic } = usePublicCharacters();
  const { toast } = useToast();

  // AI Suggestion function
  const fetchSuggestions = useCallback(async (
    type: 'traits' | 'voice' | 'appearance' | 'backstory' | 'voice_examples' | 'all'
  ) => {
    setIsLoadingSuggestion(type);
    try {
      const { data, error } = await supabase.functions.invoke('character-suggestions', {
        body: {
          type,
          characterName: formData.name || undefined,
          existingTraits: formData.traits ? formData.traits.split(',').map(t => t.trim()) : undefined,
          existingAppearance: formData.appearance_tags.length > 0 ? formData.appearance_tags : undefined,
          contentRating: formData.content_rating
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

        if (type === 'all') {
          // Apply all suggestions at once
          setFormData(prev => ({
            ...prev,
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
  }, [formData, toast]);

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
      // Build the character data including new fields
      const characterData = {
        ...formData,
        content_rating: formData.content_rating,
        // Store structured layers in scene_behavior_rules
        scene_behavior_rules: Object.keys(formData.character_layers).length > 0
          ? { characterLayers: formData.character_layers }
          : undefined
      };

      const newCharacter = await createUserCharacter(characterData);

      toast({
        title: "Character Created",
        description: `${formData.name} has been successfully created!`,
      });

      onCharacterAdded?.(newCharacter);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to create character:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create character. Please try again.",
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
  const SuggestButton = ({ type, disabled }: { type: 'traits' | 'voice' | 'appearance' | 'voice_examples'; disabled?: boolean }) => (
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Character
          </DialogTitle>
        </DialogHeader>

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

            {/* AI Enhance All Button */}
            <div className="flex justify-end">
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
              <Label htmlFor="description">Description *</Label>
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

            {/* Image URLs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="image_url">Avatar URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="reference_image_url">Reference Image URL</Label>
                <Input
                  id="reference_image_url"
                  value={formData.reference_image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreate} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Create Character
              </Button>
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
              <div className="grid gap-3 max-h-96 overflow-y-auto">
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
      </DialogContent>
    </Dialog>
  );
};