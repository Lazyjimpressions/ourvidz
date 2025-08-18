import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit3, Save, X, Plus, Wand2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { useGeneration } from '@/hooks/useGeneration';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { uploadGeneratedImageToAvatars, uploadToAvatarsBucket } from '@/utils/avatarUtils';
import { buildCharacterPortraitPrompt } from '@/utils/characterPromptBuilder';
import { useAuth } from '@/contexts/AuthContext';

interface CharacterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  character?: any;
  onCharacterUpdated?: (character: any) => void;
}

export const CharacterEditModal = ({ 
  isOpen, 
  onClose, 
  character, 
  onCharacterUpdated 
}: CharacterEditModalProps) => {
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
    user_id: ''
  });
  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { updateUserCharacter } = useUserCharacters();
  const { generateContent, isGenerating } = useGeneration();
  const { createScene } = useCharacterScenes(character?.id);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleGeneratePortrait = async () => {
    if (!character?.id) return;
    try {
      const prompt = buildCharacterPortraitPrompt({
        name: formData.name,
        description: formData.description,
        persona: formData.persona,
        traits: formData.traits,
        appearance_tags: formData.appearance_tags
      });

      const onComplete = async (e: any) => {
        const detail = e?.detail || {};
        if (detail.type !== 'image' || !detail.imageUrl) return;
        
        // Ask user if they want to set as character image
        const shouldSetAsAvatar = window.confirm(`Portrait generated successfully! Would you like to set this as ${formData.name}'s avatar image?`);
        
        if (shouldSetAsAvatar) {
          try {
            // Fetch the image and upload to avatars bucket
            const response = await fetch(detail.imageUrl);
            const imageBlob = await response.blob();
            
            const avatarUrl = await uploadGeneratedImageToAvatars(
              imageBlob, 
              user?.id || '', 
              formData.name,
              'character'
            );
            
            setFormData(prev => ({ ...prev, image_url: avatarUrl }));
            toast({ title: 'Avatar updated', description: 'Saved to avatars bucket!' });
          } catch (error) {
            console.error('Failed to upload to avatars bucket:', error);
            // Fallback to the temporary URL
            setFormData(prev => ({ ...prev, image_url: detail.imageUrl }));
            toast({ title: 'Avatar updated', description: 'Using temporary URL' });
          }
        }

        // Save to character scenes
        const payload: any = {
          character_id: character.id,
          image_url: detail.imageUrl,
          scene_prompt: `${formData.name} portrait`,
          generation_metadata: { source: 'character_portrait', jobId: detail.jobId, prompt }
        };
        
        createScene(payload)
          .then(() => {
            toast({ 
              title: 'Portrait generated', 
              description: shouldSetAsAvatar ? 'Set as avatar and saved to scenes' : 'Saved to character scenes'
            });
          })
          .catch((err) => console.error('Failed to save portrait scene', err))
          .finally(() => {
            window.removeEventListener('generation-completed', onComplete as any);
          });
      };

      window.addEventListener('generation-completed', onComplete as any);

      await generateContent({
        format: 'sdxl_image_high',
        prompt,
        metadata: { 
          source: 'character_portrait',
          contentType: 'sfw',
          character_name: formData.name
        }
      });
    } catch (err) {
      console.error('Portrait generation failed', err);
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

  useEffect(() => {
    if (character && isOpen) {
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
        user_id: character.user_id || ''
      });
    }
  }, [character, isOpen]);

  const handleSave = async () => {
    if (!character?.id) return;

    try {
      await updateUserCharacter(character.id, formData);
      
      toast({
        title: "Character Updated",
        description: `${formData.name} has been successfully updated.`,
      });

      onCharacterUpdated?.(formData);
      onClose();
    } catch (error) {
      console.error('Failed to update character:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update character. Please try again.",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Edit {character?.name || 'Character'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                  <SelectItem value="sultry">Sultry</SelectItem>
                  <SelectItem value="cheerful">Cheerful</SelectItem>
                  <SelectItem value="mysterious">Mysterious</SelectItem>
                  <SelectItem value="confident">Confident</SelectItem>
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

          <div className="flex items-center gap-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleGeneratePortrait}
              disabled={isGenerating || !formData.name.trim()}
              className="flex-1"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Portrait'}
            </Button>
            
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
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload Avatar'}
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};