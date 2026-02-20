import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit3, Save, X, Plus, Wand2, Upload, Library, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { uploadGeneratedImageToAvatars, uploadToAvatarsBucket } from '@/utils/avatarUtils';
import { buildCharacterPortraitPrompt } from '@/utils/characterPromptBuilder';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ImagePickerDialog } from '@/components/storyboard/ImagePickerDialog';
interface CharacterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  character?: any;
  onCharacterUpdated?: (character: any) => void;
  /** 'create' for new character, 'edit' for existing (default: 'edit') */
  mode?: 'create' | 'edit';
  /** Default role when creating: 'user' for persona, 'ai' for companion */
  defaultRole?: 'user' | 'ai';
}

export const CharacterEditModal = ({
  isOpen,
  onClose,
  character,
  onCharacterUpdated,
  mode = 'edit',
  defaultRole = 'ai'
}: CharacterEditModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['user-admin-role', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      return !!data;
    },
    enabled: !!user,
  });

  // Check if user can edit this character (owner OR admin)
  const isOwner = !!user && !!character?.user_id && character.user_id === user.id;
  // In create mode, anyone can "edit" (create new)
  const canEdit = mode === 'create' || isOwner || !!isAdmin;

  // Determine default content rating based on role
  const getDefaultContentRating = () => defaultRole === 'user' ? 'sfw' : 'nsfw';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    persona: '',
    traits: '',
    voice_tone: '',
    mood: '',
    appearance_tags: [] as string[],
    image_url: '',
    reference_image_url: '',
    content_rating: 'nsfw' as 'sfw' | 'nsfw',
    gender: '',
    role: '',
    is_public: false
  });
  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { updateUserCharacter, createUserCharacter, deleteUserCharacter } = useUserCharacters();
  const { createScene } = useCharacterScenes(character?.id);

  const handleGeneratePortrait = async () => {
    const characterId = character?.id;
    setIsGenerating(true);

    try {
      const prompt = buildCharacterPortraitPrompt({
        name: formData.name,
        description: formData.description,
        persona: formData.persona,
        traits: formData.traits,
        appearance_tags: formData.appearance_tags
      });

      console.log('🎨 Character portrait prompt generated:', { character: formData.name, prompt });

      // Resolve the default fal image model from api_models (table-driven, no hardcoding)
      const { data: defaultModel } = await supabase
        .from('api_models')
        .select('id, model_key, display_name, api_providers!inner(name)')
        .eq('modality', 'image')
        .eq('is_active', true)
        .contains('default_for_tasks', ['generation'])
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      const providerName = (defaultModel?.api_providers as any)?.name || '';
      const edgeFunction = providerName === 'replicate' ? 'replicate-image' : 'fal-image';

      console.log('🚀 Routing character portrait to:', edgeFunction, 'model:', defaultModel?.display_name);

      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body: {
          prompt,
          apiModelId: defaultModel?.id,
          contentType: 'sfw',
          aspectRatio: '1:1',
          metadata: {
            source: 'character_portrait',
            contentType: 'sfw',
            character_name: formData.name
          }
        }
      });

      if (error) throw new Error(error.message);

      const jobId = data?.jobId;
      if (!jobId) throw new Error('No job ID returned');

      // Listen for completion via realtime job polling
      const onComplete = async (e: any) => {
        const detail = e?.detail || {};
        if (detail.type !== 'image') return;

        let imageUrl = detail.imageUrl;

        if (!imageUrl && detail.assetId) {
          try {
            const { data: asset } = await supabase
              .from('workspace_assets')
              .select('temp_storage_path')
              .eq('id', detail.assetId)
              .single();
            if (asset?.temp_storage_path) imageUrl = asset.temp_storage_path;
          } catch (err) {
            console.error('Failed to fetch asset URL:', err);
          }
        }

        window.removeEventListener('generation-completed', onComplete as any);
        setIsGenerating(false);

        if (!imageUrl) return;

        const shouldSetAsAvatar = window.confirm(`Portrait generated! Set as ${formData.name}'s avatar?`);
        if (shouldSetAsAvatar) {
          try {
            const response = await fetch(imageUrl);
            const imageBlob = await response.blob();
            const avatarUrl = await uploadGeneratedImageToAvatars(imageBlob, user?.id || '', formData.name, 'character');
            setFormData(prev => ({ ...prev, image_url: avatarUrl }));
            toast({ title: 'Avatar updated', description: 'Saved to avatars bucket!' });
          } catch (err) {
            setFormData(prev => ({ ...prev, image_url: imageUrl }));
            toast({ title: 'Avatar updated', description: 'Using temporary URL' });
          }
        }

        if (characterId) {
          createScene({
            character_id: characterId,
            image_url: imageUrl,
            scene_prompt: `${formData.name} portrait`,
            generation_metadata: { source: 'character_portrait', jobId, prompt }
          } as any)
            .then(() => toast({ title: 'Portrait generated', description: shouldSetAsAvatar ? 'Set as avatar and saved' : 'Saved to scenes' }))
            .catch(err => console.error('Failed to save portrait scene', err));
        } else {
          toast({ title: 'Portrait generated', description: shouldSetAsAvatar ? 'Set as avatar' : 'Portrait ready' });
        }
      };

      window.addEventListener('generation-completed', onComplete as any);

      // Poll for job completion as fallback
      const pollInterval = setInterval(async () => {
        const { data: job } = await supabase.from('jobs').select('status, error_message').eq('id', jobId).single();
        if (job?.status === 'completed' || job?.status === 'failed') {
          clearInterval(pollInterval);
          if (job.status === 'failed') {
            setIsGenerating(false);
            window.removeEventListener('generation-completed', onComplete as any);
            toast({ title: 'Generation failed', description: job.error_message || 'Portrait generation failed', variant: 'destructive' });
          }
        }
      }, 5000);

      // Timeout guard
      setTimeout(() => {
        clearInterval(pollInterval);
        window.removeEventListener('generation-completed', onComplete as any);
        setIsGenerating(false);
      }, 300000);

    } catch (err) {
      console.error('Portrait generation failed', err);
      setIsGenerating(false);
      toast({ title: 'Generation failed', description: 'Could not generate portrait', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    
    setIsUploading(true);
    try {
      const avatarUrl = await uploadToAvatarsBucket(file, user.id, 'character');
      setFormData(prev => ({ ...prev, image_url: avatarUrl }));
      toast({ 
        title: 'Avatar uploaded', 
        description: 'Image uploaded successfully to avatars bucket!' 
      });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast({ 
        title: 'Upload failed', 
        description: 'Failed to upload image. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle library image selection
  const handleSelectFromLibrary = (imageUrl: string, source: 'library' | 'workspace') => {
    setFormData(prev => ({ ...prev, image_url: imageUrl, reference_image_url: imageUrl }));
    setShowImagePicker(false);
    toast({ 
      title: 'Image selected', 
      description: 'Library image set as portrait' 
    });
  };

  useEffect(() => {
    if (isOpen) {
      if (mode === 'create') {
        // Initialize with defaults for new character
        setFormData({
          name: '',
          description: '',
          persona: '',
          traits: '',
          voice_tone: '',
          mood: '',
          appearance_tags: [],
          image_url: '',
          reference_image_url: '',
          content_rating: getDefaultContentRating(),
          gender: '',
          role: defaultRole,
          is_public: false
        });
      } else if (character) {
        // Load existing character data
        setFormData({
          name: character.name || '',
          description: character.description || '',
          persona: character.persona || '',
          traits: character.traits || '',
          voice_tone: character.voice_tone || '',
          mood: character.mood || '',
          appearance_tags: character.appearance_tags || [],
          image_url: character.image_url || '',
          reference_image_url: character.reference_image_url || '',
          content_rating: character.content_rating || 'nsfw',
          gender: character.gender || '',
          role: character.role || '',
          is_public: character.is_public ?? false
        });
      }
    }
  }, [character, isOpen, mode, defaultRole]);

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your character.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a description for your character.",
        variant: "destructive",
      });
      return;
    }

    // Handle CREATE mode
    if (mode === 'create') {
      try {
        const newCharacter = await createUserCharacter({
          name: formData.name,
          description: formData.description,
          persona: formData.persona || undefined,
          traits: formData.traits || undefined,
          voice_tone: formData.voice_tone || undefined,
          mood: formData.mood || undefined,
          appearance_tags: formData.appearance_tags.length > 0 ? formData.appearance_tags : undefined,
          image_url: formData.image_url || undefined,
          reference_image_url: formData.reference_image_url || undefined,
          content_rating: formData.content_rating,
          gender: formData.gender || undefined,
          role: formData.role || defaultRole,
        });

        toast({
          title: defaultRole === 'user' ? "Persona Created" : "Character Created",
          description: `${formData.name} has been created successfully.`,
        });

        onCharacterUpdated?.(newCharacter);
        onClose();
      } catch (error) {
        console.error('Failed to create character:', error);
        toast({
          title: "Creation Failed",
          description: "Failed to create character. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    // Handle EDIT mode
    if (!character?.id) return;

    if (!canEdit) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit this character.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use direct Supabase update for admin editing of any character
      if (isAdmin && !isOwner) {
        const { data, error } = await supabase
          .from('characters')
          .update({
            name: formData.name,
            description: formData.description,
            persona: formData.persona || null,
            traits: formData.traits || null,
            voice_tone: formData.voice_tone || null,
            mood: formData.mood || null,
            appearance_tags: formData.appearance_tags.length > 0 ? formData.appearance_tags : null,
            image_url: formData.image_url || null,
            reference_image_url: formData.reference_image_url || null,
            content_rating: formData.content_rating,
            gender: formData.gender || null,
            role: formData.role || null,
            is_public: formData.is_public,
            updated_at: new Date().toISOString()
          })
          .eq('id', character.id)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Character Updated",
          description: `${formData.name} has been successfully updated.`,
        });

        onCharacterUpdated?.(data);
        onClose();
      } else {
        // Use hook for owner editing
        await updateUserCharacter(character.id, formData);

        toast({
          title: "Character Updated",
          description: `${formData.name} has been successfully updated.`,
        });

        onCharacterUpdated?.(formData);
        onClose();
      }
    } catch (error) {
      console.error('Failed to update character:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update character. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!character?.id) return;

    try {
      await deleteUserCharacter(character.id);

      toast({
        title: "Character Deleted",
        description: `${character.name} has been permanently deleted.`,
      });

      onCharacterUpdated?.(null);
      onClose();
    } catch (error) {
      console.error('Failed to delete character:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete character. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  // Only show permission denied in edit mode with existing character
  if (mode === 'edit' && !canEdit && character) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>Permission Denied</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            You don't have permission to edit this character.
          </p>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Get appropriate labels
  const isPersona = formData.role === 'user' || defaultRole === 'user';
  const entityLabel = isPersona ? 'Persona' : 'Character';
  const titleLabel = mode === 'create'
    ? `Create ${entityLabel}`
    : `Edit ${character?.name || entityLabel}`;

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose}>
      <ResponsiveModalContent className="bg-background border-border max-w-2xl">
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
          <ResponsiveModalTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            {titleLabel}
            {mode === 'edit' && isAdmin && !isOwner && (
              <Badge variant="outline" className="ml-2">Admin Edit</Badge>
            )}
          </ResponsiveModalTitle>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Character name"
              />
            </div>
            <div>
              <Label htmlFor="mood">Mood</Label>
              <Select value={formData.mood} onValueChange={(value) => setFormData(prev => ({ ...prev, mood: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mood" />
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
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your character's background and personality..."
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="persona">Personality</Label>
            <Textarea
              id="persona"
              value={formData.persona}
              onChange={(e) => setFormData(prev => ({ ...prev, persona: e.target.value }))}
              placeholder="How does your character think and behave?"
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="traits">Key Traits</Label>
              <Input
                id="traits"
                value={formData.traits}
                onChange={(e) => setFormData(prev => ({ ...prev, traits: e.target.value }))}
                placeholder="e.g., confident, witty, caring"
              />
            </div>
            <div>
              <Label htmlFor="voice_tone">Voice Tone</Label>
              <Select value={formData.voice_tone} onValueChange={(value) => setFormData(prev => ({ ...prev, voice_tone: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voice tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="teasing">Teasing</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="soft-spoken">Soft-spoken</SelectItem>
                  <SelectItem value="confident">Confident</SelectItem>
                  <SelectItem value="playful">Playful</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="content_rating">Content Rating</Label>
              <Select value={formData.content_rating} onValueChange={(value: 'sfw' | 'nsfw') => setFormData(prev => ({ ...prev, content_rating: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sfw">SFW</SelectItem>
                  <SelectItem value="nsfw">NSFW</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                  <SelectItem value="unspecified">Unspecified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Appearance Tags</Label>
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

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
              />
              <Label htmlFor="is_public">Make character public</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleGeneratePortrait}
              disabled={isGenerating || !formData.name.trim()}
              className="w-full"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Portrait'}
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
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
                  disabled={isUploading}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowImagePicker(true)}
              >
                <Library className="w-4 h-4 mr-2" />
                Library
              </Button>
            </div>
          </div>

        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-border">
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={mode === 'edit' && !canEdit}>
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? `Create ${entityLabel}` : 'Save Changes'}
            </Button>
          </div>

          {/* Delete button - only in edit mode for owned characters */}
          {mode === 'edit' && character?.id && canEdit && (
            <div className="mt-4 pt-4 border-t border-border">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {entityLabel}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {character.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the {entityLabel.toLowerCase()} and all associated data including portraits and conversation history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </ResponsiveModalContent>

      {/* Image Picker Dialog */}
      <ImagePickerDialog
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelect={handleSelectFromLibrary}
        title="Select Character Portrait"
      />
    </ResponsiveModal>
  );
};
