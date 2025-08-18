import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { User, Plus, Shield, ShieldOff, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGeneration } from '@/hooks/useGeneration';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { uploadGeneratedImageToAvatars } from '@/utils/avatarUtils';
import { useAuth } from '@/contexts/AuthContext';

interface UserCharacter {
  id: string;
  name: string;
  description: string;
  personality: string;
  background: string;
  appearance_tags: string[];
  image_url?: string;
}

interface UserCharacterSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete: (userCharacterId: string, contentMode: 'sfw' | 'nsfw') => void;
  aiCharacterName?: string;
}

export const UserCharacterSetup: React.FC<UserCharacterSetupProps> = ({
  isOpen,
  onClose,
  onSetupComplete,
  aiCharacterName = 'Character'
}) => {
  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [contentMode, setContentMode] = useState<'sfw' | 'nsfw'>('sfw');
  const [isLoading, setIsLoading] = useState(false);
  const { generateContent, isGenerating } = useGeneration();
  const { createScene } = useCharacterScenes(selectedCharacterId);
  const { user } = useAuth();
  const { toast } = useToast();

  // New character form state
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    description: '',
    personality: '',
    background: '',
    appearance: '',
    image_url: ''
  });

  const handleGeneratePortrait = async () => {
    if (!newCharacter.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a character name first",
        variant: "destructive"
      });
      return;
    }

    try {
      const tags = newCharacter.appearance ? newCharacter.appearance : '';
      const base = `${newCharacter.name}, portrait, cinematic headshot, sharp focus, soft lighting`;
      const desc = newCharacter.description ? `, ${newCharacter.description}` : '';
      const persona = newCharacter.personality ? `, ${newCharacter.personality}` : '';
      const extra = tags ? `, ${tags}` : '';
      const prompt = `${base}${extra}${persona}${desc}`.slice(0, 400);

      const onComplete = async (e: any) => {
        const detail = e?.detail || {};
        if (detail.type !== 'image' || !detail.imageUrl) return;
        
        // Ask user if they want to set as character image
        const shouldSetAsAvatar = window.confirm(`Portrait generated successfully! Would you like to set this as ${newCharacter.name}'s avatar image?`);
        
        if (shouldSetAsAvatar) {
          try {
            // Fetch the image and upload to avatars bucket
            const response = await fetch(detail.imageUrl);
            const imageBlob = await response.blob();
            
            const avatarUrl = await uploadGeneratedImageToAvatars(
              imageBlob, 
              user?.id || '', 
              newCharacter.name,
              'user'
            );
            
            setNewCharacter(prev => ({ ...prev, image_url: avatarUrl }));
            toast({ title: 'Portrait generated', description: 'Avatar updated and saved to avatars bucket!' });
          } catch (error) {
            console.error('Failed to upload to avatars bucket:', error);
            // Fallback to the temporary URL
            setNewCharacter(prev => ({ ...prev, image_url: detail.imageUrl }));
            toast({ title: 'Portrait generated', description: 'Avatar updated (temporary URL)' });
          }
        } else {
          toast({ title: 'Portrait generated', description: 'Portrait generated successfully' });
        }
        
        window.removeEventListener('generation-completed', onComplete as any);
      };

      window.addEventListener('generation-completed', onComplete as any);

      await generateContent({
        format: 'sdxl_image_high',
        prompt,
        metadata: { model_variant: 'lustify_sdxl' }
      });
    } catch (err) {
      console.error('Portrait generation failed', err);
      toast({ title: 'Generation failed', description: 'Could not generate portrait', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUserCharacters();
    }
  }, [isOpen]);

  const loadUserCharacters = async () => {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('role', 'user')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserCharacters(data?.map(char => ({
        id: char.id,
        name: char.name,
        description: char.description,
        personality: char.persona || '',
        background: char.traits || '',
        appearance_tags: char.appearance_tags || [],
        image_url: char.image_url
      })) || []);
    } catch (error) {
      console.error('Error loading user characters:', error);
      toast({
        title: "Error",
        description: "Failed to load your characters",
        variant: "destructive"
      });
    }
  };

  const createUserCharacter = async () => {
    if (!newCharacter.name.trim()) {
      toast({
        title: "Error",
        description: "Character name is required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('characters')
        .insert({
          name: newCharacter.name,
          description: newCharacter.description,
          persona: newCharacter.personality,
          traits: newCharacter.background,
          appearance_tags: newCharacter.appearance.split(',').map(t => t.trim()).filter(Boolean),
          image_url: newCharacter.image_url || null,
          role: 'user',
          user_id: user.data.user.id,
          is_public: false,
          content_rating: 'sfw'
        })
        .select()
        .single();

      if (error) throw error;

      await loadUserCharacters();
      setSelectedCharacterId(data.id);
      setShowCreateNew(false);
          setNewCharacter({ name: '', description: '', personality: '', background: '', appearance: '', image_url: '' });

      toast({
        title: "Success",
        description: "User character created successfully"
      });
    } catch (error) {
      console.error('Error creating user character:', error);
      toast({
        title: "Error",
        description: "Failed to create character",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = () => {
    if (!selectedCharacterId) {
      toast({
        title: "Error",
        description: "Please select or create a user character",
        variant: "destructive"
      });
      return;
    }

    onSetupComplete(selectedCharacterId, contentMode);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Set Up Your Roleplay Session
          </DialogTitle>
          <p className="text-gray-400">
            Choose your character and content preferences for chatting with {aiCharacterName}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Content Mode Selection */}
          <Card className="border-gray-700 bg-gray-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {contentMode === 'nsfw' ? (
                  <ShieldOff className="w-4 h-4 text-red-400" />
                ) : (
                  <Shield className="w-4 h-4 text-green-400" />
                )}
                Content Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    {contentMode === 'nsfw' ? 'Adult Content Enabled' : 'Family-Friendly Mode'}
                  </Label>
                  <p className="text-xs text-gray-400">
                    {contentMode === 'nsfw' 
                      ? 'Unrestricted conversations including mature themes' 
                      : 'Safe conversations appropriate for all ages'}
                  </p>
                </div>
                <Switch
                  checked={contentMode === 'nsfw'}
                  onCheckedChange={(checked) => setContentMode(checked ? 'nsfw' : 'sfw')}
                />
              </div>
              {contentMode === 'nsfw' && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-800 rounded text-xs text-red-300">
                  ⚠️ Adult content mode enables mature themes and unrestricted roleplay
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Character Selection */}
          <Card className="border-gray-700 bg-gray-800/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Your Character
                </CardTitle>
                <Button
                  onClick={() => setShowCreateNew(!showCreateNew)}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showCreateNew ? (
                <div className="space-y-3 p-4 border border-gray-600 rounded">
                  <Input
                    placeholder="Character name (e.g., Alex, Luna)"
                    value={newCharacter.name}
                    onChange={(e) => setNewCharacter({...newCharacter, name: e.target.value})}
                    className="bg-gray-800 border-gray-600"
                  />
                  <Textarea
                    placeholder="Brief description of your character"
                    value={newCharacter.description}
                    onChange={(e) => setNewCharacter({...newCharacter, description: e.target.value})}
                    className="bg-gray-800 border-gray-600 h-20"
                  />
                  <Textarea
                    placeholder="Personality traits (e.g., curious, confident, shy)"
                    value={newCharacter.personality}
                    onChange={(e) => setNewCharacter({...newCharacter, personality: e.target.value})}
                    className="bg-gray-800 border-gray-600 h-20"
                  />
                  <Textarea
                    placeholder="Background/backstory"
                    value={newCharacter.background}
                    onChange={(e) => setNewCharacter({...newCharacter, background: e.target.value})}
                    className="bg-gray-800 border-gray-600 h-20"
                  />
                  <Input
                    placeholder="Appearance (comma-separated: tall, brown hair, green eyes)"
                    value={newCharacter.appearance}
                    onChange={(e) => setNewCharacter({...newCharacter, appearance: e.target.value})}
                    className="bg-gray-800 border-gray-600"
                  />
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      onClick={handleGeneratePortrait}
                      disabled={isGenerating || !newCharacter.name.trim()}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      {isGenerating ? 'Generating...' : 'Generate Portrait'}
                    </Button>
                  </div>
                  {newCharacter.image_url && (
                    <div className="text-center">
                      <img 
                        src={newCharacter.image_url} 
                        alt="Generated portrait" 
                        className="w-20 h-20 rounded-full mx-auto object-cover"
                      />
                      <p className="text-xs text-green-400 mt-1">Portrait ready!</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      onClick={createUserCharacter} 
                      disabled={isLoading || !newCharacter.name.trim()}
                      size="sm"
                      className="flex-1"
                    >
                      {isLoading ? 'Creating...' : 'Create Character'}
                    </Button>
                    <Button 
                      onClick={() => setShowCreateNew(false)} 
                      variant="outline" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {userCharacters.length > 0 ? (
                    <div className="grid gap-3">
                      {userCharacters.map((character) => (
                        <div
                          key={character.id}
                          onClick={() => setSelectedCharacterId(character.id)}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedCharacterId === character.id 
                              ? 'border-purple-500 bg-purple-900/20' 
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{character.name}</h4>
                              <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                                {character.description}
                              </p>
                              {character.appearance_tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {character.appearance_tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            {selectedCharacterId === character.id && (
                              <div className="ml-2 w-4 h-4 bg-purple-500 rounded-full" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <User className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No user characters yet</p>
                      <p className="text-xs">Create your first character to get started</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleStartChat} 
              disabled={!selectedCharacterId}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Start Roleplay Chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};