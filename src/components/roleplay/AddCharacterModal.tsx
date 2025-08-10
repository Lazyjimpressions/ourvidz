import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import { Plus, Save, Users, Sparkles, X } from 'lucide-react';

interface AddCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterAdded?: (character: any) => void;
}

export const AddCharacterModal = ({ 
  isOpen, 
  onClose, 
  onCharacterAdded 
}: AddCharacterModalProps) => {
  const [activeTab, setActiveTab] = useState('create');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    persona: '',
    traits: '',
    voice_tone: 'warm',
    mood: 'friendly',
    appearance_tags: [] as string[],
    image_url: '',
    reference_image_url: '',
    is_public: false
  });
  const [newTag, setNewTag] = useState('');
  const { createUserCharacter } = useUserCharacters();
  const { characters: publicCharacters, isLoading: loadingPublic } = usePublicCharacters();
  const { toast } = useToast();

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
      const newCharacter = await createUserCharacter(formData);
      
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
      voice_tone: 'warm',
      mood: 'friendly',
      appearance_tags: [],
      image_url: '',
      reference_image_url: '',
      is_public: false
    });
    setNewTag('');
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
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your character's background, appearance, and personality..."
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="persona">Personality</Label>
              <Textarea
                id="persona"
                value={formData.persona}
                onChange={(e) => setFormData(prev => ({ ...prev, persona: e.target.value }))}
                placeholder="How does your character think, speak, and behave?"
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
                    <SelectValue />
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