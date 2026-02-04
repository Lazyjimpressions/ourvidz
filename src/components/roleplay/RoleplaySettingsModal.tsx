import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { useImageModels } from '@/hooks/useImageModels';
import { useI2IModels } from '@/hooks/useI2IModels';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { useSceneContinuity } from '@/hooks/useSceneContinuity';
import { Checkbox } from '@/components/ui/checkbox';
import { ConsistencySettings } from '@/services/ImageConsistencyService';
import { useToast } from '@/hooks/use-toast';
import { Zap, DollarSign, Shield, CheckCircle2, Info, WifiOff, Cloud, User, Eye, Users, Camera, Lock, Image as ImageIcon, Sparkles, HelpCircle, Link2, Upload, X, Loader2, Plus, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SceneStyle, ImageGenerationMode } from '@/types/roleplay';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';
import { uploadFile } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RoleplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoryTier: 'conversation' | 'character' | 'profile';
  onMemoryTierChange: (tier: 'conversation' | 'character' | 'profile') => void;
  modelProvider: string;
  onModelProviderChange: (provider: string) => void;
  selectedImageModel: string;
  onSelectedImageModelChange: (model: string) => void;
  consistencySettings: ConsistencySettings;
  onConsistencySettingsChange: (settings: ConsistencySettings) => void;
  // I2I model for scene iteration
  selectedI2IModel?: string;
  onSelectedI2IModelChange?: (model: string) => void;
  // User character and scene style
  selectedUserCharacterId?: string | null;
  onUserCharacterChange?: (characterId: string | null) => void;
  sceneStyle?: SceneStyle;
  onSceneStyleChange?: (style: SceneStyle) => void;
  // Image generation mode
  imageGenerationMode?: ImageGenerationMode;
  onImageGenerationModeChange?: (mode: ImageGenerationMode) => void;
  // Character data for validation
  characterId?: string;
  character?: {
    reference_image_url?: string | null;
    seed_locked?: number | null;
  } | null;
}

