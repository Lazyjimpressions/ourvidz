import React, { useState, useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  Plus,
  X,
  Play,
  Search,
  Heart,
  Flame,
  ChevronDown,
  ChevronUp,
  User,
  CheckCircle2
} from 'lucide-react';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useImageModels } from '@/hooks/useImageModels';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { SceneTemplate, ContentRating, SceneStyle, ImageGenerationMode } from '@/types/roleplay';
import { cn } from '@/lib/utils';
import { Loader2, Settings2 } from 'lucide-react';
import { urlSigningService } from '@/lib/services/UrlSigningService';

interface SceneSetupSheetProps {
  scene: SceneTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: SceneSetupConfig) => void;
  /** Optional pre-launch options (compact in-sheet). When provided, user can set before Start. */
  selectedImageModel?: string;
  onImageModelChange?: (id: string) => void;
  selectedChatModel?: string;
  onChatModelChange?: (key: string) => void;
  sceneStyle?: SceneStyle;
  onSceneStyleChange?: (style: SceneStyle) => void;
  imageGenerationMode?: ImageGenerationMode;
  onImageGenerationModeChange?: (mode: ImageGenerationMode) => void;
}

export interface SceneSetupConfig {
  scene: SceneTemplate;
  primaryCharacterId: string;
  secondaryCharacterId?: string;
  userRole: string;
  userCharacterId: string | null;
}

// Gradient backgrounds for scenes without preview images
const SCENE_GRADIENTS: Record<string, string> = {
  cafe: 'from-amber-600 to-orange-800',
  beach: 'from-cyan-500 to-blue-700',
  office: 'from-slate-600 to-slate-800',
  apartment: 'from-purple-600 to-indigo-800',
  garden: 'from-emerald-600 to-teal-800',
  hotel: 'from-rose-600 to-pink-800',
  tavern: 'from-amber-700 to-yellow-900',
  spa: 'from-teal-500 to-cyan-700',
  rooftop: 'from-violet-600 to-purple-800',
  cabin: 'from-orange-700 to-red-900',
  default: 'from-gray-600 to-gray-800'
};

