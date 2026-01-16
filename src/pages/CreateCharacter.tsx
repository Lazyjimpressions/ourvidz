import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCharacters, type UserCharacter } from '@/hooks/useUserCharacters';
import { useImageModels } from '@/hooks/useImageModels';
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
import { ImagePickerDialog } from '@/components/storyboard/ImagePickerDialog';
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
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    visual: false,
    greetings: false,
    advanced: false,
  });

  // Model selection - I2I detection based on reference image
  const { modelOptions, defaultModel, isLoading: modelsLoading } = useImageModels(!!referenceImageUrl);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // Set default model when available
  useEffect(() => {
    if (defaultModel && !selectedModelId) {
      setSelectedModelId(defaultModel.value);
    }
  }, [defaultModel, selectedModelId]);

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
        setFirstMessage(existingCharacter.first_message || '');
        setAlternateGreetings(
          Array.isArray(existingCharacter.alternate_greetings) 
            ? existingCharacter.alternate_greetings 
            : []
        );
        if (existingCharacter.default_presets) {
          setPresets(existingCharacter.default_presets as unknown as SelectedPresets);
        }
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

  const handleUpload = async () => {
    if (!user) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        let processedFile = file;

        // Handle HEIC conversion for iPhone
        if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
          const heic2any = (await import('heic2any')).default;
          const blob = await heic2any({ blob: file, toType: 'image/jpeg' });
          processedFile = new File(
            [blob as Blob],
            file.name.replace(/\.heic$/i, '.jpg'),
            { type: 'image/jpeg' }
          );
        }

        // Upload to reference_images bucket
        const path = `${user.id}/ref_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('reference_images')
          .upload(path, processedFile);

        if (uploadError) throw uploadError;

        // Get signed URL for display and I2I
        const { data: signedData } = await supabase.storage
          .from('reference_images')
          .createSignedUrl(path, 3600);

        if (signedData?.signedUrl) {
          setReferenceImageUrl(signedData.signedUrl);
          setImageUrl(signedData.signedUrl);
          toast({ title: 'Image Uploaded', description: 'Reference image ready for generation.' });
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: 'Upload Failed',
          description: error instanceof Error ? error.message : 'Failed to upload image.',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const handleSelectFromLibrary = (selectedImageUrl: string) => {
    setImageUrl(selectedImageUrl);
    setReferenceImageUrl(selectedImageUrl);
    setShowImagePicker(false);
    toast({ title: 'Image Selected', description: 'Reference image ready for generation.' });
  };

  const handleGenerate = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      // Get preset tags for prompt
      const presetTags = getPresetTags(presets);

      console.log('🎨 Generate portrait:', {
        name,
        gender,
        appearanceTags: [...appearanceTags, ...presetTags],
        presets,
        hasReferenceImage: !!referenceImageUrl,
        modelId: selectedModelId
      });

      // Call character-portrait edge function
      const { data, error } = await supabase.functions.invoke('character-portrait', {
        body: {
          characterId: isEditing ? editId : null,
          presets,
          referenceImageUrl,
          contentRating,
          apiModelId: selectedModelId || undefined,
          characterData: isEditing ? null : {
            name,
            gender,
            appearance_tags: appearanceTags,
            description
          }
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setImageUrl(data.imageUrl);
        toast({
          title: 'Portrait Generated',
          description: `Generated in ${Math.round((data.generationTimeMs || 0) / 1000)}s`,
        });
      } else {
        throw new Error('No image returned from generation');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate portrait.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
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
                    isUploading={isUploading}
                    presets={presets}
                    onPresetsChange={setPresets}
                    onGenerate={handleGenerate}
                    onUpload={handleUpload}
                    onSelectFromLibrary={() => setShowImagePicker(true)}
                    hasReferenceImage={!!referenceImageUrl}
                    modelId={selectedModelId}
                    onModelChange={setSelectedModelId}
                    modelOptions={modelOptions}
                    className="pb-4"
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
            <div className="hidden md:block">
              <PortraitPanel
                imageUrl={imageUrl}
                isGenerating={isGenerating}
                isUploading={isUploading}
                presets={presets}
                onPresetsChange={setPresets}
                onGenerate={handleGenerate}
                onUpload={handleUpload}
                onSelectFromLibrary={() => setShowImagePicker(true)}
                hasReferenceImage={!!referenceImageUrl}
                modelId={selectedModelId}
                onModelChange={setSelectedModelId}
                modelOptions={modelOptions}
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

      {/* Image Picker Dialog */}
      <ImagePickerDialog
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelect={handleSelectFromLibrary}
        title="Select Character Portrait"
      />
    </div>
  );
};

export default CreateCharacter;