export const RoleplaySettingsModal: React.FC<RoleplaySettingsModalProps> = ({
  isOpen,
  onClose,
  memoryTier,
  onMemoryTierChange,
  modelProvider,
  onModelProviderChange,
  selectedImageModel,
  onSelectedImageModelChange,
  consistencySettings,
  onConsistencySettingsChange,
  selectedI2IModel,
  onSelectedI2IModelChange,
  selectedUserCharacterId,
  onUserCharacterChange,
  sceneStyle = 'character_only',
  onSceneStyleChange,
  imageGenerationMode = 'auto',
  onImageGenerationModeChange,
  characterId,
  character
}) => {
  const { allModelOptions, defaultModel: defaultChatModel, isLoading: modelsLoading, chatWorkerHealthy } = useRoleplayModels();
  const { modelOptions: imageModelOptions, defaultModel: defaultImageModel, isLoading: imageModelsLoading, sdxlWorkerHealthy } = useImageModels();
  const { modelOptions: i2iModelOptions, isLoading: i2iModelsLoading, defaultModel: defaultI2IModel } = useI2IModels();
  const { characters: userCharacters, isLoading: userCharactersLoading, defaultCharacterId, setDefaultCharacter, updateUserCharacter, createUserCharacter } = useUserCharacters();
  const { isEnabled: sceneContinuityEnabled, setEnabled: setSceneContinuityEnabled, defaultStrength, setDefaultStrength } = useSceneContinuity();
  const { toast } = useToast();
  const { user } = useAuth();
  const { getSignedUrl } = useSignedImageUrls();

  // Local state for form data
  const [localMemoryTier, setLocalMemoryTier] = useState(memoryTier);
  const [localModelProvider, setLocalModelProvider] = useState(modelProvider);
  const [localSelectedImageModel, setLocalSelectedImageModel] = useState(selectedImageModel);
  const [localSelectedI2IModel, setLocalSelectedI2IModel] = useState(selectedI2IModel || 'auto');
  const [localConsistencySettings, setLocalConsistencySettings] = useState(consistencySettings);
  const [localUserCharacterId, setLocalUserCharacterId] = useState<string | null>(selectedUserCharacterId || null);
  const [localSceneStyle, setLocalSceneStyle] = useState<SceneStyle>(sceneStyle);
  const [localImageGenerationMode, setLocalImageGenerationMode] = useState<ImageGenerationMode>(imageGenerationMode);
  const [setAsDefault, setSetAsDefault] = useState(false);
  
  // Avatar editing state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [signedAvatarUrl, setSignedAvatarUrl] = useState<string | null>(null);
  
  // Quick edit state
  const [quickEditData, setQuickEditData] = useState({
    name: '',
    description: '',
    gender: '',
    appearance_tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);
  
  // Create persona state
  const [showCreatePersonaModal, setShowCreatePersonaModal] = useState(false);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [personaFormData, setPersonaFormData] = useState({
    name: '',
    description: '',
    gender: ''
  });
  
  // Get selected user character
  const selectedUserCharacter = localUserCharacterId 
    ? userCharacters.find(c => c.id === localUserCharacterId) || null
    : null;
  
  // Load character data for quick edit when character is selected
  useEffect(() => {
    if (selectedUserCharacter) {
      setQuickEditData({
        name: selectedUserCharacter.name || '',
        description: selectedUserCharacter.description || '',
        gender: selectedUserCharacter.gender || '',
        appearance_tags: selectedUserCharacter.appearance_tags || []
      });
    }
  }, [selectedUserCharacter]);
  
  // Helper to validate if a chat model is available
  const isValidChatModel = (modelValue: string): boolean => {
    const model = allModelOptions.find(m => m.value === modelValue);
    return model ? model.isAvailable : false;
  };

  // Helper to validate if an image model is available
  const isValidImageModel = (modelValue: string): boolean => {
    const model = imageModelOptions.find(m => m.value === modelValue);
    return model ? model.isAvailable : false;
  };

  // Load signed avatar URL when character is selected
  useEffect(() => {
    const loadAvatarUrl = async () => {
      if (!selectedUserCharacter?.image_url) {
        setSignedAvatarUrl(null);
        return;
      }

      if (selectedUserCharacter.image_url.startsWith('http')) {
        setSignedAvatarUrl(selectedUserCharacter.image_url);
      } else {
        try {
          const signed = await getSignedUrl(selectedUserCharacter.image_url, 'user-library');
          setSignedAvatarUrl(signed);
        } catch (error) {
          console.error('Error signing avatar URL:', error);
          setSignedAvatarUrl(null);
        }
      }
    };

    loadAvatarUrl();
  }, [selectedUserCharacter?.image_url, getSignedUrl]);

  // Load saved settings from localStorage with validation (only when modal opens)
  const hasLoadedSettingsRef = useRef(false);
  useEffect(() => {
    if (isOpen && !modelsLoading && !imageModelsLoading && !hasLoadedSettingsRef.current) {
      const savedSettings = localStorage.getItem('roleplay-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setLocalMemoryTier(parsed.memoryTier || memoryTier);

          // Validate saved chat model - fall back to default if unavailable
          const savedChatModel = parsed.modelProvider;
          if (savedChatModel && isValidChatModel(savedChatModel)) {
            setLocalModelProvider(savedChatModel);
          } else if (defaultChatModel) {
            setLocalModelProvider(defaultChatModel.value);
            console.log('⚠️ Saved chat model unavailable, using default:', defaultChatModel.value);
          } else {
            setLocalModelProvider(modelProvider);
          }

          // Validate saved image model - fall back to default if unavailable
          const savedImageModel = parsed.selectedImageModel;
          if (savedImageModel && savedImageModel.trim() !== '' && isValidImageModel(savedImageModel)) {
            setLocalSelectedImageModel(savedImageModel);
          } else if (defaultImageModel) {
            setLocalSelectedImageModel(defaultImageModel.value);
            console.log('⚠️ Saved image model unavailable, using default:', defaultImageModel.value);
          } else if (selectedImageModel && selectedImageModel.trim() !== '') {
            setLocalSelectedImageModel(selectedImageModel);
          } else {
            // No valid model - leave empty (will show placeholder)
            setLocalSelectedImageModel('');
          }

          setLocalConsistencySettings(parsed.consistencySettings || consistencySettings);
          hasLoadedSettingsRef.current = true;
        } catch (error) {
          console.warn('Failed to parse saved roleplay settings:', error);
        }
      } else {
        // No saved settings, initialize from props
        setLocalMemoryTier(memoryTier);
        setLocalModelProvider(modelProvider);
        // Use selectedImageModel if valid, otherwise default or empty
        if (selectedImageModel && selectedImageModel.trim() !== '') {
          setLocalSelectedImageModel(selectedImageModel);
        } else if (defaultImageModel) {
          setLocalSelectedImageModel(defaultImageModel.value);
        } else {
          setLocalSelectedImageModel('');
        }
        setLocalConsistencySettings(consistencySettings);
        hasLoadedSettingsRef.current = true;
      }
    } else if (!isOpen) {
      hasLoadedSettingsRef.current = false;
    }
  }, [isOpen, modelsLoading, imageModelsLoading, memoryTier, modelProvider, selectedImageModel, consistencySettings, allModelOptions, imageModelOptions, defaultChatModel, defaultImageModel]);

  // Avatar upload handler
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id || !localUserCharacterId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive'
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Create file path in user-library
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${localUserCharacterId}/${Date.now()}.${fileExt}`;

      // Upload to user-library bucket
      const result = await uploadFile('user-library', filePath, file);
      
      if (result.error || !result.data) {
        throw result.error || new Error('Upload failed');
      }

      // Update character with new image path
      // ✅ Multi-reference: Also set reference_image_url for both_characters scene generation
      await updateUserCharacter(localUserCharacterId, {
        image_url: result.data.path,
        reference_image_url: result.data.path  // Sync reference image for scene generation
      });

      // Refresh signed URL
      const signedUrl = await getSignedUrl(result.data.path, 'user-library');
      setSignedAvatarUrl(signedUrl);
      setAvatarPreview(null);

      toast({
        title: 'Avatar updated',
        description: 'Your character avatar has been updated successfully'
      });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload avatar. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Avatar remove handler
  const handleAvatarRemove = async () => {
    if (!localUserCharacterId || !selectedUserCharacter?.image_url) return;

    setIsUploadingAvatar(true);
    try {
      // ✅ Multi-reference: Also clear reference_image_url
      await updateUserCharacter(localUserCharacterId, {
        image_url: null,
        reference_image_url: null  // Clear reference image when avatar is removed
      });

      setSignedAvatarUrl(null);
      setAvatarPreview(null);

      toast({
        title: 'Avatar removed',
        description: 'Your character avatar has been removed'
      });
    } catch (error) {
      console.error('Failed to remove avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove avatar. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Quick edit handlers
  const handleQuickEditSave = async () => {
    if (!localUserCharacterId) return;

    setIsSavingQuickEdit(true);
    try {
      await updateUserCharacter(localUserCharacterId, {
        name: quickEditData.name,
        description: quickEditData.description,
        gender: quickEditData.gender || null,
        appearance_tags: quickEditData.appearance_tags.length > 0 ? quickEditData.appearance_tags : null
      });

      toast({
        title: 'Character updated',
        description: 'Your character has been updated successfully'
      });
    } catch (error) {
      console.error('Failed to save quick edit:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to update character. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSavingQuickEdit(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !quickEditData.appearance_tags.includes(newTag.trim())) {
      setQuickEditData(prev => ({
        ...prev,
        appearance_tags: [...prev.appearance_tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setQuickEditData(prev => ({
      ...prev,
      appearance_tags: prev.appearance_tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Create persona handler
  const handleCreatePersona = async () => {
    if (!personaFormData.name.trim() || !personaFormData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and description are required',
        variant: 'destructive'
      });
      return;
    }

    setIsCreatingPersona(true);
    try {
      const newCharacter = await createUserCharacter({
        name: personaFormData.name.trim(),
        description: personaFormData.description.trim(),
        gender: personaFormData.gender || undefined,
        role: 'user',
        content_rating: 'nsfw',
        is_public: false
      });

      // Set as selected and default
      setLocalUserCharacterId(newCharacter.id);
      await setDefaultCharacter(newCharacter.id);
      
      // Reset form
      setPersonaFormData({ name: '', description: '', gender: '' });
      setShowCreatePersonaModal(false);

      toast({
        title: 'Persona created',
        description: 'Your persona has been created and set as default'
      });
    } catch (error) {
      console.error('Failed to create persona:', error);
      toast({
        title: 'Creation failed',
        description: error instanceof Error ? error.message : 'Failed to create persona. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingPersona(false);
    }
  };
  
  // Save settings to localStorage
  const saveSettings = async () => {
    const settings = {
      memoryTier: localMemoryTier,
      modelProvider: localModelProvider,
      selectedImageModel: localSelectedImageModel,
      selectedI2IModel: localSelectedI2IModel,
      consistencySettings: localConsistencySettings,
      userCharacterId: localUserCharacterId,
      sceneStyle: localSceneStyle,
      imageGenerationMode: localImageGenerationMode
    };

    localStorage.setItem('roleplay-settings', JSON.stringify(settings));

    // Save default character to profile if checkbox is checked
    if (setAsDefault && localUserCharacterId && localUserCharacterId !== defaultCharacterId) {
      try {
        await setDefaultCharacter(localUserCharacterId);
        console.log('✅ Default character saved to profile');
      } catch (error) {
        console.error('Failed to save default character:', error);
        toast({
          title: 'Warning',
          description: 'Settings saved, but failed to set default character.',
          variant: 'destructive'
        });
      }
    }

    // Update parent state
    onMemoryTierChange(localMemoryTier);
    onModelProviderChange(localModelProvider);
    onSelectedImageModelChange(localSelectedImageModel);
    onSelectedI2IModelChange?.(localSelectedI2IModel);
    onConsistencySettingsChange(localConsistencySettings);
    onUserCharacterChange?.(localUserCharacterId);
    onSceneStyleChange?.(localSceneStyle);
    onImageGenerationModeChange?.(localImageGenerationMode);

    toast({
      title: 'Settings saved',
      description: 'Your roleplay settings have been saved successfully.'
    });

    // Reset setAsDefault checkbox
    setSetAsDefault(false);

    onClose();
  };
  
  // Initialize user character and scene style from props when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalUserCharacterId(selectedUserCharacterId || null);
      setLocalSceneStyle(sceneStyle);
    }
  }, [isOpen, selectedUserCharacterId, sceneStyle]);
  const selectedModel = allModelOptions?.find(m => m.value === localModelProvider) || allModelOptions?.[0] || null;
  const getModelCapabilities = (model: typeof selectedModel) => {
    if (!model) {
      return {
        speed: 'medium' as const,
        cost: 'free' as const,
        nsfw: true,
        quality: 'high' as const
      };
    }
    return model.capabilities || {
      speed: model.isLocal ? 'fast' : 'medium',
      cost: model.isLocal ? 'free' : 'low',
      nsfw: true,
      quality: 'high'
    };
  };

  const capabilities = getModelCapabilities(selectedModel);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[90vw] sm:w-[500px] max-w-2xl flex flex-col p-0">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <SheetTitle>Roleplay Settings</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-4">
          <Tabs defaultValue="general" className="flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="general" className="space-y-6 mt-0">
              {/* Memory Tier */}
              <div className="space-y-2">
                <Label>Memory Tier</Label>
                <Select value={localMemoryTier} onValueChange={(value: 'conversation' | 'character' | 'profile') => setLocalMemoryTier(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversation">
                      <div className="flex flex-col">
                        <span>Conversation</span>
                        <span className="text-xs text-muted-foreground">Only this conversation</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="character">
                      <div className="flex flex-col">
                        <span>Character</span>
                        <span className="text-xs text-muted-foreground">All conversations with this character</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="profile">
                      <div className="flex flex-col">
                        <span>Profile</span>
                        <span className="text-xs text-muted-foreground">All your roleplay conversations</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Controls how much conversation history the AI remembers.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="identity" className="space-y-6 mt-0">
              {/* Your Character Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Your Character
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Choose how you appear in the roleplay. The AI will use your name and pronouns.
                </p>
                <Select
                  value={localUserCharacterId || 'none'}
                  onValueChange={(value) => setLocalUserCharacterId(value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your character..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>Anonymous (You)</span>
                      </div>
                    </SelectItem>
                    {userCharactersLoading ? (
                      <SelectItem value="" disabled>Loading characters...</SelectItem>
                    ) : userCharacters.length === 0 ? (
                      <SelectItem value="" disabled>No characters created yet</SelectItem>
                    ) : (
                      userCharacters.map((char) => (
                        <SelectItem key={char.id} value={char.id}>
                          <div className="flex items-center gap-2">
                            {char.image_url ? (
                              <img
                                src={char.image_url}
                                alt={char.name}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-blue-400" />
                            )}
                            <span>{char.name}</span>
                            {char.gender && (
                              <Badge variant="outline" className="text-xs ml-1">
                                {char.gender}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {userCharacters.length === 0 && !userCharactersLoading && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-blue-400">
                      Create a persona to personalize your roleplay experience.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreatePersonaModal(true)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create My Persona
                    </Button>
                  </div>
                )}

                {/* Set as Default Checkbox */}
                {localUserCharacterId && localUserCharacterId !== 'none' && (
                  <div className="flex items-center space-x-2 mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Checkbox
                      id="setAsDefault"
                      checked={setAsDefault || localUserCharacterId === defaultCharacterId}
                      onCheckedChange={(checked) => setSetAsDefault(!!checked)}
                      disabled={localUserCharacterId === defaultCharacterId}
                    />
                    <label
                      htmlFor="setAsDefault"
                      className="text-sm cursor-pointer flex-1"
                    >
                      {localUserCharacterId === defaultCharacterId ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          This is your default character
                        </span>
                      ) : (
                        <span>Set as default for new conversations</span>
                      )}
                    </label>
                  </div>
                )}

                {/* Avatar Editor */}
                {localUserCharacterId && localUserCharacterId !== 'none' && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-gray-700">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Character Avatar
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Upload or update your character's avatar image.
                    </p>
                    
                    <div className="flex items-center gap-4">
                      {/* Avatar Preview */}
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700 border-2 border-gray-600 flex items-center justify-center">
                          {signedAvatarUrl || avatarPreview ? (
                            <img
                              src={avatarPreview || signedAvatarUrl || ''}
                              alt={selectedUserCharacter?.name || 'Avatar'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Avatar Actions */}
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={isUploadingAvatar}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled={isUploadingAvatar}
                            asChild
                          >
                            <span className="flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              {signedAvatarUrl ? 'Change Avatar' : 'Upload Avatar'}
                            </span>
                          </Button>
                        </label>
                        
                        {signedAvatarUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full text-red-400 hover:text-red-300 hover:border-red-500"
                            onClick={handleAvatarRemove}
                            disabled={isUploadingAvatar}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove Avatar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Edit Section */}
                {localUserCharacterId && localUserCharacterId !== 'none' && selectedUserCharacter && (
                  <div className="space-y-3 mt-4 pt-4 border-t border-gray-700">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Quick Edit
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Quickly update your character's basic information.
                    </p>

                    <div className="space-y-3">
                      {/* Name */}
                      <div className="space-y-1">
                        <Label htmlFor="quick-edit-name" className="text-xs">Name</Label>
                        <Input
                          id="quick-edit-name"
                          value={quickEditData.name}
                          onChange={(e) => setQuickEditData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Character name"
                          className="h-8 text-sm"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <Label htmlFor="quick-edit-description" className="text-xs">Description</Label>
                        <Textarea
                          id="quick-edit-description"
                          value={quickEditData.description}
                          onChange={(e) => setQuickEditData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Character description"
                          className="min-h-[60px] text-sm resize-none"
                          rows={3}
                        />
                      </div>

                      {/* Gender */}
                      <div className="space-y-1">
                        <Label htmlFor="quick-edit-gender" className="text-xs">Gender</Label>
                        <Select
                          value={quickEditData.gender || 'unspecified'}
                          onValueChange={(value) => setQuickEditData(prev => ({ ...prev, gender: value === 'unspecified' ? '' : value }))}
                        >
                          <SelectTrigger id="quick-edit-gender" className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unspecified">Unspecified</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="non-binary">Non-binary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Appearance Tags */}
                      <div className="space-y-1">
                        <Label className="text-xs">Appearance Tags</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addTag();
                              }
                            }}
                            placeholder="Add tag"
                            className="h-8 text-sm flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addTag}
                            className="h-8"
                          >
                            Add
                          </Button>
                        </div>
                        {quickEditData.appearance_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {quickEditData.appearance_tags.map((tag, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs py-0 px-2 cursor-pointer"
                                onClick={() => removeTag(tag)}
                              >
                                {tag}
                                <X className="w-3 h-3 ml-1" />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Save Button */}
                      <Button
                        type="button"
                        onClick={handleQuickEditSave}
                        disabled={isSavingQuickEdit || !quickEditData.name.trim() || !quickEditData.description.trim()}
                        className="w-full mt-2"
                        size="sm"
                      >
                        {isSavingQuickEdit ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Scene Style Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Scene Style
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Choose how you appear in generated scene images.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setLocalSceneStyle('character_only')}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      localSceneStyle === 'character_only'
                        ? "bg-blue-600/20 border-blue-500"
                        : "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-white text-sm">Focus on Character</div>
                        <div className="text-xs text-gray-400">Show only the AI character in scenes</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setLocalSceneStyle('pov')}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      localSceneStyle === 'pov'
                        ? "bg-blue-600/20 border-blue-500"
                        : "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="font-medium text-white text-sm">First Person View</div>
                        <div className="text-xs text-gray-400">See the scene from your perspective</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setLocalSceneStyle('both_characters')}
                    disabled={!localUserCharacterId || !selectedUserCharacter?.reference_image_url}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      (!localUserCharacterId || !selectedUserCharacter?.reference_image_url)
                        ? "bg-gray-800/30 border-gray-700 cursor-not-allowed opacity-60"
                        : localSceneStyle === 'both_characters'
                          ? "bg-blue-600/20 border-blue-500"
                          : "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="font-medium text-white text-sm">Show Both of Us</div>
                        <div className="text-xs text-gray-400">
                          {!localUserCharacterId
                            ? "Select a character above to enable"
                            : !selectedUserCharacter?.reference_image_url
                              ? "Upload an avatar above to enable"
                              : "Show both you and the AI character"}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Image Generation Mode */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Image Generation
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Control when scene images are generated during chat.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setLocalImageGenerationMode('auto')}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      localImageGenerationMode === 'auto'
                        ? "bg-blue-600/20 border-blue-500"
                        : "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="font-medium text-white text-sm">Auto</div>
                        <div className="text-xs text-gray-400">
                          Generate images with each AI response
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setLocalImageGenerationMode('manual')}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      localImageGenerationMode === 'manual'
                        ? "bg-blue-600/20 border-blue-500"
                        : "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Camera className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="font-medium text-white text-sm">Manual</div>
                        <div className="text-xs text-gray-400">
                          Faster chat, tap camera icon to generate
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Selected Character Preview */}
              {localUserCharacterId && (
                <Card className="p-4 bg-gray-800/50 border-gray-700">
                  {(() => {
                    const selectedChar = userCharacters.find(c => c.id === localUserCharacterId);
                    if (!selectedChar) return null;
                    return (
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                          {selectedChar.image_url ? (
                            <img
                              src={selectedChar.image_url}
                              alt={selectedChar.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{selectedChar.name}</span>
                            {selectedChar.gender && (
                              <Badge variant="outline" className="text-xs">
                                {selectedChar.gender}
                              </Badge>
                            )}
                          </div>
                          {selectedChar.appearance_tags && selectedChar.appearance_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {selectedChar.appearance_tags.slice(0, 4).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs bg-gray-700">
                                  {tag}
                                </Badge>
                              ))}
                              {selectedChar.appearance_tags.length > 4 && (
                                <Badge variant="secondary" className="text-xs bg-gray-700">
                                  +{selectedChar.appearance_tags.length - 4}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </Card>
              )}
            </TabsContent>

            <TabsContent value="models" className="space-y-6 mt-0">
              {/* Local Worker Status Banner */}
              {!chatWorkerHealthy && (
                <Card className="p-3 bg-amber-900/20 border-amber-700/50">
                  <div className="flex items-start gap-2">
                    <WifiOff className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-amber-400 font-medium">Local AI Workers Offline</p>
                      <p className="text-amber-300/70 text-xs mt-1">
                        Local models are currently unavailable. Cloud API models are recommended for reliable performance.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Chat Model Selection */}
              <div className="space-y-2">
                <Label>Chat Model</Label>
                <Select value={localModelProvider} onValueChange={setLocalModelProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsLoading ? (
                      <SelectItem value="" disabled>Loading models...</SelectItem>
                    ) : allModelOptions.length === 0 ? (
                      <SelectItem value="" disabled>No roleplay models available</SelectItem>
                    ) : (
                      allModelOptions.map((model) => {
                        return (
                          <SelectItem
                            key={model.value}
                            value={model.value}
                            disabled={!model.isAvailable}
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className={!model.isAvailable ? 'opacity-50' : ''}>{model.label}</span>
                              {model.isLocal && !model.isAvailable && (
                                <Badge variant="destructive" className="ml-2 text-xs flex items-center gap-1">
                                  <WifiOff className="w-3 h-3" />
                                  Offline
                                </Badge>
                              )}
                              {model.isLocal && model.isAvailable && (
                                <Badge variant="outline" className="ml-2 text-xs text-green-400 border-green-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Online
                                </Badge>
                              )}
                              {!model.isLocal && (
                                <Badge variant="outline" className="ml-2 text-xs text-blue-400 border-blue-400 flex items-center gap-1">
                                  <Cloud className="w-3 h-3" />
                                  API
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                {allModelOptions.length === 0 && !modelsLoading && (
                  <p className="text-xs text-yellow-400 mt-1">
                    ⚠️ No roleplay models configured. Please add models in Admin settings.
                  </p>
                )}
              </div>

              {/* Image Model Selection */}
              <div className="space-y-2">
                <Label>Image Model</Label>
                {!sdxlWorkerHealthy && (
                  <div className="flex items-center gap-2 p-2 bg-amber-900/20 border border-amber-700/50 rounded text-xs text-amber-300 mb-2">
                    <WifiOff className="w-3 h-3 flex-shrink-0" />
                    <span>Local SDXL offline - using cloud models</span>
                  </div>
                )}
                <Select
                  key={`image-model-${localSelectedImageModel || 'none'}`}
                  value={localSelectedImageModel || undefined}
                  onValueChange={(value) => {
                    console.log('📸 Image model changed:', value);
                    setLocalSelectedImageModel(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select image model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {imageModelsLoading ? (
                      <SelectItem value="__loading__" disabled>Loading image models...</SelectItem>
                    ) : imageModelOptions.length === 0 ? (
                      <SelectItem value="__none__" disabled>No image models available</SelectItem>
                    ) : (
                      imageModelOptions.map((model) => {
                        const isLocal = model.type === 'local';
                        return (
                          <SelectItem
                            key={model.value}
                            value={model.value}
                            disabled={!model.isAvailable}
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className={!model.isAvailable ? 'opacity-50' : ''}>{model.label}</span>
                              {isLocal && !model.isAvailable && (
                                <Badge variant="destructive" className="ml-2 text-xs flex items-center gap-1">
                                  <WifiOff className="w-3 h-3" />
                                  Offline
                                </Badge>
                              )}
                              {isLocal && model.isAvailable && (
                                <Badge variant="outline" className="ml-2 text-xs text-green-400 border-green-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Online
                                </Badge>
                              )}
                              {!isLocal && (
                                <Badge variant="outline" className="ml-2 text-xs text-blue-400 border-blue-400 flex items-center gap-1">
                                  <Cloud className="w-3 h-3" />
                                  API
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                {imageModelOptions.length === 0 && !imageModelsLoading && (
                  <p className="text-xs text-yellow-400 mt-1">
                    ⚠️ No image models configured. Please add models in Admin settings.
                  </p>
                )}
              </div>

              {/* I2I Model Selection (Scene Iteration) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Scene Iteration Model (I2I)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Used for iterating existing scenes. Seedream Edit models don't use strength - the prompt controls preservation.
                </p>
                <Select
                  key={`i2i-model-${localSelectedI2IModel || 'auto'}`}
                  value={localSelectedI2IModel || 'auto'}
                  onValueChange={(value) => {
                    console.log('🔄 I2I model changed:', value);
                    setLocalSelectedI2IModel(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select I2I model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {i2iModelsLoading ? (
                      <SelectItem value="__loading__" disabled>Loading I2I models...</SelectItem>
                    ) : i2iModelOptions.length === 0 ? (
                      <SelectItem value="__none__" disabled>No I2I models available</SelectItem>
                    ) : (
                      i2iModelOptions.map((model) => (
                        <SelectItem
                          key={model.value}
                          value={model.value}
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{model.label}</span>
                            {model.isDefault && model.value !== 'auto' && (
                              <Badge variant="outline" className="ml-2 text-xs text-green-400 border-green-400">
                                Default
                              </Badge>
                            )}
                            {model.capabilities?.uses_strength_param === false && (
                              <Badge variant="outline" className="ml-2 text-xs text-purple-400 border-purple-400">
                                No Strength
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {localSelectedI2IModel === 'auto' && defaultI2IModel && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Will use: {defaultI2IModel.label}
                  </p>
                )}
              </div>

              {/* Chat Model Information Card */}
              {selectedModel && capabilities && (
                <Card className="p-4 bg-gray-800/50 border-gray-700">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-white">{selectedModel.label}</h3>
                        {selectedModel.isLocal ? (
                          selectedModel.isAvailable ? (
                            <Badge variant="outline" className="text-green-400 border-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Online
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <WifiOff className="w-3 h-3" />
                              Offline
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-blue-400 border-blue-400 flex items-center gap-1">
                            <Cloud className="w-3 h-3" />
                            API
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{selectedModel.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Speed Badge */}
                      <div className="flex items-center gap-2">
                        <Zap className={cn(
                          "w-4 h-4",
                          capabilities.speed === 'fast' ? "text-green-400" :
                          capabilities.speed === 'medium' ? "text-yellow-400" : "text-red-400"
                        )} />
                        <div className="flex-1">
                          <div className="text-xs text-gray-400">Speed</div>
                          <div className="text-sm font-medium text-white capitalize">
                            {capabilities.speed || 'medium'}
                          </div>
                        </div>
                      </div>

                      {/* Cost Badge */}
                      <div className="flex items-center gap-2">
                        <DollarSign className={cn(
                          "w-4 h-4",
                          capabilities.cost === 'free' ? "text-green-400" :
                          capabilities.cost === 'low' ? "text-yellow-400" : "text-gray-400"
                        )} />
                        <div className="flex-1">
                          <div className="text-xs text-gray-400">Cost</div>
                          <div className="text-sm font-medium text-white capitalize">
                            {capabilities.cost === 'free' ? 'Free' : capabilities.cost || 'Low'}
                          </div>
                        </div>
                      </div>

                      {/* NSFW Support */}
                      <div className="flex items-center gap-2">
                        <Shield className={cn(
                          "w-4 h-4",
                          capabilities.nsfw ? "text-purple-400" : "text-gray-500"
                        )} />
                        <div className="flex-1">
                          <div className="text-xs text-gray-400">NSFW</div>
                          <div className="text-sm font-medium text-white">
                            {capabilities.nsfw ? 'Supported' : 'Not Supported'}
                          </div>
                        </div>
                      </div>

                      {/* Quality */}
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn(
                          "w-4 h-4",
                          capabilities.quality === 'high' ? "text-blue-400" :
                          capabilities.quality === 'medium' ? "text-yellow-400" : "text-gray-400"
                        )} />
                        <div className="flex-1">
                          <div className="text-xs text-gray-400">Quality</div>
                          <div className="text-sm font-medium text-white capitalize">
                            {capabilities.quality || 'High'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Provider Info */}
                    <div className="pt-3 border-t border-gray-700">
                      <div className="text-xs text-gray-400">Provider: <span className="text-white">{selectedModel.provider}</span></div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Model Comparison */}
              {allModelOptions.length > 1 && (
                <Card className="p-4 bg-gray-800/50 border-gray-700">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-gray-400" />
                      <Label className="text-sm font-semibold">Available Models</Label>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {allModelOptions.map((model) => {
                        const modelCaps = model.capabilities || {
                          speed: model.isLocal ? 'fast' : 'medium',
                          cost: model.isLocal ? 'free' : 'low',
                          nsfw: true
                        };
                        const isSelected = model.value === localModelProvider;
                        const isDisabled = !model.isAvailable;
                        return (
                          <button
                            key={model.value}
                            onClick={() => !isDisabled && setLocalModelProvider(model.value)}
                            disabled={isDisabled}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border transition-colors",
                              isDisabled
                                ? "bg-gray-800/30 border-gray-700 cursor-not-allowed opacity-60"
                                : isSelected
                                  ? "bg-blue-600/20 border-blue-500"
                                  : "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn(
                                "text-sm font-medium",
                                isDisabled ? "text-gray-500" :
                                isSelected ? "text-blue-400" : "text-white"
                              )}>
                                {model.label}
                              </span>
                              <div className="flex items-center gap-2">
                                {model.isLocal && isDisabled && (
                                  <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                    <WifiOff className="w-3 h-3" />
                                    Offline
                                  </Badge>
                                )}
                                {model.isLocal && !isDisabled && (
                                  <Badge variant="outline" className="text-xs text-green-400 border-green-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Online
                                  </Badge>
                                )}
                                {!model.isLocal && (
                                  <Badge variant="outline" className="text-xs text-blue-400 border-blue-400 flex items-center gap-1">
                                    <Cloud className="w-3 h-3" />
                                    API
                                  </Badge>
                                )}
                                {isSelected && !isDisabled && (
                                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {modelCaps.speed && (
                                <Badge variant="outline" className={cn("text-xs", isDisabled && "opacity-50")}>
                                  <Zap className="w-3 h-3 mr-1" />
                                  {modelCaps.speed}
                                </Badge>
                              )}
                              {modelCaps.cost === 'free' && (
                                <Badge variant="outline" className={cn("text-xs", isDisabled && "opacity-50")}>
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  Free
                                </Badge>
                              )}
                              {modelCaps.nsfw && (
                                <Badge variant="outline" className={cn("text-xs", isDisabled && "opacity-50")}>
                                  <Shield className="w-3 h-3 mr-1" />
                                  NSFW
                                </Badge>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 mt-0">
              {/* Consistency Settings */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Image Consistency</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="text-sm">
                            Choose how to maintain character consistency across generated scenes. 
                            Hybrid combines both methods for maximum consistency.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="method" className="text-sm">Method</Label>
                    </div>
                    <Select 
                      key={`consistency-method-${localConsistencySettings.method}`}
                      value={localConsistencySettings.method} 
                      onValueChange={(value: 'hybrid' | 'i2i_reference' | 'seed_locked') => {
                        console.log('🎨 Consistency method changed:', value);
                        setLocalConsistencySettings({ ...localConsistencySettings, method: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select consistency method..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem 
                          value="hybrid"
                          disabled={(!character?.reference_image_url && !character?.seed_locked)}
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            <span>Hybrid</span>
                          </div>
                        </SelectItem>
                        <SelectItem 
                          value="i2i_reference"
                          disabled={!character?.reference_image_url}
                        >
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            <span>Reference Image</span>
                          </div>
                        </SelectItem>
                        <SelectItem 
                          value="seed_locked"
                          disabled={!character?.seed_locked}
                        >
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            <span>Seed Locked</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Method descriptions with visual feedback */}
                    <div className="mt-2 space-y-1 text-xs transition-all duration-200">
                      {localConsistencySettings.method === 'hybrid' && (
                        <div className="p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
                          <p className="text-blue-300 font-medium mb-1">Hybrid Method Selected</p>
                          <p className="text-muted-foreground">
                            Combines seed locking with reference image for maximum consistency. 
                            {character?.reference_image_url && character?.seed_locked 
                              ? ' Both reference image and seed will be used.' 
                              : character?.reference_image_url 
                              ? ' Using reference image only (seed not available).'
                              : character?.seed_locked
                              ? ' Using seed only (reference image not available).'
                              : ' ⚠️ Requires either reference image or seed value.'}
                          </p>
                        </div>
                      )}
                      {localConsistencySettings.method === 'i2i_reference' && (
                        <div className="p-2 rounded-md bg-green-500/10 border border-green-500/20">
                          <p className="text-green-300 font-medium mb-1">Reference Image Method Selected</p>
                          <p className="text-muted-foreground">
                            Uses reference image for character consistency. Best for visual accuracy.
                            {!character?.reference_image_url && (
                              <span className="text-amber-400 block mt-1">
                                ⚠️ Reference image required. Generate character portrait first.
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      {localConsistencySettings.method === 'seed_locked' && (
                        <div className="p-2 rounded-md bg-purple-500/10 border border-purple-500/20">
                          <p className="text-purple-300 font-medium mb-1">Seed Locked Method Selected</p>
                          <p className="text-muted-foreground">
                            Uses fixed seed for consistent character generation. Best for deterministic results.
                            {character?.seed_locked ? (
                              <span className="text-green-400 block mt-1">
                                ✓ Seed value available: {character.seed_locked}
                              </span>
                            ) : (
                              <span className="text-amber-400 block mt-1">
                                ⚠️ Seed value required. Generate character portrait first to create a seed.
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Warning messages */}
                    {localConsistencySettings.method === 'i2i_reference' && !character?.reference_image_url && (
                      <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-400">
                          ⚠️ Reference Image method requires a character reference image. 
                          Falling back to hybrid or seed_locked if available.
                        </p>
                      </div>
                    )}
                    {localConsistencySettings.method === 'seed_locked' && !character?.seed_locked && (
                      <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-400">
                          ⚠️ Seed Locked method requires a character seed value. 
                          Generate character portrait first to create a seed. 
                          Falling back to hybrid or i2i_reference if available.
                        </p>
                      </div>
                    )}
                    {localConsistencySettings.method === 'hybrid' && !character?.reference_image_url && !character?.seed_locked && (
                      <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-400">
                          ⚠️ Hybrid method requires either a reference image or seed value. 
                          Some features may not work. Generate character portrait to enable full functionality.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Sliders - conditionally shown based on method */}
                  <div className={cn(
                    "grid grid-cols-2 gap-4 transition-all duration-200",
                    localConsistencySettings.method === 'seed_locked' && "opacity-50 pointer-events-none"
                  )}>
                    <div className={cn(
                      "space-y-1 transition-all duration-200",
                      localConsistencySettings.method === 'seed_locked' && "hidden"
                    )}>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="reference_strength" className="text-xs">Reference Strength</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">
                                How strongly to follow the reference image. Higher values maintain more visual similarity.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={localConsistencySettings.reference_strength}
                        onChange={(e) => 
                          setLocalConsistencySettings({ 
                            ...localConsistencySettings, 
                            reference_strength: parseFloat(e.target.value) 
                          })
                        }
                        className="w-full"
                        disabled={localConsistencySettings.method === 'seed_locked'}
                      />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(localConsistencySettings.reference_strength * 100)}%
                      </span>
                    </div>

                    <div className={cn(
                      "space-y-1 transition-all duration-200",
                      localConsistencySettings.method === 'seed_locked' && "hidden"
                    )}>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="denoise_strength" className="text-xs">Denoise Strength</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">
                                How much to modify the reference image. Higher values allow more scene variation while maintaining character consistency.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={localConsistencySettings.denoise_strength}
                        onChange={(e) => 
                          setLocalConsistencySettings({ 
                            ...localConsistencySettings, 
                            denoise_strength: parseFloat(e.target.value) 
                          })
                        }
                        className="w-full"
                        disabled={localConsistencySettings.method === 'seed_locked'}
                      />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(localConsistencySettings.denoise_strength * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Seed value display for seed_locked method */}
                  {localConsistencySettings.method === 'seed_locked' && character?.seed_locked && (
                    <div className="p-2 rounded-md bg-purple-500/10 border border-purple-500/20">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-purple-300">Current Seed Value:</span> {character.seed_locked}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Scene Continuity Settings */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Scene Continuity
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="text-sm">
                            When enabled, each new scene builds on the previous scene image using I2I iteration.
                            This maintains visual continuity for clothing state, positions, and scene context.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50">
                    <Checkbox
                      id="sceneContinuity"
                      checked={sceneContinuityEnabled}
                      onCheckedChange={(checked) => setSceneContinuityEnabled(!!checked)}
                    />
                    <label
                      htmlFor="sceneContinuity"
                      className="text-sm cursor-pointer flex-1"
                    >
                      <span className="font-medium">Link scenes together</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Each scene iterates on the previous, maintaining character appearance and scene context.
                      </p>
                    </label>
                  </div>

                  {/* I2I Strength Slider - only shown when enabled */}
                  {sceneContinuityEnabled && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="i2i_strength" className="text-sm">Iteration Strength</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">
                                How much to modify each scene from the previous.
                                Lower = more similar, Higher = more variation.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="0.7"
                        step="0.05"
                        value={defaultStrength}
                        onChange={(e) => setDefaultStrength(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Subtle</span>
                        <span className="font-medium">{Math.round(defaultStrength * 100)}%</span>
                        <span>Bold</span>
                      </div>
                    </div>
                  )}

                  {/* Info box */}
                  <div className={cn(
                    "p-2 rounded-md text-xs",
                    sceneContinuityEnabled
                      ? "bg-green-500/10 border border-green-500/20"
                      : "bg-gray-500/10 border border-gray-500/20"
                  )}>
                    <p className={sceneContinuityEnabled ? "text-green-300" : "text-muted-foreground"}>
                      {sceneContinuityEnabled
                        ? "✓ Scene continuity enabled. Scenes will maintain visual consistency."
                        : "Scene continuity disabled. Each scene generates independently."}
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </div>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 p-4 pt-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveSettings}>
            Save Settings
          </Button>
        </div>
      </SheetContent>

      {/* Create Persona Dialog */}
      <Dialog open={showCreatePersonaModal} onOpenChange={setShowCreatePersonaModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create My Persona</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="persona-name">Name *</Label>
              <Input
                id="persona-name"
                value={personaFormData.name}
                onChange={(e) => setPersonaFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your character's name"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="persona-description">Description *</Label>
              <Textarea
                id="persona-description"
                value={personaFormData.description}
                onChange={(e) => setPersonaFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your character..."
                className="min-h-[100px] resize-none"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="persona-gender">Gender</Label>
              <Select
                value={personaFormData.gender || 'unspecified'}
                onValueChange={(value) => setPersonaFormData(prev => ({ ...prev, gender: value === 'unspecified' ? '' : value }))}
              >
                <SelectTrigger id="persona-gender" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Unspecified</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              You can add an avatar and more details after creating your persona.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreatePersonaModal(false);
                  setPersonaFormData({ name: '', description: '', gender: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePersona}
                disabled={isCreatingPersona || !personaFormData.name.trim() || !personaFormData.description.trim()}
              >
                {isCreatingPersona ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Persona
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};