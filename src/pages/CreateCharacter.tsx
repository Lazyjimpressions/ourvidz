import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCharacters, type UserCharacter } from '@/hooks/useUserCharacters';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, ChevronDown, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PortraitPanel } from '@/components/roleplay/PortraitPanel';
import { CharacterGreetingsEditor } from '@/components/roleplay/CharacterGreetingsEditor';
import { type SelectedPresets, getPresetTags } from '@/data/characterPresets';

const CreateCharacter: React.FC = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { createUserCharacter, updateUserCharacter, characters } = useUserCharacters();
  const { toast } = useToast();

  const isEditing = !!editId;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gender, setGender] = useState<string>('unspecified');
  const [contentRating, setContentRating] = useState<string>('nsfw');
  const [persona, setPersona] = useState('');
  const [traits, setTraits] = useState('');
  const [appearanceTags, setAppearanceTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | undefined>();
  
  // Greetings
  const [firstMessage, setFirstMessage] = useState('');
  const [alternateGreetings, setAlternateGreetings] = useState<string[]>([]);
  
  // Visual presets
  const [presets, setPresets] = useState<SelectedPresets>({});
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    visual: false,
    greetings: false,
    advanced: false,
  });

  // Load existing character for editing
  useEffect(() => {
    if (isEditing && editId) {
      const existingCharacter = characters.find(c => c.id === editId);
      if (existingCharacter) {
        setName(existingCharacter.name);
        setDescription(existingCharacter.description);
        setGender(existingCharacter.gender || 'unspecified');
        setContentRating(existingCharacter.content_rating || 'nsfw');
        setPersona(existingCharacter.persona || '');
        setTraits(existingCharacter.traits || '');
        setAppearanceTags(existingCharacter.appearance_tags || []);
        setImageUrl(existingCharacter.image_url);
        setReferenceImageUrl(existingCharacter.reference_image_url);
        // Load first_message and alternate_greetings when available
        // These will come from the updated type after migration
      }
    }
  }, [isEditing, editId, characters]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!appearanceTags.includes(tagInput.trim())) {
        setAppearanceTags([...appearanceTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setAppearanceTags(appearanceTags.filter(t => t !== tag));
  };

  const handleGenerate = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    try {
      // Get preset tags
      const presetTags = getPresetTags(presets);
      
      // TODO: Call character-portrait edge function
      // For now, log what would be sent
      console.log('🎨 Generate portrait:', {
        name,
        gender,
        appearanceTags: [...appearanceTags, ...presetTags],
        presets,
        hasReferenceImage: !!referenceImageUrl
      });
      
      toast({
        title: 'Coming Soon',
        description: 'Portrait generation will be available shortly.',
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate portrait.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpload = () => {
    // TODO: Implement file upload
    toast({
      title: 'Coming Soon',
      description: 'Image upload will be available shortly.',
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim() || !description.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Name and description are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const characterData = {
        name: name.trim(),
        description: description.trim(),
        gender,
        content_rating: contentRating,
        persona: persona.trim() || undefined,
        traits: traits.trim() || undefined,
        appearance_tags: appearanceTags.length > 0 ? appearanceTags : undefined,
        image_url: imageUrl,
        reference_image_url: referenceImageUrl,
        first_message: firstMessage.trim() || undefined,
        alternate_greetings: alternateGreetings.filter(g => g.trim()) as unknown as undefined,
        default_presets: Object.keys(presets).length > 0 ? (presets as unknown as undefined) : undefined,
      };

      if (isEditing && editId) {
        await updateUserCharacter(editId, characterData as Partial<UserCharacter>);
        toast({ title: 'Character Updated' });
      } else {
        await createUserCharacter(characterData as Parameters<typeof createUserCharacter>[0]);
        toast({ title: 'Character Created' });
      }

      navigate('/roleplay');
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save character.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/roleplay')}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold">
              {isEditing ? 'Edit Character' : 'Create Character'}
            </h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !description.trim()}
            size="sm"
            className="h-8 gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6">
          {/* Left: Portrait Panel (Desktop) / Collapsible (Mobile) */}
          <div className="md:sticky md:top-20 md:self-start">
            <div className="block md:hidden">
              <Collapsible open={openSections.visual} onOpenChange={() => toggleSection('visual')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
                  Portrait & Presets
                  <ChevronDown className={cn('h-4 w-4 transition-transform', openSections.visual && 'rotate-180')} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <PortraitPanel
                    imageUrl={imageUrl}
                    isGenerating={isGenerating}
                    presets={presets}
                    onPresetsChange={setPresets}
                    onGenerate={handleGenerate}
                    onUpload={handleUpload}
                    hasReferenceImage={!!referenceImageUrl}
                    className="pb-4"
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
            <div className="hidden md:block">
              <PortraitPanel
                imageUrl={imageUrl}
                isGenerating={isGenerating}
                presets={presets}
                onPresetsChange={setPresets}
                onGenerate={handleGenerate}
                onUpload={handleUpload}
                hasReferenceImage={!!referenceImageUrl}
              />
            </div>
          </div>

          {/* Right: Form Sections */}
          <div className="space-y-4">
            {/* Basic Info - Always Open */}
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Basic Info</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Character name"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-sm">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="unspecified">Unspecified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this character..."
                  className="min-h-[80px] text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="content-rating" className="text-sm">Content Rating</Label>
                <Select value={contentRating} onValueChange={setContentRating}>
                  <SelectTrigger id="content-rating" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sfw">SFW</SelectItem>
                    <SelectItem value="nsfw">NSFW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            {/* Appearance Tags */}
            <section className="space-y-2">
              <Label className="text-sm">Appearance Tags</Label>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag and press Enter..."
                className="h-9"
              />
              {appearanceTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {appearanceTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary hover:bg-destructive/20 hover:text-destructive transition-colors"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* First Message Section */}
            <Collapsible open={openSections.greetings} onOpenChange={() => toggleSection('greetings')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t border-border pt-4">
                First Message & Greetings
                <ChevronDown className={cn('h-4 w-4 transition-transform', openSections.greetings && 'rotate-180')} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <CharacterGreetingsEditor
                  firstMessage={firstMessage}
                  alternateGreetings={alternateGreetings}
                  onFirstMessageChange={setFirstMessage}
                  onAlternateGreetingsChange={setAlternateGreetings}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Advanced Section */}
            <Collapsible open={openSections.advanced} onOpenChange={() => toggleSection('advanced')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t border-border pt-4">
                Advanced Settings
                <ChevronDown className={cn('h-4 w-4 transition-transform', openSections.advanced && 'rotate-180')} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="persona" className="text-sm">Persona</Label>
                  <Textarea
                    id="persona"
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    placeholder="Detailed personality and behavior description..."
                    className="min-h-[100px] text-sm resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="traits" className="text-sm">Traits</Label>
                  <Input
                    id="traits"
                    value={traits}
                    onChange={(e) => setTraits(e.target.value)}
                    placeholder="Comma-separated traits (e.g., playful, mysterious, caring)"
                    className="h-9"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border md:hidden safe-area-pb">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/roleplay')}
            className="flex-1 h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !description.trim()}
            className="flex-1 h-10"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Character'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateCharacter;
