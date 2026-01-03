import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { useImageModels } from '@/hooks/useImageModels';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { Checkbox } from '@/components/ui/checkbox';
import { ConsistencySettings } from '@/services/ImageConsistencyService';
import { useToast } from '@/hooks/use-toast';
import { Zap, DollarSign, Shield, CheckCircle2, Info, WifiOff, Cloud, User, Eye, Users, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SceneStyle } from '@/types/roleplay';

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
  // User character and scene style
  selectedUserCharacterId?: string | null;
  onUserCharacterChange?: (characterId: string | null) => void;
  sceneStyle?: SceneStyle;
  onSceneStyleChange?: (style: SceneStyle) => void;
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
  selectedUserCharacterId,
  onUserCharacterChange,
  sceneStyle = 'character_only',
  onSceneStyleChange,
  characterId,
  character
}) => {
  const { allModelOptions, defaultModel: defaultChatModel, isLoading: modelsLoading, chatWorkerHealthy } = useRoleplayModels();
  const { modelOptions: imageModelOptions, defaultModel: defaultImageModel, isLoading: imageModelsLoading, sdxlWorkerHealthy } = useImageModels();
  const { characters: userCharacters, isLoading: userCharactersLoading, defaultCharacterId, setDefaultCharacter } = useUserCharacters();
  const { toast } = useToast();

  // Local state for form data
  const [localMemoryTier, setLocalMemoryTier] = useState(memoryTier);
  const [localModelProvider, setLocalModelProvider] = useState(modelProvider);
  const [localSelectedImageModel, setLocalSelectedImageModel] = useState(selectedImageModel);
  const [localConsistencySettings, setLocalConsistencySettings] = useState(consistencySettings);
  const [localUserCharacterId, setLocalUserCharacterId] = useState<string | null>(selectedUserCharacterId || null);
  const [localSceneStyle, setLocalSceneStyle] = useState<SceneStyle>(sceneStyle);
  const [setAsDefault, setSetAsDefault] = useState(false);
  
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
  
  // Save settings to localStorage
  const saveSettings = async () => {
    const settings = {
      memoryTier: localMemoryTier,
      modelProvider: localModelProvider,
      selectedImageModel: localSelectedImageModel,
      consistencySettings: localConsistencySettings,
      userCharacterId: localUserCharacterId,
      sceneStyle: localSceneStyle
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
    onConsistencySettingsChange(localConsistencySettings);
    onUserCharacterChange?.(localUserCharacterId);
    onSceneStyleChange?.(localSceneStyle);

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
                  <p className="text-xs text-blue-400 mt-1">
                    Create a character in your profile settings to personalize your roleplay experience.
                  </p>
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
                    disabled={!localUserCharacterId}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      !localUserCharacterId
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
                          {localUserCharacterId
                            ? "Show both you and the AI character"
                            : "Select a character above to enable"}
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
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="method" className="text-sm">Method</Label>
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
                          Hybrid
                        </SelectItem>
                        <SelectItem 
                          value="i2i_reference"
                          disabled={!character?.reference_image_url}
                        >
                          Reference Image
                        </SelectItem>
                        <SelectItem 
                          value="seed_locked"
                          disabled={!character?.seed_locked}
                        >
                          Seed Locked
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Method descriptions */}
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {localConsistencySettings.method === 'hybrid' && (
                        <p>Combines seed locking with reference image for maximum consistency</p>
                      )}
                      {localConsistencySettings.method === 'i2i_reference' && (
                        <p>Uses reference image for character consistency</p>
                      )}
                      {localConsistencySettings.method === 'seed_locked' && (
                        <p>Uses fixed seed for consistent character generation</p>
                      )}
                    </div>
                    {localConsistencySettings.method === 'i2i_reference' && !character?.reference_image_url && (
                      <p className="text-xs text-amber-400 mt-1">
                        ⚠️ Reference Image method requires a character reference image. Falling back to hybrid or seed_locked.
                      </p>
                    )}
                    {localConsistencySettings.method === 'seed_locked' && !character?.seed_locked && (
                      <p className="text-xs text-amber-400 mt-1">
                        ⚠️ Seed Locked method requires a character seed value. Falling back to hybrid or i2i_reference.
                      </p>
                    )}
                    {localConsistencySettings.method === 'hybrid' && !character?.reference_image_url && !character?.seed_locked && (
                      <p className="text-xs text-amber-400 mt-1">
                        ⚠️ Hybrid method requires either a reference image or seed value. Some features may not work.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="reference_strength" className="text-xs">Reference Strength</Label>
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
                      />
                      <span className="text-xs text-muted-foreground">
                        {localConsistencySettings.reference_strength}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="denoise_strength" className="text-xs">Denoise Strength</Label>
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
                      />
                      <span className="text-xs text-muted-foreground">
                        {localConsistencySettings.denoise_strength}
                      </span>
                    </div>
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
    </Sheet>
  );
};