export const SceneSetupSheet: React.FC<SceneSetupSheetProps> = ({
  scene,
  isOpen,
  onClose,
  onStart,
  selectedImageModel = '',
  onImageModelChange,
  selectedChatModel = '',
  onChatModelChange,
  sceneStyle = 'character_only',
  onSceneStyleChange,
  imageGenerationMode = 'auto',
  onImageGenerationModeChange
}) => {
  const { characters: publicCharacters, isLoading: isLoadingPublicCharacters } = usePublicCharacters();
  const { characters: userCreatedCharacters, userPersonas, defaultCharacterId, isLoading: isLoadingUserCharacters } = useUserCharacters();
  // No hasReferenceImage: show all image models (T2I + I2I) so user can pick e.g. Seedream v4.5 Edit for first-scene I2I
  const { modelOptions: imageModelOptions, isLoading: imageModelsLoading, defaultModel: defaultImageModel } = useImageModels();
  const { allModelOptions: chatModelOptions, isLoading: chatModelsLoading, defaultModel: defaultChatModel } = useRoleplayModels();
  const hasOptions = Boolean(onImageModelChange || onChatModelChange || onSceneStyleChange || onImageGenerationModeChange);

  // Selection state
  const [primaryCharacterId, setPrimaryCharacterId] = useState<string | null>(null);
  const [secondaryCharacterId, setSecondaryCharacterId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState('');
  const [selectedUserCharacterId, setSelectedUserCharacterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSecondCharacter, setShowSecondCharacter] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'primary' | 'secondary' | null>('primary');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Combine public and user-created characters for AI companion selection, removing duplicates
  const allCharacters = useMemo(() => {
    const combined = [...publicCharacters, ...userCreatedCharacters];
    // Remove duplicates by id
    const unique = combined.filter((char, index, self) =>
      index === self.findIndex(c => c.id === char.id)
    );
    return unique;
  }, [publicCharacters, userCreatedCharacters]);

  // Reset state when scene changes
  React.useEffect(() => {
    if (scene) {
      setPrimaryCharacterId(null);
      setSecondaryCharacterId(null);
      setUserRole(scene.suggested_user_role || '');
      setShowSecondCharacter(false);
      setExpandedSection('primary');
      // Set default user character if available
      setSelectedUserCharacterId(defaultCharacterId || null);
    }
  }, [scene?.id, defaultCharacterId]);

  // Filter characters based on content rating and search
  const filteredCharacters = useMemo(() => {
    if (!scene) return [];

    return allCharacters.filter(char => {
      // Match content rating - SFW scenes can use SFW or NSFW characters
      // NSFW scenes should only use NSFW characters
      if (scene.content_rating === 'sfw' && char.content_rating === 'nsfw') {
        return false;
      }

      // Match search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          char.name.toLowerCase().includes(query) ||
          char.description?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [allCharacters, scene, searchQuery]);

  // Sign character image URLs for private storage paths
  useEffect(() => {
    const signUrls = async () => {
      const newUrls: Record<string, string> = {};
      const toSign: Array<{ id: string; url: string; bucket: 'user-library' | 'workspace-temp' }> = [];

      for (const char of filteredCharacters) {
        const rawUrl = char.reference_image_url || char.image_url;
        if (!rawUrl) continue;
        if (signedUrls[char.id]) { newUrls[char.id] = signedUrls[char.id]; continue; }
        if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
          newUrls[char.id] = rawUrl;
        } else if (rawUrl.includes('user-library')) {
          toSign.push({ id: char.id, url: rawUrl, bucket: 'user-library' });
        } else if (rawUrl.includes('workspace-temp')) {
          toSign.push({ id: char.id, url: rawUrl, bucket: 'workspace-temp' });
        } else {
          newUrls[char.id] = rawUrl;
        }
      }

      // Sign in parallel
      const results = await Promise.allSettled(
        toSign.map(async ({ id, url, bucket }) => {
          const signed = await urlSigningService.getSignedUrl(url, bucket);
          return { id, signed };
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') newUrls[r.value.id] = r.value.signed;
      }

      setSignedUrls(prev => ({ ...prev, ...newUrls }));
    };

    if (filteredCharacters.length > 0) signUrls();
  }, [filteredCharacters]);

  const primaryCharacter = allCharacters.find(c => c.id === primaryCharacterId);
  const secondaryCharacter = allCharacters.find(c => c.id === secondaryCharacterId);
  const selectedUserCharacter = userPersonas.find(c => c.id === selectedUserCharacterId);

  const canStart = primaryCharacterId !== null && selectedUserCharacterId !== null;
  const gradient = scene ? (SCENE_GRADIENTS[scene.setting || 'default'] || SCENE_GRADIENTS.default) : SCENE_GRADIENTS.default;

  const handleStart = () => {
    if (!scene || !primaryCharacterId || !selectedUserCharacterId) return;

    onStart({
      scene,
      primaryCharacterId,
      secondaryCharacterId: secondaryCharacterId || undefined,
      userRole: userRole || scene.suggested_user_role || 'The protagonist',
      userCharacterId: selectedUserCharacterId
    });
  };

  const CharacterGrid = ({
    onSelect,
    selectedId,
    excludeId
  }: {
    onSelect: (id: string) => void;
    selectedId: string | null;
    excludeId?: string | null;
  }) => (
    <div className="grid grid-cols-3 gap-2">
      {filteredCharacters
        .filter(c => c.id !== excludeId)
        .map((char) => (
        <button
          key={char.id}
          onClick={() => onSelect(char.id)}
          className={cn(
            "flex flex-col items-center p-2 rounded-lg transition-all",
            selectedId === char.id
              ? "bg-primary/20 ring-2 ring-primary"
              : "bg-muted/50 hover:bg-muted"
          )}
        >
          <Avatar className="w-12 h-12 mb-1">
            <AvatarImage src={signedUrls[char.id] || char.reference_image_url || char.image_url} alt={char.name} />
            <AvatarFallback>{char.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-center line-clamp-1">{char.name}</span>
        </button>
      ))}
      {filteredCharacters.length === 0 && (
        <p className="col-span-3 text-center text-sm text-muted-foreground py-4">
          No characters found
        </p>
      )}
    </div>
  );

  if (!scene) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] max-h-[calc(100vh-env(safe-area-inset-top)-2rem)] rounded-t-2xl px-0">
        {/* Scene Header */}
        <div className={cn("relative h-32 bg-gradient-to-br", gradient)}>
          {scene.preview_image_url && (
            <img
              src={scene.preview_image_url}
              alt={scene.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

          <SheetHeader className="absolute bottom-0 left-0 right-0 px-6 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={scene.content_rating === 'nsfw' ? 'destructive' : 'secondary'}>
                {scene.content_rating.toUpperCase()}
              </Badge>
              {(scene.atmosphere?.romance ?? 0) >= 60 && (
                <Badge variant="outline" className="gap-1">
                  <Heart className="w-3 h-3" /> Romantic
                </Badge>
              )}
              {(scene.atmosphere?.tension ?? 0) >= 50 && (
                <Badge variant="outline" className="gap-1">
                  <Flame className="w-3 h-3" /> Tension
                </Badge>
              )}
            </div>
            <SheetTitle className="text-xl">{scene.name}</SheetTitle>
            <SheetDescription className="line-clamp-2">{scene.description}</SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="h-[calc(100%-8rem-4rem)] px-6">
          <div className="space-y-6 py-4">
            {/* Primary Character Selection */}
            <div className="space-y-3">
              <button
                onClick={() => setExpandedSection(expandedSection === 'primary' ? null : 'primary')}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-medium cursor-pointer">AI Companion</Label>
                  {primaryCharacter && (
                    <Badge variant="secondary" className="text-xs">
                      {primaryCharacter.name}
                    </Badge>
                  )}
                </div>
                {expandedSection === 'primary' ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {expandedSection === 'primary' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search characters..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <CharacterGrid
                    onSelect={(id) => {
                      setPrimaryCharacterId(id);
                      setExpandedSection(null);
                    }}
                    selectedId={primaryCharacterId}
                  />
                </div>
              )}
            </div>

            {/* Secondary Character (Optional) */}
            {scene.max_characters >= 2 && (
              <div className="space-y-3">
                {!showSecondCharacter ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowSecondCharacter(true);
                      setExpandedSection('secondary');
                    }}
                    className="w-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add 2nd AI Character (dialogue only)
                  </Button>
                ) : (
                  <>
                    <button
                      onClick={() => setExpandedSection(expandedSection === 'secondary' ? null : 'secondary')}
                      className="flex items-center justify-between w-full"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium cursor-pointer">2nd AI (Dialogue Only)</Label>
                        {secondaryCharacter && (
                          <Badge variant="secondary" className="text-xs">
                            {secondaryCharacter.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSecondCharacter(false);
                            setSecondaryCharacterId(null);
                          }}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {expandedSection === 'secondary' ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {expandedSection === 'secondary' && (
                      <CharacterGrid
                        onSelect={(id) => {
                          setSecondaryCharacterId(id);
                          setExpandedSection(null);
                        }}
                        selectedId={secondaryCharacterId}
                        excludeId={primaryCharacterId}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {/* User Profile Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your Profile</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Choose how you appear in the roleplay. The AI will use your name and pronouns.
              </p>
              <Select
                value={selectedUserCharacterId || ''}
                onValueChange={(value) => {
                  setSelectedUserCharacterId(value || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your profile..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingUserCharacters ? (
                    <SelectItem value="__loading__" disabled>Loading characters...</SelectItem>
                  ) : userPersonas.length === 0 ? (
                    <SelectItem value="__empty__" disabled>No user profiles created yet</SelectItem>
                  ) : (
                    userPersonas.map((char) => (
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
              {selectedUserCharacterId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span>Profile selected: {selectedUserCharacter?.name || 'Unknown'}</span>
                </div>
              )}
              {userPersonas.length === 0 && !isLoadingUserCharacters && (
                <p className="text-xs text-blue-400 mt-1">
                  Create a user profile in your settings to personalize your roleplay experience.
                </p>
              )}
            </div>

            {/* User Role */}
            <div className="space-y-2">
              <Label htmlFor="userRole" className="text-sm font-medium">Your Role</Label>
              <Input
                id="userRole"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                placeholder={scene.suggested_user_role || "Describe your role in the scene..."}
              />
              <p className="text-xs text-muted-foreground">
                This helps set the context for the conversation
              </p>
            </div>

            {/* Compact pre-launch options (function over form, single surface) */}
            {hasOptions && (
              <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen} className="space-y-1">
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-left">
                  <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Options</span>
                  {optionsOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1">
                    {onImageModelChange && (
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Image</Label>
                        {imageModelsLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Select value={selectedImageModel || defaultImageModel?.value || ''} onValueChange={onImageModelChange}>
                            <SelectTrigger className="h-8 text-xs bg-muted/50"><SelectValue placeholder="Model" /></SelectTrigger>
                            <SelectContent>
                              {imageModelOptions.map((m) => (
                                <SelectItem key={m.value} value={m.value} disabled={!m.isAvailable}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                    {onChatModelChange && (
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Chat</Label>
                        {chatModelsLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Select value={selectedChatModel || defaultChatModel?.value || ''} onValueChange={onChatModelChange}>
                            <SelectTrigger className="h-8 text-xs bg-muted/50"><SelectValue placeholder="Model" /></SelectTrigger>
                            <SelectContent>
                              {chatModelOptions.map((m) => (
                                <SelectItem key={m.value} value={m.value} disabled={!m.isAvailable}><span className="truncate max-w-[120px]">{m.label}</span></SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                    {onSceneStyleChange && (
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Scene style</Label>
                        <Select value={sceneStyle} onValueChange={(v: SceneStyle) => onSceneStyleChange(v)}>
                          <SelectTrigger className="h-8 text-xs bg-muted/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="character_only"><span className="text-xs">Character only</span></SelectItem>
                            <SelectItem value="pov"><span className="text-xs">POV</span></SelectItem>
                            <SelectItem value="both_characters"><span className="text-xs">Both</span></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {onImageGenerationModeChange && (
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Images</Label>
                        <Select value={imageGenerationMode} onValueChange={(v: ImageGenerationMode) => onImageGenerationModeChange(v)}>
                          <SelectTrigger className="h-8 text-xs bg-muted/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto"><span className="text-xs">Auto</span></SelectItem>
                            <SelectItem value="manual"><span className="text-xs">Manual</span></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Scene Starters Preview */}
            {scene.scene_starters && scene.scene_starters.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Conversation Starters</Label>
                <div className="space-y-2">
                  {scene.scene_starters.slice(0, 2).map((starter, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground italic bg-muted/50 p-2 rounded">
                      "{starter}"
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="absolute bottom-0 left-0 right-0 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background border-t">
          <Button
            className="w-full gap-2"
            size="lg"
            disabled={!canStart}
            onClick={handleStart}
          >
            <Play className="w-4 h-4" />
            Start Roleplay
          </Button>
          {!selectedUserCharacterId && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Please select your profile to continue
            </p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
